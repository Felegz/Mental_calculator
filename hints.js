// ---- Mental Math Hints Engine ----
// Architecture: stepCost/directCost + structural vs transformational tricks

// ===========================================================
// HELPERS
// ===========================================================

const _dig = n => Math.floor(Math.log10(Math.abs(n) || 1)) + 1;
const _inp  = v => ({ value: v, type: 'input'  });
const _calc = v => ({ value: v, type: 'calc'   });
const _ans  = v => ({ value: v, type: 'answer' });
function _step(text, numbers) { return { text, numbers }; }

function formatNum(n) {
  return parseFloat(n.toFixed(8)).toLocaleString('ru');
}

// ===========================================================
// SCORING
// ===========================================================

// Returns true when a±b is cognitively trivial (round numbers, shifts, etc.)
function isRoundOp(a, b) {
  const big = Math.max(a, b), small = Math.min(a, b);
  if (!small) return false;
  if (big % 100 === 0 && small % 100 === 0) return true;
  if (big % 10  === 0 && small % 10  === 0) return true;
  const ratio = big / small;
  if (Number.isInteger(ratio) && (ratio === 10 || ratio === 100)) return true;
  if (big % 100 === 0 && small < 100) return true;
  if (big % 10  === 0 && small < 10)  return true;
  return false;
}

// Cost of one computation step inside a trick
function stepCost(a, b, op) {
  const da = _dig(a), db = _dig(b);
  if (op === '+' || op === '-') {
    if (isRoundOp(a, b)) return 2;
    const sm = Math.min(da, db), big2 = Math.max(da, db);
    if (sm === 1 && Math.max(a, b) < 20) return 1;
    if (sm === 1) return 2;
    const carry = (sm > 1 && (a % 10) + (b % 10) >= 10) ? 2 : 0;
    return (big2 <= 2 ? 3 : 8) + carry;
  }
  if (op === '*') {
    if (da === 1 && db === 1) return 1;
    if (a === 10 || b === 10)   return 2;
    if (a === 100 || b === 100) return 2;
    if (a === 1000 || b === 1000) return 3;
    const single = da === 1 ? a : db === 1 ? b : null;
    const other  = da === 1 ? b : db === 1 ? a : null;
    if (single !== null) {
      if (single === 1) return 1;
      if (new Set([2, 3, 4]).has(single)) return 2;
      if (single === 5) return other % 2 === 0 ? 2 : 3;
      return 3;
    }
    if (a % 10 === 0 || b % 10 === 0) {
      const rnd = a % 10 === 0 ? a : b;
      const oth = a % 10 === 0 ? b : a;
      return 1 + stepCost(oth, rnd / 10, '*');
    }
    if (da <= 2 && db <= 2) return 4;
    return 8 + Math.max(da, db);
  }
  if (op === '/') {
    if ((b === 10 || b === 100) && a % b === 0) return 1;
    const POW2 = new Set([2, 4, 8, 16]);
    if (POW2.has(b) && a % b === 0) return Math.log2(b) * 2;
    return 4 + da;
  }
  return 4;
}

// Cost of computing a op b WITHOUT any trick
function directCost(a, b, op) {
  const da = _dig(a), db = _dig(b);
  if (op === '*') {
    if (da === 1 && db === 1) return 2;
    if (da === 1 || db === 1) return 5;
    if (da <= 2 && db <= 2)   return 8;
    return 12 + Math.max(da, db);
  }
  if (op === '+' || op === '-') {
    const carry = (da > 1 && db > 1 && (a % 10) + (b % 10) >= 10) ? 2 : 0;
    return (Math.max(da, db) <= 2 ? 4 : 9) + carry;
  }
  return 6;
}

// ===========================================================
// TRICK SELECTION
// ===========================================================

function _checkNearBase(a, b) {
  const BASES = [10, 20, 25, 50, 100, 200, 250, 500, 1000];
  for (const base of BASES) {
    const da = a - base, db = b - base;
    const threshold = Math.max(Math.ceil(base * 0.15), 5);
    if (Math.abs(da) > threshold || Math.abs(db) > threshold) continue;
    if (Math.abs(da) === 0 || Math.abs(db) === 0) continue;
    const sumDev  = Math.abs(da + db);
    const prodDev = da * db;
    const baseSq  = base * base;
    const mid     = baseSq - base * (da + db);
    const cost = stepCost(Math.abs(da), Math.abs(db), '+')
               + stepCost(baseSq, base * sumDev, '-')
               + stepCost(Math.abs(da), Math.abs(db), '*')
               + stepCost(Math.abs(mid), Math.abs(prodDev), prodDev >= 0 ? '+' : '-');
    return { id: 'nearBase', tag: base === 100 ? 'Near 100 trick' : `Near ${base} trick`,
             base, da, db, cost };
  }
  return null;
}

// Cost of two-step indirect trick: other × f1 × f2 = res
// Tries both orderings and picks the cheaper one.
function _indirectCost(other, f1, f2) {
  const way1 = stepCost(other, f1, '*') + stepCost(other * f1, f2, '*');
  const way2 = stepCost(other, f2, '*') + stepCost(other * f2, f1, '*');
  return way1 <= way2
    ? { cost: way1, first: f1, second: f2, mid: other * f1 }
    : { cost: way2, first: f2, second: f1, mid: other * f2 };
}

const INDIRECT = [
  { n: 22,  factors: [2, 11] },
  { n: 33,  factors: [3, 11] },
  { n: 44,  factors: [4, 11] },
  { n: 66,  factors: [6, 11] },
  { n: 18,  factors: [2,  9] },
  { n: 27,  factors: [3,  9] },
  { n: 36,  factors: [4,  9] },
  { n: 15,  factors: [3,  5] },
  { n: 35,  factors: [7,  5] },
  { n: 45,  factors: [5,  9] },
  { n: 75,  factors: [3, 25] },
];

function _pickMulTrick(a, b) {
  const [big, small] = a >= b ? [a, b] : [b, a];
  const dc = directCost(a, b, '*');

  if (a === b) {
    const n = a;
    if (n % 10 === 0) return { id: 'mul10',     tag: 'Умножение на кратное 10', structural: true };
    if (n % 10 === 5) return { id: 'sqEnd5',    tag: 'Squares ending in 5',     structural: true };
    if (n >= 41 && n <= 59) return { id: 'sq4159', tag: 'Squares 41–59',        structural: true };
    return { id: 'sqGeneric', tag: 'Квадрат числа', structural: true };
  }

  // When both operands are special, pick the one with lower assigned cost.
  const SPECIAL_COST = { 9:1, 25:2, 99:2, 4:3, 5:3, 8:4, 11:5, 101:6, 111:7, 75:8, 125:9 };
  const SPECIAL = [9, 25, 99, 4, 5, 8, 11, 101, 111, 75, 125];
  const SPECIAL_SET = new Set(SPECIAL);

  // mul10: any operand ends in 0, but only when neither is a SPECIAL multiplier
  if ((small % 10 === 0 || big % 10 === 0) && !SPECIAL_SET.has(small) && !SPECIAL_SET.has(big))
    return { id: 'mul10', tag: 'Умножение на кратное 10', structural: true };

  let bestSpecial = null;
  for (const v of SPECIAL) {
    if (a !== v && b !== v) continue;
    const other = a === v ? b : a;
    if (v === 8 && _dig(other) > 2) continue;
    const sc = SPECIAL_COST[v];
    if (!bestSpecial || sc < bestSpecial.sc)
      bestSpecial = { id: String(v), tag: _specialTag(v), structural: true, other, sc };
  }
  if (bestSpecial) return bestSpecial;

  if (Math.floor(a / 10) === Math.floor(b / 10) && (a % 10) + (b % 10) === 10)
    return { id: 'sameTens', tag: 'Same tens, units sum to 10', structural: true };

  if (a % 10 === 5 && b % 10 === 5)
    return { id: 'bothEnd5', tag: 'Both end in 5', structural: true };

  // Reversals: 2-digit ab × ba
  if (big >= 10 && big <= 99 && String(big).split('').reverse().join('') === String(small))
    return { id: 'reverses', tag: 'Multiplying reverses', structural: true };

  const candidates = [];

  if ((a + b) % 2 === 0) {
    const mid = (a + b) / 2, d = Math.abs(mid - a);
    if (mid % 5 === 0) {
      const cost = stepCost(mid, mid, '*') + stepCost(d, d, '*') + stepCost(mid * mid, d * d, '-');
      if (cost < dc) candidates.push({ id: 'equidistant', tag: 'Equidistant from midpoint',
                                        structural: false, mid, d, cost });
    }
  }

  const nb = _checkNearBase(a, b);
  if (nb && nb.cost < dc) candidates.push(nb);

  // Double & Half: try halving each even number
  for (const [even, odd] of [[big, small], [small, big]]) {
    if (even % 2 !== 0) continue;
    const ns = even / 2, nb2 = odd * 2;
    // Require at least one of the new pair to be divisible by 10 (genuinely round).
    // This rejects cases like 9×38 where neither factor is round.
    const simpler = ns % 10 === 0 || nb2 % 10 === 0;
    if (simpler) {
      const cost = stepCost(ns, nb2, '*');
      if (cost < dc) {
        candidates.push({ id: 'doubleHalf', tag: 'Double & Half', structural: false,
                          evenNum: even, oddNum: odd, ns, nb: nb2, cost });
        break; // only need one
      }
    }
  }

  // Indirect tricks: e.g. ×22 = ×2 ×11
  for (const { n, factors: [f1, f2] } of INDIRECT) {
    if (big !== n && small !== n) continue;
    const other = big === n ? small : big;
    const ind = _indirectCost(other, f1, f2);
    if (ind.cost < dc) {
      candidates.push({ id: 'indirect', tag: `× ${n} = × ${ind.first} × ${ind.second}`,
                        structural: false, other, f1: ind.first, f2: ind.second,
                        mid: ind.mid, mulN: n, cost: ind.cost });
    }
  }

  // Near-decade: small close to a round decade (|diff|<=5) — structural, always show
  // Guard: skip when one operand is single-digit AND roundDiff is large (>=3) — e.g. 54×7
  const roundBase = Math.round(small / 10) * 10;
  const roundDiff = small - roundBase;
  const da = _dig(a), db = _dig(b);
  const oneSingleDigit = Math.min(da, db) === 1;
  if (roundBase > 0 && Math.abs(roundDiff) <= 5 && roundDiff !== 0
      && !(oneSingleDigit && Math.abs(roundDiff) >= 3)) {
    const cost = stepCost(big, roundBase, '*') + stepCost(big, Math.abs(roundDiff), '*')
                 + stepCost(big * roundBase, big * Math.abs(roundDiff), roundDiff < 0 ? '-' : '+');
    candidates.push({ id: 'nearDecade', tag: 'Округление при ×',
                      structural: false, big, small, roundBase, roundDiff, cost });
  }

  if (candidates.length)
    return candidates.reduce((best, c) => c.cost < best.cost ? c : best);

  return { id: 'generic', tag: 'Умножение', structural: true };
}

function _specialTag(v) {
  const tags = { 11:'× 11 трюк', 9:'× 9 трюк', 5:'× 5 трюк', 25:'× 25 трюк',
                 4:'× 4 трюк',  8:'× 8 трюк',  99:'× 99 трюк', 101:'× 101 trick',
                 111:'× 111 trick', 75:'× 75 trick', 125:'× 125 trick' };
  return tags[v] || 'Умножение';
}

// ===========================================================
// TRICK TAG  (for UI badge)
// ===========================================================

function getTrickTag(a, b, op) {
  if (op === '*') return _pickMulTrick(a, b).tag;
  if (op === '+') {
    const sqA = Math.round(Math.sqrt(a)), sqB = Math.round(Math.sqrt(b));
    if ((sqA * sqA === a && sqA === b && sqA > 1) || (sqB * sqB === b && sqB === a && sqB > 1))
      return 'n² + n трюк';
    if (sqA >= 10 && sqA <= 99 && sqB >= 10 && sqB <= 99 &&
        sqA * sqA === a && sqB * sqB === b) {
      const pU = sqA % 10, pT = Math.floor(sqA / 10);
      const qU = sqB % 10, qT = Math.floor(sqB / 10);
      if ((pU === qT + 1 && pT + qU === 10) || (qU === pT + 1 && qT + pU === 10))
        return 'Сумма квадратов ×101';
    }
    if (String(a).endsWith('9') || String(b).endsWith('9')) return 'Округление +1';
    if (String(a).endsWith('8') || String(b).endsWith('8')) return 'Округление +2';
    return 'Сложение';
  }
  if (op === '-') {
    if (String(b).endsWith('9')) return 'Вычитание 9';
    const sA = String(a), sB = String(b);
    if (sA.length === sB.length && sA.length >= 2 && sA === sB.split('').reverse().join(''))
      return 'Subtracting reverses';
    return 'Вычитание';
  }
  if (op === '/') {
    if (b === 2) return '÷2 trick';
    if (b === 3) return '÷3 trick';
    if (b === 6) return '÷6 trick';
    if (b === 11) return '÷11 trick';
    return 'Деление';
  }
  return null;
}

// ===========================================================
// MAIN ENTRY POINT
// ===========================================================

function getHints(a, b, op, res) {
  if (op === '+') return hintsAdd(a, b, res);
  if (op === '-') return hintsSub(a, b, res);
  if (op === '*') return hintsMul(a, b, res);
  if (op === '/') return hintsDiv(a, b, res);
  return ['Нет подсказок для этой операции.'];
}

// ---- Addition hints ----
function hintsAdd(a, b, res) {
  const steps = [];

  // n² + n = n(n+1) — check FIRST before trivial guard
  const sqrtA = Math.round(Math.sqrt(a)), sqrtB = Math.round(Math.sqrt(b));
  if (sqrtA * sqrtA === a && sqrtA === b && sqrtA > 1) {
    steps.push(_step('{a} = {n}² и {b} = {n}',
      { a: _inp(a), n: _calc(sqrtA), b: _inp(b) }));
    steps.push(_step('{n}² + {n} = {n} × {n1} = {res}',
      { n: _calc(sqrtA), n1: _calc(sqrtA + 1), res: _ans(res) }));
    return { trickName: 'n² + n трюк', steps };
  }
  if (sqrtB * sqrtB === b && sqrtB === a && sqrtB > 1) {
    steps.push(_step('{b} = {n}² и {a} = {n}',
      { b: _inp(b), n: _calc(sqrtB), a: _inp(a) }));
    steps.push(_step('{n}² + {n} = {n} × {n1} = {res}',
      { n: _calc(sqrtB), n1: _calc(sqrtB + 1), res: _ans(res) }));
    return { trickName: 'n² + n трюк', steps };
  }

  // Sum of Squares: p²+q² = (d1²+d2²)×101
  if (sqrtA >= 10 && sqrtA <= 99 && sqrtA * sqrtA === a &&
      sqrtB >= 10 && sqrtB <= 99 && sqrtB * sqrtB === b) {
    const pArr = [[sqrtA, sqrtB], [sqrtB, sqrtA]];
    for (const [p, q] of pArr) {
      const pU = p % 10, pT = Math.floor(p / 10);
      const qU = q % 10, qT = Math.floor(q / 10);
      if (pU === qT + 1 && pT + qU === 10) {
        const sum101 = pT * pT + pU * pU;
        steps.push(_step('{a} = {p}² и {b} = {q}² — специальный случай суммы квадратов',
          { a: _inp(a), p: _calc(p), b: _inp(b), q: _calc(q) }));
        steps.push(_step('Сумма квадратов цифр {pT} и {pU}: {pT}² + {pU}² = {s101}',
          { pT: _calc(pT), pU: _calc(pU), s101: _calc(sum101) }));
        steps.push(_step('{s101} × 101 = {res}',
          { s101: _calc(sum101), res: _ans(res) }));
        return { trickName: 'Сумма квадратов ×101', steps };
      }
    }
  }

  // Trivial: one operand ≤ 10 — no round-up trick needed
  if (Math.min(a, b) <= 10) {
    steps.push(_step('{a} + {b} = {res}',
      { a: _inp(a), b: _inp(b), res: _ans(res) }));
    return { trickName: 'Прямое сложение', steps };
  }

  // Round up trick
  const lastA = a % 10, lastB = b % 10;
  if (lastA >= 7 || lastB >= 7) {
    const which = lastA >= lastB ? a : b;
    const other = which === a ? b : a;
    const round = Math.ceil(which / 10) * 10;
    const diff  = round - which;
    steps.push(_step('Округли {which} → {round} (прибавив {diff})',
      { which: _inp(which), round: _calc(round), diff: _calc(diff) }));
    steps.push(_step('{round} + {other} = {sum}',
      { round: _calc(round), other: _inp(other), sum: _calc(round + other) }));
    steps.push(_step('{sum} − {diff} = {res}',
      { sum: _calc(round + other), diff: _calc(diff), res: _ans(res) }));
    return { trickName: `Округление +${diff}`, steps };
  }

  if (a % 100 !== 0 && b % 100 !== 0 && Math.floor(a / 10) !== Math.floor(b / 10)) {
    const aT = Math.floor(a/10)*10, aU = a%10;
    const bT = Math.floor(b/10)*10, bU = b%10;
    // Build split description without showing "+0"
    const aDesc = aU !== 0 ? `{aT}+{aU}` : `{aT}`;
    const bDesc = bU !== 0 ? `{bT}+{bU}` : `{bT}`;
    steps.push(_step(`Разбей: {a} = ${aDesc}, {b} = ${bDesc}`,
      { a: _inp(a), aT: _calc(aT), aU: _calc(aU), b: _inp(b), bT: _calc(bT), bU: _calc(bU) }));
    steps.push(_step('Десятки: {aT} + {bT} = {sumT}',
      { aT: _calc(aT), bT: _calc(bT), sumT: _calc(aT + bT) }));
    if (aU !== 0 && bU !== 0) {
      steps.push(_step('Единицы: {aU} + {bU} = {sumU}',
        { aU: _calc(aU), bU: _calc(bU), sumU: _calc(aU + bU) }));
    }
    const sumU  = aU + bU;
    const sumT2 = aT + bT;
    if (sumU === 0) {
      steps.push(_step('{sumT} = {res}', { sumT: _calc(sumT2), res: _ans(res) }));
    } else {
      steps.push(_step('{sumT} + {sumU} = {res}',
        { sumT: _calc(sumT2), sumU: _calc(sumU), res: _ans(res) }));
    }
    return { trickName: 'Сложение', steps };
  }

  steps.push(_step('Иди слева направо, начни с больших разрядов', {}));
  steps.push(_step('{a} + {b} = {res}',
    { a: _inp(a), b: _inp(b), res: _ans(res) }));
  return { trickName: 'Сложение', steps };
}

// ---- Subtraction hints ----
function hintsSub(a, b, res) {
  const steps = [];
  let trickName = 'Вычитание';

  // Trivial: a − a = 0
  if (a === b) {
    steps.push(_step('Любое число минус себя равно 0: {a} − {b} = {res}',
      { a: _inp(a), b: _inp(b), res: _ans(0) }));
    return { trickName: 'Тривиальное вычитание', steps };
  }

  // Subtracting reverses — override everything
  const sA = String(Math.max(a, b)), sB = String(Math.min(a, b));
  const isRev = sA.length === sB.length && sA === sB.split('').reverse().join('');
  if (isRev && sA.length === 2) {
    const dA = Math.floor(Math.max(a,b)/10), dB = Math.max(a,b) % 10;
    steps.push(_step('Цифры переставлены → ответ = 9 × (большая − меньшая цифра)',
      {}));
    steps.push(_step('9 × ({dA} − {dB}) = 9 × {diff} = {res}',
      { dA: _inp(dA), dB: _inp(dB), diff: _calc(dA - dB), res: _ans(res) }));
    return { trickName: 'Subtracting reverses', steps };
  }
  if (isRev && sA.length === 3) {
    const fA = parseInt(sA[0]), fB = parseInt(sA[2]);
    steps.push(_step('3-значные перевёртыши → ответ = 99 × (первая − последняя цифра)',
      {}));
    steps.push(_step('99 × ({fA} − {fB}) = 99 × {diff} = {res}',
      { fA: _inp(fA), fB: _inp(fB), diff: _calc(fA - fB), res: _ans(res) }));
    return { trickName: 'Subtracting reverses', steps };
  }
  if (isRev && sA.length === 4 && sA[1] === '0' && sA[2] === '0') {
    const fA = parseInt(sA[0]), fB = parseInt(sA[3]);
    steps.push(_step('Перевёртыши X00Y → ответ = 999 × (первая − последняя цифра)',
      {}));
    steps.push(_step('999 × ({fA} − {fB}) = 999 × {diff} = {res}',
      { fA: _inp(fA), fB: _inp(fB), diff: _calc(fA - fB), res: _ans(res) }));
    return { trickName: 'Subtracting reverses', steps };
  }

  if (b % 10 === 9 || b % 10 === 8 || b % 10 === 7) {
    const round = Math.ceil(b / 10) * 10;
    const diff  = round - b;
    steps.push(_step('Округли вычитаемое {b} → {round}',
      { b: _inp(b), round: _calc(round) }));
    steps.push(_step('{a} − {round} = {sub}',
      { a: _inp(a), round: _calc(round), sub: _calc(a - round) }));
    steps.push(_step('{sub} + {diff} = {res}',
      { sub: _calc(a - round), diff: _calc(diff), res: _ans(res) }));
    trickName = `Вычитание ${b % 10 === 9 ? '9' : b % 10 === 8 ? '8' : '7'}`;
  } else if (b % 10 === 0) {
    steps.push(_step('Вычитание кратного 10 — уменьши нужный разряд', {}));
    steps.push(_step('{a} − {b} = {res}',
      { a: _inp(a), b: _inp(b), res: _ans(res) }));
  } else if (b % 10 !== 0 && b % 10 <= a % 10) {
    // No borrowing needed — split subtrahend into tens and units
    const bT = Math.floor(b / 10) * 10, bU = b % 10;
    const mid = a - bT;
    steps.push(_step('{a} − {bT} = {mid}',
      { a: _inp(a), bT: _calc(bT), mid: _calc(mid) }));
    steps.push(_step('{mid} − {bU} = {res}',
      { mid: _calc(mid), bU: _calc(bU), res: _ans(res) }));
    trickName = 'Вычитание';
  } else {
    const toRound = Math.ceil(b / 10) * 10;
    steps.push(_step('Метод дополнения: от {b} до {toRound} = {step1}',
      { b: _inp(b), toRound: _calc(toRound), step1: _calc(toRound - b) }));
    steps.push(_step('От {toRound} до {a} = {step2}',
      { toRound: _calc(toRound), a: _inp(a), step2: _calc(a - toRound) }));
    steps.push(_step('{step1} + {step2} = {res}',
      { step1: _calc(toRound - b), step2: _calc(a - toRound), res: _ans(res) }));
    trickName = 'Метод дополнения';
  }

  // Difference of squares bonus
  const sqA = Math.round(Math.sqrt(Math.max(a, b)));
  const sqB = Math.round(Math.sqrt(Math.min(a, b)));
  if (sqA * sqA === Math.max(a, b) && sqB * sqB === Math.min(a, b) && sqA !== sqB) {
    steps.push(_step('{big} = {sqA}², {small} = {sqB}² → (a+b)(a−b)',
      { big: _inp(Math.max(a,b)), sqA: _calc(sqA), small: _inp(Math.min(a,b)), sqB: _calc(sqB) }));
    steps.push(_step('({sqA} + {sqB}) × ({sqA} − {sqB}) = {sum} × {dif} = {res}',
      { sqA: _calc(sqA), sqB: _calc(sqB),
        sum: _calc(sqA + sqB), dif: _calc(sqA - sqB), res: _ans(res) }));
    trickName = 'Разность квадратов';
  }

  return { trickName, steps };
}

// ===========================================================
// MULTIPLICATION HINTS  →  { trickName, steps: [{text, numbers}] }
// ===========================================================

function hintsMul(a, b, res) {
  const steps = [];
  const [big, small] = a >= b ? [a, b] : [b, a];
  const trick = _pickMulTrick(a, b);

  const id  = trick.id;
  const ov  = trick.other; // non-special operand for special-multiplier tricks

  // ------------------------------------------------------------------
  // SPECIAL MULTIPLIERS (structural)
  // ------------------------------------------------------------------
  if (id === '11') {
    if (ov < 100) {
      const d1 = Math.floor(ov / 10), d2 = ov % 10;
      const mid = d1 + d2;
      steps.push(_step('Трюк ×{v}: запиши {d1} | {mid} | {d2}',
        { v: _inp(11), d1: _inp(d1), mid: _calc(mid), d2: _inp(d2) }));
      if (mid >= 10) {
        steps.push(_step('Сумма цифр {mid} ≥ 10, перенеси единицу: результат {res}',
          { mid: _calc(mid), res: _ans(res) }));
      } else {
        steps.push(_step('Результат: {d1}{mid}{d2} = {res}',
          { d1: _inp(d1), mid: _calc(mid), d2: _inp(d2), res: _ans(res) }));
      }
    } else {
      const shifted = ov * 10;
      steps.push(_step('×11 = ×10 + ×1: {ov}×10 = {shifted}',
        { ov: _inp(ov), shifted: _calc(shifted) }));
      steps.push(_step('{shifted} + {ov} = {res}',
        { shifted: _calc(shifted), ov: _inp(ov), res: _ans(res) }));
    }
    return { trickName: '× 11 трюк', steps };
  }

  if (id === '9') {
    const t10 = ov * 10;
    steps.push(_step('×9 = ×10 − ×1. Сначала: {ov} × 10 = {t10}',
      { ov: _inp(ov), t10: _calc(t10) }));
    steps.push(_step('{t10} − {ov} = {res}',
      { t10: _calc(t10), ov: _inp(ov), res: _ans(res) }));
    return { trickName: '× 9 трюк', steps };
  }

  if (id === '5') {
    const t10 = ov * 10;
    steps.push(_step('×5 = ×10 ÷ 2. Сначала: {ov} × 10 = {t10}',
      { ov: _inp(ov), t10: _calc(t10) }));
    steps.push(_step('{t10} ÷ 2 = {res}',
      { t10: _calc(t10), res: _ans(res) }));
    return { trickName: '× 5 трюк', steps };
  }

  if (id === '25') {
    const t100 = ov * 100;
    steps.push(_step('×25 = ×100 ÷ 4. Сначала: {ov} × 100 = {t100}',
      { ov: _inp(ov), t100: _calc(t100) }));
    steps.push(_step('{t100} ÷ 4 = {res}',
      { t100: _calc(t100), res: _ans(res) }));
    return { trickName: '× 25 трюк', steps };
  }

  if (id === '4') {
    const d1 = ov * 2, d2 = d1 * 2;
    steps.push(_step('×4 = удвой дважды: {ov} × 2 = {d1}',
      { ov: _inp(ov), d1: _calc(d1) }));
    steps.push(_step('{d1} × 2 = {res}',
      { d1: _calc(d1), res: _ans(d2) }));
    return { trickName: '× 4 трюк', steps };
  }

  if (id === '8') {
    const d1 = ov * 2, d2 = d1 * 2, d3 = d2 * 2;
    steps.push(_step('×8 = удвой трижды: {ov} × 2 = {d1}',
      { ov: _inp(ov), d1: _calc(d1) }));
    steps.push(_step('{d1} × 2 = {d2}',
      { d1: _calc(d1), d2: _calc(d2) }));
    steps.push(_step('{d2} × 2 = {res}',
      { d2: _calc(d2), res: _ans(d3) }));
    return { trickName: '× 8 трюк', steps };
  }

  if (id === '99') {
    const t100 = ov * 100;
    steps.push(_step('×99 = ×100 − ×1: {ov} × 100 = {t100}',
      { ov: _inp(ov), t100: _calc(t100) }));
    steps.push(_step('{t100} − {ov} = {res}',
      { t100: _calc(t100), ov: _inp(ov), res: _ans(res) }));
    return { trickName: '× 99 трюк', steps };
  }

  if (id === '101') {
    const t100 = ov * 100;
    steps.push(_step('×101 = ×100 + ×1: {ov} × 100 = {t100}',
      { ov: _inp(ov), t100: _calc(t100) }));
    steps.push(_step('{t100} + {ov} = {res}',
      { t100: _calc(t100), ov: _inp(ov), res: _ans(res) }));
    return { trickName: '× 101 trick', steps };
  }

  if (id === '111') {
    const t100 = ov * 100, t10 = ov * 10;
    steps.push(_step('111 = 100 + 10 + 1: {ov} × 100 = {t100}, × 10 = {t10}',
      { ov: _inp(ov), t100: _calc(t100), t10: _calc(t10) }));
    steps.push(_step('{t100} + {t10} + {ov} = {res}',
      { t100: _calc(t100), t10: _calc(t10), ov: _inp(ov), res: _ans(res) }));
    return { trickName: '× 111 trick', steps };
  }

  if (id === '75') {
    const quarter = ov / 4, threeQ = quarter * 3;
    steps.push(_step('×75 = ×100 × 3/4. Делим {ov} на 4: {quarter}',
      { ov: _inp(ov), quarter: _calc(quarter) }));
    steps.push(_step('{quarter} × 3 = {threeQ}',
      { quarter: _calc(quarter), threeQ: _calc(threeQ) }));
    steps.push(_step('{threeQ} × 100 = {res}',
      { threeQ: _calc(threeQ), res: _ans(res) }));
    return { trickName: '× 75 trick', steps };
  }

  if (id === '125') {
    const eighth = ov / 8;
    steps.push(_step('×125 = ×1000 ÷ 8. Делим {ov} на 8: {eighth}',
      { ov: _inp(ov), eighth: _calc(eighth) }));
    steps.push(_step('{eighth} × 1000 = {res}',
      { eighth: _calc(eighth), res: _ans(res) }));
    return { trickName: '× 125 trick', steps };
  }

  // ------------------------------------------------------------------
  // PATTERN TRICKS (structural)
  // ------------------------------------------------------------------
  if (id === 'sameTens') {
    const lead = Math.floor(a / 10);
    const uA = a % 10, uB = b % 10;
    const lastPart = String(uA * uB).padStart(2, '0');
    const firstPart = lead * (lead + 1);
    steps.push(_step('Одинаковые десятки {lead}, единицы {uA} + {uB} = 10',
      { lead: _inp(lead), uA: _inp(uA), uB: _inp(uB) }));
    steps.push(_step('Последние 2 цифры: {uA} × {uB} = {last}',
      { uA: _inp(uA), uB: _inp(uB), last: _calc(Number(lastPart)) }));
    steps.push(_step('Первая часть: {lead} × {lead1} = {first}',
      { lead: _inp(lead), lead1: _calc(lead + 1), first: _calc(firstPart) }));
    steps.push(_step('Ответ: {first}{last} = {res}',
      { first: _calc(firstPart), last: _calc(Number(lastPart)), res: _ans(res) }));
    return { trickName: 'Same tens, units sum to 10', steps };
  }

  if (id === 'bothEnd5') {
    const leadA = Math.floor(big / 10), leadB = Math.floor(small / 10);
    const sumLeads = leadA + leadB;
    const lastTwo = sumLeads % 2 === 0 ? 25 : 75;
    const firstPart = leadA * leadB + Math.floor(sumLeads / 2);
    steps.push(_step('Оба числа оканчиваются на 5. Последние 2 цифры: {last}',
      { last: _calc(lastTwo) }));
    steps.push(_step('{leadA} × {leadB} + ⌊{sum}/2⌋ = {prod} + {half} = {first}',
      { leadA: _inp(leadA), leadB: _inp(leadB), sum: _calc(sumLeads),
        prod: _calc(leadA * leadB), half: _calc(Math.floor(sumLeads / 2)), first: _calc(firstPart) }));
    steps.push(_step('Ответ: {first}{last} = {res}',
      { first: _calc(firstPart), last: _calc(lastTwo), res: _ans(res) }));
    return { trickName: 'Both end in 5', steps };
  }

  if (id === 'sqEnd5') {
    const n = a;
    const leading = Math.floor(n / 10);
    const firstPart = leading * (leading + 1);
    steps.push(_step('Квадрат числа, оканчивающегося на 5: последние 2 цифры всегда {last}',
      { last: _calc(25) }));
    steps.push(_step('Цифры перед 5: {lead}. {lead} × {lead1} = {first}',
      { lead: _inp(leading), lead1: _calc(leading + 1), first: _calc(firstPart) }));
    steps.push(_step('Ответ: {first}25 = {res}',
      { first: _calc(firstPart), res: _ans(res) }));
    return { trickName: 'Squares ending in 5', steps };
  }

  if (id === 'sq4159') {
    const n = a;
    const k = Math.abs(n - 50);
    const hundreds = 25 + (n >= 50 ? k : -k);
    const onesRaw = k * k;
    const onesPad = String(onesRaw).padStart(2, '0');
    steps.push(_step('Расстояние от 50: k = {k}',
      { k: _calc(k) }));
    steps.push(_step('Первые цифры: 25 {sign} {k} = {hundreds}',
      { sign: { value: n >= 50 ? '+' : '−', type: 'calc' }, k: _calc(k), hundreds: _calc(hundreds) }));
    steps.push(_step('Последние 2 цифры: k² = {k}² = {last}',
      { k: _calc(k), last: _calc(onesRaw) }));
    steps.push(_step('Ответ: {hundreds}{last} = {res}',
      { hundreds: _calc(hundreds), last: _calc(Number(onesPad)), res: _ans(res) }));
    return { trickName: 'Squares 41–59', steps };
  }

  if (id === 'sqGeneric') {
    const n = a;
    const r = Math.round(n / 10) * 10;
    const d = n - r;
    steps.push(_step('Квадрат: ({r}{sign}{d})² = {r}² {sign2} 2·{r}·{d} + {d}²',
      { r: _calc(r), d: _calc(Math.abs(d)),
        sign:  { value: d >= 0 ? '+' : '−', type: 'calc' },
        sign2: { value: d >= 0 ? '+' : '−', type: 'calc' } }));
    const rSq = r * r, cross = 2 * r * Math.abs(d), dSq = d * d;
    steps.push(_step('{rSq} {sign} {cross} + {dSq} = {res}',
      { rSq: _calc(rSq), cross: _calc(cross), dSq: _calc(dSq),
        sign: { value: d >= 0 ? '+' : '−', type: 'calc' }, res: _ans(res) }));
    return { trickName: 'Квадрат числа', steps };
  }

  if (id === 'mul10') {
    if (a === b) {
      // squaring a multiple of 10
      const base = big / 10;
      steps.push(_step('{big} = {base} × 10, значит {big}² = {base}² × 100',
        { big: _inp(big), base: _calc(base) }));
      steps.push(_step('{base}² = {bsq}, × 100 = {res}',
        { base: _calc(base), bsq: _calc(base * base), res: _ans(res) }));
    } else {
      const nonRound = a % 10 === 0 ? b : a;
      const round    = a % 10 === 0 ? a : b;
      const zeros    = String(round).match(/0+$/)[0].length;
      const factor   = round / Math.pow(10, zeros);
      const partial  = nonRound * factor;
      steps.push(_step('{round} = {factor} × {pow10}: {nonRound} × {factor} = {partial}',
        { round: _inp(round), factor: _calc(factor),
          pow10: _calc(Math.pow(10, zeros)), nonRound: _inp(nonRound), partial: _calc(partial) }));
      steps.push(_step('{partial} × {pow10} = {res}',
        { partial: _calc(partial), pow10: _calc(Math.pow(10, zeros)), res: _ans(res) }));
    }
    return { trickName: 'Умножение на кратное 10', steps };
  }

  // ------------------------------------------------------------------
  // TRANSFORMATIONAL TRICKS
  // ------------------------------------------------------------------
  if (id === 'equidistant') {
    const { mid, d } = trick;
    const midSq = mid * mid, dSq = d * d;
    steps.push(_step('Оба числа равноудалены от {mid} (на {d}): {a} × {b} = {mid}² − {d}²',
      { mid: _calc(mid), d: _calc(d), a: _inp(a), b: _inp(b) }));
    steps.push(_step('{mid}² = {midSq}',
      { mid: _calc(mid), midSq: _calc(midSq) }));
    steps.push(_step('{d}² = {dSq}',
      { d: _calc(d), dSq: _calc(dSq) }));
    steps.push(_step('{midSq} − {dSq} = {res}',
      { midSq: _calc(midSq), dSq: _calc(dSq), res: _ans(res) }));
    return { trickName: 'Equidistant from midpoint', steps };
  }

  if (id === 'nearDecade') {
    const { roundBase: rb, roundDiff: rd } = trick;
    const absDiff       = Math.abs(rd);
    const bigTimesRound = big * rb;
    const bigTimesDiff  = big * absDiff;
    if (rd < 0) {
      // rounded UP (rb > small) → subtract back
      steps.push(_step('Заменяем {small} на удобное {rb} — это на {absDiff} больше',
        { small: _inp(small), rb: _calc(rb), absDiff: _calc(absDiff) }));
      steps.push(_step('{big} × {rb} = {part}',
        { big: _inp(big), rb: _calc(rb), part: _calc(bigTimesRound) }));
      steps.push(_step('{big} × {absDiff} = {adj} — это лишнее, которое надо вычесть',
        { big: _inp(big), absDiff: _calc(absDiff), adj: _calc(bigTimesDiff) }));
      steps.push(_step('{part} − {adj} = {res}',
        { part: _calc(bigTimesRound), adj: _calc(bigTimesDiff), res: _ans(res) }));
    } else {
      // rounded DOWN (rb < small) → add back
      steps.push(_step('Заменяем {small} на удобное {rb} — это на {absDiff} меньше',
        { small: _inp(small), rb: _calc(rb), absDiff: _calc(absDiff) }));
      steps.push(_step('{big} × {rb} = {part}',
        { big: _inp(big), rb: _calc(rb), part: _calc(bigTimesRound) }));
      steps.push(_step('{big} × {absDiff} = {adj} — это недостающее, которое надо прибавить',
        { big: _inp(big), absDiff: _calc(absDiff), adj: _calc(bigTimesDiff) }));
      steps.push(_step('{part} + {adj} = {res}',
        { part: _calc(bigTimesRound), adj: _calc(bigTimesDiff), res: _ans(res) }));
    }
    return { trickName: 'Округление при ×', steps };
  }

  if (id === 'reverses') {
    const d1 = Math.floor(big / 10), d2 = big % 10;
    const prod = d1 * d2;
    const sumSq = d1 * d1 + d2 * d2;
    steps.push(_step('Цифры чисел переставлены: {big} и {small}. Произведение цифр: {d1} × {d2} = {prod}',
      { big: _inp(big), small: _inp(small), d1: _calc(d1), d2: _calc(d2), prod: _calc(prod) }));
    steps.push(_step('Сумма квадратов цифр: {d1}² + {d2}² = {sumSq}',
      { d1: _calc(d1), d2: _calc(d2), sumSq: _calc(sumSq) }));
    steps.push(_step('Собери с переносами: {res}',
      { res: _ans(res) }));
    return { trickName: 'Multiplying reverses', steps };
  }

  if (id === 'indirect') {
    const { other, f1, f2, mid, mulN } = trick;
    const SPECIAL_F = new Set([9, 25, 99, 4, 5, 8, 11, 101, 111, 75, 125]);
    // Step 1: first factor
    steps.push(_step('{other} × {f1} = {mid}',
      { other: _inp(other), f1: _inp(f1), mid: _calc(mid) }));
    // Step 2: if f2 is a plain small number (≤12, not a SPECIAL trick), just show one direct step;
    //         otherwise recurse so the SPECIAL trick for f2 (e.g. ×11, ×9) gets applied.
    if (f2 <= 12 && !SPECIAL_F.has(f2)) {
      steps.push(_step('{mid} × {f2} = {res}',
        { mid: _calc(mid), f2: _inp(f2), res: _ans(res) }));
    } else {
      const sub = hintsMul(mid, f2, res);
      for (const s of sub.steps) steps.push(s);
    }
    return { trickName: `× ${mulN} = × ${f1} × ${f2}`, steps };
  }

  if (id === 'nearBase') {
    const { base, da, db } = trick;
    const crossSum = a + db;       // = b + da
    const prod1 = crossSum * base;
    const prod2 = da * db;
    const fmtDev = v => v >= 0 ? `+${v}` : `−${Math.abs(v)}`;
    steps.push(_step(`Замечаем: {a} = {base} ${fmtDev(da)}, {b} = {base} ${fmtDev(db)}`,
      { a: _inp(a), base: _calc(base), b: _inp(b) }));
    steps.push(_step('Вычитаем отклонение второго числа из первого: {a} {sign_db} = {cross}, {cross} × {base} = {prod1}',
      { a: _inp(a), sign_db: { value: fmtDev(db), type: 'calc' }, base: _calc(base),
        cross: _calc(crossSum), prod1: _calc(prod1) }));
    steps.push(_step('Поправка: {da} × {db} = {prod2}',
      { da: { value: da, type: 'calc' }, db: { value: db, type: 'calc' }, prod2: _calc(prod2) }));
    steps.push(_step('{prod1} {sign} {absProd2} = {res}',
      { prod1: _calc(prod1),
        sign: { value: prod2 >= 0 ? '+' : '−', type: 'calc' },
        absProd2: _calc(Math.abs(prod2)), res: _ans(res) }));
    return { trickName: base === 100 ? 'Near 100 trick' : `Near ${base} trick`, steps };
  }

  if (id === 'doubleHalf') {
    const { evenNum, oddNum, ns, nb } = trick;
    steps.push(_step('Double & Half: {evenNum} ÷ 2 = {ns}, {oddNum} × 2 = {nb}',
      { evenNum: _inp(evenNum), ns: _calc(ns), oddNum: _inp(oddNum), nb: _calc(nb) }));
    steps.push(_step('{ns} × {nb} = {res}',
      { ns: _calc(ns), nb: _calc(nb), res: _ans(res) }));
    return { trickName: 'Double & Half', steps };
  }

  // ------------------------------------------------------------------
  // GENERIC fallback
  // ------------------------------------------------------------------
  const sT = Math.floor(small / 10) * 10, sU = small % 10;
  if (sT > 0 && sU > 0) {
    const p1 = big * sT, p2 = big * sU;
    steps.push(_step('Разбей {small} = {sT} + {sU}',
      { small: _inp(small), sT: _calc(sT), sU: _calc(sU) }));
    steps.push(_step('{big} × {sT} = {p1}',
      { big: _inp(big), sT: _calc(sT), p1: _calc(p1) }));
    steps.push(_step('{big} × {sU} = {p2}',
      { big: _inp(big), sU: _calc(sU), p2: _calc(p2) }));
    steps.push(_step('{p1} + {p2} = {res}',
      { p1: _calc(p1), p2: _calc(p2), res: _ans(res) }));
  } else {
    steps.push(_step('{a} × {b} = {res}',
      { a: _inp(a), b: _inp(b), res: _ans(res) }));
  }
  return { trickName: 'Умножение', steps };
}


// ---- Division hints ----
function hintsDiv(a, b, res) {
  if (b === 0) return { trickName: 'Деление', steps: [_step('На ноль делить нельзя!', {})] };
  const steps = [];

  if (b === 10) {
    steps.push(_step('÷10: убери один ноль справа: {a} ÷ 10 = {res}',
      { a: _inp(a), res: _ans(res) }));
    return { trickName: '÷10 trick', steps };
  }

  if (b === 100) {
    steps.push(_step('÷100: убери два ноля справа: {a} ÷ 100 = {res}',
      { a: _inp(a), res: _ans(res) }));
    return { trickName: '÷100 trick', steps };
  }

  if (b === 5) {
    steps.push(_step('÷5 = ×2 ÷ 10: {a} × 2 = {t2}',
      { a: _inp(a), t2: _calc(a * 2) }));
    steps.push(_step('{t2} ÷ 10 = {res}',
      { t2: _calc(a * 2), res: _ans(res) }));
    return { trickName: '÷5 trick', steps };
  }

  if (b === 2) {
    if (a % 2 === 0) {
      steps.push(_step('{a} чётное — делим напрямую: {a} ÷ 2 = {res}',
        { a: _inp(a), res: _ans(res) }));
    } else {
      const fl = Math.floor(a / 2);
      steps.push(_step('{a} нечётное: ({a} − 1) ÷ 2 = {fl}',
        { a: _inp(a), fl: _calc(fl) }));
      steps.push(_step('{fl} + 0.5 = {res}',
        { fl: _calc(fl), res: _ans(res) }));
    }
    return { trickName: '÷2 trick', steps };
  }

  if (b === 3) {
    const digitSum = String(a).split('').reduce((s, c) => s + parseInt(c), 0);
    const digitsStr = String(a).split('').join(' + ');
    steps.push(_step('Сумма цифр {a}: {digs} = {ds}',
      { a: _inp(a), digs: { value: digitsStr, type: 'calc' }, ds: _calc(digitSum) }));
    if (digitSum % 3 === 0) {
      steps.push(_step('{ds} делится на 3 ✓ → {a} ÷ 3 = {res}',
        { ds: _calc(digitSum), a: _inp(a), res: _ans(res) }));
    } else {
      steps.push(_step('{ds} даёт остаток {rem} при делении на 3 → {a} ÷ 3 = {res}',
        { ds: _calc(digitSum), rem: _calc(digitSum % 3), a: _inp(a), res: _ans(formatNum(res)) }));
    }
    return { trickName: '÷3 trick', steps };
  }

  if (b === 11) {
    const digits = String(a).split('').map(Number);
    let altSum = 0;
    for (let i = 0; i < digits.length; i++)
      altSum += (i % 2 === 0) ? digits[digits.length - 1 - i] : -digits[digits.length - 1 - i];
    const rem11 = ((altSum % 11) + 11) % 11;
    const digStr = digits.map((d, i) => {
      const pos = digits.length - 1 - i;
      return pos % 2 === 0 ? `+${d}` : `−${d}`;
    }).join(' ');
    steps.push(_step('Знакочередующаяся сумма цифр {a}: {digs} = {alt}',
      { a: _inp(a), digs: { value: digStr, type: 'calc' }, alt: _calc(altSum) }));
    if (rem11 === 0) {
      steps.push(_step('{alt} делится на 11 ✓ → {a} ÷ 11 = {res}',
        { alt: _calc(altSum), a: _inp(a), res: _ans(formatNum(res)) }));
    } else {
      steps.push(_step('Остаток {rem} → {a} ÷ 11 = {res}',
        { rem: _calc(rem11), a: _inp(a), res: _ans(formatNum(res)) }));
    }
    return { trickName: '÷11 trick', steps };
  }

  if (b === 6) {
    const isEven = a % 2 === 0;
    const ds6 = String(a).split('').reduce((s, c) => s + parseInt(c), 0);
    const div3 = ds6 % 3 === 0;
    steps.push(_step('÷6 = проверь делимость на 2 и на 3', {}));
    steps.push(_step('На 2: {a} оканчивается на {last} — {even}',
      { a: _inp(a), last: _calc(a % 10),
        even: { value: isEven ? 'чётное ✓' : 'нечётное ✗', type: 'calc' } }));
    steps.push(_step('На 3: сумма цифр = {ds} — {ok}',
      { ds: _calc(ds6),
        ok: { value: div3 ? 'делится ✓' : `остаток ${ds6 % 3}`, type: 'calc' } }));
    steps.push(_step('{a} ÷ 6 = {res}',
      { a: _inp(a), res: _ans(formatNum(res)) }));
    return { trickName: '÷6 trick', steps };
  }

  if (b === 4) {
    const half1 = a / 2, half2 = half1 / 2;
    steps.push(_step('÷4 = ÷2 ÷2: {a} ÷ 2 = {h1}',
      { a: _inp(a), h1: _calc(half1) }));
    steps.push(_step('{h1} ÷ 2 = {res}',
      { h1: _calc(half1), res: _ans(res) }));
    return { trickName: 'Деление', steps };
  }

  if (b === 8) {
    const h1 = a / 2, h2 = h1 / 2, h3 = h2 / 2;
    steps.push(_step('÷8 = ÷2 ÷2 ÷2: {a} ÷ 2 = {h1}',
      { a: _inp(a), h1: _calc(h1) }));
    steps.push(_step('{h1} ÷ 2 = {h2}',
      { h1: _calc(h1), h2: _calc(h2) }));
    steps.push(_step('{h2} ÷ 2 = {res}',
      { h2: _calc(h2), res: _ans(res) }));
    return { trickName: 'Деление', steps };
  }

  if (b === 25) {
    const t4 = a * 4;
    steps.push(_step('÷25 = ×4 ÷ 100: {a} × 4 = {t4}',
      { a: _inp(a), t4: _calc(t4) }));
    steps.push(_step('{t4} ÷ 100 = {res}',
      { t4: _calc(t4), res: _ans(res) }));
    return { trickName: 'Деление', steps };
  }

  if (b === 9) {
    const ds9 = String(a).split('').reduce((s, c) => s + parseInt(c), 0);
    steps.push(_step('Делимость на 9: сумма цифр {a} = {ds}',
      { a: _inp(a), ds: _calc(ds9) }));
    steps.push(_step('{ds} {ok} → {a} ÷ 9 = {res}',
      { ds: _calc(ds9),
        ok: { value: ds9 % 9 === 0 ? 'делится на 9 ✓' : 'не делится нацело', type: 'calc' },
        a: _inp(a), res: _ans(formatNum(res)) }));
    return { trickName: 'Деление', steps };
  }

  if (Number.isInteger(res)) {
    steps.push(_step('{b} × ? = {a}', { b: _inp(b), a: _inp(a) }));
    steps.push(_step('? = {res}', { res: _ans(res) }));
  } else {
    const int = Math.floor(a / b);
    const rem = a - int * b;
    steps.push(_step('Целая часть: {a} ÷ {b} ≈ {int}',
      { a: _inp(a), b: _inp(b), int: _calc(int) }));
    if (rem) steps.push(_step('Остаток {rem} → {rem}/{b}',
      { rem: _calc(rem), b: _inp(b) }));
    steps.push(_step('Ответ: {res}', { res: _ans(formatNum(res)) }));
  }
  return { trickName: 'Деление', steps };
}

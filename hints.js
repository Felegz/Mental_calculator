// ---- Mental Math Hints Engine ----

// ---- Scoring for special-multiplier rules ----
// Returns estimated mental complexity: lower = easier.
// = base_steps + max_intermediate_magnitude / 1000 + remainder_penalty
function _mulRuleCost(other, rule) {
  switch (rule) {
    // ×11 trick only makes sense for 2+-digit others (single-digit: "0|d|d" display is nonsensical)
    case 11: return other < 10 ? 99 : (other < 100 ? 1.0 : 2.0);
    // ×10 is trivial; one real step: subtract. Tiny magnitude penalty.
    case 9:  return 1.0 + other / 10000;
    // ×10 then ÷2. Extra 0.3 if other is odd (half result).
    case 5:  return 1.0 + (other % 2 !== 0 ? 0.3 : 0) + other / 10000;
    // ×100 trivial, then ÷4 (=÷2÷2): 2 real steps. Extra 0.5 if not cleanly divisible.
    case 25: return 2.0 + (other % 4 !== 0 ? 0.5 : 0) + other / 10000;
    // Double twice: 2 steps.
    case 4:  return 2.0 + other / 10000;
    // Double thrice: 3 steps.
    case 8:  return 3.0 + other / 10000;
    default: return 99;
  }
}

// Estimated cost of squaring n (used inside equidistant cost).
function _squareCost(n) {
  if (n % 10 === 0) return 0.5;        // trivial shift
  if (n % 10 === 5) return 1.0;        // ends-in-5 trick
  if (n >= 41 && n <= 59) return 1.5;  // 41-59 trick
  return 2.0 + n / 100;               // generic deviation
}

// Returns array of ALL applicable tricks with {id, tag, other?, cost} for a×b.
function _mulAllCandidates(a, b) {
  if (a === b) return [];
  const [big, small] = a >= b ? [a, b] : [b, a];
  const C = [];

  // Small special multipliers
  const specLabels = {11:'× 11 трюк', 9:'× 9 трюк', 5:'× 5 трюк', 25:'× 25 трюк', 4:'× 4 трюк', 8:'× 8 трюк'};
  for (const v of [11, 9, 5, 25, 4, 8]) {
    if (a === v || b === v) {
      const other = (a === v ? b : a);
      C.push({id: String(v), tag: specLabels[v], other, cost: _mulRuleCost(other, v)});
    }
  }

  // Large special multipliers
  // ×99: other×100 − other; ×100 is trivial, one real subtraction step.
  if (a === 99 || b === 99)  { const o=a===99?b:a;  C.push({id:'99',  tag:'× 99 трюк',      other:o, cost:1.5+(o>99?0.5:0)+o/10000}); }
  // ×101: other×100 + other; same structure.
  if (a === 101 || b === 101){ const o=a===101?b:a; C.push({id:'101', tag:'× 101 trick',     other:o, cost:1.5+(o>99?0.5:0)+o/10000}); }
  // ×111: 3 trivial shifts then add three values; moderate.
  if (a === 111 || b === 111){ const o=a===111?b:a; C.push({id:'111', tag:'× 111 trick',     other:o, cost:2.0+(o>99?0.5:0)+o/10000}); }
  // ×75: ÷4×3×100; ÷4 and ×3 are the real steps. Penalty if not divisible by 4.
  if (a === 75  || b === 75) { const o=a===75?b:a;  C.push({id:'75',  tag:'× 75 trick',      other:o, cost:2.5+(o%4!==0?1.0:0)+o/10000}); }
  // ×125: ÷8×1000; ÷8 = three halvings. Penalty if not divisible by 8.
  if (a === 125 || b === 125){ const o=a===125?b:a; C.push({id:'125', tag:'× 125 trick',     other:o, cost:2.0+(o%8!==0?1.0:0)+o/10000}); }

  // Pattern tricks
  // Same tens, units sum to 10: lead×(lead+1) | units×units. Harder for larger lead.
  if (Math.floor(a/10)===Math.floor(b/10) && (a%10)+(b%10)===10) {
    const lead = Math.floor(a/10);
    C.push({id:'same-tens', tag:'Same tens, units sum to 10', cost:2.0+lead*lead/100});
  }
  // Near 100: 2 steps. Difficulty scales with deviation product.
  if (Math.abs(a-100)<=10 && Math.abs(b-100)<=10) {
    C.push({id:'near-100', tag:'Near 100 trick', cost:2.0+Math.abs((a-100)*(b-100))/100});
  }
  // Both end in 5: fixed formula, moderate difficulty.
  if (a%10===5 && b%10===5) {
    C.push({id:'both-end-5', tag:'Both end in 5', cost:2.5});
  }
  // Double & Half: halve + double, then still multiply two numbers.
  if ((big%10===5&&small%2===0)||(small%10===5&&big%2===0)) {
    C.push({id:'double-half', tag:'Double & Half', cost:3.0});
  }
  // Multiplying reverses: 3-step formula.
  if (a>=10&&a<=99&&b>=10&&b<=99&&String(a).split('').reverse().join('')===String(b)) {
    C.push({id:'reverses', tag:'Multiplying reverses', cost:3.0});
  }
  // Near-decade: round to decade ± adjust. |rd|=1 is easy; |rd|=2 costs more to stay above ×8.
  const _rb = Math.round(small/10)*10, _rd = small-_rb;
  if (_rb>0 && Math.abs(_rd)<=2 && _rd!==0 && Math.abs(a-b)>10) {
    C.push({id:'near-decade', tag:'Округление при ×', cost:1.5+Math.abs(_rd)*0.8+big*_rb/10000});
  }
  // Equidistant from midpoint: mid² − d². Cost depends on how easy mid² is.
  if ((a+b)%2===0) {
    const mid=(a+b)/2, d=Math.abs(mid-a);
    C.push({id:'equidistant', tag:'Equidistant from midpoint', cost:2.0+_squareCost(mid)+d*d/100});
  }
  // Multiple of 10: trivial.
  if (small%10===0) {
    C.push({id:'mul-10', tag:'Умножение', cost:0.5});
  }
  // Fallback.
  C.push({id:'generic', tag:'Умножение', cost:5.0});
  return C;
}

// Returns the single best trick {id, tag, other?} for a×b.
function _bestMulTrick(a, b) {
  if (a === b) {
    const n = a;
    if (n%10===5) return {id:'sq-end-5', tag:'Squares ending in 5', cost:_squareCost(n)};
    if (n>=41&&n<=59) return {id:'sq-4159', tag:'Squares 41–59', cost:_squareCost(n)};
    return {id:'sq-generic', tag:'Квадрат числа', cost:_squareCost(n)};
  }
  return _mulAllCandidates(a, b).reduce((best, c) => c.cost < best.cost ? c : best);
}

function formatNum(n) {
  const s = parseFloat(n.toFixed(8));
  return s.toLocaleString('ru');
}

// Returns true when x×y is non-trivial enough to warrant a sub-hint.
function _isNonTrivialMul(x, y) {
  if (Math.min(x, y) < 10) return false;      // single-digit factor
  if (Math.min(x, y) % 10 === 0) return false; // ×10, ×20, etc. trivial
  const trick = _bestMulTrick(x, y);
  return trick.cost >= 1.5; // exclude ×11/×9/×5 (cost 1.0)
}

// Returns a sub-hint object {sub, label, steps} or null.
// depth > 0 prevents recursion beyond one level.
function _subHint(x, y, depth) {
  if (depth > 0) return null;
  if (!_isNonTrivialMul(x, y)) return null;
  const subRes = x * y;
  return {
    sub: true,
    label: `Как посчитать ${x} × ${y}:`,
    steps: hintsMul(x, y, subRes, 1) // depth=1 inside sub
  };
}

function getTrickTag(a, b, op) {
  if (op === '*') {
    return _bestMulTrick(a, b).tag;
  }
  if (op === '+') {
    const _sqA = Math.round(Math.sqrt(a)), _sqB = Math.round(Math.sqrt(b));
    if ((_sqA * _sqA === a && _sqA === b && _sqA > 1) || (_sqB * _sqB === b && _sqB === a && _sqB > 1)) return 'n² + n трюк';
    const _sA = String(a), _sB = String(b);
    const _sqC = Math.round(Math.sqrt(a)), _sqD = Math.round(Math.sqrt(b));
    if (_sqC >= 10 && _sqC <= 99 && _sqD >= 10 && _sqD <= 99 &&
        _sqC * _sqC === a && _sqD * _sqD === b &&
        ((_sqC % 10 === Math.floor(_sqD / 10) + 1 && Math.floor(_sqC / 10) + _sqD % 10 === 10) ||
         (_sqD % 10 === Math.floor(_sqC / 10) + 1 && Math.floor(_sqD / 10) + _sqC % 10 === 10))) {
      return 'Сумма квадратов ×101';
    }
    if (String(a).endsWith('9') || String(b).endsWith('9')) return 'Округление +1';
    if (String(a).endsWith('8') || String(b).endsWith('8')) return 'Округление +2';
    return 'Сложение';
  }
  if (op === '-') {
    if (String(b).endsWith('9')) return 'Вычитание 9';
    const sA = String(a), sB = String(b);
    if (sA.length === sB.length && sA.length >= 2 && sA === sB.split('').reverse().join('')) return 'Subtracting reverses';
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

function isSquare(a, b) { 
  return a === b; 
}

function getHints(a, b, op, res, depth = 0) {
  if (op === '+') return hintsAdd(a, b, res);
  if (op === '-') return hintsSub(a, b, res);
  if (op === '*') return hintsMul(a, b, res, depth);
  if (op === '/') return hintsDiv(a, b, res);
  return ['Нет подсказок для этой операции.'];
}

// ---- Addition hints ----
function hintsAdd(a, b, res) {
  const hints = [];

  // n² + n = n(n+1)
  const sqrtA = Math.round(Math.sqrt(a)), sqrtB = Math.round(Math.sqrt(b));
  if (sqrtA * sqrtA === a && sqrtA === b && sqrtA > 1) {
    hints.push(`<span class="hc-input">${a}</span> = <span class="hc-calc">${sqrtA}</span>² и <span class="hc-input">${b}</span> = <span class="hc-calc">${sqrtA}</span>`);
    hints.push(`Значит <span class="hc-calc">${sqrtA}</span>² + <span class="hc-calc">${sqrtA}</span> = <span class="hc-calc">${sqrtA}</span> × (<span class="hc-calc">${sqrtA}</span> + 1) = <span class="hc-calc">${sqrtA}</span> × <span class="hc-calc">${sqrtA + 1}</span> = <span class="hc-answer">${res}</span>.`);
    return hints;
  }
  if (sqrtB * sqrtB === b && sqrtB === a && sqrtB > 1) {
    hints.push(`<span class="hc-input">${b}</span> = <span class="hc-calc">${sqrtB}</span>² и <span class="hc-input">${a}</span> = <span class="hc-calc">${sqrtB}</span>`);
    hints.push(`Значит <span class="hc-calc">${sqrtB}</span>² + <span class="hc-calc">${sqrtB}</span> = <span class="hc-calc">${sqrtB}</span> × (<span class="hc-calc">${sqrtB}</span> + 1) = <span class="hc-calc">${sqrtB}</span> × <span class="hc-calc">${sqrtB + 1}</span> = <span class="hc-answer">${res}</span>.`);
    return hints;
  }

  // Sum of Squares Special Case: p²+q² = (d1²+d2²)×101
  // Conditions: both are 2-digit perfect squares; units(p)=tens(q)+1, tens(p)+units(q)=10
  if (sqrtA >= 10 && sqrtA <= 99 && sqrtA * sqrtA === a &&
      sqrtB >= 10 && sqrtB <= 99 && sqrtB * sqrtB === b) {
    const pArr = [[sqrtA, sqrtB], [sqrtB, sqrtA]];
    for (const [p, q] of pArr) {
      const pU = p % 10, pT = Math.floor(p / 10);
      const qU = q % 10, qT = Math.floor(q / 10);
      if (pU === qT + 1 && pT + qU === 10) {
        const sum101 = pT * pT + pU * pU;
        hints.push(`Замечаем: <span class="hc-input">${a}</span> = <span class="hc-calc">${p}</span>² и <span class="hc-input">${b}</span> = <span class="hc-calc">${q}</span>². Специальный случай суммы квадратов.`);
        hints.push(`Условие выполнено: цифры <span class="hc-calc">${p}</span> это <span class="hc-calc">${pT}</span> и <span class="hc-calc">${pU}</span>; ${pU} = ${qT}+1 и ${pT}+${qU} = 10.`);
        hints.push(`Сумма квадратов цифр: <span class="hc-calc">${pT}</span>² + <span class="hc-calc">${pU}</span>² = ${pT*pT} + ${pU*pU} = <span class="hc-part">${sum101}</span>.`);
        hints.push(`Ответ = <span class="hc-part">${sum101}</span> × 101 = <span class="hc-answer">${res}</span>.`);
        return hints;
      }
    }
  }

  // Round up trick
  const lastA = a % 10, lastB = b % 10;
  if (lastA >= 7 || lastB >= 7) {
    const which = lastA >= lastB ? a : b;
    const other = which === a ? b : a;
    const round = Math.ceil(which / 10) * 10;
    const diff = round - which;
    hints.push(`Округли <strong>${which}</strong> до <strong>${round}</strong> (прибавив ${diff})`);
    hints.push(`Сложи: <strong>${round}</strong> + <strong>${other}</strong> = <em>${round + other}</em>`);
    hints.push(`Вычти добавленное: <em>${round + other}</em> − <strong>${diff}</strong> = <em>${res}</em>`);
  } else if (a % 100 !== 0 && b % 100 !== 0 && Math.floor(a/10) !== Math.floor(b/10)) {
    // Split by tens
    const aT = Math.floor(a/10)*10, aU = a%10;
    const bT = Math.floor(b/10)*10, bU = b%10;
    hints.push(`Разбей на части: <strong>${a}</strong> = ${aT}+${aU} и <strong>${b}</strong> = ${bT}+${bU}`);
    hints.push(`Сложи десятки: <em>${aT} + ${bT} = ${aT+bT}</em>`);
    hints.push(`Сложи единицы: <em>${aU} + ${bU} = ${aU+bU}</em>`);
    hints.push(`Сумма: <em>${aT+bT} + ${aU+bU} = ${res}</em>`);
  } else {
    hints.push(`Иди слева направо: начни с больших разрядов`);
    const aT = Math.floor(a/10)*10, bT = Math.floor(b/10)*10;
    if (aT || bT) hints.push(`Сначала <strong>${aT || a}</strong> + <strong>${bT || b}</strong>, потом добавь остатки`);
    hints.push(`Ответ: <em>${res}</em>`);
  }
  return hints;
}

// ---- Subtraction hints ----
function hintsSub(a, b, res) {
  const hints = [];
  if (b % 10 === 9 || b % 10 === 8 || b % 10 === 7) {
    const round = Math.ceil(b/10)*10;
    const diff = round - b;
    hints.push(`Округли вычитаемое <strong>${b}</strong> → <strong>${round}</strong>`);
    hints.push(`Вычти: <strong>${a}</strong> − <strong>${round}</strong> = <em>${a - round}</em>`);
    hints.push(`Добавь обратно <strong>${diff}</strong>: <em>${a - round} + ${diff} = ${res}</em>`);
  } else if (b % 10 === 0) {
    hints.push(`Вычитание кратного 10 — просто уменьши нужный разряд`);
    hints.push(`<strong>${a}</strong> − <strong>${b}</strong> = <em>${res}</em>`);
  } else {
    // Count up
    const toRound = Math.ceil(b/10)*10;
    hints.push(`Метод «дополнения»: от <strong>${b}</strong> до <strong>${toRound}</strong> = ${toRound-b}`);
    hints.push(`От <strong>${toRound}</strong> до <strong>${a}</strong> = ${a - toRound}`);
    hints.push(`Итого: ${toRound-b} + ${a-toRound} = <em>${res}</em>`);
  }

  // Difference of squares bonus hint
  const sqA = Math.round(Math.sqrt(Math.max(a, b)));
  const sqB = Math.round(Math.sqrt(Math.min(a, b)));
  if (sqA * sqA === Math.max(a, b) && sqB * sqB === Math.min(a, b) && sqA !== sqB) {
    hints.push(`Difference of squares: <span class="hc-input">${Math.max(a,b)}</span> = <span class="hc-calc">${sqA}</span>² and <span class="hc-input">${Math.min(a,b)}</span> = <span class="hc-calc">${sqB}</span>², so use a² − b² = (a+b)(a−b).`);
    hints.push(`(<span class="hc-calc">${sqA}</span> + <span class="hc-calc">${sqB}</span>) × (<span class="hc-calc">${sqA}</span> − <span class="hc-calc">${sqB}</span>) = <span class="hc-part">${sqA + sqB}</span> × <span class="hc-key">${sqA - sqB}</span> = <span class="hc-answer">${res}</span>.`);
  }

  // Subtracting reverses check (runs after normal hints as extra insight)
  const sA = String(Math.max(a,b)), sB = String(Math.min(a,b));
  if (sA.length === sB.length && sA.length === 2 && sA === sB.split('').reverse().join('')) {
    const dA = Math.floor(Math.max(a,b)/10), dB = Math.max(a,b)%10;
    hints.push(`Subtracting reverses trick: the digits are swapped, so the answer is 9 × (larger digit − smaller digit).`);
    hints.push(`9 × (<span class="hc-input">${dA}</span> − <span class="hc-input">${dB}</span>) = 9 × <span class="hc-calc">${dA - dB}</span> = <span class="hc-answer">${res}</span>.`);
  } else if (sA.length === sB.length && sA.length === 3 && sA === sB.split('').reverse().join('')) {
    const fA = parseInt(sA[0]), fB = parseInt(sA[2]);
    hints.push(`Subtracting reverses trick: for a 3-digit number, the answer is 99 × (first digit − last digit).`);
    hints.push(`99 × (<span class="hc-input">${fA}</span> − <span class="hc-input">${fB}</span>) = 99 × <span class="hc-calc">${fA - fB}</span> = <span class="hc-answer">${res}</span>.`);
  } else if (sA.length === sB.length && sA.length === 4 && sA[1] === '0' && sA[2] === '0' && sA === sB.split('').reverse().join('')) {
    const fA = parseInt(sA[0]), fB = parseInt(sA[3]);
    hints.push(`Subtracting reverses trick: for a 4-digit number X00Y, the answer is 999 × (first digit − last digit).`);
    hints.push(`999 × (<span class="hc-input">${fA}</span> − <span class="hc-input">${fB}</span>) = 999 × <span class="hc-calc">${fA - fB}</span> = <span class="hc-answer">${res}</span>.`);
  }

  return hints;
}

// ---- Multiplication hints ----
function hintsMul(a, b, res, depth = 0) {
  const hints = [];
  const [big, small] = a >= b ? [a, b] : [b, a];
  const sub = (x, y) => _subHint(x, y, depth); // shorthand

  // Use cost-based scoring to pick the easiest applicable trick
  const _trick = _bestMulTrick(a, b);
  const _sv = _trick.id;
  const _ov = _trick.other; // non-special operand when applicable

  if (_sv === '11') {
    if (_ov < 100) {
      const d1 = Math.floor(_ov/10), d2 = _ov%10;
      hints.push(`Трюк ×11: напиши первую и последнюю цифру <strong>${_ov}</strong> по краям`);
      hints.push(`Вставь их сумму в середину: ${d1} | <em>${d1+d2}</em> | ${d2}`);
      if (d1+d2 >= 10) hints.push(`Сумма цифр ≥ 10, перенеси: <em>${res}</em>`);
      else hints.push(`Результат: <em>${res}</em>`);
    } else {
      hints.push(`×11: сдвинь число и сложи с собой: <strong>${_ov}</strong>×10 + <strong>${_ov}</strong>`);
      hints.push(`${_ov*10} + ${_ov} = <em>${res}</em>`);
    }
  } else if (_sv === '9') {
    hints.push(`×9 = ×10 − ×1`);
    hints.push(`<strong>${_ov}</strong> × 10 = <em>${_ov*10}</em>`);
    hints.push(`<em>${_ov*10}</em> − <strong>${_ov}</strong> = <em>${res}</em>`);
  } else if (_sv === '5') {
    hints.push(`×5 = ÷2 × 10 (умножь на 10, потом раздели на 2)`);
    hints.push(`<strong>${_ov}</strong> × 10 = <em>${_ov*10}</em>`);
    hints.push(`<em>${_ov*10}</em> ÷ 2 = <em>${res}</em>`);
  } else if (_sv === '25') {
    hints.push(`×25 = ×100 ÷ 4`);
    hints.push(`<strong>${_ov}</strong> × 100 = <em>${_ov*100}</em>`);
    hints.push(`<em>${_ov*100}</em> ÷ 4 = <em>${res}</em>`);
  } else if (_sv === '4') {
    hints.push(`×4 = удвой дважды`);
    hints.push(`<strong>${_ov}</strong> × 2 = <em>${_ov*2}</em>`);
    hints.push(`<em>${_ov*2}</em> × 2 = <em>${res}</em>`);
  } else if (_sv === '8') {
    hints.push(`×8 = удвой трижды`);
    hints.push(`<strong>${_ov}</strong>×2 = ${_ov*2}, ×2 = ${_ov*4}, ×2 = <em>${res}</em>`);
  } else if (_sv === '99') {
    hints.push(`×99 = ×100 − ×1`);
    hints.push(`<strong>${_ov}</strong> × 100 = <em>${_ov*100}</em>`);
    hints.push(`<em>${_ov*100}</em> − <strong>${_ov}</strong> = <em>${res}</em>`);
  } else if (_sv === '75') {
    const quarter = _ov / 4;
    const threeQuarters = quarter * 3;
    hints.push(`75 is three-quarters of 100. Find three-quarters of <span class="hc-input">${_ov}</span>, then multiply by 100.`);
    hints.push(`Step 1 — divide by 4: <span class="hc-input">${_ov}</span> ÷ 4 = <span class="hc-part">${quarter}</span>.`);
    hints.push(`Step 2 — multiply by 3: <span class="hc-part">${quarter}</span> × 3 = <span class="hc-key">${threeQuarters}</span>.`);
    hints.push(`Step 3 — multiply by 100: <span class="hc-key">${threeQuarters}</span> × 100 = <span class="hc-answer">${res}</span>.`);
  } else if (_sv === '125') {
    const eighth = _ov / 8;
    hints.push(`125 equals 1000 ÷ 8. So instead of multiplying by 125, divide by 8 and then add three zeros.`);
    hints.push(`Divide <span class="hc-input">${_ov}</span> by 8: <span class="hc-input">${_ov}</span> ÷ 8 = <span class="hc-part">${eighth}</span>.`);
    hints.push(`Multiply by 1000 (add three zeros): <span class="hc-part">${eighth}</span> × 1000 = <span class="hc-answer">${res}</span>.`);
  } else if (_sv === '101') {
    hints.push(`Multiplying by 101 means adding the number to itself shifted two places: <span class="hc-input">${_ov}</span> × 101 = <span class="hc-input">${_ov}</span> × 100 + <span class="hc-input">${_ov}</span>.`);
    if (_ov < 100) {
      hints.push(`For a two-digit number, this simply concatenates it with itself (with a possible carry on the overlapping digit).`);
    }
    hints.push(`Shift left by two: <span class="hc-input">${_ov}</span> × 100 = <span class="hc-part">${_ov * 100}</span>.`);
    hints.push(`Add the original: <span class="hc-part">${_ov * 100}</span> + <span class="hc-key">${_ov}</span> = <span class="hc-answer">${res}</span>.`);
  } else if (_sv === '111') {
    hints.push(`111 = 100 + 10 + 1, so multiply <span class="hc-input">${_ov}</span> by each part and add.`);
    hints.push(`<span class="hc-input">${_ov}</span> × 100 = <span class="hc-part">${_ov*100}</span>, × 10 = <span class="hc-calc">${_ov*10}</span>, × 1 = <span class="hc-key">${_ov}</span>.`);
    hints.push(`<span class="hc-part">${_ov*100}</span> + <span class="hc-calc">${_ov*10}</span> + <span class="hc-key">${_ov}</span> = <span class="hc-answer">${res}</span>.`);
  } else if (_sv === 'same-tens') {
    // Same leading digits, units add to 10: ab × ac = a*(a+1) | b*c (zero-padded)
    const lead = Math.floor(a / 10);
    const uA = a % 10, uB = b % 10;
    const lastPart = String(uA * uB).padStart(2, '0');
    const firstPart = lead * (lead + 1);
    hints.push(`The leading part of both numbers is the same: <span class="hc-input">${lead}</span>. Their units digits, <span class="hc-calc">${uA}</span> and <span class="hc-calc">${uB}</span>, add up to 10.`);
    hints.push(`Last two digits: <span class="hc-calc">${uA}</span> × <span class="hc-calc">${uB}</span> = <span class="hc-key">${lastPart}</span>.`);
    hints.push(`Leading digits: <span class="hc-input">${lead}</span> × (<span class="hc-input">${lead}</span> + 1) = <span class="hc-input">${lead}</span> × <span class="hc-calc">${lead + 1}</span> = <span class="hc-part">${firstPart}</span>.`);
    hints.push(`Place them together: <span class="hc-part">${firstPart}</span><span class="hc-key">${lastPart}</span> = <span class="hc-answer">${res}</span>.`);
  } else if (_sv === 'near-100') {
    // Two numbers near 100
    const dA = a - 100, dB = b - 100;
    if (dA > 0 && dB > 0) {
      const lastStr = String(dA * dB).padStart(2, '0');
      const first = a + dB;
      hints.push(`Both numbers are above 100. Find the excess of each: <span class="hc-input">${a}</span> is <span class="hc-calc">+${dA}</span> above 100, <span class="hc-input">${b}</span> is <span class="hc-calc">+${dB}</span> above 100.`);
      hints.push(`Last two digits: <span class="hc-calc">${dA}</span> × <span class="hc-calc">${dB}</span> = <span class="hc-key">${lastStr}</span>.`);
      hints.push(`Leading digits: <span class="hc-input">${a}</span> + <span class="hc-calc">${dB}</span> = <span class="hc-part">${first}</span>.`);
      hints.push(`Answer: <span class="hc-part">${first}</span><span class="hc-key">${lastStr}</span> = <span class="hc-answer">${res}</span>.`);
    } else if (dA < 0 && dB < 0) {
      const defA = -dA, defB = -dB;
      const lastStr = String(defA * defB).padStart(2, '0');
      const first = a - defB;
      hints.push(`Both numbers are below 100. Find the deficit of each: <span class="hc-input">${a}</span> is <span class="hc-calc">−${defA}</span> from 100, <span class="hc-input">${b}</span> is <span class="hc-calc">−${defB}</span> from 100.`);
      hints.push(`Last two digits: <span class="hc-calc">${defA}</span> × <span class="hc-calc">${defB}</span> = <span class="hc-key">${lastStr}</span>.`);
      hints.push(`Leading digits: <span class="hc-input">${a}</span> − <span class="hc-calc">${defB}</span> = <span class="hc-part">${first}</span>.`);
      hints.push(`Answer: <span class="hc-part">${first}</span><span class="hc-key">${lastStr}</span> = <span class="hc-answer">${res}</span>.`);
    } else {
      const [above, below] = a > b ? [a, b] : [b, a];
      const ex = above - 100, def = 100 - below;
      const lastPart = 100 - ex * def;
      const first = above - def - 1;
      const lastStr = String(lastPart).padStart(2, '0');
      hints.push(`One number is above 100, the other below. Excess: <span class="hc-input">${above}</span> is <span class="hc-calc">+${ex}</span>; deficit: <span class="hc-input">${below}</span> is <span class="hc-calc">−${def}</span>.`);
      hints.push(`Last two digits: 100 − (<span class="hc-calc">${ex}</span> × <span class="hc-calc">${def}</span>) = 100 − ${ex * def} = <span class="hc-key">${lastStr}</span>.`);
      hints.push(`Leading digits: <span class="hc-input">${above}</span> − <span class="hc-calc">${def}</span> − 1 = <span class="hc-part">${first}</span>.`);
      hints.push(`Answer: <span class="hc-part">${first}</span><span class="hc-key">${lastStr}</span> = <span class="hc-answer">${res}</span>.`);
    }
  } else if (_sv === 'both-end-5') {
    // Both numbers end in 5: a5 × b5
    const leadA = Math.floor(big / 10), leadB = Math.floor(small / 10);
    const sumLeads = leadA + leadB;
    const lastTwo = sumLeads % 2 === 0 ? 25 : 75;
    const firstPart = leadA * leadB + Math.floor(sumLeads / 2);
    hints.push(`Both numbers end in 5. The last two digits are <span class="hc-key">${lastTwo}</span> — 25 when the sum of leading digits is even, 75 when odd.`);
    hints.push(`Leading digits: <span class="hc-input">${leadA}</span> and <span class="hc-input">${leadB}</span>. Their sum = <span class="hc-calc">${sumLeads}</span> (${sumLeads % 2 === 0 ? 'even' : 'odd'}).`);
    hints.push(`Remaining part: <span class="hc-input">${leadA}</span> × <span class="hc-input">${leadB}</span> + ⌊${sumLeads}/2⌋ = ${leadA * leadB} + ${Math.floor(sumLeads / 2)} = <span class="hc-part">${firstPart}</span>.`);
    hints.push(`Answer: <span class="hc-part">${firstPart}</span><span class="hc-key">${lastTwo}</span> = <span class="hc-answer">${res}</span>.`);
  } else if (_sv === 'double-half') {
    // Double & Half: halve the even, double the odd, then multiply the result
    const [evenNum, oddNum] = big%2===0 ? [big, small] : [small, big];
    const halfE = evenNum / 2;
    const doubleO = oddNum * 2;
    hints.push(`Double & Half trick: halve the even number and double the other to get a simpler product.`);
    hints.push(`Halve <span class="hc-input">${evenNum}</span> → <span class="hc-calc">${halfE}</span>, double <span class="hc-input">${oddNum}</span> → <span class="hc-calc">${doubleO}</span>.`);
    const _sh = sub(halfE, doubleO);
    if (_sh) hints.push(_sh);
    hints.push(`Now multiply: <span class="hc-calc">${halfE}</span> × <span class="hc-calc">${doubleO}</span> = <span class="hc-answer">${res}</span>.`);
  } else if (_sv === 'reverses') {
    // Multiplying reverses: ab × ba = 100(ab) + 10(a²+b²) + (ab), where ab = digit product
    const d1 = Math.floor(big / 10), d2 = big % 10;
    const prod = d1 * d2;
    const sumSq = d1 * d1 + d2 * d2;
    hints.push(`The digits of these two numbers are reversed: <span class="hc-input">${big}</span> and <span class="hc-input">${small}</span>.`);
    hints.push(`Compute the product of the digits: <span class="hc-input">${d1}</span> × <span class="hc-input">${d2}</span> = <span class="hc-calc">${prod}</span>. This forms both the ones and hundreds parts.`);
    hints.push(`Compute the sum of their squares: <span class="hc-input">${d1}</span>² + <span class="hc-input">${d2}</span>² = ${d1*d1} + ${d2*d2} = <span class="hc-key">${sumSq}</span>. This forms the tens part.`);
    hints.push(`Assemble (with carries): <span class="hc-answer">${res}</span>.`);
  } else if (_sv === 'near-decade') {
    // Near decade: a × b = big × round ± big × |diff|
    const roundBase = Math.round(small / 10) * 10;
    const roundDiff = small - roundBase;
    const bigTimesRound = big * roundBase;
    const bigTimesDiff = big * Math.abs(roundDiff);
    const sign = roundDiff < 0 ? '−' : '+';
    hints.push(`<span class="hc-input">${small}</span> is close to <span class="hc-calc">${roundBase}</span> (just ${roundDiff < 0 ? roundBase + ' − ' + Math.abs(roundDiff) : roundBase + ' + ' + roundDiff}). Use round & adjust.`);
    hints.push(`<span class="hc-input">${big}</span> × <span class="hc-calc">${roundBase}</span> = <span class="hc-part">${bigTimesRound}</span>.`);
    if (roundDiff < 0) {
      hints.push(`Subtract <span class="hc-input">${big}</span> × <span class="hc-calc">${Math.abs(roundDiff)}</span> = <span class="hc-key">${bigTimesDiff}</span>.`);
      hints.push(`<span class="hc-part">${bigTimesRound}</span> − <span class="hc-key">${bigTimesDiff}</span> = <span class="hc-answer">${res}</span>.`);
    } else {
      hints.push(`Add <span class="hc-input">${big}</span> × <span class="hc-calc">${roundDiff}</span> = <span class="hc-key">${bigTimesDiff}</span>.`);
      hints.push(`<span class="hc-part">${bigTimesRound}</span> + <span class="hc-key">${bigTimesDiff}</span> = <span class="hc-answer">${res}</span>.`);
    }
  } else if (_sv === 'equidistant') {
    // Equidistant from midpoint: a × b = mid² − d²
    const mid = (a + b) / 2;
    const d = Math.abs(mid - a);
    const midSq = mid * mid;
    const dSq = d * d;
    hints.push(`Both numbers are equidistant from <span class="hc-calc">${mid}</span> (each is <span class="hc-input">${d}</span> away), so use the difference of squares: <span class="hc-calc">${mid}</span>² − <span class="hc-input">${d}</span>².`);
    const _sh = sub(mid, mid);
    if (_sh) hints.push(_sh);
    hints.push(`<span class="hc-calc">${mid}</span>² = <span class="hc-part">${midSq}</span>.`);
    hints.push(`<span class="hc-input">${d}</span>² = <span class="hc-key">${dSq}</span>.`);
    hints.push(`<span class="hc-part">${midSq}</span> − <span class="hc-key">${dSq}</span> = <span class="hc-answer">${res}</span>.`);
  } else if (_sv === 'sq-end-5' || _sv === 'sq-4159' || _sv === 'sq-generic') {
    // Square
    const n = a;
    if (n % 10 === 5) {
      // Squares ending in 5: (a5)² = a×(a+1) | 25
      const leading = Math.floor(n / 10);
      hints.push(`Any number ending in 5, when squared, always ends in <span class="hc-key">25</span>.`);
      hints.push(`Take the digits before the 5: <span class="hc-input">${leading}</span>. Multiply: <span class="hc-input">${leading}</span> × <span class="hc-calc">${leading + 1}</span> = <span class="hc-part">${leading * (leading + 1)}</span>.`);
      const _sh = sub(leading, leading + 1);
      if (_sh) hints.push(_sh);
      hints.push(`Place <span class="hc-key">25</span> at the end: <span class="hc-part">${leading * (leading + 1)}</span><span class="hc-key">25</span> = <span class="hc-answer">${res}</span>.`);
    } else if (n >= 41 && n <= 59) {
      // Squares 41-59: (50±k)² = 100(25±k) + k²
      const k = Math.abs(n - 50);
      const sign = n >= 50 ? '+' : '−';
      const hundreds = 25 + (n >= 50 ? k : -k);
      const onesRaw = k * k;
      const onesPad = String(onesRaw).padStart(2, '0');
      hints.push(`Find how far <span class="hc-input">${n}</span> is from 50: k = <span class="hc-calc">${k}</span>.`);
      hints.push(`The first part of the answer is 25 ${sign} k = 25 ${sign} <span class="hc-calc">${k}</span> = <span class="hc-part">${hundreds}</span>.`);
      hints.push(`The last two digits are k² = <span class="hc-calc">${k}</span>² = <span class="hc-key">${onesPad}</span>.`);
      hints.push(`Put them together: <span class="hc-part">${hundreds}</span><span class="hc-key">${onesPad}</span> = <span class="hc-answer">${res}</span>.`);
    } else {
      const r = Math.round(n/10)*10;
      const d = n - r;
      hints.push(`Метод отклонения от круглого числа`);
      hints.push(`Базa <strong>${r}</strong>, отклонение <strong>${d}</strong>`);
      hints.push(`(${r}+${d})(${r}−${-d}) + ${d}² = ${r*r - d*d} + ${d*d} = <em>${res}</em>`);
    }
  } else if (_sv === 'mul-10') {
    hints.push(`Умножение на кратное 10: просто приписывай нули`);
    hints.push(`<strong>${big}</strong> × <strong>${small/10}</strong> = <em>${big * (small/10)}</em>, добавь 0`);
    hints.push(`= <em>${res}</em>`);
  } else {
    // Generic: break apart
    const sT = Math.floor(small/10)*10, sU = small%10;
    if (sT > 0 && sU > 0) {
      hints.push(`Разбей <strong>${small}</strong> = ${sT} + ${sU}`);
      hints.push(`<strong>${big}</strong> × <strong>${sT}</strong> = <em>${big*sT}</em>`);
      hints.push(`<strong>${big}</strong> × <strong>${sU}</strong> = <em>${big*sU}</em>`);
      hints.push(`<em>${big*sT}</em> + <em>${big*sU}</em> = <em>${res}</em>`);
    } else {
      hints.push(`Используй разбиение на множители`);
      hints.push(`<strong>${a}</strong> × <strong>${b}</strong> = <em>${res}</em>`);
    }
  }
  return hints;
}

// ---- Division hints ----
function hintsDiv(a, b, res) {
  const hints = [];
  if (b === 0) return ['На ноль делить нельзя!'];

  if (b === 5) {
    hints.push(`÷5 = ×2 ÷ 10`);
    hints.push(`<strong>${a}</strong> × 2 = <em>${a*2}</em>`);
    hints.push(`<em>${a*2}</em> ÷ 10 = <em>${res}</em>`);
  } else if (b === 2) {
    if (a % 2 === 0) {
      hints.push(`<span class="hc-input">${a}</span> is even, so halve it directly: <span class="hc-input">${a}</span> ÷ 2 = <span class="hc-answer">${res}</span>.`);
    } else {
      const fl = Math.floor(a / 2);
      hints.push(`<span class="hc-input">${a}</span> is odd. Halve the even part: <span class="hc-calc">${a - 1}</span> ÷ 2 = <span class="hc-part">${fl}</span>, then add 0.5.`);
      hints.push(`Answer: <span class="hc-part">${fl}</span> + 0.5 = <span class="hc-answer">${res}</span>.`);
    }
  } else if (b === 3) {
    const digitSum = String(a).split('').reduce((s,c) => s + parseInt(c), 0);
    const divBy3 = digitSum % 3 === 0;
    hints.push(`To check divisibility by 3, sum all digits of <span class="hc-input">${a}</span>: ${String(a).split('').join(' + ')} = <span class="hc-calc">${digitSum}</span>.`);
    if (divBy3) {
      hints.push(`<span class="hc-calc">${digitSum}</span> is divisible by 3, so <span class="hc-input">${a}</span> is divisible by 3.`);
      hints.push(`<span class="hc-input">${a}</span> ÷ 3 = <span class="hc-answer">${formatNum(res)}</span>.`);
    } else {
      const rem = digitSum % 3;
      hints.push(`<span class="hc-calc">${digitSum}</span> leaves remainder <span class="hc-key">${rem}</span> when divided by 3, so <span class="hc-input">${a}</span> ÷ 3 = <span class="hc-answer">${formatNum(res)}</span>.`);
    }
  } else if (b === 11) {
    const digits = String(a).split('').map(Number);
    // alternating sum: ones, hundreds, ... minus tens, thousands, ...
    let altSum = 0;
    for (let i = 0; i < digits.length; i++) {
      altSum += (i % 2 === 0) ? digits[digits.length - 1 - i] : -digits[digits.length - 1 - i];
    }
    const rem11 = ((altSum % 11) + 11) % 11;
    const digStr = digits.map((d,i) => {
      const pos = digits.length - 1 - i; // position from right (0-indexed)
      return (pos % 2 === 0 ? `+${d}` : `−${d}`);
    }).join(' ');
    hints.push(`For divisibility by 11, take alternating digits (+ from ones, − from tens, etc.): ${digStr} = <span class="hc-calc">${altSum}</span>.`);
    if (rem11 === 0) {
      hints.push(`<span class="hc-calc">${altSum}</span> is divisible by 11, so <span class="hc-input">${a}</span> ÷ 11 = <span class="hc-answer">${formatNum(res)}</span>.`);
    } else {
      hints.push(`Remainder is <span class="hc-key">${rem11}</span>. Answer: <span class="hc-answer">${formatNum(res)}</span>.`);
    }
  } else if (b === 6) {
    const isEven = a % 2 === 0;
    const digitSum6 = String(a).split('').reduce((s,c) => s + parseInt(c), 0);
    const divBy3_6 = digitSum6 % 3 === 0;
    hints.push(`To divide by 6, check divisibility by both 2 and 3 (since 6 = 2 × 3).`);
    hints.push(`By 2: <span class="hc-input">${a}</span> ends in <span class="hc-calc">${a%10}</span> — ${isEven ? 'even ✓' : 'odd ✗'}.`);
    hints.push(`By 3: digit sum = ${String(a).split('').join('+')} = <span class="hc-calc">${digitSum6}</span> — ${divBy3_6 ? 'divisible by 3 ✓' : `remainder ${digitSum6 % 3}`}.`);
    if (isEven && divBy3_6) {
      hints.push(`Both checks pass, so <span class="hc-input">${a}</span> ÷ 6 = <span class="hc-answer">${formatNum(res)}</span>.`);
    } else {
      hints.push(`<span class="hc-input">${a}</span> ÷ 6 = <span class="hc-answer">${formatNum(res)}</span>.`);
    }
  } else if (b === 4) {
    const last2 = parseInt(String(a).slice(-2));
    hints.push(`To check divisibility by 4, only the last two digits matter: <span class="hc-calc">${String(a).slice(-2)}</span> ÷ 4 = remainder <span class="hc-key">${last2 % 4}</span>.`);
    hints.push(`Then divide in two steps: <span class="hc-input">${a}</span> ÷ 2 = <span class="hc-part">${a/2}</span>, then <span class="hc-part">${a/2}</span> ÷ 2 = <span class="hc-answer">${res}</span>.`);
  } else if (b === 8) {
    const last3 = parseInt(String(a).slice(-3));
    hints.push(`To check divisibility by 8, only the last three digits matter: <span class="hc-calc">${String(a).slice(-3)}</span> ÷ 8 = remainder <span class="hc-key">${last3 % 8}</span>.`);
    hints.push(`Divide in three steps: <span class="hc-input">${a}</span> ÷ 2 = ${a/2} → ÷ 2 = ${a/4} → ÷ 2 = <span class="hc-answer">${res}</span>.`);
  } else if (b === 25) {
    hints.push(`÷25 = ×4 ÷100`);
    hints.push(`<strong>${a}</strong> × 4 = <em>${a*4}</em>`);
    hints.push(`<em>${a*4}</em> ÷ 100 = <em>${res}</em>`);
  } else if (b === 9) {
    hints.push(`Проверь делимость на 9: сумма цифр должна делиться на 9`);
    const digitSum = String(a).split('').reduce((s,c) => s + parseInt(c), 0);
    hints.push(`Сумма цифр <strong>${a}</strong>: ${digitSum} ${digitSum % 9 === 0 ? '✓ делится' : '→ не делится нацело'}`);
    hints.push(`<strong>${a}</strong> ÷ <strong>9</strong> = <em>${formatNum(res)}</em>`);
  } else if (Number.isInteger(res)) {
    hints.push(`Ищи, сколько раз <strong>${b}</strong> укладывается в <strong>${a}</strong>`);
    hints.push(`<strong>${b}</strong> × ? = <strong>${a}</strong>`);
    hints.push(`? = <em>${res}</em>`);
  } else {
    const int = Math.floor(a/b);
    const rem = a - int*b;
    hints.push(`Целая часть: <strong>${a}</strong> ÷ <strong>${b}</strong> ≈ <em>${int}</em>`);
    if (rem) hints.push(`Остаток: <em>${rem}</em> → переводим в дробь: ${rem}/${b}`);
    hints.push(`Полный ответ: <em>${formatNum(res)}</em>`);
  }
  return hints;
}

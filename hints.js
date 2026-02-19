// ---- Mental Math Hints Engine ----

function formatNum(n) {
  const s = parseFloat(n.toFixed(8));
  return s.toLocaleString('ru');
}

function getTrickTag(a, b, op) {
  if (op === '*') {
    if (b === 11 || a === 11) return '× 11 трюк';
    if (b === 9 || a === 9) return '× 9 трюк';
    if (b === 5 || a === 5) return '× 5 трюк';
    if (b === 25 || a === 25) return '× 25 трюк';
    if (b === 99 || a === 99) return '× 99 трюк';
    if (isSquare(a, b)) {
      const n = a;
      if (n % 10 === 5) return 'Squares ending in 5';
      if (n >= 41 && n <= 59) return 'Squares 41–59';
      return 'Квадрат числа';
    }
    return 'Умножение';
  }
  if (op === '+') {
    if (String(a).endsWith('9') || String(b).endsWith('9')) return 'Округление +1';
    if (String(a).endsWith('8') || String(b).endsWith('8')) return 'Округление +2';
    return 'Сложение';
  }
  if (op === '-') {
    if (String(b).endsWith('9')) return 'Вычитание 9';
    return 'Вычитание';
  }
  if (op === '/') return 'Деление';
  return null;
}

function isSquare(a, b) { 
  return a === b; 
}

function getHints(a, b, op, res) {
  if (op === '+') return hintsAdd(a, b, res);
  if (op === '-') return hintsSub(a, b, res);
  if (op === '*') return hintsMul(a, b, res);
  if (op === '/') return hintsDiv(a, b, res);
  return ['Нет подсказок для этой операции.'];
}

// ---- Addition hints ----
function hintsAdd(a, b, res) {
  const hints = [];
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
  return hints;
}

// ---- Multiplication hints ----
function hintsMul(a, b, res) {
  const hints = [];
  const [big, small] = a >= b ? [a, b] : [b, a];

  if (small === 11) {
    if (big < 100) {
      const d1 = Math.floor(big/10), d2 = big%10;
      hints.push(`Трюк ×11: напиши первую и последнюю цифру <strong>${big}</strong> по краям`);
      hints.push(`Вставь их сумму в середину: ${d1} | <em>${d1+d2}</em> | ${d2}`);
      if (d1+d2 >= 10) hints.push(`Сумма цифр ≥ 10, перенеси: <em>${res}</em>`);
      else hints.push(`Результат: <em>${res}</em>`);
    } else {
      hints.push(`×11: сдвинь число и сложи с собой: <strong>${big}</strong>×10 + <strong>${big}</strong>`);
      hints.push(`${big*10} + ${big} = <em>${res}</em>`);
    }
  } else if (small === 9) {
    hints.push(`×9 = ×10 − ×1`);
    hints.push(`<strong>${big}</strong> × 10 = <em>${big*10}</em>`);
    hints.push(`<em>${big*10}</em> − <strong>${big}</strong> = <em>${res}</em>`);
  } else if (small === 5) {
    hints.push(`×5 = ÷2 × 10 (умножь на 10, потом раздели на 2)`);
    hints.push(`<strong>${big}</strong> × 10 = <em>${big*10}</em>`);
    hints.push(`<em>${big*10}</em> ÷ 2 = <em>${res}</em>`);
  } else if (small === 25) {
    hints.push(`×25 = ×100 ÷ 4`);
    hints.push(`<strong>${big}</strong> × 100 = <em>${big*100}</em>`);
    hints.push(`<em>${big*100}</em> ÷ 4 = <em>${res}</em>`);
  } else if (small === 4) {
    hints.push(`×4 = удвой дважды`);
    hints.push(`<strong>${big}</strong> × 2 = <em>${big*2}</em>`);
    hints.push(`<em>${big*2}</em> × 2 = <em>${res}</em>`);
  } else if (small === 8) {
    hints.push(`×8 = удвой трижды`);
    hints.push(`<strong>${big}</strong>×2 = ${big*2}, ×2 = ${big*4}, ×2 = <em>${res}</em>`);
  } else if (small === 99) {
    hints.push(`×99 = ×100 − ×1`);
    hints.push(`<strong>${big}</strong> × 100 = <em>${big*100}</em>`);
    hints.push(`<em>${big*100}</em> − <strong>${big}</strong> = <em>${res}</em>`);
  } else if (a === b) {
    // Square
    const n = a;
    if (n % 10 === 5) {
      // Squares ending in 5: (a5)² = a×(a+1) | 25
      const leading = Math.floor(n / 10);
      hints.push(`Any number ending in 5, when squared, always ends in <span class="hc-key">25</span>.`);
      hints.push(`Take the digits before the 5: <span class="hc-input">${leading}</span>. Add 1 to get <span class="hc-calc">${leading + 1}</span>, then multiply: <span class="hc-input">${leading}</span> × <span class="hc-calc">${leading + 1}</span> = <span class="hc-part">${leading * (leading + 1)}</span>.`);
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
  } else if (small % 10 === 0) {
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
  } else if (b === 4) {
    hints.push(`÷4 = ÷2 ÷2`);
    hints.push(`<strong>${a}</strong> ÷ 2 = <em>${a/2}</em>`);
    hints.push(`<em>${a/2}</em> ÷ 2 = <em>${res}</em>`);
  } else if (b === 8) {
    hints.push(`÷8 = ÷2 ÷2 ÷2`);
    hints.push(`${a} ÷ 2 = ${a/2} → ÷2 = ${a/4} → ÷2 = <em>${res}</em>`);
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

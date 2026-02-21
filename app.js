// ---- Calc state ----
let current = '0', stored = null, operator = null, waitNext = false, exprStr = '';

const display = document.getElementById('display');
const expr = document.getElementById('expr');

function updateDisplay(val) {
  display.textContent = val;
}

function handleNumber(n) {
  if (waitNext) { current = n; waitNext = false; }
  else current = current === '0' ? n : current + n;
  updateDisplay(current);
}

function handleOp(op) {
  if (operator && !waitNext) compute();
  stored = parseFloat(current);
  operator = op;
  waitNext = true;
  const sym = {'+':'+', '-':'−', '*':'×', '/':'÷'}[op];
  exprStr = current + ' ' + sym;
  expr.textContent = exprStr;
}

function compute() {
  if (operator === null || stored === null) return null;
  const a = stored, b = parseFloat(current);
  let res;
  if (operator === '+') res = a + b;
  else if (operator === '-') res = a - b;
  else if (operator === '*') res = a * b;
  else if (operator === '/') res = b !== 0 ? a / b : 'Ошибка';
  return { a, b, op: operator, res };
}

function handleEquals() {
  const data = compute();
  if (!data) return;
  const { a, b, op, res } = data;
  exprStr = a + ' ' + {'+':'+', '-':'−', '*':'×', '/':'÷'}[op] + ' ' + b + ' =';
  expr.textContent = exprStr;
  current = typeof res === 'number' ? String(parseFloat(res.toFixed(10))) : res;
  updateDisplay(current);
  stored = null; operator = null; waitNext = true;
  showHints(a, b, op, res);
}

// ---- Button wiring ----
document.querySelectorAll('button').forEach(btn => {
  btn.addEventListener('click', function(e) {
    rippleEffect(this, e);
    if (this.dataset.num !== undefined) handleNumber(this.dataset.num);
    else if (this.dataset.op) handleOp(this.dataset.op);
    else if (this.dataset.action === 'equals') handleEquals();
    else if (this.dataset.action === 'clear') {
      current = '0'; stored = null; operator = null; waitNext = false; exprStr = '';
      updateDisplay('0'); expr.textContent = '';
      resetHints();
    }
    else if (this.dataset.action === 'sign') {
      current = String(parseFloat(current) * -1); updateDisplay(current);
    }
    else if (this.dataset.action === 'percent') {
      current = String(parseFloat(current) / 100); updateDisplay(current);
    }
    else if (this.dataset.action === 'dot') {
      if (!current.includes('.')) { current += '.'; updateDisplay(current); }
    }
  });
});

function rippleEffect(btn, e) {
  const r = document.createElement('span');
  r.className = 'ripple';
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  r.style.width = r.style.height = size + 'px';
  r.style.left = (e.clientX - rect.left - size/2) + 'px';
  r.style.top  = (e.clientY - rect.top  - size/2) + 'px';
  btn.appendChild(r);
  setTimeout(() => r.remove(), 500);
}

// ---- Hints engine ----
function resetHints() {
  document.getElementById('emptyState').style.display = 'block';
  document.getElementById('hintSteps').style.display = 'none';
  document.getElementById('answerRow').style.display = 'none';
}

// Render one step from {text, numbers} format into HTML.
function renderStep(step) {
  return step.text.replace(/\{(\w+)\}/g, (_, k) => {
    const n = step.numbers && step.numbers[k];
    if (!n) return k;
    const val = typeof n.value === 'number' ? n.value.toLocaleString('ru') : n.value;
    return `<span class="hc-${n.type}">${val}</span>`;
  });
}

function showHints(a, b, op, res) {
  const hintsData = getHints(a, b, op, res);
  const steps     = hintsData.steps;
  const trickName = hintsData.trickName;

  const container = document.getElementById('hintSteps');
  const answerRow  = document.getElementById('answerRow');
  const answerVal  = document.getElementById('answerValue');
  const showBtn    = document.getElementById('showAnswerBtn');

  document.getElementById('emptyState').style.display = 'none';
  container.style.display = 'flex';
  container.innerHTML = '';

  steps.forEach((step, i) => {
    const div = document.createElement('div');
    div.className = 'hint-step';
    div.style.animationDelay = (i * 0.15) + 's';
    div.innerHTML = `
      <span class="hint-num">${i + 1}</span>
      <div class="hint-text">${renderStep(step)}</div>
    `;
    container.appendChild(div);
  });

  // Trick tag at top
  if (trickName) {
    const tagEl = document.createElement('div');
    tagEl.className = 'trick-tag';
    tagEl.textContent = trickName;
    tagEl.style.marginBottom = '4px';
    container.prepend(tagEl);
  }

  answerRow.style.display = 'flex';
  answerVal.style.display = 'none';
  answerVal.textContent = typeof res === 'number' ? formatNum(res) : res;
  showBtn.style.display = 'inline-block';
  showBtn.onclick = () => {
    answerVal.style.display = 'inline-block';
    showBtn.style.display = 'none';
  };

  // debug panel
  const info = debugInfo(a, b, op, res, hintsData);
  debugPre.textContent = renderDebug(info);
  debugPanel.style.display = debugCheck.checked ? 'block' : 'none';
}

// keyboard support
document.addEventListener('keydown', e => {
  const map = {
    '0':'0','1':'1','2':'2','3':'3','4':'4','5':'5','6':'6','7':'7','8':'8','9':'9',
    '+':'+','-':'-','*':'*','/':'/','Enter':'=','.':'.',
    'Delete':'c','Backspace':'c'
  };
  const k = map[e.key];
  if (!k) return;
  if ('0123456789'.includes(k)) handleNumber(k);
  else if ('+-*/'.includes(k)) handleOp(k);
  else if (k === '=') handleEquals();
  else if (k === '.') { if (!current.includes('.')) { current += '.'; updateDisplay(current); } }
  else if (k === 'c') {
    current = '0'; stored = null; operator = null; waitNext = false; exprStr = '';
    updateDisplay('0'); expr.textContent = ''; resetHints();
  }
});

// ---- Debug logic ----
function debugInfo(a, b, op, result, hintsData) {
  return {
    input: `${a} ${op} ${b} = ${result}`,
    directCost: directCost(a, b, op),
    trickSelected: hintsData.trickName,
    stepsCount: hintsData.steps.length,
    steps: hintsData.steps.map((s, i) => `  ${i+1}. ${s.text}`)
  };
}

function renderDebug(info) {
  return JSON.stringify(info, null, 2);
}

const debugCheck   = document.getElementById('debugCheck');
const debugPanel   = document.getElementById('debugPanel');
const debugPre     = document.getElementById('debugPre');

// Re-render debug section when checkbox toggled
debugCheck.addEventListener('change', () => {
  if (!debugCheck.checked) { debugPanel.style.display = 'none'; return; }
  if (debugPre.textContent) debugPanel.style.display = 'block';
});

// ---- Random test ----
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

const RANGES = {
  '*': () => [rand(12, 99), rand(2, 99)],
  '+': () => [rand(10, 999), rand(10, 999)],
  '-': () => { const a = rand(50, 999), b = rand(10, Math.min(499, a)); return [a, b]; },
  '/': () => { const b = rand(2, 12); return [b * rand(2, 20), b]; }
};

function flatSteps(steps) {
  return steps.map((s, i) => `  ${i+1}. ${s.text.replace(/\{(\w+)\}/g, (_, k) => s.numbers[k] ? s.numbers[k].value : k)}`);
}

function runRandTests() {
  const ops = ['*', '*', '*', '*', '*', '+', '+', '+', '+', '+',
               '-', '-', '-', '-', '-', '/', '/', '/', '/', '/'];
  const SEP = '═'.repeat(45);
  const DIV = '─'.repeat(45);
  const opSym = { '*': '×', '+': '+', '-': '−', '/': '÷' };
  const lines = [SEP];
  ops.forEach((op, idx) => {
    const [a, b] = RANGES[op]();
    let res;
    if (op === '+') res = a + b;
    else if (op === '-') res = a - b;
    else if (op === '*') res = a * b;
    else res = a / b;
    const h = getHints(a, b, op, res);
    const dc = directCost(a, b, op);
    lines.push(`${a} ${opSym[op]} ${b} = ${res}`);
    lines.push(`directCost: ${dc}`);
    lines.push(`trick: ${h.trickName}`);
    lines.push('steps:');
    flatSteps(h.steps).forEach(s => lines.push(s));
    lines.push(idx < ops.length - 1 ? DIV : SEP);
  });
  return lines.join('\n');
}

document.getElementById('randBtn').addEventListener('click', () => {
  const log    = runRandTests();
  const panel  = document.getElementById('randlogPanel');
  const area   = document.getElementById('randlogArea');
  area.value   = log;
  panel.style.display = 'block';
  area.scrollTop = 0;
});

document.getElementById('randlogCopy').addEventListener('click', function() {
  const area = document.getElementById('randlogArea');
  area.select();
  navigator.clipboard.writeText(area.value).then(() => {
    const btn = this;
    btn.textContent = '✔ Ok';
    setTimeout(() => btn.textContent = 'Копировать', 1500);
  }).catch(() => {
    area.select();
    document.execCommand('copy');
  });
});

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

function showHints(a, b, op, res) {
  const steps = getHints(a, b, op, res);
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
    div.style.animationDelay = (i * 0.12) + 's';
    div.innerHTML = `
      <span class="hint-num">${i+1}</span>
      <div class="hint-text">${step}</div>
    `;
    container.appendChild(div);
  });

  // Add trick tag at top
  const tag = getTrickTag(a, b, op);
  if (tag) {
    const tagEl = document.createElement('div');
    tagEl.className = 'trick-tag';
    tagEl.textContent = tag;
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

// ---- Automated tests for hints.js ----
// Run with: node tests.js

const fs = require('fs');
eval(fs.readFileSync('./hints.js', 'utf8'));

let passed = 0, failed = 0;

function check(label, actual, expected) {
  if (actual === expected) {
    console.log(`  \x1b[32m✓\x1b[0m ${label}`);
    passed++;
  } else {
    console.log(`  \x1b[31m✗\x1b[0m ${label}`);
    console.log(`      expected: ${JSON.stringify(expected)}`);
    console.log(`      got:      ${JSON.stringify(actual)}`);
    failed++;
  }
}

// Flatten hints array: strings stay as-is, sub-hint objects get their steps included
function _flatHints(hints) {
  const out = [];
  for (const h of hints) {
    if (h && typeof h === 'object' && h.sub) {
      out.push(h.label);
      for (const s of h.steps) out.push(typeof s === 'string' ? s : '');
    } else {
      out.push(typeof h === 'string' ? h : '');
    }
  }
  return out.map(h => h.replace(/<[^>]+>/g, ''));
}

// at least one hint contains substr
function has(hints, substr, label) {
  const plain = _flatHints(hints);
  if (plain.some(h => h.includes(substr))) {
    console.log(`  \x1b[32m✓\x1b[0m ${label}`);
    passed++;
  } else {
    console.log(`  \x1b[31m✗\x1b[0m ${label}`);
    console.log(`      no hint contained: ${JSON.stringify(substr)}`);
    console.log(`      hints:\n${plain.map((h,i) => `        [${i}] ${h}`).join('\n')}`);
    failed++;
  }
}

// alias kept for compat
const checkHintContains = has;

function hasNot(hints, substr, label) {
  const plain = _flatHints(hints);
  if (!plain.some(h => h.includes(substr))) {
    console.log(`  \x1b[32m✓\x1b[0m ${label}`);
    passed++;
  } else {
    console.log(`  \x1b[31m✗\x1b[0m ${label}`);
    console.log(`      unexpectedly found: ${JSON.stringify(substr)}`);
    failed++;
  }
}

function section(name) {
  console.log(`\n\x1b[36m── ${name}\x1b[0m`);
}

// =============================================================
// getTrickTag
// =============================================================
section('getTrickTag — multiplication');
check('×11 (a=11)',    getTrickTag(11, 54, '*'),  '× 11 трюк');
check('×11 (b=11)',    getTrickTag(72, 11, '*'),  '× 11 трюк');
check('×9  (a=9)',     getTrickTag(9, 47,  '*'),  '× 9 трюк');
check('×9  (b=9)',     getTrickTag(36, 9,  '*'),  '× 9 трюк');
check('×5  (a=5)',     getTrickTag(5, 84,  '*'),  '× 5 трюк');
check('×5  (b=5)',     getTrickTag(84, 5,  '*'),  '× 5 трюк');
check('×25 (a=25)',    getTrickTag(25, 84, '*'),  '× 25 трюк');
check('×25 (b=25)',    getTrickTag(84, 25, '*'),  '× 25 трюк');
check('×4 (a=4)',     getTrickTag(4, 37,   '*'),  '× 4 трюк');
check('×4 (b=4)',     getTrickTag(37, 4,   '*'),  '× 4 трюк');
check('×8 (a=8)',     getTrickTag(8, 37,   '*'),  '× 8 трюк');
check('×8 (b=8)',     getTrickTag(37, 8,   '*'),  '× 8 трюк');
check('×99 (a=99)',    getTrickTag(99, 37, '*'),  '× 99 трюк');
check('×99 (b=99)',    getTrickTag(37, 99, '*'),  '× 99 трюк');
// conflict: when both operands are special, priority by ease wins
check('9×8  → × 9',   getTrickTag(9, 8,   '*'),  '× 9 трюк');
check('8×9  → × 9',   getTrickTag(8, 9,   '*'),  '× 9 трюк');
check('9×4  → × 9',   getTrickTag(9, 4,   '*'),  '× 9 трюк');
check('9×5  → × 9',   getTrickTag(9, 5,   '*'),  '× 9 трюк');
check('11×9 → × 9',   getTrickTag(11, 9,  '*'),  '× 9 трюк');
check('11×5 → × 5',   getTrickTag(11, 5,  '*'),  '× 5 трюк');
check('11×4 → × 4',   getTrickTag(11, 4,  '*'),  '× 4 трюк');
check('11×8 → × 8',   getTrickTag(11, 8,  '*'),  '× 8 трюк');
check('25×4 → × 25',  getTrickTag(25, 4,  '*'),  '× 25 трюк'); // 4×100÷4=100 is marginally cheaper
check('25×8 → × 25',  getTrickTag(25, 8,  '*'),  '× 25 трюк');
check('4×8  → × 4',   getTrickTag(4, 8,   '*'),  '× 4 трюк');
check('99×4 → × 99',  getTrickTag(99, 4,  '*'),  '× 99 трюк');
check('99×8 → × 99',  getTrickTag(99, 8,  '*'),  '× 99 трюк');
check('×101 (a=101)',  getTrickTag(101, 23,'*'),  '× 101 trick');
check('×101 (b=101)',  getTrickTag(438, 101,'*'), '× 101 trick');
check('×111 (a=111)',  getTrickTag(111, 87,'*'),  '× 111 trick');
check('×111 (b=111)',  getTrickTag(87, 111,'*'),  '× 111 trick');
check('×75 (a=75)',    getTrickTag(75, 76, '*'),  '× 75 trick');
check('×75 (b=75)',    getTrickTag(76, 75, '*'),  '× 75 trick');
check('×125 (a=125)',  getTrickTag(125, 320,'*'), '× 125 trick');
check('×125 (b=125)',  getTrickTag(320, 125,'*'), '× 125 trick');
check('same tens 43×47', getTrickTag(43, 47,'*'), 'Same tens, units sum to 10');
check('same tens 62×68', getTrickTag(62, 68,'*'), 'Same tens, units sum to 10');
check('near100 above', getTrickTag(103, 108,'*'), 'Near 100 trick');
check('near100 below', getTrickTag(97, 94,  '*'), 'Near 100 trick');
check('near100 mixed', getTrickTag(103, 94, '*'), 'Near 100 trick');
check('both end 5',    getTrickTag(45, 85,  '*'), 'Both end in 5');
check('double&half',   getTrickTag(15, 78,  '*'), 'Double & Half');
check('mul reverses',  getTrickTag(53, 35,  '*'), 'Multiplying reverses');
check('equidistant',   getTrickTag(48, 52,  '*'), 'Equidistant from midpoint');
check('sq end 5 (35)', getTrickTag(35, 35,  '*'), 'Squares ending in 5');
check('sq end 5 (85)', getTrickTag(85, 85,  '*'), 'Squares ending in 5');
check('sq 41-59 (47)', getTrickTag(47, 47,  '*'), 'Squares 41–59');
check('sq 41-59 (53)', getTrickTag(53, 53,  '*'), 'Squares 41–59');
check('sq generic',    getTrickTag(36, 36,  '*'), 'Квадрат числа');
// Scoring cross-trick decisions
check('99×98 → ×99 (not near-100)',       getTrickTag(99, 98,   '*'), '× 99 трюк');    // ×99 base 1.5 < near-100 2.02
check('101×103 → ×101 (not near-100)',    getTrickTag(101, 103, '*'), '× 101 trick');  // ×101 2.01 < near-100 2.03
check('93×97 → near-100 (not same-tens)', getTrickTag(93, 97,   '*'), 'Near 100 trick'); // same-tens=2.81, near-100=2.21
check('45×55 → both-end-5 (not equidist)',getTrickTag(45, 55,   '*'), 'Both end in 5'); // both-end-5=2.5, equidist=2.75
check('47×19 → near-decade',              getTrickTag(47, 19,   '*'), 'Округление при ×');
check('47×21 → near-decade',              getTrickTag(47, 21,   '*'), 'Округление при ×');

section('getTrickTag — subtraction');
check('sub ends 9',     getTrickTag(54, 19, '-'), 'Вычитание 9');
check('sub ends 8',     getTrickTag(54, 18, '-'), 'Вычитание');
check('sub ends 7',     getTrickTag(54, 17, '-'), 'Вычитание');
check('sub reverses 2d',getTrickTag(73, 37, '-'), 'Subtracting reverses');
check('sub reverses 3d',getTrickTag(812,218,'-'), 'Subtracting reverses');
check('sub reverses 4d',getTrickTag(4002,2004,'-'),'Subtracting reverses');
check('sub generic',    getTrickTag(54, 23, '-'), 'Вычитание');

section('getTrickTag — addition');
check('add rounding',  getTrickTag(54, 19, '+'), 'Округление +1');
check('add rounding 2',getTrickTag(54, 18, '+'), 'Округление +2');
check('add generic',   getTrickTag(34, 52, '+'), 'Сложение');

section('getTrickTag — division');
check('÷2',  getTrickTag(44, 2,   '/'), '÷2 trick');
check('÷3',  getTrickTag(99, 3,   '/'), '÷3 trick');
check('÷6',  getTrickTag(48, 6,   '/'), '÷6 trick');
check('÷11', getTrickTag(132, 11, '/'), '÷11 trick');
check('÷5 fallback',  getTrickTag(120, 5,  '/'), 'Деление');
check('÷4 fallback',  getTrickTag(56,  4,  '/'), 'Деление');
check('÷8 fallback',  getTrickTag(648, 8,  '/'), 'Деление');
check('÷9 fallback',  getTrickTag(81,  9,  '/'), 'Деление');
check('÷25 fallback', getTrickTag(300, 25, '/'), 'Деление');

// =============================================================
// MULTIPLICATION HINTS
// =============================================================

section('hintsMul — ×11 two-digit no carry (23×11=253)');
{
  const h = getHints(23, 11, '*', 253);
  has(h, '253', 'result 253');
  has(h, '5',   'middle digit 2+3=5');
}

section('hintsMul — ×11 two-digit with carry (87×11=957)');
{
  const h = getHints(87, 11, '*', 957);
  has(h, '957', 'result');
  has(h, '15',  'digit sum 8+7=15 triggers carry');
}

section('hintsMul — ×11 large (123×11=1353)');
{
  const h = getHints(123, 11, '*', 1353);
  has(h, '1353', 'result');
  has(h, '1230', '123×10=1230');
}

section('hintsMul — ×9 (47×9=423)');
{
  const h = getHints(47, 9, '*', 423);
  has(h, '470', '47×10=470');
  has(h, '423', 'result');
}

section('hintsMul — ×5 (84×5=420)');
{
  const h = getHints(84, 5, '*', 420);
  has(h, '840', '84×10=840');
  has(h, '420', 'result');
}

section('hintsMul — ×25 (84×25=2100)');
{
  const h = getHints(84, 25, '*', 2100);
  has(h, '8400', '84×100=8400');
  has(h, '2100', 'result');
}

section('hintsMul — ×4 (37×4=148)');
{
  const h = getHints(37, 4, '*', 148);
  has(h, '74',  '37×2=74');
  has(h, '148', 'result');
}

section('hintsMul — ×8 (37×8=296)');
{
  const h = getHints(37, 8, '*', 296);
  has(h, '74',  '37×2=74');
  has(h, '148', '74×2=148');
  has(h, '296', 'result');
}

section('hintsMul — ×99 (37×99=3663)');
{
  const h = getHints(37, 99, '*', 3663);
  has(h, '3700', '37×100=3700');
  has(h, '3663', 'result');
  // commutative
  const hc = getHints(99, 37, '*', 3663);
  has(hc, '3700', 'commutative: ×99 still uses 37');
}

section('hintsMul — ×75 (76×75=5700)');
{
  const h = getHints(76, 75, '*', 5700);
  has(h, '19',   '76÷4=19');
  has(h, '57',   '19×3=57');
  has(h, '5700', 'result');
  // divisible-by-4 case: 42×75=3150
  const h2 = getHints(42, 75, '*', 3150);
  has(h2, '3150', 'result 42×75');
  // commutative
  const hc = getHints(75, 76, '*', 5700);
  has(hc, '5700', 'commutative ×75');
}

section('hintsMul — ×125 (320×125=40000)');
{
  const h = getHints(320, 125, '*', 40000);
  has(h, '40',    '320÷8=40');
  has(h, '40000', 'result');
}

section('hintsMul — ×101 two-digit (23×101=2323)');
{
  const h = getHints(23, 101, '*', 2323);
  has(h, '2300', '23×100=2300');
  has(h, '2323', 'result');
}

section('hintsMul — ×101 three-digit (438×101=44238)');
{
  const h = getHints(438, 101, '*', 44238);
  has(h, '43800', '438×100=43800');
  has(h, '44238', 'result');
  // commutative
  const hc = getHints(101, 438, '*', 44238);
  has(hc, '43800', 'commutative ×101');
}

section('hintsMul — ×111 (87×111=9657)');
{
  const h = getHints(87, 111, '*', 9657);
  has(h, '8700', '87×100=8700');
  has(h, '870',  '87×10=870');
  has(h, '87',   '87×1=87');
  has(h, '9657', 'result');
  // commutative
  const hc = getHints(111, 87, '*', 9657);
  has(hc, '8700', 'commutative ×111');
}

section('hintsMul — same tens, units sum to 10 (43×47=2021)');
{
  const h = getHints(43, 47, '*', 2021);
  has(h, '21',   '3×7=21 last part');
  has(h, '20',   '4×5=20 leading part');
  has(h, '2021', 'result');
}

section('hintsMul — same tens, units sum to 10 (68×62=4216)');
{
  const h = getHints(68, 62, '*', 4216);
  has(h, '16',   '8×2=16');
  has(h, '42',   '6×7=42');
  has(h, '4216', 'result');
}

section('hintsMul — same tens, 3-digit leading (173×177=30621)');
{
  const h = getHints(173, 177, '*', 30621);
  has(h, '21',    '3×7=21');
  has(h, '30621', 'result');
}

section('hintsMul — near 100 both above (103×108=11124)');
{
  const h = getHints(103, 108, '*', 11124);
  has(h, '+3',    'excess +3');
  has(h, '+8',    'excess +8');
  has(h, '24',    '3×8=24 last two');
  has(h, '111',   '103+8=111 leading');
  has(h, '11124', 'result');
}

section('hintsMul — near 100 both above, small product (101×102=10302)');
{
  // last part = 1×2=2 → must be padded to "02"
  const h = getHints(101, 102, '*', 10302);
  has(h, '02',    'last two digits padded to 02');
  has(h, '10302', 'result');
}

section('hintsMul — near 100 both below (97×94=9118)');
{
  const h = getHints(97, 94, '*', 9118);
  has(h, '−3',  'deficit −3');
  has(h, '−6',  'deficit −6');
  has(h, '18',  '3×6=18 last two');
  has(h, '91',  'leading part');
  has(h, '9118','result');
}

section('hintsMul — near 100 both below, small product (98×99=9702)');
{
  // deficit 2 and 1, product 2 → pad to "02"
  const h = getHints(98, 99, '*', 9702);
  has(h, '02',   'last two digits padded to 02');
  has(h, '9702', 'result');
}

section('hintsMul — near 100 mixed (103×94=9682)');
{
  const h = getHints(103, 94, '*', 9682);
  has(h, '+3',   'excess +3');
  has(h, '−6',   'deficit −6');
  has(h, '9682', 'result');
}

section('hintsMul — near 100 mixed (108×93=10044)');
{
  const h = getHints(108, 93, '*', 10044);
  has(h, '44',    '8×7=56, 100−56=44 last part');
  has(h, '10044', 'result');
}

section('hintsMul — both end in 5, even sum (45×85=3825)');
{
  const h = getHints(45, 85, '*', 3825);
  has(h, '25',   'ends in 25 (even sum 4+8=12)');
  has(h, '38',   'leading part 4×8+6=38');
  has(h, '3825', 'result');
}

section('hintsMul — both end in 5, odd sum (35×85=2975)');
{
  const h = getHints(35, 85, '*', 2975);
  has(h, '75',   'ends in 75 (odd sum 3+8=11)');
  has(h, '2975', 'result');
}

section('hintsMul — both end in 5 (65×45=2925)');
{
  const h = getHints(65, 45, '*', 2925);
  has(h, '2925', 'result');
}

section('hintsMul — double & half (15×78=1170)');
{
  const h = getHints(15, 78, '*', 1170);
  has(h, '39',   '78÷2=39');
  has(h, '30',   '15×2=30');
  has(h, '1170', 'result');
}

section('hintsMul — double & half (35×42=1470)');
{
  const h = getHints(35, 42, '*', 1470);
  has(h, '21',   '42÷2=21');
  has(h, '70',   '35×2=70');
  has(h, '1470', 'result');
}

section('hintsMul — multiplying reverses (53×35=1855)');
{
  const h = getHints(53, 35, '*', 1855);
  has(h, '15',   '5×3=15 digit product');
  has(h, '34',   '5²+3²=25+9=34');
  has(h, '1855', 'result');
}

section('hintsMul — multiplying reverses (43×34=1462)');
{
  const h = getHints(43, 34, '*', 1462);
  has(h, '12',   '4×3=12');
  has(h, '25',   '4²+3²=25');
  has(h, '1462', 'result');
}

section('hintsMul — equidistant from midpoint (48×52=2496)');
{
  const h = getHints(48, 52, '*', 2496);
  has(h, '50',   'midpoint 50');
  has(h, '2500', '50²=2500');
  has(h, '4',    'd²=2²=4');
  has(h, '2496', 'result');
}

section('hintsMul — equidistant from midpoint (46×54=2484)');
{
  // small=46, round=50, diff=-4 → near-decade won't fire (|diff|=4>2)
  const h = getHints(46, 54, '*', 2484);
  has(h, '50',   'midpoint 50');
  has(h, '2500', '50²=2500');
  has(h, '16',   'd²=4²=16');
  has(h, '2484', 'result');
}

section('hintsMul — squares ending in 5 (35²=1225)');
{
  const h = getHints(35, 35, '*', 1225);
  has(h, '25',   'ends in 25');
  has(h, '12',   '3×4=12');
  has(h, '1225', 'result');
}

section('hintsMul — squares ending in 5 (85²=7225)');
{
  const h = getHints(85, 85, '*', 7225);
  has(h, '72',   '8×9=72');
  has(h, '7225', 'result');
}

section('hintsMul — squares ending in 5 (115²=13225)');
{
  const h = getHints(115, 115, '*', 13225);
  has(h, '132',   '11×12=132');
  has(h, '13225', 'result');
}

section('hintsMul — squares 41–59 (47²=2209)');
{
  const h = getHints(47, 47, '*', 2209);
  has(h, '3',    'k=3');
  has(h, '22',   '25−3=22');
  has(h, '09',   '3²=09');
  has(h, '2209', 'result');
}

section('hintsMul — squares 41–59 (53²=2809)');
{
  const h = getHints(53, 53, '*', 2809);
  has(h, '3',    'k=3');
  has(h, '28',   '25+3=28');
  has(h, '09',   '3²=09');
  has(h, '2809', 'result');
}

section('hintsMul — squares 41–59 (50²=2500)');
{
  const h = getHints(50, 50, '*', 2500);
  has(h, '25',   '25+0=25');
  has(h, '2500', 'result');
}

section('hintsMul — generic square / deviation (31²=961)');
{
  const h = getHints(31, 31, '*', 961);
  has(h, '961', 'result');
}

section('hintsMul — generic square / deviation (27²=729)');
{
  const h = getHints(27, 27, '*', 729);
  has(h, '30',  'round to 30');
  has(h, '729', 'result');
}

section('hintsMul — multiply by multiple of 10 (47×30=1410)');
{
  const h = getHints(47, 30, '*', 1410);
  has(h, '1410', 'result');
}

section('hintsMul — multiply by multiple of 10 (73×20=1460)');
{
  const h = getHints(73, 20, '*', 1460);
  has(h, '1460', 'result');
}

section('hintsMul — generic split (37×16=592)');
{
  // midpoint=(37+16)/2=26.5 → equidistant won't fire; no other special trick
  const h = getHints(37, 16, '*', 592);
  has(h, '592', 'result');
}

section('hintsMul — generic split (24×13=312)');
{
  const h = getHints(24, 13, '*', 312);
  has(h, '312', 'result');
}

// =============================================================
// SUBTRACTION HINTS
// =============================================================

section('hintsSub — round up ends in 9 (54−19=35)');
{
  const h = getHints(54, 19, '-', 35);
  has(h, '20', 'round 19→20');
  has(h, '34', '54−20=34');
  has(h, '35', 'result');
}

section('hintsSub — round up ends in 8 (64−18=46)');
{
  const h = getHints(64, 18, '-', 46);
  has(h, '20', 'round 18→20');
  has(h, '46', 'result');
}

section('hintsSub — round up ends in 7 (53−17=36)');
{
  const h = getHints(53, 17, '-', 36);
  has(h, '20', 'round 17→20');
  has(h, '36', 'result');
}

section('hintsSub — multiple of 10 (74−30=44)');
{
  const h = getHints(74, 30, '-', 44);
  has(h, '44', 'result');
}

section('hintsSub — multiple of 10 (80−30=50)');
{
  const h = getHints(80, 30, '-', 50);
  has(h, '50', 'result');
}

section('hintsSub — count up complement (53−26=27)');
{
  const h = getHints(53, 26, '-', 27);
  has(h, '27', 'result');
}

section('hintsSub — count up complement (84−37=47)');
{
  const h = getHints(84, 37, '-', 47);
  has(h, '47', 'result');
}

section('hintsSub — subtracting reverses 2-digit (73−37=36)');
{
  const h = getHints(73, 37, '-', 36);
  has(h, '9',   '×9 factor');
  has(h, '36',  'result');
}

section('hintsSub — subtracting reverses 3-digit (812−218=594)');
{
  const h = getHints(812, 218, '-', 594);
  has(h, '99',  '×99 factor');
  has(h, '594', 'result');
}

section('hintsSub — subtracting reverses 4-digit X00Y (4002−2004=1998)');
{
  const h = getHints(4002, 2004, '-', 1998);
  has(h, '999',  '×999 factor');
  has(h, '1998', 'result');
}

section('hintsSub — difference of squares bonus (2916−576=2340)');
{
  // 2916=54², 576=24²; (54+24)(54-24)=78×30=2340
  const h = getHints(2916, 576, '-', 2340);
  has(h, '54',   'sqrt(2916)=54');
  has(h, '24',   'sqrt(576)=24');
  has(h, '78',   '54+24=78');
  has(h, '30',   '54−24=30');
  has(h, '2340', 'result');
}

section('hintsSub — difference of squares (225−144=81)');
{
  // 225=15², 144=12²; (15+12)(15-12)=27×3=81
  const h = getHints(225, 144, '-', 81);
  has(h, '15',  'sqrt(225)=15');
  has(h, '12',  'sqrt(144)=12');
  has(h, '81',  'result');
}

// =============================================================
// DIVISION HINTS
// =============================================================

section('hintsDiv — ÷5 (120÷5=24)');
{
  const h = getHints(120, 5, '/', 24);
  has(h, '240', '120×2=240');
  has(h, '24',  'result');
}

section('hintsDiv — ÷2 even (44÷2=22)');
{
  const h = getHints(44, 2, '/', 22);
  has(h, '22', 'result');
}

section('hintsDiv — ÷2 odd (7÷2=3.5)');
{
  const h = getHints(7, 2, '/', 3.5);
  has(h, '3',   'integer part 3');
  has(h, '0.5', '+0.5');
}

section('hintsDiv — ÷3 divisible (132÷3=44)');
{
  const h = getHints(132, 3, '/', 44);
  has(h, '1 + 3 + 2', 'digits written out');
  has(h, '6',   'digit sum = 6');
  has(h, '44',  'result');
}

section('hintsDiv — ÷3 with remainder (34÷3≈11.33)');
{
  const h = getHints(34, 3, '/', 34/3);
  has(h, '3 + 4', 'digits written out');
  has(h, '7',    'digit sum = 7');
  has(h, '1',    'remainder: 7÷3 r1');
}

section('hintsDiv — ÷4 divisible (56÷4=14)');
{
  const h = getHints(56, 4, '/', 14);
  has(h, '56',  'last two digits mentioned');
  has(h, '28',  '56÷2=28');
  has(h, '14',  'result');
}

section('hintsDiv — ÷4 not divisible (58÷4=14.5)');
{
  const h = getHints(58, 4, '/', 14.5);
  has(h, '58',  'last two digits mentioned');
}

section('hintsDiv — ÷6 divisible (48÷6=8)');
{
  const h = getHints(48, 6, '/', 8);
  has(h, '8',  'last digit check');
  has(h, '3',  'digit sum divisible by 3');
}

section('hintsDiv — ÷6 fails odd check (35÷6≈5.83)');
{
  const h = getHints(35, 6, '/', 35/6);
  has(h, '5',  'last digit 5 (odd)');
}

section('hintsDiv — ÷8 divisible (648÷8=81)');
{
  const h = getHints(648, 8, '/', 81);
  has(h, '648', 'last 3 digits');
  has(h, '324', '648÷2=324');
  has(h, '162', '324÷2=162');
  has(h, '81',  'result');
}

section('hintsDiv — ÷8 not divisible (650÷8=81.25)');
{
  const h = getHints(650, 8, '/', 81.25);
  has(h, '650', 'last 3 digits mentioned');
}

section('hintsDiv — ÷9 divisible (81÷9=9)');
{
  const h = getHints(81, 9, '/', 9);
  has(h, '9',  'result');
}

section('hintsDiv — ÷9 with remainder (52÷9≈5.78)');
{
  const h = getHints(52, 9, '/', 52/9);
  has(h, '7',  'digit sum 5+2=7');
  has(h, '7',  'remainder info');
}

section('hintsDiv — ÷11 with remainder (13542÷11≈1231.09)');
{
  const h = getHints(13542, 11, '/', 13542/11);
  has(h, '+1',  'alternating: +1');
  has(h, '−3',  'alternating: −3');
  has(h, '1',   'alternating sum = 1, remainder = 1');
}

section('hintsDiv — ÷11 divisible (1353÷11=123)');
{
  const h = getHints(1353, 11, '/', 123);
  has(h, '0',   'alternating sum = 0 → divisible');
  has(h, '123', 'result');
}

section('hintsDiv — ÷25 (300÷25=12)');
{
  const h = getHints(300, 25, '/', 12);
  has(h, '1200', '300×4=1200');
  has(h, '12',   'result');
}

section('hintsDiv — ÷ generic integer (84÷7=12)');
{
  const h = getHints(84, 7, '/', 12);
  has(h, '12', 'result');
  has(h, '7',  'divisor in hint');
}

section('hintsDiv — ÷ generic non-integer (10÷3≈3.33)');
{
  const h = getHints(10, 3, '/', 10/3);
  has(h, '3',  'integer part 3');
  has(h, '1',  'remainder 1');
}

// =============================================================
// ADDITION HINTS
// =============================================================

section('hintsAdd — round up ×9 (54+19=73)');
{
  const h = getHints(54, 19, '+', 73);
  has(h, '20', '19→20');
  has(h, '74', '54+20=74 intermediate');
  has(h, '73', 'result');
}

section('hintsAdd — round up ×8 (54+18=72)');
{
  const h = getHints(54, 18, '+', 72);
  has(h, '20', '18→20');
  has(h, '72', 'result');
}

section('hintsAdd — round up ×7 (54+17=71)');
{
  const h = getHints(54, 17, '+', 71);
  has(h, '20', '17→20');
  has(h, '71', 'result');
}

section('hintsAdd — split by tens (34+52=86)');
{
  const h = getHints(34, 52, '+', 86);
  has(h, '30',  'tens part of 34');
  has(h, '50',  'tens part of 52');
  has(h, '86',  'result');
}

section('hintsAdd — split by tens (23+56=79)');
{
  const h = getHints(23, 56, '+', 79);
  has(h, '20',  'tens of 23');
  has(h, '50',  'tens of 56');
  has(h, '79',  'result');
}

section('hintsAdd — generic left-to-right (30+50=80)');
{
  const h = getHints(30, 50, '+', 80);
  has(h, '80', 'result');
}

section('hintsAdd — generic left-to-right (12+12=24)');
{
  const h = getHints(12, 12, '+', 24);
  has(h, '24', 'result');
}

// =============================================================
// NEW TRICKS
// =============================================================

section('getTrickTag — near-decade ×');
check('×19 tag',  getTrickTag(47, 19, '*'), 'Округление при ×');
check('×21 tag',  getTrickTag(47, 21, '*'), 'Округление при ×');
check('×29 tag',  getTrickTag(73, 29, '*'), 'Округление при ×');
check('×31 tag',  getTrickTag(73, 31, '*'), 'Округление при ×');
check('×28 tag',  getTrickTag(56, 28, '*'), 'Округление при ×');
check('×32 tag',  getTrickTag(56, 32, '*'), 'Округление при ×');
// should NOT fire for equidistant pairs (diff ≤ 10)
check('48×52 still equidistant', getTrickTag(48, 52, '*'), 'Equidistant from midpoint');

section('getTrickTag — addition n²+n');
check('49+7',  getTrickTag(49, 7,  '+'), 'n² + n трюк');
check('7+49',  getTrickTag(7,  49, '+'), 'n² + n трюк');
check('36+6',  getTrickTag(36, 6,  '+'), 'n² + n трюк');
check('81+9',  getTrickTag(81, 9,  '+'), 'n² + n трюк');

section('getTrickTag — sum of squares ×101');
check('72²+13²',  getTrickTag(5184, 169,  '+'), 'Сумма квадратов ×101');
check('93²+21²',  getTrickTag(8649, 441,  '+'), 'Сумма квадратов ×101');
check('82²+12²',  getTrickTag(6724, 144,  '+'), 'Сумма квадратов ×101');

section('hintsMul — near-decade ×19 (47×19=893)');
{
  const h = getHints(47, 19, '*', 893);
  has(h, '20',   'round 19→20');
  has(h, '940',  '47×20=940');
  has(h, '47',   'subtract 47×1');
  has(h, '893',  'result');
}

section('hintsMul — near-decade ×21 (47×21=987)');
{
  const h = getHints(47, 21, '*', 987);
  has(h, '20',   'round 21→20');
  has(h, '940',  '47×20=940');
  has(h, '47',   'add 47×1');
  has(h, '987',  'result');
}

section('hintsMul — near-decade ×29 (73×29=2117)');
{
  const h = getHints(73, 29, '*', 2117);
  has(h, '30',   'round 29→30');
  has(h, '2190', '73×30=2190');
  has(h, '73',   'subtract 73×1');
  has(h, '2117', 'result');
}

section('hintsMul — near-decade ×31 (73×31=2263)');
{
  const h = getHints(73, 31, '*', 2263);
  has(h, '30',   'round 31→30');
  has(h, '2190', '73×30=2190');
  has(h, '73',   'add 73×1');
  has(h, '2263', 'result');
}

section('hintsMul — near-decade ×28 (56×28=1568)');
{
  const h = getHints(56, 28, '*', 1568);
  has(h, '30',   'round 28→30');
  has(h, '1680', '56×30=1680');
  has(h, '112',  '56×2=112');
  has(h, '1568', 'result');
}

section('hintsAdd — n²+n: 49+7=56');
{
  const h = getHints(49, 7, '+', 56);
  has(h, '49',  'mentions 49');
  has(h, '7',   'mentions 7');
  has(h, '56',  'result');
  has(h, '×',   'multiplication step');
}

section('hintsAdd — n²+n: 7+49=56 (commutative)');
{
  const h = getHints(7, 49, '+', 56);
  has(h, '56',  'result');
}

section('hintsAdd — n²+n: 36+6=42');
{
  const h = getHints(36, 6, '+', 42);
  has(h, '6',   'sqrt 36 = 6');
  has(h, '7',   '6+1=7');
  has(h, '42',  'result');
}

section('hintsAdd — n²+n: 81+9=90');
{
  const h = getHints(81, 9, '+', 90);
  has(h, '9',   'sqrt 81 = 9');
  has(h, '10',  '9+1=10');
  has(h, '90',  'result');
}

section('hintsAdd — sum of squares ×101: 72²+13²=5353');
{
  // 72²=5184, 13²=169, sum=5353 = (7²+2²)×101 = 53×101
  const h = getHints(5184, 169, '+', 5353);
  has(h, '72',   'sqrt(5184)=72 mentioned');
  has(h, '13',   'sqrt(169)=13 mentioned');
  has(h, '53',   '7²+2²=49+4=53');
  has(h, '5353', 'result');
}

section('hintsAdd — sum of squares ×101: 93²+21²=9090');
{
  // 93²=8649, 21²=441, sum=9090 = (9²+3²)×101 = 90×101
  const h = getHints(8649, 441, '+', 9090);
  has(h, '93',   'sqrt(8649)=93');
  has(h, '21',   'sqrt(441)=21');
  has(h, '90',   '9²+3²=90');
  has(h, '9090', 'result');
}

// =============================================================
// SUB-HINTS
// =============================================================

const findSub = h => h.find(x => x && typeof x === 'object' && x.sub);

section('sub-hints — equidistant 37×49: sub-hint for 43²');
{
  const h = hintsMul(37, 49, 1813);
  const sub = findSub(h);
  check('sub-hint object present', sub !== undefined, true);
  check('label mentions 43 × 43', sub && sub.label.includes('43'), true);
  check('sub steps are array', sub && Array.isArray(sub.steps), true);
  check('sub steps non-empty', sub && sub.steps.length > 0, true);
}

section('sub-hints — sq-end-5 135²: sub-hint for 13×14');
{
  const h = hintsMul(135, 135, 18225);
  const sub = findSub(h);
  check('sub-hint object present', sub !== undefined, true);
  check('label mentions 13', sub && sub.label.includes('13'), true);
  check('label mentions 14', sub && sub.label.includes('14'), true);
}

section('sub-hints — sq-end-5 115²: NO sub-hint (11×12 is trivial ×11)');
{
  const h = hintsMul(115, 115, 13225);
  const sub = findSub(h);
  check('no sub-hint for trivial 11×12', sub, undefined);
}

section('sub-hints — depth guard: sub-hints inside sub stay flat');
{
  // At depth=1, _subHint should return null (no nested sub-hints)
  const h = hintsMul(37, 49, 1813, 1);
  const sub = findSub(h);
  check('no sub-hint at depth=1', sub, undefined);
}

// =============================================================
// SUMMARY
// =============================================================
console.log(`\n${'─'.repeat(40)}`);
const total = passed + failed;
console.log(`\x1b[32m${passed} passed\x1b[0m  \x1b[31m${failed} failed\x1b[0m  (${total} total)`);
if (failed > 0) process.exit(1);

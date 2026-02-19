# Mental Calculator — Project Summary
_Last updated: 2026-02-19_

## Project

Mental math hint engine deployed as a static web app.

- **Repo:** https://github.com/Felegz/Mental_calculator
- **Live:** Netlify (auto-deploy from main)
- **Stack:** Vanilla JS + HTML + CSS, no build step, no npm

## Files

| File | Lines | Purpose |
|---|---|---|
| `index.html` | — | Main UI |
| `styles.css` | — | Styles + color system |
| `app.js` | — | UI logic, input handling |
| `hints.js` | 488 | Hint engine (all tricks) |
| `tests.js` | 871 | Automated test suite |
| `other/mental_math_book.md` | 11622 | Source book: "Number Sense Tricks" – Bryant Heath |

## Running Tests

```
node tests.js
```

No dependencies. Uses `eval(fs.readFileSync('./hints.js'))`. All 295 tests pass.

---

## Hint Engine Architecture (`hints.js`)

### Entry points

- `getTrickTag(a, b, op)` → string label for the trick (shown in UI badge)
- `getHints(a, b, op, res)` → array of HTML hint strings
- `isSquare(a, b)` → `a === b`
- `formatNum(n)` → locale-formatted number

### Color classes used in hints

| Class | Meaning |
|---|---|
| `hc-input` | Original input numbers |
| `hc-calc` | Intermediate calculation value |
| `hc-part` | Part of the final answer |
| `hc-key` | Key insight / last digits |
| `hc-answer` | Final answer |

---

## Implemented Tricks

### Multiplication (`hintsMul`)

Order matters — first matching branch wins.

1. `small === 11` — ×11 trick:
   - 2-digit: insert digit sum in the middle (e.g. 23×11 = 2|5|3 = 253)
   - carry if digit sum ≥ 10 (e.g. 87×11 = 957)
   - large: ×10 + original (e.g. 123×11 = 1353)
2. `small === 9` — ×9 = ×10 − 1
3. `small === 5` — ×5 = ×10 ÷ 2
4. `small === 25` — ×25 = ×100 ÷ 4
5. `small === 4` — ×4 = double twice
6. `small === 8` — ×8 = double thrice
7. `a===99 || b===99` — ×99 = ×100 − 1
8. `a===75 || b===75` — ×75 = ¾ × 100 (÷4, ×3, ×100)
9. `small === 125` — ×125 = ×1000 ÷ 8
10. `a===101 || b===101` — ×101: shift+add (uses `other101`, not `big`)
11. `a===111 || b===111` — ×111 = ×100 + ×10 + ×1
12. Same tens, units sum to 10 — e.g. 43×47: lead×(lead+1) | units×units
13. Near 100, both above — e.g. 103×108 = 111|24
14. Near 100, both below — e.g. 97×94 = 91|18
15. Near 100, mixed — one above, one below
    - Note: last 2 digits padded with `padStart(2,'0')` for small products
16. Both end in 5 — e.g. 45×85: even sum → 25, odd sum → 75
17. Double & Half — one ends in 5, other is even
18. Multiplying reverses — 53×35 = 100(dp) + 10(sum of squares) + dp
19. **Near-decade** _(NEW)_ — `|small - round10| ≤ 2` and `|a-b| > 10`
    - e.g. 47×19 → 47×20 − 47 = 893
    - e.g. 73×31 → 73×30 + 73 = 2263
20. Equidistant from midpoint — a×b = mid² − d²
21. `a===b, n%10===5` — Squares ending in 5
22. `a===b, n>=41&&n<=59` — Squares 41–59: (50±k)² = 100(25±k) + k²
23. `a===b` generic — deviation from round: (r+d)(r−d) + d²
24. `small % 10 === 0` — multiply by multiple of 10
25. Generic split — break small into tens + units

### Division (`hintsDiv`)

1. `b===5` — ÷5 = ×2 ÷ 10
2. `b===2` — even: halve; odd: ⌊÷2⌋ + 0.5
3. `b===3` — digit sum divisibility + remainder
4. `b===11` — alternating digit sum (from ones); remainder
5. `b===6` — check ÷2 (even last digit) and ÷3 (digit sum)
6. `b===4` — last 2 digits, then ÷2 ÷2
7. `b===8` — last 3 digits, then ÷2 ÷2 ÷2
8. `b===25` — ÷25 = ×4 ÷ 100
9. `b===9` — digit sum divisibility
10. Generic integer — "how many times does b fit in a"
11. Generic non-integer — integer part + remainder

### Subtraction (`hintsSub`)

1. `b%10 === 9/8/7` — round up, subtract, add back
2. `b%10 === 0` — subtract round number
3. Generic — count up (complement method)
4. **BONUS: Subtracting reverses**
   - 2-digit (73−37): difference of digits × 9
   - 3-digit (812−218): difference of leading digits × 99
   - 4-digit X00Y (4002−2004): difference × 999
5. **BONUS: Difference of squares** — if both a and b are perfect squares:
   - a² − b² = (a+b)(a−b)

### Addition (`hintsAdd`)

1. **n² + n = n(n+1)** _(NEW)_ — e.g. 49+7 = 7×8 = 56, 81+9 = 9×10 = 90
2. **Sum of Squares ×101** _(NEW)_ — both are 2-digit perfect squares;
   conditions: `units(p) = tens(q)+1` and `tens(p)+units(q) = 10`
   → answer = (d1²+d2²) × 101
   - e.g. 72²+13² = (7²+2²)×101 = 53×101 = 5353
3. Last digit ≥ 7 → rounding (+1/+2/+3 depending on last digit)
4. Different tens → split both by tens, add separately
5. Generic — left-to-right

---

## getTrickTag Labels (for UI badge)

| Label | When |
|---|---|
| `× 11 трюк` | one operand = 11 |
| `× 9 трюк` | one = 9 |
| `× 5 трюк` | one = 5 |
| `× 25 трюк` | one = 25 |
| `× 99 трюк` | one = 99 |
| `× 101 trick` | one = 101 |
| `× 111 trick` | one = 111 |
| `× 75 trick` | one = 75 |
| `× 125 trick` | one = 125 |
| `Same tens, units sum to 10` | — |
| `Near 100 trick` | — |
| `Both end in 5` | — |
| `Double & Half` | — |
| `Multiplying reverses` | — |
| `Округление при ×` | near-decade (|diff|≤2, |a-b|>10) _(NEW)_ |
| `Equidistant from midpoint` | — |
| `Squares ending in 5` | a===b, ends in 5 |
| `Squares 41–59` | a===b, 41–59 |
| `Квадрат числа` | a===b, generic |
| `Умножение` | fallback |
| `n² + n трюк` | one is square, other is root _(NEW)_ |
| `Сумма квадратов ×101` | special case _(NEW)_ |
| `Округление +1/+2` | addition, last digit 9/8 |
| `Сложение` | addition fallback |
| `Вычитание 9` | subtraction, b ends in 9 |
| `Subtracting reverses` | a and b are reverses |
| `Вычитание` | subtraction fallback |
| `÷2/÷3/÷6/÷11 trick` | — |
| `Деление` | division fallback |

---

## Known Decisions / Architecture Notes

- `big = Math.max(a,b)`, `small = Math.min(a,b)` computed at top of `hintsMul`
- ×99, ×101, ×111 use `other99/other101/other111` (not `big`) to get the non-special operand
- Near 100: both-above and both-below pad last two digits with `padStart(2,'0')`
- Near-decade check runs **before** equidistant in `getTrickTag` (otherwise 47×19 would wrongly match equidistant)
- Hint ordering in `getTrickTag` matters — later checks are fallbacks
- Hints are HTML strings; strip tags before substring matching in tests

---

## Test Suite Structure (`tests.js`)

Sections:
- `getTrickTag` — multiplication (32 checks), subtraction, addition, division
- `hintsMul` — one section per trick, multiple `has()` per case
- `hintsSub` — rounding, multiples of 10, count-up, reverses (2/3/4-digit), diff of squares
- `hintsDiv` — all 11 branches, both even/odd and remainder/no-remainder variants
- `hintsAdd` — rounding, split by tens, generic, n²+n, sum-of-squares ×101

Helpers:
- `check(label, actual, expected)` — strict equality
- `has(hints, substr, label)` — at least one hint (with HTML stripped) contains substr
- `hasNot(hints, substr, label)` — none contain substr
- `section(name)` — console grouping

---

## What's Left from the Book (not yet implemented)

Potentially useful for the calculator:

- **Multiplying Mixed Numbers** (§1.3.8) — FOIL for `n½ × n½` type
- **a × a/b trick** (§1.3.9) — `a × a/b = [a + (a−b)] + (a−b)²/b`
- **Sum of Consecutive Squares** (§1.3.3) — `n² + (n+1)² = 2n² + 2n + 1`
- **Factoring patterns** (§1.3.2) — `a² + (3a)² = 10a²`, `n×k + m×n = n(k+m)` etc.
- **Remainder tricks for other divisors** (§1.4.4–1.4.5)
- Better **hintsAdd generic** for 3-digit additions

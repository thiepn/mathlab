# First source-linked university acceptance sample (historical AMP)

**Source:** Prof. Dr. Angela Kunoth / Sandra Boschert, *Algorithmische Mathematik und Programmieren*, Universität zu Köln, WS 2017/18, **Übungsblatt 3** (26 October 2017), original university PDF:
https://numana.uni-koeln.de/sites/kunoth/user_upload/Algo_17_18/Blatt3.pdf

**Scope:** This is an authentic **2017/18** assignment, not a 2026/27 assignment. Do not substitute this old sheet for the real current-semester ILIAS worksheets. The currently listed AMP syllabus is numerical error analysis, linear systems (LR/QR) and least-squares, with practical Julia work:
https://numana.uni-koeln.de/lehre/lehrveranstaltungen-ws-2026-2027/algorithmische-mathematik-und-programmieren

## Worksheet task 13 — manually derived independent oracles

The exercise specifies an **8-bit custom signed fixed-point** system: one sign bit, four bits for the integer part and three bits for the fraction. Thus each finite represented magnitude is a multiple of 1/8 up to 15 + 7/8. This is **not** IEEE-754 binary64.

| Subtask | Independently checkable answer | MathLab status |
| --- | --- | --- |
| 13(a) | +7.25 = `0 0111.010`; −5.625 = `1 0101.101` | Manual binary encoding; no certified custom-fixed-point encoder |
| 13(b) | 256 bit patterns but **255 different numeric values**, because signed +0 and −0 are duplicate values | Not an app result |
| 13(c) | Smallest positive = **1/8**; largest positive = **127/8 = 15.875** | Not an app result |
| 13(d) | Round 1/3 to closest grid point **3/8**; absolute error **1/24**; relative error **1/8** | **Only the two exact-rational subcalculations** are covered by automated MathLab tests |
| 13(e) | The interior-grid half-step absolute-error maximum is **1/16**. On the specified positive interval, maximum relative error **1/3** occurs at **3/16** (or is attained at the tie limit depending on the tie rule) | Not an app result |

The oracle for 13(d) is independently derived:

`8(1/3) = 8/3` is closest to integer 3, so `fl(1/3) = 3/8`. Then
- absolute error `3/8 − 1/3 = 1/24`;
- relative error `(1/24)/(1/3) = 1/8`.

The **regression test** `tests/officialHistoricalAmpWorksheet.test.ts` executes the actual MathLab exact algebra operation on these subcalculations. It **does not** claim that MathLab selects the nearest custom-format value, simulates rounding ties, decodes bit patterns or handles Julia programming tasks. These remain unsupported/unqualified until independently tested or implemented.

## Other tasks on this sheet

- **Task 12:** absolute/relative sensitivity for `acos(a/b)` given triangle side lengths. Requires explicit choice of perturbation norm/conditioning convention and independent analytic derivative checking; **not yet run** in MathLab.
- **Task 14:** normalized 3-digit binary floating-point arithmetic on restricted exponents. **Not certified** by the binary64 profiler.
- **Task 15:** first-order forward difference and cancellation/roundoff error. Derivation and numerical behavior require independent analytic error-oracle checks; **not yet run** in MathLab.

## How this fits release acceptance

- The existing Q2 tests are **representative synthetic examples**.
- This is a first **authentic historical-sheet source-linked mathematical regression**, restricted to exact rational arithmetic. Passing CI does **not** certify the complete official exercise or a hands-on UI workflow.
- The **2026/27** actual lecture-sheet/exam acceptance remains open as issue **#52**. Never mark it complete on historical/synthetic cases alone.
- Device/PWA/screen-reader qualification remains open as issue **#51**.

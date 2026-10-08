# Q2 — University workflow acceptance (provisional)

## Purpose and evidence

This stage tests realistic, independently checkable tasks in four third-semester fields, running them through the same cumulative P7MathEngine, parser and semantic-object resolution used by the MathLab production Worker.

Automated certification is **not** proof that MathLab solves arbitrary university exam questions. In particular, this initial baseline is not based on the student's actual lecture sheets, scripts or past exams. Those must be checked separately before claiming course-specific coverage.

## Executable baseline

The cases below are checked in tests/q2UniversityWorkflows.test.ts by the standard Vitest CI job. Each exercise specifies an input, operation and mathematical oracle, rather than merely checking whether output is nonempty.

| Course | Input and operation | Mathematical oracle | Boundary |
|---|---|---|---|
| Differentialgleichungen | linearode(1,0), ode-symbolic-solve | First-order linear analytic result, marked exact | Supported class; not a general symbolic ODE solver |
| Differentialgleichungen | ivp(y,0,1), ode-adaptive-solve, endpoint=1 | y(1)=e for y'=y, y(0)=1, within numeric tolerance | Approximate RK45 result; initial-value problems only |
| Stochastik | studentt(10), distribution-probability, event=le,value=0 | Student-t symmetry: F(0)=0.5 | Approximate CDF |
| Stochastik | jointpmf([[1/4,1/4],[1/8,3/8]]), joint-distribution-profile | E[X]=0.5, E[Y]=0.625, Cov(X,Y)=0.0625 | Uses documented zero-based support convention |
| Theoretische Informatik | master(2,2,1), complexity-profile | T(n)=2T(n/2)+n => Θ(n log n) | Master-theorem supported forms only |
| Theoretische Informatik | weighted graph, shortest-path | Shortest path 1→3→2→4 of cost 4 | Graph algorithms, not automata or formal languages |
| Algorithmische Mathematik & Programmieren | 5 quadratic sample pairs, polynomial-least-squares, degree=2,predictAt=5 | Fit y=(x+1)², R²≈1, prediction 36 | QR fit is approximate; inspect conditioning |
| Algorithmische Mathematik & Programmieren | [[2,1],[1,2]], numerical-eigen | Symmetric real eigenvalues 3 and 1 | Not a general nonsymmetric matrix eigensolver |

## Explicit unsupported / course-specific gaps

- **DGL:** general nonlinear symbolic ODEs, broad PDE boundary-value problems and proof-driven theory are not fully covered.
- **Stochastik:** mathematical proofs of convergence theorems, arbitrary measure-theoretic probability, and some large continuous multivariate models are outside the covered computational workflows.
- **Theoretische Informatik:** DFA/NFA construction and minimization, context-free grammars, pumping lemmas, Turing-machine reductions, decidability and computational-complexity proofs are **not certified** by graph and Master-theorem support. TI must not be advertised as complete.
- **AMP:** course-specific programming assignments, source-code execution/grading, arbitrary library APIs and every requested numerical method remain external. Regression outputs also require interpretation of numerical error and assumptions.

## Real-world acceptance protocol (not yet executed)

1. Collect a representative set of **actual** lecture/problem-sheet/exam problems from each course, including conceptual and negative cases.
2. For each: record problem source, exact input, desired outcome, expected result or proof, supported mathematical assumptions, executed MathLab operation and actual output.
3. Classify **correct**, **incorrect**, **unsupported**, or **UX-blocked**, and record a reproduction for each non-correct case.
4. Verify a full workflow from entering/editing math to saving, revisiting, interpreting results and finding a learning explanation.
5. Fix demonstrated mathematical defects before expanding scope. Unsupported problems should be visibly communicated as limitations, not silently approximated.
6. Re-run the exact-head mathematical, browser and production deployment checks for all changes.

**Q2 status: representative automated baseline in progress; real lecture-sheet/exam acceptance pending.** This does not increase or rewrite the frozen E12 22-domain mathematical audit score (66/100).

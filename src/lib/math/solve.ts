import type { AstNode, ComparisonOperator } from './ast';
import {
  addPolynomials, factorPolynomial, isPerfectSquareRational, makeBinary, makeNumber,
  makeSymbol, makeUnary, polynomialCoefficient, polynomialDegree, polynomialToAst, rationalToAst, symbolsIn,
  toPolynomial, rationalValue, sqrtDecomposition, sqrtRationalAst,
} from './algebra';
import { ONE, ZERO, add, div, isZero, mul, neg, rat, sign, sub, type Rational } from './rational';

export interface SolveStep {
  rule: string;
  explanation: string;
  beforeAst: AstNode;
  afterAst: AstNode;
}

export interface EquationSolution {
  status: 'solved' | 'all-real' | 'none' | 'unsupported';
  variable?: string;
  resultAst?: AstNode;
  solutions: AstNode[];
  steps: SolveStep[];
  warning?: string;
}

function equation(left: AstNode, right: AstNode): AstNode { return { type: 'equation', left, right }; }
function comparison(operator: ComparisonOperator, left: AstNode, right: AstNode): AstNode { return { type: 'comparison', operator, left, right }; }
function set(items: AstNode[]): AstNode { return { type: 'set', items }; }

function normalizeEquation(ast: Extract<AstNode, { type: 'equation' }>, variable: string) {
  const left = toPolynomial(ast.left, variable); const right = toPolynomial(ast.right, variable);
  if (!left || !right) return null;
  return addPolynomials(left, new Map([...right].map(([d, c]) => [d, neg(c)])));
}

export function solveEquation(ast: AstNode, variable?: string): EquationSolution {
  if (ast.type !== 'equation') return { status: 'unsupported', solutions: [], steps: [], warning: 'Solve requires an equation.' };
  const vars = variable ? [variable] : symbolsIn(ast);
  if (vars.length !== 1) return { status: 'unsupported', solutions: [], steps: [], warning: vars.length ? 'P4 solves one-variable polynomial equations. Use a semicolon-separated system for multiple variables.' : 'No solve variable was found.' };
  const x = vars[0];
  const poly = normalizeEquation(ast, x);
  if (!poly) return { status: 'unsupported', variable: x, solutions: [], steps: [], warning: 'P4 currently solves polynomial equations with exact rational coefficients.' };
  const degree = polynomialDegree(poly);
  const normalized = equation(polynomialToAst(poly, x), makeNumber(0));
  const steps: SolveStep[] = [];
  if (JSON.stringify(ast) !== JSON.stringify(normalized)) steps.push({ rule: 'move-all-terms', explanation: 'Move all terms to one side and combine like terms.', beforeAst: ast, afterAst: normalized });

  if (degree === 0) {
    if (isZero(polynomialCoefficient(poly, 0))) return { status: 'all-real', variable: x, resultAst: { type: 'symbol', name: 'R' }, solutions: [], steps };
    return { status: 'none', variable: x, resultAst: set([]), solutions: [], steps };
  }

  if (degree === 1) {
    const a = polynomialCoefficient(poly, 1); const c = polynomialCoefficient(poly, 0);
    const isolated = equation(makeBinary('*', rationalToAst(a), makeSymbol(x), true), rationalToAst(neg(c)));
    if (!isZero(c)) steps.push({ rule: 'isolate-variable-term', explanation: 'Move the constant term to the other side.', beforeAst: normalized, afterAst: isolated });
    const root = div(neg(c), a);
    const solved = equation(makeSymbol(x), rationalToAst(root));
    steps.push({ rule: 'divide-both-sides', explanation: 'Divide both sides by the nonzero coefficient of the variable.', beforeAst: isolated, afterAst: solved });
    return { status: 'solved', variable: x, resultAst: set([rationalToAst(root)]), solutions: [rationalToAst(root)], steps };
  }

  if (degree === 2) {
    const a = polynomialCoefficient(poly, 2); const b = polynomialCoefficient(poly, 1); const c = polynomialCoefficient(poly, 0);
    const discriminant = sub(mul(b, b), mul(rat(4n), mul(a, c)));
    if (sign(discriminant) < 0) {
      return { status: 'none', variable: x, resultAst: set([]), solutions: [], steps, warning: 'No real solutions. Complex quadratic solutions are deferred to the complex-domain engine.' };
    }
    const sqrtDisc = isPerfectSquareRational(discriminant);
    const twoA = mul(rat(2n), a);
    let roots: AstNode[];
    if (sqrtDisc) {
      const r1 = div(add(neg(b), sqrtDisc), twoA);
      const r2 = div(sub(neg(b), sqrtDisc), twoA);
      roots = JSON.stringify(rationalToAst(r1)) === JSON.stringify(rationalToAst(r2)) ? [rationalToAst(r1)] : [rationalToAst(r1), rationalToAst(r2)];
      const factored = equation(factorPolynomial(poly, x), makeNumber(0));
      if (JSON.stringify(factored) !== JSON.stringify(normalized)) steps.push({ rule: 'factor-polynomial', explanation: 'Factor the quadratic over the rationals.', beforeAst: normalized, afterAst: factored });
      const solvedSet = set(roots);
      steps.push({ rule: 'zero-product-rule', explanation: 'Set each linear factor equal to zero.', beforeAst: factored, afterAst: solvedSet });
    } else {
      const decomposition = sqrtDecomposition(discriminant);
      if (!decomposition) return { status: 'none', variable: x, resultAst: set([]), solutions: [], steps, warning: 'No real solutions.' };
      const center = div(neg(b), twoA);
      const radicalCoefficient = div(decomposition.coefficient, twoA);
      const radical = sqrtRationalAst(decomposition.radicand);
      const radicalTerm = isZero(radicalCoefficient) ? makeNumber(0) : (radicalCoefficient.n === radicalCoefficient.d ? radical : makeBinary('*', rationalToAst(radicalCoefficient), radical, true));
      const centerAst = rationalToAst(center);
      const r1 = isZero(center) ? radicalTerm : makeBinary('+', centerAst, radicalTerm);
      const r2 = isZero(center) ? makeUnary('-', radicalTerm) : makeBinary('-', centerAst, radicalTerm);
      roots = [r1, r2];
      steps.push({ rule: 'quadratic-formula', explanation: 'Apply the quadratic formula and simplify the radical exactly.', beforeAst: normalized, afterAst: set(roots) });
    }
    return { status: 'solved', variable: x, resultAst: set(roots), solutions: roots, steps };
  }

  return { status: 'unsupported', variable: x, solutions: [], steps, warning: `P4 deterministic solving currently handles polynomial degree 2 or lower. This equation has degree ${degree}.` };
}

export interface InequalitySolution {
  status: 'solved' | 'all-real' | 'none' | 'unsupported';
  variable?: string;
  resultAst?: AstNode;
  steps: SolveStep[];
  warning?: string;
}

function reverse(op: ComparisonOperator): ComparisonOperator {
  if (op === '<') return '>';
  if (op === '<=') return '>=';
  if (op === '>') return '<';
  if (op === '>=') return '<=';
  return op;
}

export function solveInequality(ast: AstNode, variable?: string): InequalitySolution {
  if (ast.type !== 'comparison') return { status: 'unsupported', steps: [], warning: 'Inequality solving requires <, <=, >, >=, or !=.' };
  const vars = variable ? [variable] : symbolsIn(ast);
  if (vars.length !== 1) return { status: 'unsupported', steps: [], warning: 'P4 solves one-variable linear inequalities.' };
  const x = vars[0];
  const left = toPolynomial(ast.left, x); const right = toPolynomial(ast.right, x);
  if (!left || !right) return { status: 'unsupported', variable: x, steps: [], warning: 'P4 solves linear inequalities with exact rational coefficients.' };
  const poly = addPolynomials(left, new Map([...right].map(([d, c]) => [d, neg(c)])));
  if (polynomialDegree(poly) > 1) return { status: 'unsupported', variable: x, steps: [], warning: 'Polynomial inequalities above degree 1 are deferred to a later algebra extension.' };
  const a = polynomialCoefficient(poly, 1); const c = polynomialCoefficient(poly, 0);
  const normalized = comparison(ast.operator, polynomialToAst(poly, x), makeNumber(0));
  const steps: SolveStep[] = JSON.stringify(ast) === JSON.stringify(normalized) ? [] : [{ rule: 'move-all-terms', explanation: 'Move all terms to the left and combine like terms.', beforeAst: ast, afterAst: normalized }];
  if (isZero(a)) {
    const cSign = sign(c);
    const truth = ast.operator === '<' ? cSign < 0 : ast.operator === '<=' ? cSign <= 0 : ast.operator === '>' ? cSign > 0 : ast.operator === '>=' ? cSign >= 0 : cSign !== 0;
    return { status: truth ? 'all-real' : 'none', variable: x, resultAst: truth ? makeSymbol('R') : set([]), steps };
  }
  const boundary = div(neg(c), a);
  const op = sign(a) < 0 ? reverse(ast.operator) : ast.operator;
  const result = comparison(op, makeSymbol(x), rationalToAst(boundary));
  steps.push({ rule: sign(a) < 0 ? 'divide-and-reverse' : 'divide-positive', explanation: sign(a) < 0 ? 'Divide by the negative coefficient and reverse the inequality sign.' : 'Divide by the positive coefficient; the inequality direction is preserved.', beforeAst: normalized, afterAst: result });
  return { status: 'solved', variable: x, resultAst: result, steps };
}

export interface LinearSystemSolution {
  status: 'unique' | 'none' | 'infinite' | 'unsupported';
  variables: string[];
  resultAst?: AstNode;
  steps: SolveStep[];
  warning?: string;
}

function coefficientVector(equationAst: AstNode, variables: string[]): Rational[] | null {
  if (equationAst.type !== 'equation') return null;
  // Build coefficients by substituting the multivariate linear expression structurally using finite differences at 0/1.
  // The helper below accepts only +,-,*,/ by rational constants and first powers of symbols.
  const linear = linearForm({ type: 'binary', operator: '-', left: equationAst.left, right: equationAst.right }, variables);
  if (!linear) return null;
  return [...variables.map((variable) => linear.coefficients.get(variable) ?? ZERO), neg(linear.constant)];
}

interface LinearForm { coefficients: Map<string, Rational>; constant: Rational }

function addLinear(a: LinearForm, b: LinearForm): LinearForm {
  const coefficients = new Map(a.coefficients);
  for (const [name, value] of b.coefficients) coefficients.set(name, add(coefficients.get(name) ?? ZERO, value));
  return { coefficients, constant: add(a.constant, b.constant) };
}
function scaleLinear(a: LinearForm, factor: Rational): LinearForm {
  return { coefficients: new Map([...a.coefficients].map(([name, value]) => [name, mul(value, factor)])), constant: mul(a.constant, factor) };
}
function linearForm(node: AstNode, variables: string[]): LinearForm | null {
  if (node.type === 'number') { const value = rationalValue(node); return value ? { coefficients: new Map(), constant: value } : null; }
  // Use rational parser indirectly through one-variable polynomial for constants with decimals/fractions.
  if (node.type === 'symbol') return variables.includes(node.name) ? { coefficients: new Map([[node.name, ONE]]), constant: ZERO } : null;
  if (node.type === 'unary') {
    const value = linearForm(node.operand, variables); if (!value) return null;
    return node.operator === '-' ? scaleLinear(value, rat(-1n)) : value;
  }
  if (node.type === 'binary') {
    if (node.operator === '+' || node.operator === '-') {
      const a = linearForm(node.left, variables); const b = linearForm(node.right, variables); if (!a || !b) return null;
      return addLinear(a, node.operator === '-' ? scaleLinear(b, rat(-1n)) : b);
    }
    if (node.operator === '*' || node.operator === '/') {
      const leftHasVars = symbolsIn(node.left).some((name) => variables.includes(name));
      const rightHasVars = symbolsIn(node.right).some((name) => variables.includes(name));
      if (leftHasVars && rightHasVars) return null;
      const variablePart = leftHasVars ? linearForm(node.left, variables) : rightHasVars ? linearForm(node.right, variables) : null;
      const constantNode = leftHasVars ? node.right : node.left;
      const constantPoly = toPolynomial(constantNode, '__constant__');
      if (!constantPoly || polynomialDegree(constantPoly) !== 0) return null;
      const constant = polynomialCoefficient(constantPoly, 0);
      if (!variablePart) {
        const full = toPolynomial(node, '__constant__');
        return full && polynomialDegree(full) === 0 ? { coefficients: new Map(), constant: polynomialCoefficient(full, 0) } : null;
      }
      if (node.operator === '/' && !leftHasVars) return null;
      return scaleLinear(variablePart, node.operator === '/' ? div(ONE, constant) : constant);
    }
    if (node.operator === '^') {
      const full = toPolynomial(node, '__constant__');
      return full && polynomialDegree(full) === 0 ? { coefficients: new Map(), constant: polynomialCoefficient(full, 0) } : null;
    }
  }
  return null;
}

export function solveLinearSystem(ast: AstNode): LinearSystemSolution {
  if (ast.type !== 'system') return { status: 'unsupported', variables: [], steps: [], warning: 'Enter multiple equations separated by semicolons.' };
  if (!ast.items.every((item) => item.type === 'equation')) return { status: 'unsupported', variables: [], steps: [], warning: 'Every item in a P4 system must be an equation.' };
  const variables = [...new Set(ast.items.flatMap(symbolsIn))].sort();
  if (!variables.length) return { status: 'unsupported', variables: [], steps: [], warning: 'No variables were found.' };
  const matrix = ast.items.map((item) => coefficientVector(item, variables));
  if (matrix.some((row) => !row)) return { status: 'unsupported', variables, steps: [], warning: 'P4 system solving supports linear equations with exact rational coefficients.' };
  const a = matrix as Rational[][];
  let row = 0;
  const pivotColumns: number[] = [];
  const steps: SolveStep[] = [];
  const initialMatrix: AstNode = { type: 'matrix', rows: a.map((r) => r.map(rationalToAst)) };
  for (let col = 0; col < variables.length && row < a.length; col++) {
    let pivot = row;
    while (pivot < a.length && isZero(a[pivot][col])) pivot++;
    if (pivot === a.length) continue;
    if (pivot !== row) { [a[pivot], a[row]] = [a[row], a[pivot]]; }
    const pivotValue = a[row][col];
    a[row] = a[row].map((value) => div(value, pivotValue));
    for (let r = 0; r < a.length; r++) if (r !== row && !isZero(a[r][col])) {
      const factor = a[r][col];
      a[r] = a[r].map((value, j) => sub(value, mul(factor, a[row][j])));
    }
    pivotColumns.push(col); row++;
  }
  const finalMatrix: AstNode = { type: 'matrix', rows: a.map((r) => r.map(rationalToAst)) };
  steps.push({ rule: 'gaussian-elimination', explanation: 'Apply exact row operations to reduce the augmented matrix.', beforeAst: initialMatrix, afterAst: finalMatrix });
  const inconsistent = a.some((r) => r.slice(0, variables.length).every(isZero) && !isZero(r[variables.length]));
  if (inconsistent) return { status: 'none', variables, resultAst: set([]), steps };
  if (pivotColumns.length < variables.length) return { status: 'infinite', variables, steps, warning: 'The system has infinitely many solutions. Use the P7 augmented-matrix workflow to obtain a particular solution and null-space basis.' };
  const solutions: AstNode[] = variables.map((name, col) => {
    const pivotRow = pivotColumns.indexOf(col);
    return equation(makeSymbol(name), rationalToAst(a[pivotRow][variables.length]));
  });
  return { status: 'unique', variables, resultAst: { type: 'system', items: solutions }, steps };
}

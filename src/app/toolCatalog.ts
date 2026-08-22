import type { SemanticMathObject } from '../lib/math/types';
import { operationNeedsControls } from './workspaceOperations';

export type ToolCategory =
  | 'Algebra'
  | 'Calculus'
  | 'Visualization'
  | 'Linear Algebra'
  | 'Analysis'
  | 'Probability & Statistics'
  | 'Discrete Math & Algorithms'
  | 'Numerical Math & ODEs'
  | 'Proof & Verification';

export interface ToolCatalogItem {
  id: string;
  operation: string;
  label: string;
  category: ToolCategory;
  phase: string;
  objectKinds: SemanticMathObject['kind'][];
  description: string;
  example: string;
  aliases: string[];
  specialRoute?: 'proof' | 'visualize';
}

export const TOOL_CATEGORIES: ToolCategory[] = [
  'Algebra', 'Calculus', 'Visualization', 'Linear Algebra', 'Analysis',
  'Probability & Statistics', 'Discrete Math & Algorithms', 'Numerical Math & ODEs', 'Proof & Verification',
];

const examples: Partial<Record<string, string>> = {
  solve: '2*x + 5 = 11',
  'solve-inequality': '-3*x + 2 > 11',
  'solve-system': 'x+y=3; x-y=1',
  substitute: 'x^2 + 2*x + 1',
  'polynomial-division': '(x^3-1)/(x-1)',
  'partial-fractions': '(2*x+3)/((x+1)*(x+2))',
  'evaluate-function': 'f(x) := x^2 + 1',
  'function-profile': 'f(x) := x^3 - 3*x',
  derivative: 'f(x) := (x^2+1)^3',
  differentiate: '(x^2+1)^3',
  'definite-integral': 'sin(x)',
  limit: 'sin(x)/x',
  graph: 'f(x) := x^3 - 3*x',
  'dot-product': '[1,2,3]',
  projection: '[2,3]',
  'project-column-space': '[[1,0],[1,1],[1,2]]',
  'least-squares': '[[1,0],[1,1],[1,2]]',
  'correlation-regression': '[[1,2],[2,4],[3,6]]',
  'interpolation-polynomial': '[[0,1],[1,3],[2,7]]',
  'numerical-linear-solve': '[[2,1,5],[1,-1,1]]',
  'iterative-linear-solve': '[[4,1,9],[1,3,7]]',
  'condition-estimate': '[[1,0],[0,2]]',
  'continuity-at': '(x^2-1)/(x-1)',
  'differentiability-at': 'abs(x)',
  'analysis-limit': '1/(x-1)',
  'taylor-polynomial': 'exp(x)',
  'power-series-profile': 'ln(1+x)',
  'sequence-terms': 'a_n := 1/n',
  'sequence-limit': 'a_n := sin(n)/n',
  'series-convergence': 'a_n := (-1)^(n+1)/n',
  'partial-sum': 'a_n := 1/n^2',
  'descriptive-statistics': 'data(1,2,3,4,5)',
  'mean-confidence-interval': 'data(1,2,3,4,5)',
  'mean-hypothesis-test': 'data(1,2,3,4,5)',
  'proportion-confidence-interval': 'data(1,1,0,1,0,1)',
  'proportion-hypothesis-test': 'data(1,1,0,1,0,1)',
  'distribution-profile': 'binomial(10, 1/2)',
  'distribution-probability': 'binomial(10, 1/2)',
  'distribution-quantile': 'normal(0,1)',
  'sampling-mean-profile': 'normal(0,1)',
  'simulate-distribution': 'binomial(10, 1/2)',
  'evaluate-probability': 'bayes(1/100, 9/10, 27/1000)',
  'logic-profile': 'implies(and(p,q),p)',
  'logic-normal-forms': 'xor(p,q)',
  'set-profile': 'set(1,2,3)',
  'power-set': 'set(1,2,3)',
  'set-union': 'set(1,2,3)',
  'set-intersection': 'set(1,2,3)',
  'set-difference': 'set(1,2,3)',
  'set-symmetric-difference': 'set(1,2,3)',
  'cartesian-product': 'set(1,2,3)',
  'subset-check': 'set(1,2)',
  'relation-profile': 'relation(3, [[1,1],[2,2],[3,3]])',
  'relation-closures': 'relation(3, [[1,2],[2,3]])',
  'equivalence-classes': 'relation(3, [[1,1],[2,2],[3,3]])',
  'hasse-profile': 'relation(3, [[1,1],[2,2],[3,3],[1,2],[1,3]])',
  'graph-profile': 'graph(5, [[1,2],[1,3],[2,4],[3,5]])',
  'graph-bfs': 'graph(5, [[1,2],[1,3],[2,4],[3,5]])',
  'graph-dfs': 'graph(5, [[1,2],[1,3],[2,4],[3,5]])',
  'shortest-path': 'wgraph(4, [[1,2,3],[1,3,1],[3,2,1],[2,4,2]])',
  'topological-sort': 'digraph(4, [[1,2],[1,3],[2,4],[3,4]])',
  'minimum-spanning-tree': 'wgraph(4, [[1,2,3],[1,3,1],[3,2,1],[2,4,2]])',
  'recurrence-profile': 'linrec2(0,1,1,1)',
  'recurrence-terms': 'linrec2(0,1,1,1)',
  'recurrence-closed-form': 'linrec(1,2,3)',
  'complexity-profile': 'complexity(n*log(n))',
  'evaluate-combinatorics': 'starsbars(5,3)',
  'sorting-trace': '[5,2,4,1]',
  'binary-search': '[1,2,4,5,9]',
  'heap-profile': '[1,3,2,7,6,4]',
  'floating-point-profile': '1/10',
  'numerical-root': 'x^2 - 2',
  'numerical-derivative': 'sin(x)',
  'numerical-integral': 'sin(x)',
  'ivp-profile': 'ivp(y, 0, 1)',
  'ode-solve': 'ivp(y, 0, 1)',
  'verify-transition': 'x/x',
  verify: '2*x + 5 = 11',
};

const defaultExample: Record<SemanticMathObject['kind'], string> = {
  scalar: '1/3', expression: 'x^2 - 1', equation: '2*x + 5 = 11', inequality: 'x^2 >= 0',
  system: 'x+y=3; x-y=1', function: 'f(x) := x^3 - 3*x', vector: '[1,2,3]', matrix: '[[1,2],[3,4]]',
  sequence: 'a_n := 1/n', dataset: 'data(1,2,3,4,5)', distribution: 'binomial(10,1/2)',
  probability: 'bayes(1/100,9/10,27/1000)', proposition: 'implies(and(p,q),p)', 'finite-set': 'set(1,2,3)',
  relation: 'relation(3, [[1,1],[2,2],[3,3]])', graph: 'graph(4, [[1,2],[2,3],[3,4]])',
  recurrence: 'linrec2(0,1,1,1)', complexity: 'complexity(n*log(n))', combinatorics: 'starsbars(5,3)',
  ode: 'ivp(y,0,1)', unknown: 'x^2 - 1',
};

const descriptions: Partial<Record<string, string>> = {
  solve: 'Solve a supported one-variable equation and return the exact solution set.',
  'solve-inequality': 'Solve a supported one-variable inequality while preserving direction and domain rules.',
  'solve-system': 'Solve a linear system exactly using rational Gaussian elimination.',
  simplify: 'Simplify an algebraic expression without silently changing its domain.',
  expand: 'Expand polynomial products and powers into collected polynomial form.',
  factor: 'Factor supported rational polynomials exactly.',
  derivative: 'Differentiate a unary function symbolically with rule-aware derivation steps.',
  differentiate: 'Differentiate a one-variable expression symbolically.',
  integrate: 'Find a supported elementary antiderivative symbolically.',
  'definite-integral': 'Evaluate a supported definite integral over configured bounds.',
  limit: 'Evaluate a supported calculus limit at a configured point.',
  graph: 'Open the current unary expression or function in the visualization workspace.',
  rref: 'Compute exact reduced row echelon form and expose the row-operation derivation.',
  det: 'Compute the exact determinant of a square matrix.',
  inverse: 'Compute an exact inverse by Gauss–Jordan elimination when it exists.',
  eigen: 'Compute supported exact eigenvalues, including bounded complex 2×2 spectra.',
  eigenspaces: 'Compute bases for supported eigenspaces.',
  diagonalize: 'Construct an exact diagonalization when a complete eigenbasis exists.',
  'gram-schmidt': 'Build orthogonal and orthonormal column bases using exact inner products and radicals.',
  qr: 'Compute a reduced exact QR decomposition for independent columns.',
  'least-squares': 'Solve a supported least-squares problem using exact normal equations.',
  'continuity-profile': 'Classify continuity and identify supported holes, poles, and domain exclusions.',
  'differentiability-profile': 'Distinguish differentiability from continuity and detect supported corners or boundaries.',
  'analysis-limit': 'Run the stricter one-sided/two-sided real-analysis limit workflow.',
  'taylor-polynomial': 'Construct an exact Taylor polynomial about a configured center and order.',
  'series-convergence': 'Apply deterministic convergence tests to a supported sequence term.',
  'descriptive-statistics': 'Compute exact summary statistics, quartiles, variance, and outlier diagnostics.',
  'distribution-probability': 'Evaluate PMF/CDF/tail/interval probabilities for a supported distribution.',
  'correlation-regression': 'Compute exact simple linear regression coefficients, Pearson correlation, and R².',
  'logic-profile': 'Generate the exhaustive truth table and classify a proposition.',
  'graph-profile': 'Analyze graph degrees, components, cycles, bipartiteness, trees, and Euler criteria.',
  'shortest-path': 'Find a shortest path using BFS or exact-rational Dijkstra for supported graphs.',
  'complexity-profile': 'Classify supported asymptotic expressions with a tight Θ bound.',
  'numerical-root': 'Approximate a root using bisection, Newton, or secant with convergence diagnostics.',
  'numerical-integral': 'Approximate an integral with adaptive Simpson or composite quadrature and error estimates.',
  'ode-solve': 'Solve a first-order IVP numerically with Euler, Heun, or RK4 and step-doubling diagnostics.',
  'verify-transition': 'Check whether a mathematical transformation is verified, conditional, invalid, or not proven.',
};

type RawTool = [string, string, ToolCategory, string, SemanticMathObject['kind'][], string[]?];

const raw: RawTool[] = [
  ['inspect-exact','Exact form','Algebra','P4',['scalar']], ['inspect-decimal','Decimal form','Algebra','P4',['scalar']],
  ['simplify','Simplify','Algebra','P4',['expression']], ['expand','Expand','Algebra','P4',['expression']], ['factor','Factor','Algebra','P4',['expression']],
  ['substitute','Substitute','Algebra','P4',['expression']], ['polynomial-division','Polynomial division','Algebra','P4',['expression']], ['partial-fractions','Partial fractions','Algebra','P4',['expression']],
  ['solve','Solve equation','Algebra','P4',['equation'],['equation solver','roots']], ['solve-inequality','Solve inequality','Algebra','P4',['inequality']], ['solve-system','Solve linear system','Algebra','P4',['system']],

  ['evaluate-function','Evaluate function','Calculus','P5',['function']], ['function-profile','Full function profile','Calculus','P5',['function']], ['zeros','Zeros','Calculus','P5',['function']],
  ['differentiate','Differentiate expression','Calculus','P5',['expression'],['derivative']], ['derivative','Derivative','Calculus','P5',['function'],['differentiate']], ['higher-derivative','Higher derivative','Calculus','P5',['expression','function']],
  ['integrate','Antiderivative','Calculus','P5',['expression','function'],['indefinite integral']], ['definite-integral','Definite integral','Calculus','P5',['expression','function']], ['limit','Limit','Calculus','P5',['expression','function']],
  ['critical-points','Critical points','Calculus','P5',['function']], ['extrema','Extrema','Calculus','P5',['function']], ['monotonicity','Monotonicity','Calculus','P5',['function']], ['concavity','Concavity','Calculus','P5',['function']],
  ['graph','Graph / plot','Visualization','P6',['expression','function'],['plot','visualize']],

  ['evaluate-linear-algebra','Evaluate linear algebra','Linear Algebra','P7',['expression','vector','matrix']], ['norm','Euclidean norm','Linear Algebra','P7',['vector']], ['dot-product','Dot product','Linear Algebra','P7',['vector']], ['span-vector','Span profile','Linear Algebra','P7',['vector']],
  ['det','Determinant','Linear Algebra','P7',['matrix']], ['rank','Rank','Linear Algebra','P7',['matrix']], ['inverse','Inverse','Linear Algebra','P7',['matrix']], ['rref','RREF','Linear Algebra','P7',['matrix'],['row reduction','gauss jordan']],
  ['solve-augmented','Solve augmented system','Linear Algebra','P7',['matrix']], ['linear-profile','Linear algebra profile','Linear Algebra','P7',['matrix']], ['column-space','Column-space basis','Linear Algebra','P7',['matrix']], ['null-space','Null-space basis','Linear Algebra','P7',['matrix']], ['row-space','Row-space basis','Linear Algebra','P7',['matrix']],
  ['projection','Project vector','Linear Algebra','P8',['vector']], ['transpose','Transpose','Linear Algebra','P8',['vector','matrix']], ['conjugate-transpose','Conjugate transpose / adjoint','Linear Algebra','P8',['vector','matrix'],['adjoint','hermitian transpose']],
  ['orthogonality-profile','Orthogonality profile','Linear Algebra','P8',['vector','matrix']], ['gram-schmidt','Gram–Schmidt','Linear Algebra','P8',['matrix']], ['project-column-space','Project onto column space','Linear Algebra','P8',['matrix']],
  ['qr','QR decomposition','Linear Algebra','P8',['matrix']], ['least-squares','Least squares','Linear Algebra','P8',['matrix']], ['characteristic-polynomial','Characteristic polynomial','Linear Algebra','P8',['matrix'],['char poly']],
  ['eigen','Eigenvalues','Linear Algebra','P8',['matrix'],['eigenvalue','spectrum']], ['eigenspaces','Eigenspaces','Linear Algebra','P8',['matrix'],['eigenvectors']], ['diagonalize','Diagonalize','Linear Algebra','P8',['matrix']], ['symmetry-profile','Symmetric / Hermitian profile','Linear Algebra','P8',['matrix']],

  ['continuity-profile','Continuity profile','Analysis','P9',['expression','function']], ['differentiability-profile','Differentiability profile','Analysis','P9',['expression','function']], ['continuity-at','Continuity at a point','Analysis','P9',['expression','function']], ['differentiability-at','Differentiability at a point','Analysis','P9',['expression','function']],
  ['analysis-limit','Rigorous limit','Analysis','P9',['expression','function'],['one sided limit']], ['taylor-polynomial','Taylor polynomial','Analysis','P9',['expression','function'],['Taylor series']], ['power-series-profile','Power-series profile','Analysis','P9',['expression','function']], ['asymptotic-profile','Asymptotic profile','Analysis','P9',['expression','function']], ['analysis-profile','Full analysis profile','Analysis','P9',['expression','function']],
  ['sequence-terms','Preview sequence terms','Analysis','P9',['sequence']], ['sequence-limit','Sequence limit','Analysis','P9',['sequence']], ['sequence-convergence','Sequence convergence','Analysis','P9',['sequence']], ['partial-sum','Partial sum','Analysis','P9',['sequence']], ['series-convergence','Series convergence','Analysis','P9',['sequence']], ['sequence-series-profile','Sequence + series profile','Analysis','P9',['sequence']],

  ['descriptive-statistics','Descriptive statistics','Probability & Statistics','P10',['dataset','vector']], ['mean-confidence-interval','Mean confidence interval','Probability & Statistics','P10',['dataset','vector']], ['mean-hypothesis-test','One-sample mean test','Probability & Statistics','P10',['dataset','vector']],
  ['proportion-confidence-interval','Proportion confidence interval','Probability & Statistics','P10',['dataset','vector']], ['proportion-hypothesis-test','One-proportion test','Probability & Statistics','P10',['dataset','vector']],
  ['distribution-profile','Distribution profile','Probability & Statistics','P10',['distribution']], ['distribution-probability','Distribution probability','Probability & Statistics','P10',['distribution'],['pmf','cdf','tail']], ['distribution-quantile','Distribution quantile','Probability & Statistics','P10',['distribution']], ['sampling-mean-profile','Sampling mean distribution','Probability & Statistics','P10',['distribution']], ['simulate-distribution','Simulate distribution','Probability & Statistics','P10',['distribution']],
  ['evaluate-probability','Evaluate probability exactly','Probability & Statistics','P10',['probability'],['Bayes','conditional probability']], ['correlation-regression','Correlation & regression','Probability & Statistics','P10',['matrix'],['Pearson','linear regression']],

  ['logic-profile','Truth table & classification','Discrete Math & Algorithms','P11',['proposition']], ['logic-normal-forms','Canonical DNF / CNF','Discrete Math & Algorithms','P11',['proposition']],
  ['set-profile','Set profile','Discrete Math & Algorithms','P11',['finite-set']], ['power-set','Power set','Discrete Math & Algorithms','P11',['finite-set']], ['set-union','Set union','Discrete Math & Algorithms','P11',['finite-set']], ['set-intersection','Set intersection','Discrete Math & Algorithms','P11',['finite-set']], ['set-difference','Set difference','Discrete Math & Algorithms','P11',['finite-set']], ['set-symmetric-difference','Symmetric difference','Discrete Math & Algorithms','P11',['finite-set']], ['cartesian-product','Cartesian product','Discrete Math & Algorithms','P11',['finite-set']], ['subset-check','Subset check','Discrete Math & Algorithms','P11',['finite-set']],
  ['relation-profile','Relation profile','Discrete Math & Algorithms','P11',['relation']], ['relation-closures','Relation closures','Discrete Math & Algorithms','P11',['relation']], ['equivalence-classes','Equivalence classes','Discrete Math & Algorithms','P11',['relation']], ['hasse-profile','Hasse / order profile','Discrete Math & Algorithms','P11',['relation']],
  ['graph-profile','Graph profile','Discrete Math & Algorithms','P11',['graph']], ['graph-bfs','BFS trace','Discrete Math & Algorithms','P11',['graph']], ['graph-dfs','DFS trace','Discrete Math & Algorithms','P11',['graph']], ['shortest-path','Shortest path','Discrete Math & Algorithms','P11',['graph'],['Dijkstra']], ['topological-sort','Topological sort','Discrete Math & Algorithms','P11',['graph']], ['minimum-spanning-tree','Minimum spanning tree','Discrete Math & Algorithms','P11',['graph'],['MST','Kruskal']],
  ['recurrence-profile','Recurrence profile','Discrete Math & Algorithms','P11',['recurrence']], ['recurrence-terms','Generate recurrence terms','Discrete Math & Algorithms','P11',['recurrence']], ['recurrence-closed-form','Closed / characteristic form','Discrete Math & Algorithms','P11',['recurrence']], ['complexity-profile','Asymptotic complexity','Discrete Math & Algorithms','P11',['complexity'],['Big O','Theta']], ['evaluate-combinatorics','Evaluate combinatorics exactly','Discrete Math & Algorithms','P11',['combinatorics']],
  ['sorting-trace','Sorting trace','Discrete Math & Algorithms','P11',['vector']], ['binary-search','Binary search','Discrete Math & Algorithms','P11',['vector']], ['heap-profile','Binary heap profile','Discrete Math & Algorithms','P11',['vector']],

  ['floating-point-profile','IEEE-754 binary64 profile','Numerical Math & ODEs','P12',['scalar']], ['numerical-root','Numerical root','Numerical Math & ODEs','P12',['expression','function']], ['numerical-derivative','Numerical derivative','Numerical Math & ODEs','P12',['expression','function']], ['numerical-integral','Numerical integral','Numerical Math & ODEs','P12',['expression','function']],
  ['interpolation-polynomial','Interpolation polynomial','Numerical Math & ODEs','P12',['matrix']], ['numerical-linear-solve','Pivoted numerical solve','Numerical Math & ODEs','P12',['matrix']], ['iterative-linear-solve','Jacobi / Gauss–Seidel','Numerical Math & ODEs','P12',['matrix']], ['condition-estimate','Condition estimate','Numerical Math & ODEs','P12',['matrix']], ['ivp-profile','IVP profile','Numerical Math & ODEs','P12',['ode']], ['ode-solve','Euler / Heun / RK4 solve','Numerical Math & ODEs','P12',['ode'],['RK4','Runge Kutta']],

  ['verify-transition','Verify transformation','Proof & Verification','P13',['scalar','expression','equation','inequality','system','function','vector','matrix','proposition']], ['verify','Check equation solution','Proof & Verification','P13',['equation']],
];

function humanKinds(kinds: SemanticMathObject['kind'][]): string {
  return kinds.map((kind) => kind.replace('finite-set','set').replace('ode','IVP')).join(', ');
}

export const TOOL_CATALOG: ToolCatalogItem[] = raw.map(([operation, label, category, phase, objectKinds, aliases = []]) => ({
  id: operation,
  operation,
  label,
  category,
  phase,
  objectKinds,
  description: descriptions[operation] ?? `${label} for compatible ${humanKinds(objectKinds)} objects using MathLab's deterministic ${phase} engine.`,
  example: examples[operation] ?? defaultExample[objectKinds[0] ?? 'expression'],
  aliases,
})).concat([
  {
    id: 'verify-chain', operation: 'verify-chain', label: 'Verify a derivation chain', category: 'Proof & Verification', phase: 'P13', objectKinds: [],
    description: 'Check every adjacent step in a worked derivation and combine the results into a verified / conditional / invalid / not-proven verdict.',
    example: '2*x + 2 = 6\n2*x = 4\nx = 2', aliases: ['proof steps','check my work'], specialRoute: 'proof',
  },
  {
    id: 'verify-entailment', operation: 'verify-entailment', label: 'Check logical entailment', category: 'Proof & Verification', phase: 'P13', objectKinds: [],
    description: 'Exhaustively check whether a propositional conclusion follows from the stated premises and produce a countermodel when it does not.',
    example: 'implies(p,q)\np\n∴ q', aliases: ['logic proof','entailment'], specialRoute: 'proof',
  },
]);

export function toolNeedsConfiguration(tool: ToolCatalogItem): boolean {
  return operationNeedsControls(tool.operation);
}

export function toolSearchText(tool: ToolCatalogItem): string {
  return [tool.label, tool.category, tool.phase, tool.description, tool.objectKinds.join(' '), ...tool.aliases].join(' ').toLowerCase();
}

export function findTool(id: string): ToolCatalogItem | undefined {
  return TOOL_CATALOG.find((tool) => tool.id === id);
}

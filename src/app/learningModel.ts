import {
  capabilitiesForCourse,
  type CapabilityCourseId,
  type CapabilityDescriptor,
} from './capabilityRegistry';
import {
  PRACTICE_COURSES,
  authoredExercisesForTopic,
  generatePracticeExercise,
  type PracticeCourse,
  type PracticeExercise,
  type PracticeProgressState,
  type PracticeTopic,
} from '../lib/math/practice';

export type LearningStage = 'learn' | 'example' | 'guided' | 'independent';

export interface WorkedExample {
  title: string;
  prompt: string;
  steps: string[];
  result: string;
}

export interface LearningConcept {
  id: string;
  courseId: CapabilityCourseId;
  title: string;
  summary: string;
  objective: string;
  checkpoint: string;
  prerequisites: string[];
  practiceTopicIds: string[];
  capabilityTerms: string[];
  catchAll?: boolean;
  workedExample: WorkedExample;
}

export interface ConceptProgressSummary {
  conceptId: string;
  attempts: number;
  accuracy: number;
  mastery: number;
  due: number;
  seen: number;
}

export interface ConceptReadiness {
  ready: boolean;
  blockedBy: LearningConcept[];
}

export interface LearningCoverage {
  courseId: CapabilityCourseId;
  totalCapabilities: number;
  coveredCapabilities: number;
  uncoveredCapabilityIds: string[];
  byConcept: Array<{ concept: LearningConcept; capabilities: CapabilityDescriptor[] }>;
}

export interface LearningModelIntegrity {
  duplicateConceptIds: string[];
  unknownCourses: string[];
  unknownPracticeTopics: string[];
  unknownPrerequisites: string[];
  uncoveredPracticeTopics: string[];
  uncoveredCapabilities: string[];
  conceptsWithoutWorkedExamples: string[];
}

export const LEARNING_STAGES: ReadonlyArray<{ id: LearningStage; label: string; description: string }> = [
  { id: 'learn', label: 'Learn', description: 'Understand the idea, notation, assumptions and failure conditions.' },
  { id: 'example', label: 'Example', description: 'Trace a complete worked example before solving on your own.' },
  { id: 'guided', label: 'Guided', description: 'Solve with progressive hints and exact deterministic checking.' },
  { id: 'independent', label: 'Independent', description: 'Practice without help, then revisit through spaced review and exams.' },
];

function example(title: string, prompt: string, steps: string[], result: string): WorkedExample {
  return { title, prompt, steps, result };
}

export const LEARNING_CONCEPTS: readonly LearningConcept[] = [
  {
    id: 'algebra-equations',
    courseId: 'algebra',
    title: 'Equations and solution sets',
    summary: 'Solve equations while preserving the exact solution set.',
    objective: 'Choose reversible transformations, solve supported equation classes, and interpret exact solution sets.',
    checkpoint: 'You can explain why each transformation preserves the solution set and detect when a domain condition is required.',
    prerequisites: [],
    practiceTopicIds: ['algebra-equations'],
    capabilityTerms: ['equation', 'solve', 'solution set', 'root', 'system', 'inequal'],
    workedExample: example(
      'Linear equation with exact reversal',
      'Solve 3x - 5 = 16.',
      ['Add 5 to both sides to obtain 3x = 21.', 'Divide both sides by the nonzero coefficient 3.', 'Check x = 7 in the original equation.'],
      'x = 7',
    ),
  },
  {
    id: 'algebra-polynomials',
    courseId: 'algebra',
    title: 'Polynomial structure',
    summary: 'Expand, factor and reorganize polynomial expressions.',
    objective: 'Move between equivalent polynomial forms and recognize when a chosen form is useful.',
    checkpoint: 'You can expand and factor exact polynomial forms and verify equivalence.',
    prerequisites: ['algebra-equations'],
    practiceTopicIds: ['algebra-polynomials'],
    capabilityTerms: ['polynomial', 'factor', 'expand', 'partial fraction', 'roots', 'division'],
    workedExample: example(
      'Expand and refactor',
      'Rewrite (x + 2)(x - 3) as a polynomial, then recover the factors.',
      ['Distribute both factors.', 'Collect the linear terms: -3x + 2x = -x.', 'Verify the resulting polynomial factors back to the original product.'],
      'x^2 - x - 6 = (x + 2)(x - 3)',
    ),
  },
  {
    id: 'algebra-transformations',
    courseId: 'algebra',
    title: 'Domain-safe transformations',
    summary: 'Simplify without silently changing where an expression is defined.',
    objective: 'Track assumptions and excluded values while simplifying, substituting and transforming expressions.',
    checkpoint: 'You can distinguish unconditional equivalence from equivalence that holds only under explicit conditions.',
    prerequisites: ['algebra-polynomials'],
    practiceTopicIds: ['algebra-transformations'],
    capabilityTerms: ['simpl', 'substitut', 'domain', 'assumption', 'expression', 'rational'],
    catchAll: true,
    workedExample: example(
      'Cancellation with an excluded value',
      'Compare x/x with 1 over the real numbers.',
      ['The numerator and denominator cancel only where the denominator is nonzero.', 'The original expression is undefined at x = 0.', 'Therefore the simplified value is valid under the condition x != 0.'],
      'x/x = 1 for x != 0, not as an unconditional identity on all real x',
    ),
  },

  {
    id: 'calculus-derivatives',
    courseId: 'calculus',
    title: 'Derivatives and local behavior',
    summary: 'Differentiate exactly and interpret local change.',
    objective: 'Use exact derivative rules and connect derivatives to critical points, local geometry and multivariable differential structure.',
    checkpoint: 'You can compute a derivative and explain what its value says about local behavior.',
    prerequisites: [],
    practiceTopicIds: ['calculus-derivatives'],
    capabilityTerms: ['derivative', 'differentiat', 'gradient', 'jacobian', 'hessian', 'critical', 'extrema', 'monotonic', 'concavity', 'taylor', 'lagrange', 'stationary', 'partial'],
    workedExample: example(
      'Chain rule',
      'Differentiate f(x) = (x^2 + 1)^3.',
      ['Differentiate the outer cube: 3(x^2 + 1)^2.', 'Multiply by the derivative of the inner function x^2 + 1.', 'Simplify the product.'],
      "f'(x) = 6x(x^2 + 1)^2",
    ),
  },
  {
    id: 'calculus-integrals',
    courseId: 'calculus',
    title: 'Integration and accumulated change',
    summary: 'Compute exact integrals and interpret accumulated quantities.',
    objective: 'Use supported antiderivatives and definite, multivariable and vector-calculus integration workflows with their required assumptions.',
    checkpoint: 'You can select a valid integration workflow and interpret the bounds, path, surface or region involved.',
    prerequisites: ['calculus-derivatives'],
    practiceTopicIds: ['calculus-integrals'],
    capabilityTerms: ['integral', 'integrat', 'flux', 'green', 'gauss', 'stokes', 'surface', 'line integral', 'change of variables'],
    catchAll: true,
    workedExample: example(
      'Exact definite integral',
      'Compute the integral from 0 to 2 of (3x + 1) dx.',
      ['An antiderivative is (3/2)x^2 + x.', 'Evaluate it at x = 2 and x = 0.', 'Subtract the lower value from the upper value.'],
      '8',
    ),
  },

  {
    id: 'linear-matrices',
    courseId: 'linear-algebra',
    title: 'Matrices and linear maps',
    summary: 'Read, combine and characterize finite-dimensional linear transformations.',
    objective: 'Work exactly with matrices, determinants and the basic invariants of linear maps.',
    checkpoint: 'You can compute matrix invariants and explain what they imply about invertibility and structure.',
    prerequisites: [],
    practiceTopicIds: ['linear-matrices'],
    capabilityTerms: ['matrix', 'determinant', 'inverse', 'trace', 'rank'],
    workedExample: example(
      '2 by 2 determinant',
      'Compute det([[2, 3], [1, 4]]).',
      ['Multiply the main diagonal entries: 2*4 = 8.', 'Multiply the off-diagonal entries: 3*1 = 3.', 'Subtract the second product from the first.'],
      'det = 5',
    ),
  },
  {
    id: 'linear-row-reduction',
    courseId: 'linear-algebra',
    title: 'Systems and row reduction',
    summary: 'Use reversible row operations to expose solution structure.',
    objective: 'Reduce matrices exactly and interpret pivots, rank and solution spaces.',
    checkpoint: 'You can produce RREF and connect pivot structure to the associated linear system.',
    prerequisites: ['linear-matrices'],
    practiceTopicIds: ['linear-row-reduction'],
    capabilityTerms: ['rref', 'row', 'linear system', 'null', 'column space', 'basis'],
    workedExample: example(
      'Rank-deficient row reduction',
      'Reduce [[1, 2], [2, 4]] to RREF.',
      ['Replace row 2 by row 2 minus 2 times row 1.', 'The second row becomes zero.', 'The first row already has a leading pivot.'],
      '[[1, 2], [0, 0]]',
    ),
  },
  {
    id: 'linear-advanced',
    courseId: 'linear-algebra',
    title: 'Spectral and inner-product structure',
    summary: 'Study eigenstructure, orthogonality and decompositions.',
    objective: 'Connect eigenvalues, inner products and matrix factorizations to geometric and numerical structure.',
    checkpoint: 'You can identify the right decomposition or structural test for a matrix problem.',
    prerequisites: ['linear-row-reduction'],
    practiceTopicIds: ['linear-advanced'],
    capabilityTerms: ['eigen', 'spectrum', 'orthogonal', 'unitary', 'hermitian', 'qr', 'svd', 'cholesky', 'lu', 'condition', 'pseudoinverse'],
    catchAll: true,
    workedExample: example(
      'Hermitian criterion',
      'Decide whether A = [[2, i], [-i, 3]] is Hermitian.',
      ['Transpose the matrix.', 'Conjugate every complex entry.', 'Compare the conjugate transpose with the original matrix.'],
      'A* = A, so A is Hermitian',
    ),
  },

  {
    id: 'analysis-sequences',
    courseId: 'analysis',
    title: 'Sequences and limits',
    summary: 'Reason about asymptotic behavior with exact hypotheses.',
    objective: 'Classify supported sequence and function limits and track the hypotheses used.',
    checkpoint: 'You can justify a limit classification rather than relying on numerical samples.',
    prerequisites: [],
    practiceTopicIds: ['analysis-sequences'],
    capabilityTerms: ['limit', 'sequence', 'continu', 'compact', 'metric'],
    workedExample: example(
      'Rational sequence limit',
      'Find lim n->infinity of 5/n^2.',
      ['The numerator remains fixed.', 'The denominator grows without bound because n^2 tends to infinity.', 'Therefore the quotient tends to zero.'],
      '0',
    ),
  },
  {
    id: 'analysis-series',
    courseId: 'analysis',
    title: 'Infinite series and convergence',
    summary: 'Choose valid convergence tests and distinguish convergence modes.',
    objective: 'Classify supported infinite series and explain why the chosen criterion applies.',
    checkpoint: 'You can state the theorem or test that certifies the classification.',
    prerequisites: ['analysis-sequences'],
    practiceTopicIds: ['analysis-series'],
    capabilityTerms: ['series', 'converg', 'summation', 'p-series', 'leibniz'],
    workedExample: example(
      'Harmonic series',
      'Classify the series sum 1/n from n = 1 to infinity.',
      ['Recognize the series as a p-series.', 'Here p = 1.', 'A p-series converges only for p > 1.'],
      'The harmonic series diverges',
    ),
  },
  {
    id: 'analysis-taylor',
    courseId: 'analysis',
    title: 'Taylor and power-series reasoning',
    summary: 'Approximate functions while keeping remainder and convergence claims explicit.',
    objective: 'Construct supported Taylor objects and separate finite approximation from infinite-series convergence.',
    checkpoint: 'You can produce a Taylor polynomial and state what is and is not certified about its approximation.',
    prerequisites: ['analysis-series'],
    practiceTopicIds: ['analysis-taylor'],
    capabilityTerms: ['taylor', 'power series', 'remainder', 'approximation'],
    catchAll: true,
    workedExample: example(
      'Maclaurin polynomial',
      'Construct T3(x) for exp(x).',
      ['Every derivative of exp(x) equals exp(x).', 'At x = 0 every derivative value is 1.', 'Insert the coefficients 1/k! through degree 3.'],
      'T3(x) = 1 + x + x^2/2 + x^3/6',
    ),
  },

  {
    id: 'probability-core',
    courseId: 'probability',
    title: 'Probability models and conditioning',
    summary: 'Represent uncertainty exactly and update it conditionally.',
    objective: 'Compute supported probability quantities while keeping events, conditioning and independence assumptions explicit.',
    checkpoint: 'You can translate a verbal probability statement into the correct exact conditional expression.',
    prerequisites: [],
    practiceTopicIds: ['probability-core'],
    capabilityTerms: ['probability', 'bayes', 'conditional', 'distribution', 'random variable', 'expectation', 'covariance', 'markov'],
    workedExample: example(
      'Bayes update',
      'Given P(A)=0.01, P(B|A)=0.9 and P(B)=0.027, compute P(A|B).',
      ['Use P(A|B)=P(B|A)P(A)/P(B).', 'Multiply 0.9 by 0.01.', 'Divide 0.009 by 0.027.'],
      'P(A|B) = 1/3',
    ),
  },
  {
    id: 'probability-counting',
    courseId: 'probability',
    title: 'Counting for probability',
    summary: 'Count finite outcomes before assigning probabilities.',
    objective: 'Use exact combinatorial counts for finite probability models.',
    checkpoint: 'You can identify whether order and repetition matter before choosing a counting formula.',
    prerequisites: ['probability-core'],
    practiceTopicIds: ['probability-counting'],
    capabilityTerms: ['combination', 'permutation', 'count', 'choose', 'binomial'],
    workedExample: example(
      'Combination count',
      'How many ways can 3 objects be chosen from 8 without order?',
      ['Order does not matter, so use a combination.', 'Compute 8!/(3!5!).', 'Cancel common factors before multiplying.'],
      'C(8,3) = 56',
    ),
  },
  {
    id: 'statistics-descriptive',
    courseId: 'probability',
    title: 'Statistics and inference',
    summary: 'Summarize data and reason from samples with explicit conventions.',
    objective: 'Compute descriptive and supported inferential statistics while distinguishing sample quantities from population quantities.',
    checkpoint: 'You can state the estimator, denominator and assumptions behind a reported statistic.',
    prerequisites: ['probability-counting'],
    practiceTopicIds: ['statistics-descriptive'],
    capabilityTerms: ['statistic', 'mean', 'variance', 'regression', 'anova', 'bootstrap', 'test', 'confidence', 'sample'],
    catchAll: true,
    workedExample: example(
      'Sample variance convention',
      'For a sample x1,...,xn, which denominator is used by the usual unbiased sample variance?',
      ['Estimate the sample mean from the same observations.', 'That consumes one degree of freedom.', 'Divide the squared-deviation sum by n - 1.'],
      'n - 1',
    ),
  },

  {
    id: 'discrete-logic',
    courseId: 'discrete',
    title: 'Logic and finite reasoning',
    summary: 'Work with propositions, quantifiers and exact inference rules.',
    objective: 'Apply supported logical rules and distinguish a valid inference from a plausible pattern.',
    checkpoint: 'You can name the inference rule or counterexample that justifies your conclusion.',
    prerequisites: [],
    practiceTopicIds: ['discrete-logic'],
    capabilityTerms: ['logic', 'truth', 'quantif', 'entail', 'proposition', 'boolean'],
    workedExample: example(
      'Modus ponens',
      'From p -> q and p, determine what follows.',
      ['The implication states that q follows whenever p is true.', 'The second premise establishes p.', 'Apply modus ponens.'],
      'q',
    ),
  },
  {
    id: 'discrete-counting',
    courseId: 'discrete',
    title: 'Combinatorics and discrete structure',
    summary: 'Count finite configurations with exact combinatorial arguments.',
    objective: 'Use supported counting, generating-function and number-theoretic workflows.',
    checkpoint: 'You can explain the combinatorial object counted by each factor or coefficient.',
    prerequisites: ['discrete-logic'],
    practiceTopicIds: ['discrete-counting'],
    capabilityTerms: ['count', 'combination', 'permutation', 'stars', 'generating', 'modular', 'crt', 'diophantine', 'factorization'],
    workedExample: example(
      'Stars and bars',
      'Count nonnegative integer solutions to x1+x2+x3=5.',
      ['Represent the five units as stars.', 'Use two separators to divide them among three variables.', 'Choose the separator positions among seven total positions.'],
      'C(7,2) = 21',
    ),
  },
  {
    id: 'discrete-complexity',
    courseId: 'discrete',
    title: 'Algorithms and asymptotic complexity',
    summary: 'Analyze algorithmic cost and supported finite graph workflows.',
    objective: 'Classify recurrence growth and interpret deterministic algorithm traces and graph results.',
    checkpoint: 'You can justify a complexity class or graph result from the algorithm assumptions, not only from observed runs.',
    prerequisites: ['discrete-counting'],
    practiceTopicIds: ['discrete-complexity'],
    capabilityTerms: ['complex', 'master theorem', 'graph', 'shortest', 'flow', 'matching', 'dynamic programming', 'algorithm'],
    catchAll: true,
    workedExample: example(
      'Master theorem',
      'Classify T(n)=2T(n/2)+Theta(n).',
      ['Compute n^(log_b a)=n^(log_2 2)=n.', 'Compare f(n)=Theta(n) with that critical term.', 'They match polynomially, so apply the balanced case.'],
      'Theta(n log n)',
    ),
  },

  {
    id: 'numerical-roots',
    courseId: 'numerical',
    title: 'Numerical solving and error control',
    summary: 'Approximate roots and optima while tracking guarantees and stopping criteria.',
    objective: 'Select a supported numerical method whose hypotheses match the problem and interpret its residual or error information.',
    checkpoint: 'You can state why a method is applicable and what its stopping criterion guarantees.',
    prerequisites: [],
    practiceTopicIds: ['numerical-roots'],
    capabilityTerms: ['root', 'newton', 'bisection', 'optimization', 'minim', 'conjugate gradient', 'nonlinear', 'condition'],
    workedExample: example(
      'Bisection precondition',
      'What must a continuous f satisfy on [a,b] before standard bisection certifies a root bracket?',
      ['Continuity lets the Intermediate Value Theorem apply.', 'The endpoint values must have opposite signs.', 'Then at least one zero lies between the endpoints.'],
      'f(a)f(b) < 0',
    ),
  },
  {
    id: 'numerical-ode',
    courseId: 'numerical',
    title: 'ODEs and dynamical systems',
    summary: 'Solve and simulate supported initial-value problems.',
    objective: 'Distinguish symbolic ODE structure from numerical integration and interpret stability and phase information.',
    checkpoint: 'You can identify the ODE class, the initial data and the numerical or symbolic guarantee being used.',
    prerequisites: ['numerical-roots'],
    practiceTopicIds: ['numerical-ode'],
    capabilityTerms: ['ode', 'runge', 'rk', 'ivp', 'phase', 'equilibrium', 'stability', 'dynamical'],
    catchAll: true,
    workedExample: example(
      'Classical RK4 order',
      'What is the global order of the classical four-stage RK4 method for sufficiently smooth IVPs?',
      ['RK4 combines four slope evaluations per step.', 'Its local truncation error is fifth order.', 'Accumulating over a fixed interval yields fourth-order global error.'],
      'Fourth order',
    ),
  },

  {
    id: 'proof-verification',
    courseId: 'proof',
    title: 'Exact verification',
    summary: 'Separate proof, disproof and unresolved claims.',
    objective: 'Use deterministic verification rules, explicit conditions and counterexamples to classify mathematical claims.',
    checkpoint: 'You can distinguish verified, conditionally valid, invalid and not-proven outcomes.',
    prerequisites: [],
    practiceTopicIds: ['proof-verification'],
    capabilityTerms: ['verify', 'proof', 'equivalent', 'entail', 'counterexample', 'induction', 'theorem'],
    workedExample: example(
      'Sampling is not proof',
      'An identity matches at 20 sampled values but no exact rule proves it. What is the correct status?',
      ['Finite samples can expose a counterexample.', 'Matching samples cannot cover an infinite domain.', 'Without an exact rule, certification remains unavailable.'],
      'Not proven',
    ),
  },
  {
    id: 'proof-linear',
    courseId: 'proof',
    title: 'Structured proof steps',
    summary: 'Recognize reversible transformations and certified finite proof patterns.',
    objective: 'Apply exact proof rules to row operations, finite structures and supported theorem workflows.',
    checkpoint: 'You can explain why a step is reversible or cite the exact rule that certifies it.',
    prerequisites: ['proof-verification'],
    practiceTopicIds: ['proof-linear'],
    capabilityTerms: ['row', 'linear', 'finite', 'group', 'ring', 'field', 'topolog', 'metric', 'geometry'],
    catchAll: true,
    workedExample: example(
      'Elementary row operation',
      'Which operation is not elementary: swap rows, multiply a row by 3, add -2 times another row, or multiply a row by 0?',
      ['Elementary row operations must be reversible.', 'Swaps, nonzero scaling and row replacement all have inverses.', 'Scaling by zero destroys information and cannot be reversed.'],
      'Multiplying a row by 0 is not an elementary row operation',
    ),
  },
];

const conceptById = new Map(LEARNING_CONCEPTS.map((concept) => [concept.id, concept] as const));

export function learningConcept(id: string): LearningConcept | undefined {
  return conceptById.get(id);
}

export function conceptsForCourse(courseId: string): LearningConcept[] {
  return LEARNING_CONCEPTS.filter((concept) => concept.courseId === courseId);
}

function courseDefinition(courseId: string): PracticeCourse | undefined {
  return PRACTICE_COURSES.find((course) => course.id === courseId);
}

function topicDefinition(courseId: string, topicId: string): PracticeTopic | undefined {
  return courseDefinition(courseId)?.topics.find((topic) => topic.id === topicId);
}

function capabilityText(capability: CapabilityDescriptor): string {
  return [
    capability.id,
    capability.operation,
    capability.label,
    capability.category,
    capability.description,
    ...capability.aliases,
  ].join(' ').toLowerCase();
}

function termScore(concept: LearningConcept, capability: CapabilityDescriptor): number {
  const text = capabilityText(capability);
  return concept.capabilityTerms.reduce((score, term) => score + (text.includes(term.toLowerCase()) ? 1 : 0), 0);
}

export function learningCoverageForCourse(courseId: string): LearningCoverage {
  const courseConcepts = conceptsForCourse(courseId);
  const capabilities = capabilitiesForCourse(courseId);
  const buckets = new Map(courseConcepts.map((concept) => [concept.id, [] as CapabilityDescriptor[]] as const));
  const uncoveredCapabilityIds: string[] = [];
  const fallback = courseConcepts.find((concept) => concept.catchAll) ?? courseConcepts[courseConcepts.length - 1];

  for (const capability of capabilities) {
    let best: LearningConcept | undefined;
    let bestScore = 0;
    for (const concept of courseConcepts) {
      const score = termScore(concept, capability);
      if (score > bestScore) {
        bestScore = score;
        best = concept;
      }
    }
    const target = best ?? fallback;
    if (!target) {
      uncoveredCapabilityIds.push(capability.id);
      continue;
    }
    buckets.get(target.id)?.push(capability);
  }

  return {
    courseId: courseId as CapabilityCourseId,
    totalCapabilities: capabilities.length,
    coveredCapabilities: capabilities.length - uncoveredCapabilityIds.length,
    uncoveredCapabilityIds,
    byConcept: courseConcepts.map((concept) => ({ concept, capabilities: buckets.get(concept.id) ?? [] })),
  };
}

export function capabilitiesForConcept(conceptId: string): CapabilityDescriptor[] {
  const concept = learningConcept(conceptId);
  if (!concept) return [];
  return learningCoverageForCourse(concept.courseId).byConcept.find((item) => item.concept.id === conceptId)?.capabilities ?? [];
}

export function conceptProgress(
  state: PracticeProgressState,
  conceptId: string,
  now = Date.now(),
): ConceptProgressSummary {
  const concept = learningConcept(conceptId);
  if (!concept) return { conceptId, attempts: 0, accuracy: 0, mastery: 0, due: 0, seen: 0 };
  const records = Object.values(state.records).filter((record) =>
    record.courseId === concept.courseId && concept.practiceTopicIds.includes(record.topicId));
  const attempts = records.reduce((sum, record) => sum + record.attempts, 0);
  const correct = records.reduce((sum, record) => sum + record.correct, 0);
  const mastery = records.length
    ? records.reduce((sum, record) => sum + record.mastery, 0) / records.length
    : 0;
  return {
    conceptId,
    attempts,
    accuracy: attempts ? correct / attempts : 0,
    mastery,
    due: records.filter((record) => record.dueAt <= now).length,
    seen: records.length,
  };
}

export function conceptReadiness(state: PracticeProgressState, conceptId: string): ConceptReadiness {
  const concept = learningConcept(conceptId);
  if (!concept) return { ready: false, blockedBy: [] };
  const blockedBy = concept.prerequisites
    .map((id) => learningConcept(id))
    .filter((item): item is LearningConcept => Boolean(item))
    .filter((item) => conceptProgress(state, item.id).mastery < 0.55);
  return { ready: blockedBy.length === 0, blockedBy };
}

export function recommendedConceptForCourse(
  courseId: string,
  state: PracticeProgressState,
): LearningConcept | undefined {
  const concepts = conceptsForCourse(courseId);
  const ready = concepts.filter((concept) => conceptReadiness(state, concept.id).ready);
  const pool = ready.length ? ready : concepts;
  return [...pool].sort((a, b) => {
    const pa = conceptProgress(state, a.id);
    const pb = conceptProgress(state, b.id);
    if (pa.seen === 0 && pb.seen !== 0) return -1;
    if (pb.seen === 0 && pa.seen !== 0) return 1;
    return pa.mastery - pb.mastery;
  })[0];
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function conceptExercises(concept: LearningConcept, seed: number): PracticeExercise[] {
  const course = courseDefinition(concept.courseId);
  if (!course) return [];
  return concept.practiceTopicIds.flatMap((topicId, topicIndex) => {
    const topic = topicDefinition(concept.courseId, topicId);
    if (!topic) return [];
    const authored = authoredExercisesForTopic(topic);
    const generated = topic.templateIds.flatMap((templateId, templateIndex) =>
      Array.from({ length: 3 }, (_, variant) =>
        generatePracticeExercise(
          templateId,
          hashString(concept.id + ':' + String(seed) + ':' + String(topicIndex) + ':' + String(templateIndex) + ':' + String(variant)),
        )));
    return [...authored, ...generated];
  });
}

export function buildGuidedConceptSession(
  conceptId: string,
  state: PracticeProgressState,
  count = 6,
  seed = Date.now(),
): PracticeExercise[] {
  const concept = learningConcept(conceptId);
  if (!concept) return [];
  const candidates = conceptExercises(concept, seed);
  return [...candidates]
    .sort((a, b) => {
      const pa = state.records[a.id];
      const pb = state.records[b.id];
      const ma = pa?.mastery ?? -0.05;
      const mb = pb?.mastery ?? -0.05;
      if (ma !== mb) return ma - mb;
      return hashString(a.id + ':' + String(seed)) - hashString(b.id + ':' + String(seed));
    })
    .slice(0, Math.max(1, count));
}

export function learningModelIntegrity(): LearningModelIntegrity {
  const ids = new Map<string, number>();
  const unknownCourses: string[] = [];
  const unknownPracticeTopics: string[] = [];
  const unknownPrerequisites: string[] = [];
  const conceptsWithoutWorkedExamples: string[] = [];

  for (const concept of LEARNING_CONCEPTS) {
    ids.set(concept.id, (ids.get(concept.id) ?? 0) + 1);
    const course = courseDefinition(concept.courseId);
    if (!course) unknownCourses.push(concept.id);
    for (const topicId of concept.practiceTopicIds) {
      if (!topicDefinition(concept.courseId, topicId)) unknownPracticeTopics.push(concept.id + ':' + topicId);
    }
    for (const prerequisite of concept.prerequisites) {
      if (!learningConcept(prerequisite)) unknownPrerequisites.push(concept.id + ':' + prerequisite);
    }
    if (!concept.workedExample.title.trim() || !concept.workedExample.prompt.trim() || !concept.workedExample.result.trim() || concept.workedExample.steps.length === 0) {
      conceptsWithoutWorkedExamples.push(concept.id);
    }
  }

  const coveredTopicIds = new Set(LEARNING_CONCEPTS.flatMap((concept) => concept.practiceTopicIds));
  const uncoveredPracticeTopics = PRACTICE_COURSES
    .flatMap((course) => course.topics.map((topic) => topic.id))
    .filter((topicId) => !coveredTopicIds.has(topicId));

  const uncoveredCapabilities = PRACTICE_COURSES.flatMap((course) =>
    learningCoverageForCourse(course.id).uncoveredCapabilityIds.map((id) => course.id + ':' + id));

  return {
    duplicateConceptIds: [...ids.entries()].filter(([, count]) => count > 1).map(([id]) => id),
    unknownCourses,
    unknownPracticeTopics,
    unknownPrerequisites,
    uncoveredPracticeTopics,
    uncoveredCapabilities,
    conceptsWithoutWorkedExamples,
  };
}

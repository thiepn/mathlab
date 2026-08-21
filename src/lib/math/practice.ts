import { verifySingleTransition } from './proofLab';

export type PracticeDifficulty = 1 | 2 | 3 | 4 | 5;
export type PracticeAnswerType = 'math' | 'choice';
export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';

export interface PracticeChoice { id: string; label: string; }

export interface PracticeExercise {
  id: string;
  source: 'authored' | 'generated';
  courseId: string;
  topicId: string;
  title: string;
  prompt: string;
  difficulty: PracticeDifficulty;
  answerType: PracticeAnswerType;
  expected: string;
  choices?: PracticeChoice[];
  hints: string[];
  solution: string;
  tags: string[];
}

export interface PracticeTopic {
  id: string;
  courseId: string;
  title: string;
  description: string;
  templateIds: string[];
  authoredIds: string[];
}

export interface PracticeCourse {
  id: string;
  title: string;
  phaseRange: string;
  description: string;
  topics: PracticeTopic[];
}

export interface PracticeAttempt {
  at: number;
  correct: boolean;
  rating: ReviewRating;
  hintsUsed: number;
  solutionRevealed: boolean;
}

export interface ExerciseProgress {
  exerciseId: string;
  courseId: string;
  topicId: string;
  attempts: number;
  correct: number;
  streak: number;
  mastery: number;
  ease: number;
  intervalDays: number;
  dueAt: number;
  lastAttemptAt: number;
  lastRating: ReviewRating;
  history: PracticeAttempt[];
}

export interface PracticeProgressState {
  version: 1;
  records: Record<string, ExerciseProgress>;
  completedSessions: number;
  completedExams: number;
  totalCorrect: number;
  totalAttempts: number;
  lastCourseId?: string;
  updatedAt: number;
}

export interface PracticeGrade {
  correct: boolean;
  status: 'verified' | 'conditional' | 'invalid' | 'not-proven';
  feedback: string;
}

export interface CourseProgressSummary {
  courseId: string;
  attempts: number;
  accuracy: number;
  mastery: number;
  due: number;
  seen: number;
}

const MINUTE = 60_000;
const DAY = 86_400_000;

function clamp(value: number, min: number, max: number): number { return Math.min(max, Math.max(min, value)); }
function gcd(a: number, b: number): number { let x = Math.abs(a); let y = Math.abs(b); while (y) [x, y] = [y, x % y]; return x || 1; }
function fraction(n: number, d: number): string { const sign = d < 0 ? -1 : 1; const g = gcd(n, d); const a = sign * n / g; const b = Math.abs(d) / g; return b === 1 ? String(a) : `${a}/${b}`; }

function hashSeed(seed: number): number {
  let x = seed | 0;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  return x >>> 0;
}

function rng(seed: number): () => number {
  let state = hashSeed(seed || 1);
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

function int(random: () => number, min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

function nonzeroInt(random: () => number, min: number, max: number): number {
  let value = 0;
  while (value === 0) value = int(random, min, max);
  return value;
}

const authored: Record<string, Omit<PracticeExercise, 'id' | 'source'>> = {
  'algebra-domain': {
    courseId:'algebra', topicId:'algebra-transformations', title:'Cancellation and domain', difficulty:3,
    prompt:'Is the transformation x/x → 1 unconditionally valid over the real numbers?', answerType:'choice', expected:'conditional',
    choices:[{id:'verified',label:'Yes, always valid'},{id:'conditional',label:'Only when x ≠ 0'},{id:'invalid',label:'Never valid'}],
    hints:['Compare the domain of x/x with the domain of 1.','The denominator of the original expression cannot equal zero.'],
    solution:'The algebraic values agree wherever x ≠ 0, but x/x is undefined at x = 0. The transformation is conditionally valid under x ≠ 0.', tags:['domain','equivalence'],
  },
  'calculus-chain': {
    courseId:'calculus', topicId:'calculus-derivatives', title:'Chain rule', difficulty:2,
    prompt:'Differentiate f(x) = (x^2 + 1)^3. Enter only f\'(x).', answerType:'math', expected:'6*x*(x^2+1)^2',
    hints:['Use the power rule on the outer cube.','Multiply the outer derivative by the derivative of x^2 + 1.'],
    solution:'Let u = x^2 + 1. Then d(u^3)/dx = 3u^2·u\' = 3(x^2+1)^2·2x = 6x(x^2+1)^2.', tags:['derivative','chain-rule'],
  },
  'linear-rref': {
    courseId:'linear-algebra', topicId:'linear-row-reduction', title:'Exact RREF', difficulty:3,
    prompt:'Give the RREF of [[1,2],[2,4]].', answerType:'math', expected:'[[1,2],[0,0]]',
    hints:['Eliminate the entry below the first pivot.','Use R2 ← R2 − 2R1.'],
    solution:'R2 ← R2 − 2R1 gives [[1,2],[0,0]], which is already in reduced row-echelon form.', tags:['rref','rank'],
  },
  'linear-hermitian': {
    courseId:'linear-algebra', topicId:'linear-advanced', title:'Hermitian criterion', difficulty:2,
    prompt:'Which condition defines a Hermitian matrix?', answerType:'choice', expected:'adjoint',
    choices:[{id:'transpose',label:'Aᵀ = A'},{id:'adjoint',label:'A* = A'},{id:'inverse',label:'A⁻¹ = A'},{id:'det',label:'det(A) = 1'}],
    hints:['Complex entries require conjugation as well as transposition.'], solution:'A matrix is Hermitian exactly when its conjugate transpose (adjoint) satisfies A* = A.', tags:['hermitian','adjoint'],
  },
  'analysis-harmonic': {
    courseId:'analysis', topicId:'analysis-series', title:'Harmonic series', difficulty:2,
    prompt:'Classify Σ(1/n), n = 1…∞.', answerType:'choice', expected:'divergent',
    choices:[{id:'absolute',label:'Absolutely convergent'},{id:'conditional',label:'Conditionally convergent'},{id:'divergent',label:'Divergent'}],
    hints:['This is a p-series with p = 1.'], solution:'A p-series Σ1/n^p converges iff p > 1. Here p = 1, so the harmonic series diverges.', tags:['series','p-series'],
  },
  'analysis-taylor': {
    courseId:'analysis', topicId:'analysis-taylor', title:'Taylor polynomial', difficulty:2,
    prompt:'Give the Maclaurin polynomial T3(x) for exp(x).', answerType:'math', expected:'1+x+x^2/2+x^3/6',
    hints:['All derivatives of exp(x) equal exp(x).','At x = 0 every derivative equals 1.'], solution:'T3(x) = Σ_{k=0}^3 x^k/k! = 1 + x + x²/2 + x³/6.', tags:['taylor','series'],
  },
  'probability-bayes': {
    courseId:'probability', topicId:'probability-core', title:'Bayes theorem', difficulty:3,
    prompt:'If P(A)=1/100, P(B|A)=9/10 and P(B)=27/1000, compute P(A|B).', answerType:'math', expected:'1/3',
    hints:['Use P(A|B)=P(B|A)P(A)/P(B).'], solution:'P(A|B) = (9/10)(1/100)/(27/1000) = 1/3.', tags:['bayes','conditional-probability'],
  },
  'statistics-variance': {
    courseId:'probability', topicId:'statistics-descriptive', title:'Sample vs population variance', difficulty:2,
    prompt:'For a sample of n observations, which denominator is used by the usual unbiased sample variance?', answerType:'choice', expected:'n-1',
    choices:[{id:'n',label:'n'},{id:'n-1',label:'n − 1'},{id:'n+1',label:'n + 1'}], hints:['One degree of freedom is consumed by estimating the sample mean.'], solution:'The usual unbiased sample variance divides the squared-deviation sum by n − 1.', tags:['variance','statistics'],
  },
  'discrete-master': {
    courseId:'discrete', topicId:'discrete-complexity', title:'Master theorem', difficulty:3,
    prompt:'For T(n)=2T(n/2)+Θ(n), what is the tight asymptotic bound?', answerType:'choice', expected:'nlogn',
    choices:[{id:'n',label:'Θ(n)'},{id:'nlogn',label:'Θ(n log n)'},{id:'n2',label:'Θ(n²)'},{id:'logn',label:'Θ(log n)'}],
    hints:['Compare f(n)=n with n^{log_b a}.','log₂2 = 1, so both terms have the same polynomial order.'], solution:'n^{log₂2}=n, matching f(n)=Θ(n), so Master theorem case 2 gives Θ(n log n).', tags:['master-theorem','complexity'],
  },
  'discrete-logic': {
    courseId:'discrete', topicId:'discrete-logic', title:'Modus ponens', difficulty:1,
    prompt:'From p → q and p, which conclusion follows?', answerType:'choice', expected:'q',
    choices:[{id:'p',label:'p'},{id:'q',label:'q'},{id:'notq',label:'¬q'},{id:'none',label:'No conclusion'}], hints:['Apply modus ponens.'], solution:'From p → q and p, modus ponens yields q.', tags:['logic','entailment'],
  },
  'numerical-bisection': {
    courseId:'numerical', topicId:'numerical-roots', title:'Bisection requirement', difficulty:1,
    prompt:'What must a continuous f satisfy on [a,b] before standard bisection can certify a root bracket?', answerType:'choice', expected:'sign',
    choices:[{id:'sign',label:'f(a)f(b) < 0'},{id:'derivative',label:'f\'(a)=0'},{id:'positive',label:'f(a),f(b)>0'},{id:'same',label:'f(a)=f(b)'}],
    hints:['Use the Intermediate Value Theorem.'], solution:'A sign change f(a)f(b)<0 guarantees at least one zero between a and b for continuous f.', tags:['bisection','roots'],
  },
  'numerical-rk4': {
    courseId:'numerical', topicId:'numerical-ode', title:'RK4 order', difficulty:2,
    prompt:'What is the classical global order of accuracy of RK4 for sufficiently smooth IVPs?', answerType:'choice', expected:'4',
    choices:[{id:'1',label:'First order'},{id:'2',label:'Second order'},{id:'4',label:'Fourth order'},{id:'5',label:'Fifth order'}], hints:['The name RK4 refers to the classical four-stage fourth-order method.'], solution:'Classical RK4 is globally fourth order under the usual smoothness assumptions.', tags:['rk4','ode'],
  },
  'proof-sampling': {
    courseId:'proof', topicId:'proof-verification', title:'Samples are not proof', difficulty:2,
    prompt:'A proposed identity matches at 20 sampled x-values, but no exact rule proves it. What should Proof Lab report?', answerType:'choice', expected:'not-proven',
    choices:[{id:'verified',label:'Verified'},{id:'not-proven',label:'Not proven'},{id:'invalid',label:'Invalid'}], hints:['Finite samples can reveal counterexamples, but cannot certify an identity over an infinite domain.'], solution:'The correct status is NOT PROVEN. Sampling may disprove by counterexample, but matching samples cannot establish a universal identity.', tags:['proof','counterexample'],
  },
  'proof-row-operation': {
    courseId:'proof', topicId:'proof-linear', title:'Elementary row operation', difficulty:2,
    prompt:'Which row operation is not reversible and therefore is not an elementary row operation?', answerType:'choice', expected:'zero-scale',
    choices:[{id:'swap',label:'Swap two rows'},{id:'nonzero-scale',label:'Multiply a row by 3'},{id:'replace',label:'Add −2 times another row'},{id:'zero-scale',label:'Multiply a row by 0'}],
    hints:['An elementary row operation must be invertible.'], solution:'Multiplying a row by zero destroys information and cannot be reversed. Nonzero scaling, swapping, and row replacement are reversible.', tags:['proof','linear-algebra'],
  },
};

function authoredExercise(id: string): PracticeExercise {
  const value = authored[id];
  if (!value) throw new Error(`Unknown authored exercise ${id}.`);
  return { id:`auth:${id}`, source:'authored', ...value };
}

type TemplateGenerator = (seed: number) => PracticeExercise;

const templates: Record<string, TemplateGenerator> = {
  'linear-equation': (seed) => {
    const random=rng(seed); const a=nonzeroInt(random,-7,7); const x=int(random,-8,8); const b=int(random,-9,9); const c=a*x+b;
    return generated(seed,'linear-equation','algebra','algebra-equations','Solve a linear equation',1,
      `Solve ${a}*x ${b < 0 ? '-' : '+'} ${Math.abs(b)} = ${c}. Enter only the value of x.`,String(x),
      ['Undo the constant term first.','Then divide by the nonzero coefficient of x.'],`Subtract ${b} from both sides and divide by ${a}. The exact solution is x = ${x}.`,['linear-equation']);
  },
  'expand-quadratic': (seed) => {
    const random=rng(seed); const a=int(random,-6,6); const b=int(random,-6,6); const linear=a+b; const constant=a*b;
    const expected=`x^2${linear===0?'':linear>0?`+${linear}*x`:`${linear}*x`}${constant===0?'':constant>0?`+${constant}`:`${constant}`}`;
    return generated(seed,'expand-quadratic','algebra','algebra-polynomials','Expand a product',2,
      `Expand (x ${a < 0 ? '-' : '+'} ${Math.abs(a)})*(x ${b < 0 ? '-' : '+'} ${Math.abs(b)}).`,expected,
      ['Distribute each term in the first factor across the second.','Collect the two x-terms after expansion.'],`The middle coefficient is ${a}+${b}=${linear}, and the constant is ${a}·${b}=${constant}.`,['expand','polynomial']);
  },
  'derivative-polynomial': (seed) => {
    const random=rng(seed); const a=nonzeroInt(random,-5,5); const b=nonzeroInt(random,-7,7); const c=int(random,-9,9);
    return generated(seed,'derivative-polynomial','calculus','calculus-derivatives','Differentiate a polynomial',1,
      `Differentiate f(x) = ${a}*x^3 ${b<0?'-':'+'} ${Math.abs(b)}*x ${c<0?'-':'+'} ${Math.abs(c)}. Enter only f'(x).`,`${3*a}*x^2${b>0?`+${b}`:`${b}`}`,
      ['Apply the power rule term by term.','The derivative of the constant term is zero.'],`d(${a}x³)/dx=${3*a}x² and d(${b}x)/dx=${b}; the constant vanishes.`,['derivative','polynomial']);
  },
  'definite-linear-integral': (seed) => {
    const random=rng(seed); const a=nonzeroInt(random,-5,5); const b=int(random,-5,5); const upper=int(random,1,5); const numerator=a*upper*upper + 2*b*upper;
    return generated(seed,'definite-linear-integral','calculus','calculus-integrals','Exact definite integral',2,
      `Compute ∫_0^${upper} (${a}*x ${b<0?'-':'+'} ${Math.abs(b)}) dx.`,fraction(numerator,2),
      ['Use the antiderivative (a/2)x² + bx.','Evaluate at the upper bound and subtract the value at 0.'],`The integral is (${a}/2)·${upper}² + ${b}·${upper} = ${fraction(numerator,2)}.`,['integral','exact']);
  },
  'determinant-2x2': (seed) => {
    const random=rng(seed); const a=int(random,-5,5), b=int(random,-5,5), c=int(random,-5,5), d=int(random,-5,5); const det=a*d-b*c;
    return generated(seed,'determinant-2x2','linear-algebra','linear-matrices','2×2 determinant',1,
      `Compute det([[${a},${b}],[${c},${d}]]).`,String(det),
      ['For [[a,b],[c,d]], use ad − bc.'],`${a}·${d} − ${b}·${c} = ${det}.`,['determinant','matrix']);
  },
  'sequence-rational-limit': (seed) => {
    const random=rng(seed); const a=nonzeroInt(random,1,9); const p=int(random,1,4);
    return generated(seed,'sequence-rational-limit','analysis','analysis-sequences','Sequence limit',1,
      `Find lim(n→∞) ${a}/n^${p}.`, '0',
      ['The denominator grows without bound while the numerator is constant.'],`Because p=${p}>0, n^p→∞, so ${a}/n^${p}→0.`,['sequence','limit']);
  },
  'combination': (seed) => {
    const random=rng(seed); const n=int(random,5,11); const k=int(random,1,Math.min(5,n-1)); let value=1; for(let i=1;i<=k;i+=1)value=value*(n-k+i)/i;
    return generated(seed,'combination','probability','probability-counting','Combinations',1,
      `Compute choose(${n},${k}).`,String(Math.round(value)),
      [`Use n!/(k!(n−k)!).`],`choose(${n},${k}) = ${Math.round(value)}.`,['combinatorics','probability']);
  },
  'dataset-mean': (seed) => {
    const random=rng(seed); const values=Array.from({length:4},()=>int(random,0,12)); const total=values.reduce((s,v)=>s+v,0);
    return generated(seed,'dataset-mean','probability','statistics-descriptive','Exact mean',1,
      `Find the arithmetic mean of data(${values.join(',')}).`,fraction(total,values.length),
      ['Add all observations, then divide by the number of observations.'],`The sum is ${total}; dividing by ${values.length} gives ${fraction(total,values.length)}.`,['statistics','mean']);
  },
  'stars-bars': (seed) => {
    const random=rng(seed); const balls=int(random,3,8); const boxes=int(random,2,5); let value=1; const n=balls+boxes-1; const k=boxes-1; for(let i=1;i<=k;i+=1)value=value*(n-k+i)/i;
    return generated(seed,'stars-bars','discrete','discrete-counting','Stars and bars',2,
      `How many nonnegative integer solutions does x1+...+x${boxes}=${balls} have? Enter the count.`,String(Math.round(value)),
      ['Use the stars-and-bars formula C(n+k−1,k−1).'],`The count is C(${balls+boxes-1},${boxes-1}) = ${Math.round(value)}.`,['stars-bars','counting']);
  },
  'proof-equivalence': (seed) => {
    const random=rng(seed); const a=int(random,-8,8); const b=int(random,-8,8);
    return generated(seed,'proof-equivalence','proof','proof-verification','Equivalent expressions',2,
      `Give an expression equivalent to (${a})*(x+${b}).`,`${a}*x+${a*b}`,
      ['Distribute the coefficient across both terms.'],`${a}(x+${b}) = ${a}x + ${a*b}. Proof Lab can certify this polynomial identity exactly.`,['proof','equivalence']);
  },
};

function generated(seed:number, templateId:string, courseId:string, topicId:string, title:string, difficulty:PracticeDifficulty, prompt:string, expected:string, hints:string[], solution:string, tags:string[]): PracticeExercise {
  return { id:`gen:${templateId}:${seed >>> 0}`, source:'generated', courseId, topicId, title, prompt, difficulty, answerType:'math', expected, hints, solution, tags };
}

function topic(courseId:string,id:string,title:string,description:string,templateIds:string[],authoredIds:string[]): PracticeTopic {
  return { courseId,id,title,description,templateIds,authoredIds };
}

export const PRACTICE_COURSES: PracticeCourse[] = [
  { id:'algebra', title:'Algebra & Equations', phaseRange:'P4', description:'Exact algebra, equations, factorization and domain-aware transformations.', topics:[
    topic('algebra','algebra-equations','Linear equations','Solve exact one-variable equations and preserve reversible steps.',['linear-equation'],[]),
    topic('algebra','algebra-polynomials','Polynomial algebra','Expand, collect and recognize polynomial identities.',['expand-quadratic'],[]),
    topic('algebra','algebra-transformations','Domain-safe transformations','Distinguish algebraic identities from domain-changing simplifications.',[],['algebra-domain']),
  ]},
  { id:'calculus', title:'Functions & Calculus', phaseRange:'P5–P6', description:'Derivatives, integrals and function reasoning.', topics:[
    topic('calculus','calculus-derivatives','Differentiation','Power, chain and exact derivative workflows.',['derivative-polynomial'],['calculus-chain']),
    topic('calculus','calculus-integrals','Integration','Exact elementary definite integrals.',['definite-linear-integral'],[]),
  ]},
  { id:'linear-algebra', title:'Linear Algebra', phaseRange:'P7–P8', description:'Matrices, row reduction and advanced inner-product structure.', topics:[
    topic('linear-algebra','linear-matrices','Matrices','Determinants and exact matrix foundations.',['determinant-2x2'],[]),
    topic('linear-algebra','linear-row-reduction','Row reduction','RREF and reversible row operations.',[],['linear-rref']),
    topic('linear-algebra','linear-advanced','Advanced structure','Hermitian, orthogonal and spectral concepts.',[],['linear-hermitian']),
  ]},
  { id:'analysis', title:'Real Analysis', phaseRange:'P9', description:'Sequences, infinite series, rigorous limits and Taylor expansions.', topics:[
    topic('analysis','analysis-sequences','Sequences','Limit classification for supported exact sequence families.',['sequence-rational-limit'],[]),
    topic('analysis','analysis-series','Series','Convergence classifications and theorem choice.',[],['analysis-harmonic']),
    topic('analysis','analysis-taylor','Taylor & power series','Finite Taylor construction and convergence distinctions.',[],['analysis-taylor']),
  ]},
  { id:'probability', title:'Probability & Statistics', phaseRange:'P10', description:'Exact probability, counting and statistical foundations.', topics:[
    topic('probability','probability-core','Probability','Conditional probability and Bayes theorem.',[],['probability-bayes']),
    topic('probability','probability-counting','Probability counting','Combinations used in discrete probability.',['combination'],[]),
    topic('probability','statistics-descriptive','Descriptive statistics','Exact means, variance conventions and basic summaries.',['dataset-mean'],['statistics-variance']),
  ]},
  { id:'discrete', title:'Discrete Math & Algorithms', phaseRange:'P11', description:'Logic, counting and asymptotic algorithm analysis.', topics:[
    topic('discrete','discrete-logic','Logic','Propositional entailment and proof rules.',[],['discrete-logic']),
    topic('discrete','discrete-counting','Counting','Stars and bars and discrete combinatorics.',['stars-bars'],[]),
    topic('discrete','discrete-complexity','Complexity','Tight asymptotic classification and Master theorem.',[],['discrete-master']),
  ]},
  { id:'numerical', title:'Numerical Math & ODEs', phaseRange:'P12', description:'Convergence conditions, numerical error and ODE methods.', topics:[
    topic('numerical','numerical-roots','Root finding','Conditions and guarantees for numerical root methods.',[],['numerical-bisection']),
    topic('numerical','numerical-ode','ODE methods','Accuracy and interpretation of explicit IVP solvers.',[],['numerical-rk4']),
  ]},
  { id:'proof', title:'Verify My Work', phaseRange:'P13', description:'Exact certification, counterexamples and transformation validity.', topics:[
    topic('proof','proof-verification','Verification logic','Understand what can be certified, disproved or left not proven.',['proof-equivalence'],['proof-sampling']),
    topic('proof','proof-linear','Linear proof steps','Recognize reversible elementary row operations.',[],['proof-row-operation']),
  ]},
];

export function emptyPracticeProgress(): PracticeProgressState {
  return { version:1, records:{}, completedSessions:0, completedExams:0, totalCorrect:0, totalAttempts:0, updatedAt:Date.now() };
}

export function generatePracticeExercise(templateId:string, seed:number): PracticeExercise {
  const generator=templates[templateId]; if(!generator)throw new Error(`Unknown practice template ${templateId}.`); return generator(seed >>> 0);
}

export function getPracticeExercise(id:string): PracticeExercise | null {
  if(id.startsWith('auth:')) { const key=id.slice(5); return authored[key] ? authoredExercise(key) : null; }
  const match=/^gen:([^:]+):(\d+)$/.exec(id); if(!match)return null;
  try { return generatePracticeExercise(match[1],Number(match[2])); } catch { return null; }
}

export function authoredExercisesForTopic(topic:PracticeTopic): PracticeExercise[] { return topic.authoredIds.map(authoredExercise); }

export function gradePracticeAnswer(exercise:PracticeExercise, answer:string): PracticeGrade {
  const trimmed=answer.trim();
  if(!trimmed)return { correct:false,status:'invalid',feedback:'Enter an answer before checking.' };
  if(exercise.answerType==='choice') {
    const correct=trimmed===exercise.expected;
    return { correct,status:correct?'verified':'invalid',feedback:correct?'Correct.':'That choice is not correct.' };
  }
  try {
    const report=verifySingleTransition(exercise.expected,trimmed);
    if(report.status==='verified')return {correct:true,status:'verified',feedback:'Verified exactly by MathLab.'};
    if(report.status==='conditionally-valid')return {correct:false,status:'conditional',feedback:'Your expression matches only under an additional condition. The requested answer is unconditional.'};
    if(report.status==='invalid')return {correct:false,status:'invalid',feedback:report.transitions.find((item)=>item.counterexample)?.counterexample ? `Not equivalent. Counterexample: ${report.transitions.find((item)=>item.counterexample)?.counterexample}` : 'Not equivalent to the expected result.'};
    return {correct:false,status:'not-proven',feedback:'MathLab cannot certify this answer with the current deterministic verifier. Try an equivalent exact form closer to the expected object.'};
  } catch (error) {
    return {correct:false,status:'invalid',feedback:error instanceof Error?error.message:'The answer could not be parsed.'};
  }
}

function ratingForAttempt(correct:boolean,hintsUsed:number,solutionRevealed:boolean,previous?:ExerciseProgress): ReviewRating {
  if(!correct)return 'again';
  if(solutionRevealed||hintsUsed>=2)return 'hard';
  if(hintsUsed===1)return 'good';
  return (previous?.streak ?? 0)>=2 ? 'easy' : 'good';
}

export function recordPracticeAttempt(state:PracticeProgressState, exercise:PracticeExercise, correct:boolean, hintsUsed:number, solutionRevealed:boolean, at=Date.now()): PracticeProgressState {
  const previous=state.records[exercise.id]; const rating=ratingForAttempt(correct,hintsUsed,solutionRevealed,previous);
  const ease=clamp((previous?.ease ?? 2.3)+(rating==='again'?-0.2:rating==='hard'?-0.05:rating==='easy'?0.08:0),1.3,3);
  let intervalDays:number;
  if(rating==='again')intervalDays=10*MINUTE/DAY;
  else if(rating==='hard')intervalDays=Math.max(0.5,(previous?.intervalDays ?? 0)*1.2);
  else if(rating==='good')intervalDays=(previous?.intervalDays ?? 0)<1?1:Math.max(1,(previous?.intervalDays ?? 1)*ease);
  else intervalDays=(previous?.intervalDays ?? 0)<1?3:Math.max(3,(previous?.intervalDays ?? 1)*ease*1.3);
  const masteryDelta=rating==='again'?-0.12:rating==='hard'?0.045:rating==='good'?0.09:0.13;
  const mastery=clamp((previous?.mastery ?? 0)+masteryDelta,0,1);
  const attempt:PracticeAttempt={at,correct,rating,hintsUsed,solutionRevealed};
  const record:ExerciseProgress={
    exerciseId:exercise.id,courseId:exercise.courseId,topicId:exercise.topicId,attempts:(previous?.attempts??0)+1,correct:(previous?.correct??0)+(correct?1:0),
    streak:correct?(previous?.streak??0)+1:0,mastery,ease,intervalDays,dueAt:at+intervalDays*DAY,lastAttemptAt:at,lastRating:rating,
    history:[attempt,...(previous?.history??[])].slice(0,20),
  };
  return {...state,records:{...state.records,[exercise.id]:record},totalCorrect:state.totalCorrect+(correct?1:0),totalAttempts:state.totalAttempts+1,lastCourseId:exercise.courseId,updatedAt:at};
}

export function markSessionComplete(state:PracticeProgressState, exam=false):PracticeProgressState {
  return {...state,completedSessions:state.completedSessions+(exam?0:1),completedExams:state.completedExams+(exam?1:0),updatedAt:Date.now()};
}

function allTopicExercises(topic:PracticeTopic, seed:number):PracticeExercise[] {
  const fixed=authoredExercisesForTopic(topic);
  const generated=topic.templateIds.flatMap((templateId,index)=>Array.from({length:3},(_,variant)=>generatePracticeExercise(templateId,hashSeed(seed+index*7919+variant*104729))));
  return [...fixed,...generated];
}

function deterministicShuffle<T>(items:T[],seed:number):T[] {
  const random=rng(seed); const next=[...items];
  for(let i=next.length-1;i>0;i-=1){const j=Math.floor(random()*(i+1));[next[i],next[j]]=[next[j],next[i]];}
  return next;
}

export function buildCourseSession(courseId:string,state:PracticeProgressState,count=8,seed=Date.now()):PracticeExercise[] {
  const course=PRACTICE_COURSES.find((item)=>item.id===courseId); if(!course)return [];
  const candidates=course.topics.flatMap((item,index)=>allTopicExercises(item,hashSeed(seed+index*104729)));
  const ranked=deterministicShuffle(candidates,seed).sort((a,b)=>{
    const pa=state.records[a.id]; const pb=state.records[b.id];
    const sa=pa?pa.mastery:0; const sb=pb?pb.mastery:0;
    return sa-sb;
  });
  return ranked.slice(0,Math.max(1,count));
}

export function buildAdaptiveReview(state:PracticeProgressState,count=10,seed=Date.now(),courseId?:string,now=Date.now()):PracticeExercise[] {
  const due=Object.values(state.records)
    .filter((record)=>record.dueAt<=now&&(!courseId||record.courseId===courseId))
    .sort((a,b)=>a.dueAt-b.dueAt||a.mastery-b.mastery)
    .map((record)=>getPracticeExercise(record.exerciseId)).filter((item):item is PracticeExercise=>Boolean(item));
  if(due.length>=count)return due.slice(0,count);
  const courses=courseId?PRACTICE_COURSES.filter((item)=>item.id===courseId):PRACTICE_COURSES;
  const fresh=courses.flatMap((course,ci)=>course.topics.flatMap((topic,ti)=>allTopicExercises(topic,hashSeed(seed+ci*4099+ti*131))))
    .filter((exercise)=>!due.some((item)=>item.id===exercise.id));
  const ranked=deterministicShuffle(fresh,seed).sort((a,b)=>{
    const pa=state.records[a.id]; const pb=state.records[b.id];
    const va=pa?.mastery ?? -0.05; const vb=pb?.mastery ?? -0.05;
    return va-vb;
  });
  return [...due,...ranked].slice(0,count);
}

export function buildExamSession(courseId:string,count=10,seed=Date.now()):PracticeExercise[] {
  const course=PRACTICE_COURSES.find((item)=>item.id===courseId); if(!course)return [];
  const pool=course.topics.flatMap((topic,index)=>allTopicExercises(topic,hashSeed(seed+index*65537)));
  return deterministicShuffle(pool,seed).slice(0,Math.min(Math.max(1,count),pool.length));
}

export function courseProgress(state:PracticeProgressState,courseId:string,now=Date.now()):CourseProgressSummary {
  const records=Object.values(state.records).filter((record)=>record.courseId===courseId);
  const attempts=records.reduce((sum,item)=>sum+item.attempts,0); const correct=records.reduce((sum,item)=>sum+item.correct,0);
  const course=PRACTICE_COURSES.find((item)=>item.id===courseId);
  const topicMasteries=(course?.topics??[]).map((topic)=>{const topicRecords=records.filter((record)=>record.topicId===topic.id);return topicRecords.length?topicRecords.reduce((sum,item)=>sum+item.mastery,0)/topicRecords.length:0;});
  const mastery=topicMasteries.length?topicMasteries.reduce((sum,value)=>sum+value,0)/topicMasteries.length:0;
  return {courseId,attempts,accuracy:attempts?correct/attempts:0,mastery,due:records.filter((item)=>item.dueAt<=now).length,seen:records.length};
}

export function overallMastery(state:PracticeProgressState):number {
  return PRACTICE_COURSES.length?PRACTICE_COURSES.reduce((sum,course)=>sum+courseProgress(state,course.id).mastery,0)/PRACTICE_COURSES.length:0;
}

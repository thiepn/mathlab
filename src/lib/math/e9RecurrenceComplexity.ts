import type { AstNode } from './ast';
import { simplifyAst } from './algebra';
import { astToPlainText } from './format';
import { add, isZero, mul, ONE, rat, sub } from './rational';
import { b, call, compareRat, exactInteger, exactStep, n, rationalAst, recurrenceSpec, s, section } from './e9Exact';
import type { E9Transform } from './e9Types';

export function recurrenceGeneratingFunction(node: AstNode): E9Transform {
  const spec = recurrenceSpec(node), x = s('x'); let ast: AstNode;
  if (spec.kind === 'linrec') {
    const [a0, c0, d0] = spec.args;
    const numerator = b('+', b('*', rationalAst(a0), b('-', n(1), x)), b('*', rationalAst(d0), x));
    const denominator = b('*', b('-', n(1), b('*', rationalAst(c0), x)), b('-', n(1), x));
    ast = simplifyAst(b('/', numerator, denominator));
  } else {
    const [a0, a1, p, q] = spec.args;
    const numerator = b('+', rationalAst(a0), b('*', rationalAst(sub(a1, mul(p, a0))), x));
    const denominator = b('-', b('-', n(1), b('*', rationalAst(p), x)), b('*', rationalAst(q), b('^', x, n(2))));
    ast = simplifyAst(b('/', numerator, denominator));
  }
  return { ast, display:`A(x) = ${astToPlainText(ast)}`, exactness:'exact', warnings:[], steps:[exactStep(node,ast,'ordinary-generating-function','Multiply the recurrence by x^n, sum over its valid index range, and solve algebraically for A(x).')], sections:[section('generating-function','Ordinary generating function',[{label:'A(x)',display:astToPlainText(ast),ast},{label:'Convention',display:'A(x)=Σ_{n≥0} a_n x^n'}])] };
}

function squareRootAst(value: { n: bigint; d: bigint }): AstNode {
  return value.n < 0n ? b('*', s('i'), call('sqrt', rationalAst({ n:-value.n, d:value.d }))) : call('sqrt', rationalAst(value));
}
export function recurrenceClosedFormE9(node: AstNode): E9Transform {
  const spec = recurrenceSpec(node);
  if (spec.kind === 'linrec') {
    const [a0,c0,d0]=spec.args,k=s('n'); let ast:AstNode;
    if(compareRat(c0,ONE)===0) ast=b('+',rationalAst(a0),b('*',rationalAst(d0),k));
    else { const cp=b('^',rationalAst(c0),k); ast=simplifyAst(b('+',b('*',rationalAst(a0),cp),b('*',rationalAst(d0),b('/',b('-',cp,n(1)),rationalAst(sub(c0,ONE)))))); }
    return {ast,display:`a_n = ${astToPlainText(ast)}`,exactness:'exact',warnings:[],steps:[exactStep(node,ast,'first-order-linear-recurrence','Solve the affine first-order recurrence by geometric summation.')],sections:[section('recurrence-closed-form','Exact closed form',[{label:'a_n',display:astToPlainText(ast),ast}])]};
  }
  const [a0,a1,p,q]=spec.args,disc=add(mul(p,p),mul(rat(4),q)),sqrtD=squareRootAst(disc),two=n(2),k=s('n');
  const r1=simplifyAst(b('/',b('+',rationalAst(p),sqrtD),two)),r2=simplifyAst(b('/',b('-',rationalAst(p),sqrtD),two));
  if(isZero(disc)){
    if(isZero(p)) throw new Error('The degenerate double-zero characteristic root needs finite-support/Kronecker-delta semantics that E9 does not yet represent as a single closed-form AST.');
    const root=simplifyAst(b('/',rationalAst(p),two)),B=simplifyAst(b('-',b('/',rationalAst(a1),root),rationalAst(a0))),ast=simplifyAst(b('*',b('+',rationalAst(a0),b('*',B,k)),b('^',root,k)));
    return {ast,display:`a_n = ${astToPlainText(ast)}`,exactness:'exact',warnings:[],steps:[exactStep(node,ast,'repeated-characteristic-root','Use (A+Bn)r^n and solve A,B from a_0,a_1.')],sections:[section('recurrence-closed-form','Second-order closed form',[{label:'Repeated root',display:astToPlainText(root),ast:root},{label:'a_n',display:astToPlainText(ast),ast}])]};
  }
  const A=simplifyAst(b('/',b('-',rationalAst(a1),b('*',rationalAst(a0),r2)),b('-',r1,r2))),B=simplifyAst(b('-',rationalAst(a0),A)),ast=simplifyAst(b('+',b('*',A,b('^',r1,k)),b('*',B,b('^',r2,k))));
  return {ast,display:`a_n = ${astToPlainText(ast)}`,exactness:'exact',warnings:disc.n<0n?['The exact characteristic-root form is complex-valued; conjugate terms combine to the real recurrence sequence.']:[],steps:[exactStep(node,ast,'characteristic-roots','Solve the quadratic characteristic equation exactly and determine coefficients from a_0 and a_1.')],sections:[section('recurrence-closed-form','Second-order closed form',[{label:'r1',display:astToPlainText(r1),ast:r1},{label:'r2',display:astToPlainText(r2),ast:r2},{label:'a_n',display:astToPlainText(ast),ast}])]};
}

export function extendedMasterTheorem(node: AstNode, logPower: number): E9Transform {
  const q=simplifyAst(node); if(q.type!=='call'||q.name!=='master'||q.args.length!==3) throw new Error('Extended Master analysis expects master(a,b,k), with configured log-power j.');
  const a=exactInteger(q.args[0],'a'),base=exactInteger(q.args[1],'b'),k=exactInteger(q.args[2],'k');
  if(a<1n||base<2n||k<0n||k>30n) throw new Error('master(a,b,k) requires a≥1, b≥2, and 0≤k≤30.');
  if(!Number.isInteger(logPower)||logPower<0||logPower>20) throw new Error('Log power j must be an integer in [0,20].');
  const bk=base**k; let result:string,caseText:string;
  if(a<bk){result=`Θ(n^${k}${logPower?` (log n)^${logPower}`:''})`;caseText='Case 3: f(n) polynomially dominates n^(log_b a).';}
  else if(a>bk){result=`Θ(n^(log_${base} ${a}))`;caseText='Case 1: n^(log_b a) polynomially dominates f(n).';}
  else {const j=logPower+1;result=k===0n?`Θ((log n)^${j})`:`Θ(n^${k}${j===1?' log n':` (log n)^${j}`})`;caseText='Case 2 extension: f(n)=Θ(n^(log_b a)(log n)^j).';}
  return {display:result,exactness:'exact',warnings:[],steps:[],sections:[section('extended-master','Extended Master theorem',[{label:'Recurrence',display:`T(n)=${a}T(n/${base})+Θ(n^${k}(log n)^${logPower})`},{label:'Classification',display:caseText},{label:'Tight bound',display:result,tone:'positive'}],'This bounded extension covers nonnegative integer logarithmic powers only.')]};
}

import type { AstNode } from './ast';
import { rationalToAst, rationalValue, simplifyAst, substituteAst, symbolsIn, toPolynomial, polynomialCoefficient, polynomialDegree } from './algebra';
import { differentiateAst, integrateAst } from './calculus';
import { astToPlainText } from './format';
import { parseMath } from './parser';
import { solveEquation, solveLinearSystem } from './solve';
import { add, div, isZero, mul, neg, rat, rationalToNumber, sign, sub, type Rational } from './rational';
import type { DerivationStep, Exactness, MathResultSection } from './types';

export type OdeConstructor = 'ivp' | 'odesys' | 'separable' | 'linearode' | 'exactode' | 'ode2' | 'oden';

export interface OdeShapeInfo {
  constructor: OdeConstructor;
  variables: number;
  order: number;
  hasInitialConditions: boolean;
  autonomous: boolean | null;
}

export interface OdeTransform {
  ast?: AstNode;
  display: string;
  exactness: Exactness;
  warnings: string[];
  steps: DerivationStep[];
  sections: MathResultSection[];
}

interface FirstOrderSystemSpec {
  constructor: 'ivp' | 'odesys' | 'ode2' | 'oden';
  independent: string;
  states: string[];
  rhs: AstNode[];
  initialTime?: number;
  initialState?: number[];
  eventAst?: AstNode;
  sourceAst: AstNode;
}

interface EquilibriumPoint {
  ast: AstNode[];
  approx: number[];
  source: string;
}

const ODE_CONSTRUCTORS = new Set<OdeConstructor>(['ivp','odesys','separable','linearode','exactode','ode2','oden']);
const ZERO_AST: AstNode = { type:'number', value:'0' };
const ONE_AST: AstNode = { type:'number', value:'1' };
const C_AST: AstNode = { type:'symbol', name:'C' };

function n(value:string|number):AstNode { return {type:'number',value:String(value)}; }
function s(name:string):AstNode { return {type:'symbol',name}; }
function b(operator:'+'|'-'|'*'|'/'|'^',left:AstNode,right:AstNode):AstNode { return {type:'binary',operator,left,right}; }
function call(name:string,...args:AstNode[]):AstNode { return {type:'call',name,args}; }
function matrix(items:AstNode[]):AstNode { return {type:'matrix',rows:[items]}; }
function equation(left:AstNode,right:AstNode):AstNode { return {type:'equation',left,right}; }
function same(a:AstNode,bNode:AstNode):boolean { return JSON.stringify(simplifyAst(a))===JSON.stringify(simplifyAst(bNode)); }
function section(id:string,title:string,facts:MathResultSection['facts'],description?:string):MathResultSection { return {id,title,facts,description}; }
function step(beforeAst:AstNode,afterAst:AstNode,rule:string,explanation:string,index:number):DerivationStep {
  return {id:`e4-step-${index}`,before:astToPlainText(beforeAst),after:astToPlainText(afterAst),beforeAst,afterAst,rule,explanation,verified:true};
}
function finiteNumber(node:AstNode):number|null {
  const r=rationalValue(simplifyAst(node));
  if(r)return rationalToNumber(r);
  if(node.type==='symbol'&&node.name==='pi')return Math.PI;
  if(node.type==='symbol'&&node.name==='e')return Math.E;
  if(node.type==='unary'){
    const v=finiteNumber(node.operand);return v===null?null:node.operator==='-'?-v:v;
  }
  return null;
}
function vectorItems(node:AstNode,label:string):AstNode[] {
  if(node.type!=='matrix'||node.rows.length!==1)throw new Error(`${label} must be a one-row vector such as [x, y].`);
  return node.rows[0];
}
function stateNames(node:AstNode):string[] {
  const items=vectorItems(node,'ODE state list');
  const names=items.map((item)=>item.type==='symbol'?item.name:'');
  if(names.some((name)=>!name))throw new Error('ODE system state variables must be simple symbols, for example [x, y].');
  if(new Set(names).size!==names.length)throw new Error('ODE system state variables must be distinct.');
  if(names.includes('t'))throw new Error('The independent variable t cannot also be used as a state variable.');
  return names;
}
function callOf(node:AstNode):Extract<AstNode,{type:'call'}>|null {
  const ast=node.type==='definition'?node.right:node;
  return ast.type==='call'&&ODE_CONSTRUCTORS.has(ast.name as OdeConstructor)?ast as Extract<AstNode,{type:'call'}>:null;
}
function symbolsOnly(node:AstNode,allowed:Set<string>):boolean{return symbolsIn(node).every((name)=>allowed.has(name));}
function noSymbol(node:AstNode,name:string):boolean{return !symbolsIn(node).includes(name);}

export function isOdeConstructorCall(node:AstNode):boolean{return Boolean(callOf(node));}

export function odeIntrinsicSymbols(node:AstNode):string[] {
  const c=callOf(node);if(!c)return[];
  if(c.name==='odesys'){
    try{return ['t',...stateNames(c.args[0])];}catch{return['t'];}
  }
  if(c.name==='ode2'||c.name==='oden')return['t'];
  return['x','y'];
}

export function odeShapeInfo(node:AstNode):OdeShapeInfo|null {
  const c=callOf(node);if(!c)return null;
  if(c.name==='ivp')return{constructor:'ivp',variables:1,order:1,hasInitialConditions:c.args.length>=3,autonomous:c.args[0]?noSymbol(c.args[0],'x'):null};
  if(c.name==='odesys'){
    try{
      const states=stateNames(c.args[0]);const rhs=vectorItems(c.args[1],'ODE right-hand side');
      return{constructor:'odesys',variables:states.length,order:1,hasInitialConditions:c.args.length>=4&&Boolean(c.args[2]&&c.args[3]),autonomous:rhs.every((item)=>noSymbol(item,'t'))};
    }catch{return{constructor:'odesys',variables:0,order:1,hasInitialConditions:false,autonomous:null};}
  }
  if(c.name==='ode2')return{constructor:'ode2',variables:2,order:2,hasInitialConditions:c.args.length>=7,autonomous:c.args[3]?noSymbol(c.args[3],'t'):true};
  if(c.name==='oden'){
    try{const coefficients=vectorItems(c.args[0],'Constant-coefficient list');const order=Math.max(0,coefficients.length-1);return{constructor:'oden',variables:order,order,hasInitialConditions:c.args.length>=4,autonomous:c.args[1]?noSymbol(c.args[1],'t'):true};}
    catch{return{constructor:'oden',variables:0,order:0,hasInitialConditions:false,autonomous:null};}
  }
  return{constructor:c.name as OdeConstructor,variables:1,order:1,hasInitialConditions:c.args.length>=4,autonomous:c.name==='exactode'?true:null};
}

export interface OdeCapabilityInfo extends OdeShapeInfo {
  canSymbolicSolve:boolean;
  canConvertToSystem:boolean;
  canAnalyzeEquilibria:boolean;
  canLinearize:boolean;
  canClassifyStability:boolean;
  canAdaptiveSolve:boolean;
}

export function odeCapabilityInfo(node:AstNode):OdeCapabilityInfo|null {
  const info=odeShapeInfo(node);if(!info)return null;
  const c=callOf(node)!;
  const systemLike=info.constructor==='odesys'||info.constructor==='ode2'||info.constructor==='oden';
  const scalarIvp=info.constructor==='ivp'&&c.args.length>=3&&c.args[0]?.type!=='matrix';
  return{
    ...info,
    canSymbolicSolve:['separable','linearode','exactode','ode2'].includes(info.constructor)||scalarIvp,
    canConvertToSystem:info.constructor==='ode2'||info.constructor==='oden',
    canAnalyzeEquilibria:systemLike&&info.autonomous===true,
    canLinearize:systemLike&&info.autonomous===true,
    canClassifyStability:systemLike&&info.autonomous===true&&info.variables===2,
    canAdaptiveSolve:(scalarIvp||systemLike)&&info.hasInitialConditions,
  };
}

function formatState(states:string[],values:AstNode[]):string{return `(${states.map((name,index)=>`${name}=${astToPlainText(values[index])}`).join(', ')})`;}

function profileSections(node:AstNode):MathResultSection[] {
  const info=odeShapeInfo(node);if(!info)throw new Error('E4 ODE analysis requires ivp(...), odesys(...), separable(...), linearode(...), exactode(...), ode2(...), or oden(...).');
  const c=callOf(node)!;const facts:MathResultSection['facts']=[
    {label:'Constructor',display:info.constructor},
    {label:'Differential order',display:String(info.order)},
    {label:'State dimension',display:String(info.variables)},
    {label:'Initial conditions',display:info.hasInitialConditions?'Present':'Not encoded'},
    {label:'Autonomous',display:info.autonomous===null?'Not classified':info.autonomous?'Yes':'No'},
  ];
  if(c.name==='odesys'){
    const states=stateNames(c.args[0]);const rhs=vectorItems(c.args[1],'ODE right-hand side');
    facts.push({label:'States',display:states.join(', ')},{label:'Vector field',display:astToPlainText(matrix(rhs)),ast:matrix(rhs)});
  }else if(c.name==='ivp')facts.push({label:"y'",display:astToPlainText(c.args[0]),ast:c.args[0]});
  else if(c.name==='ode2')facts.push({label:'Equation',display:`${astToPlainText(c.args[0])} y'' + ${astToPlainText(c.args[1])} y' + ${astToPlainText(c.args[2])} y = ${astToPlainText(c.args[3]??ZERO_AST)}`});
  else if(c.name==='oden')facts.push({label:'Coefficients',display:astToPlainText(c.args[0]),ast:c.args[0]},{label:'Forcing',display:astToPlainText(c.args[1]??ZERO_AST),ast:c.args[1]??ZERO_AST});
  return[section('ode-model','ODE model',facts,'E4 keeps symbolic structure and numerical provenance separate. Approximate integration never masquerades as an exact solution.')];
}

export function odeProfile(node:AstNode):OdeTransform {
  const info=odeShapeInfo(node);if(!info)throw new Error('Not an E4 ODE object.');
  return{ast:node,display:`${info.order}${info.order===1?'st':info.order===2?'nd':info.order===3?'rd':'th'}-order ${info.variables}-state ODE`,exactness:'exact',warnings:[],steps:[],sections:profileSections(node)};
}

function safeIntegral(node:AstNode,variable:string):{ast:AstNode;warnings:string[]} {
  const out=integrateAst(node,variable,false);return{ast:out.ast,warnings:out.warnings};
}
function applyInitialImplicit(left:AstNode,right:AstNode,x0:AstNode,y0:AstNode):AstNode {
  const left0=simplifyAst(substituteAst(left,'y',y0));const right0=simplifyAst(substituteAst(right,'x',x0));
  const constant=simplifyAst(b('-',left0,right0));return equation(left,simplifyAst(b('+',right,constant)));
}
function separableSolution(fx:AstNode,gy:AstNode,x0?:AstNode,y0?:AstNode):OdeTransform {
  if(!symbolsOnly(fx,new Set(['x']))||!symbolsOnly(gy,new Set(['y'])))throw new Error('separable(f, g) requires f to depend only on x and g only on y.');
  const left=safeIntegral(simplifyAst(b('/',ONE_AST,gy)),'y');const right=safeIntegral(fx,'x');
  const relation=x0&&y0?applyInitialImplicit(left.ast,right.ast,x0,y0):equation(left.ast,simplifyAst(b('+',right.ast,C_AST)));
  return{
    ast:relation,display:astToPlainText(relation),exactness:'exact',warnings:[...left.warnings,...right.warnings,'The separable solution is returned implicitly; branches/domain components must respect the original ODE and any encoded initial condition.'],
    steps:[step(b('/',s('dy'),gy),b('*',fx,s('dx')),'separate-variables','Move the y-dependent factor to the left and the x-dependent factor to the right.',1),step(equation(left.ast,right.ast),relation,'integrate-both-sides','Integrate both sides and determine the integration constant when initial data is encoded.',2)],
    sections:[section('symbolic','Separable symbolic solution',[{label:'∫dy/g(y)',display:astToPlainText(left.ast),ast:left.ast},{label:'∫f(x)dx',display:astToPlainText(right.ast),ast:right.ast},{label:'Solution relation',display:astToPlainText(relation),ast:relation}],'This is an exact implicit solution within the verified elementary integration boundary.')],
  };
}

function formalIntegral(node:AstNode,variable:string):AstNode{return call('Integral',node,s(variable));}
function linearSolution(p:AstNode,q:AstNode,x0?:AstNode,y0?:AstNode):OdeTransform {
  if(!symbolsOnly(p,new Set(['x']))||!symbolsOnly(q,new Set(['x'])))throw new Error('linearode(p, q) requires p(x) and q(x) to depend on x only.');
  let pIntegral:{ast:AstNode;warnings:string[]};let pClosed=true;
  try{pIntegral=safeIntegral(p,'x');}catch{pIntegral={ast:formalIntegral(p,'x'),warnings:['The integrating factor is kept as exp(Integral(p,x)) because ∫p dx is outside MathLab’s verified elementary antiderivative table.']};pClosed=false;}
  const mu=simplifyAst(call('exp',pIntegral.ast));const forcing=simplifyAst(b('*',mu,q));
  let forcingIntegral:AstNode;const warnings=[...pIntegral.warnings];let closed=pClosed;
  try{forcingIntegral=safeIntegral(forcing,'x').ast;}catch{forcingIntegral=formalIntegral(forcing,'x');closed=false;warnings.push('The integrating-factor identity is exact, but the remaining integral is outside MathLab’s verified elementary antiderivative table and is left unevaluated.');}
  let numerator:AstNode;
  if(x0&&y0){
    const mu0=simplifyAst(substituteAst(mu,'x',x0));
    if(closed){const i0=simplifyAst(substituteAst(forcingIntegral,'x',x0));const c0=simplifyAst(b('-',b('*',y0,mu0),i0));numerator=simplifyAst(b('+',forcingIntegral,c0));}
    else numerator=simplifyAst(b('+',b('*',y0,mu0),call('DefIntegral',forcing,x0,s('x'))));
  }else numerator=simplifyAst(b('+',forcingIntegral,C_AST));
  const solution=simplifyAst(b('/',numerator,mu));const relation=equation(s('y'),solution);
  return{ast:relation,display:astToPlainText(relation),exactness:'exact',warnings,steps:[step(equation(b('+',s("y'"),b('*',p,s('y'))),q),equation(b('*',mu,s("y'")),b('*',mu,q)),'integrating-factor','Use μ(x)=exp(∫p(x)dx) so the left side becomes (μy)′.',1),step(s('y'),solution,'solve-linear-first-order','Integrate (μy)′=μq and divide by μ.',2)],sections:[section('symbolic','First-order linear solution',[{label:'Integrating factor μ',display:astToPlainText(mu),ast:mu},{label:'∫μq dx',display:astToPlainText(forcingIntegral),ast:forcingIntegral},{label:'Solution',display:astToPlainText(relation),ast:relation},{label:'Closed elementary form',display:closed?'Yes':'Integral left symbolic',tone:closed?'positive':'warning'}],'The integrating-factor representation is exact. An unevaluated Integral(...) records a verified representation, not a fabricated elementary antiderivative.') ]};
}

function exactEquationSolution(M:AstNode,N:AstNode):OdeTransform {
  if(!symbolsOnly(M,new Set(['x','y']))||!symbolsOnly(N,new Set(['x','y'])))throw new Error('exactode(M, N) may depend only on x and y.');
  const My=differentiateAst(M,'y').ast;const Nx=differentiateAst(N,'x').ast;
  if(!same(My,Nx))throw new Error(`This differential form is not exact on the represented domain because ∂M/∂y = ${astToPlainText(My)} while ∂N/∂x = ${astToPlainText(Nx)}.`);
  const phiX=safeIntegral(M,'x').ast;const phiY=differentiateAst(phiX,'y').ast;const residual=simplifyAst(b('-',N,phiY));const h=safeIntegral(residual,'y').ast;const potential=simplifyAst(b('+',phiX,h));const relation=equation(potential,C_AST);
  return{ast:relation,display:astToPlainText(relation),exactness:'exact',warnings:['Exactness is certified locally from matching cross-partials on the represented differentiable domain. Domain topology may separate solution components.'],steps:[step(My,Nx,'exactness-test','Verify ∂M/∂y = ∂N/∂x.',1),step(M,phiX,'recover-potential-x','Integrate M with respect to x.',2),step(residual,h,'recover-potential-y','Use N-∂φ/∂y to recover the remaining y-only contribution.',3)],sections:[section('exact-ode','Exact differential equation',[{label:'∂M/∂y',display:astToPlainText(My),ast:My},{label:'∂N/∂x',display:astToPlainText(Nx),ast:Nx},{label:'Potential Φ',display:astToPlainText(potential),ast:potential},{label:'Implicit solution',display:astToPlainText(relation),ast:relation}]) ]};
}

function coefficient(node:AstNode,label:string):Rational {
  const value=rationalValue(simplifyAst(node));if(!value)throw new Error(`${label} must be an exact rational constant in E4's constant-coefficient second-order solver.`);return value;
}
function sqrtAstPositive(value:Rational):AstNode{return call('sqrt',rationalToAst(value));}
function homogeneousSecondOrderSolution(c:Extract<AstNode,{type:'call'}>):OdeTransform {
  if(c.args.length<3)throw new Error('ode2(a,b,c[,forcing,t0,y0,v0]) requires at least a, b, and c.');
  const a=coefficient(c.args[0],'a'),bb=coefficient(c.args[1],'b'),cc=coefficient(c.args[2],'c');if(isZero(a))throw new Error('ode2 requires a ≠ 0.');
  const forcing=c.args[3]??ZERO_AST;const forcingR=rationalValue(simplifyAst(forcing));
  let particular:AstNode=ZERO_AST;const warnings:string[]=[];
  if(forcingR&&!isZero(forcingR)){
    if(isZero(cc))throw new Error('The E4 symbolic ode2 forcing shortcut currently supports constant forcing only when c ≠ 0. Convert to a first-order system for numerical integration otherwise.');
    particular=rationalToAst(div(forcingR,cc));
  }else if(!forcingR&&!same(forcing,ZERO_AST))throw new Error('The E4 symbolic ode2 solver currently supports homogeneous equations or constant forcing. Use system conversion plus RK45 for other forcing terms.');
  const discriminant=sub(mul(bb,bb),mul(rat(4n),mul(a,cc)));const twoA=mul(rat(2n),a);let homogeneous:AstNode;let family:string;
  if(sign(discriminant)>0){
    const root=sqrtAstPositive(discriminant);const r1=b('/',b('+',rationalToAst(neg(bb)),root),rationalToAst(twoA));const r2=b('/',b('-',rationalToAst(neg(bb)),root),rationalToAst(twoA));
    homogeneous=b('+',b('*',s('C1'),call('exp',b('*',r1,s('t')))),b('*',s('C2'),call('exp',b('*',r2,s('t')))));family='Two distinct real characteristic roots';
  }else if(sign(discriminant)===0){
    const r=rationalToAst(div(neg(bb),twoA));homogeneous=b('*',b('+',s('C1'),b('*',s('C2'),s('t'))),call('exp',b('*',r,s('t'))));family='Repeated real characteristic root';
  }else{
    const alpha=rationalToAst(div(neg(bb),twoA));const beta=b('/',sqrtAstPositive(neg(discriminant)),rationalToAst(twoA));const oscillation=b('+',b('*',s('C1'),call('cos',b('*',beta,s('t')))),b('*',s('C2'),call('sin',b('*',beta,s('t')))));homogeneous=b('*',call('exp',b('*',alpha,s('t'))),oscillation);family='Complex-conjugate characteristic roots';
  }
  const solution=same(particular,ZERO_AST)?homogeneous:simplifyAst(b('+',homogeneous,particular));const relation=equation(s('y'),solution);
  if(c.args.length>=7)warnings.push('Initial conditions are preserved on the ODE object. E4 reports the exact characteristic-family solution; use “Convert to first-order system” for a numerically initialized trajectory when constants C1/C2 are not rationally reducible by the current exact algebra layer.');
  return{ast:relation,display:astToPlainText(relation),exactness:'exact',warnings,steps:[step(equation(b('+',b('+',b('*',c.args[0],s("y''")),b('*',c.args[1],s("y'"))),b('*',c.args[2],s('y'))),forcing),equation(b('+',b('+',b('*',c.args[0],b('^',s('r'),n(2))),b('*',c.args[1],s('r'))),c.args[2]),ZERO_AST),'characteristic-equation','For the homogeneous constant-coefficient part, substitute y=e^{rt}.',1)],sections:[section('second-order','Second-order constant-coefficient solution',[{label:'Characteristic discriminant',display:astToPlainText(rationalToAst(discriminant)),ast:rationalToAst(discriminant)},{label:'Root family',display:family},{label:'Particular constant',display:astToPlainText(particular),ast:particular},{label:'General solution',display:astToPlainText(relation),ast:relation}]) ]};
}

function factors(node:AstNode):AstNode[]{return node.type==='binary'&&node.operator==='*'?[...factors(node.left),...factors(node.right)]:[node];}
function autoSeparable(rhs:AstNode):{fx:AstNode;gy:AstNode}|null {
  const parts=factors(simplifyAst(rhs));const xParts:AstNode[]=[],yParts:AstNode[]=[];
  for(const part of parts){const vars=symbolsIn(part);if(vars.every((v)=>v==='x'))xParts.push(part);else if(vars.every((v)=>v==='y'))yParts.push(part);else return null;}
  const product=(items:AstNode[])=>items.reduce<AstNode>((acc,item)=>simplifyAst(b('*',acc,item)),ONE_AST);
  return{fx:product(xParts),gy:product(yParts)};
}
function autoConstantLinear(rhs:AstNode):{p:AstNode;q:AstNode}|null {
  const poly=toPolynomial(rhs,'y');if(!poly||polynomialDegree(poly)>1)return null;
  const a=polynomialCoefficient(poly,1),q=polynomialCoefficient(poly,0);return{p:rationalToAst(neg(a)),q:rationalToAst(q)};
}

export function symbolicOdeSolve(node:AstNode):OdeTransform {
  const c=callOf(node);if(!c)throw new Error('Symbolic ODE solving requires an E4 ODE constructor.');
  if(c.name==='separable'){
    if(c.args.length!==2&&c.args.length!==4)throw new Error('Use separable(f(x), g(y)) or separable(f(x), g(y), x0, y0).');
    return separableSolution(c.args[0],c.args[1],c.args[2],c.args[3]);
  }
  if(c.name==='linearode'){
    if(c.args.length!==2&&c.args.length!==4)throw new Error('Use linearode(p(x), q(x)) or linearode(p(x), q(x), x0, y0) for y′ + p(x)y = q(x).');
    return linearSolution(c.args[0],c.args[1],c.args[2],c.args[3]);
  }
  if(c.name==='exactode'){
    if(c.args.length!==2)throw new Error('Use exactode(M(x,y), N(x,y)) for M dx + N dy = 0.');return exactEquationSolution(c.args[0],c.args[1]);
  }
  if(c.name==='ode2')return homogeneousSecondOrderSolution(c);
  if(c.name==='ivp'){
    if(c.args.length<3||c.args[0].type==='matrix')throw new Error('This ivp(...) form is not a scalar first-order IVP.');
    const separable=autoSeparable(c.args[0]);if(separable)return separableSolution(separable.fx,separable.gy,c.args[1],c.args[2]);
    const linear=autoConstantLinear(c.args[0]);if(linear)return linearSolution(linear.p,linear.q,c.args[1],c.args[2]);
    throw new Error('This scalar IVP is outside E4’s verified symbolic classes. Supported automatic cases are separable products and constant-coefficient linear first-order equations; use separable(...) or linearode(...) to state broader textbook structure explicitly.');
  }
  throw new Error('First-order systems use equilibrium, linearization, stability, and numerical workflows rather than a fabricated general symbolic solution.');
}

function ode2System(c:Extract<AstNode,{type:'call'}>):AstNode {
  if(c.args.length<3)throw new Error('ode2 requires a, b, and c.');const a=c.args[0],bb=c.args[1],cc=c.args[2],forcing=c.args[3]??ZERO_AST;
  const acceleration=simplifyAst(b('/',b('-',b('-',forcing,b('*',bb,s('v'))),b('*',cc,s('y'))),a));
  const args:AstNode[]=[matrix([s('y'),s('v')]),matrix([s('v'),acceleration])];
  if(c.args.length>=7)args.push(c.args[4],matrix([c.args[5],c.args[6]]));
  return call('odesys',...args);
}

function odenSystem(c:Extract<AstNode,{type:'call'}>):AstNode {
  if(c.args.length<1)throw new Error('oden requires a coefficient vector [a_n,...,a_0].');
  const coefficients=vectorItems(c.args[0],'Constant-coefficient list');if(coefficients.length<3||coefficients.length>7)throw new Error('oden supports orders 2–6, encoded by 3–7 coefficients [a_n,...,a_0].');
  const order=coefficients.length-1;const leading=coefficients[0];const leadingValue=rationalValue(simplifyAst(leading));if(leadingValue&&isZero(leadingValue))throw new Error('The leading coefficient a_n must be nonzero.');
  const forcing=c.args[1]??ZERO_AST;const states=[s('y'),...Array.from({length:order-1},(_,index)=>s(`y${index+1}`))];const rhs=states.slice(1);
  const lowerCoefficients=coefficients.slice(1);let numerator:AstNode=forcing;lowerCoefficients.forEach((coefficient,index)=>{numerator=simplifyAst(b('-',numerator,b('*',coefficient,states[order-1-index])));});
  rhs.push(simplifyAst(b('/',numerator,leading)));const args:AstNode[]=[matrix(states),matrix(rhs)];
  if(c.args.length>=4){const initial=vectorItems(c.args[3],'Higher-order initial data');if(initial.length!==order)throw new Error(`oden initial data must contain y through the ${order-1}th derivative (${order} values).`);args.push(c.args[2],matrix(initial));}
  return call('odesys',...args);
}

export function convertOdeToSystem(node:AstNode):OdeTransform {
  const c=callOf(node);if(!c||(c.name!=='ode2'&&c.name!=='oden'))throw new Error('Higher-order conversion accepts ode2(...) or oden([a_n,...,a_0], forcing[,t0,initialDerivatives]).');
  const out=c.name==='ode2'?ode2System(c):odenSystem(c);const info=odeShapeInfo(c);const order=info?.order??2;
  return{ast:out,display:astToPlainText(out),exactness:'exact',warnings:[],steps:[step(node,out,'higher-order-state-conversion',`Introduce derivative states y, y1, … through order ${order-1}, then solve the highest derivative from the constant-coefficient equation.`,1)],sections:[section('system-conversion','First-order system representation',[{label:'Order',display:String(order)},{label:'System',display:astToPlainText(out),ast:out}],'This representation is algebraically equivalent wherever the leading coefficient is nonzero and is the bridge to E4 adaptive integration and, in two dimensions, E3 phase-plane workflows.') ]};
}

function systemSpec(node:AstNode,requireInitial=false):FirstOrderSystemSpec {
  const c=callOf(node);if(!c)throw new Error('Expected an ODE constructor.');
  if(c.name==='ode2')return systemSpec(ode2System(c),requireInitial);
  if(c.name==='oden')return systemSpec(odenSystem(c),requireInitial);
  if(c.name==='ivp'){
    if(c.args.length<3||c.args[0].type==='matrix')throw new Error('Scalar ivp syntax is ivp(f(x,y), x0, y0[, event(x,y)]).');
    const t0=finiteNumber(c.args[1]),y0=finiteNumber(c.args[2]);if(requireInitial&&(t0===null||y0===null))throw new Error('Adaptive integration requires finite numeric x0 and y0.');
    return{constructor:'ivp',independent:'x',states:['y'],rhs:[c.args[0]],initialTime:t0??undefined,initialState:y0===null?undefined:[y0],eventAst:c.args[3],sourceAst:node};
  }
  if(c.name!=='odesys')throw new Error('This workflow requires odesys(...) or a convertible ode2(...) / oden(...).');
  if(c.args.length!==2&&c.args.length!==4&&c.args.length!==5)throw new Error('Use odesys([x,y], [f,g]) for analysis or odesys([x,y], [f,g], t0, [x0,y0][, event]) for an IVP.');
  const states=stateNames(c.args[0]);if(states.length<1||states.length>6)throw new Error('E4 ODE systems are bounded to 1–6 state variables.');const rhs=vectorItems(c.args[1],'ODE right-hand side');if(rhs.length!==states.length)throw new Error('The ODE right-hand-side vector must have exactly one component per state variable.');
  const allowed=new Set(['t',...states]);for(const component of rhs){const extras=symbolsIn(component).filter((name)=>!allowed.has(name));if(extras.length)throw new Error(`Resolve external ODE parameters before execution: ${[...new Set(extras)].join(', ')}.`);}
  let initialTime:number|undefined,initialState:number[]|undefined;if(c.args.length>=4){initialTime=finiteNumber(c.args[2])??undefined;const init=vectorItems(c.args[3],'Initial state').map(finiteNumber);if(init.some((value)=>value===null))throw new Error('Every encoded initial state value must resolve to a finite real number.');initialState=init as number[];if(initialState.length!==states.length)throw new Error('Initial state dimension must match the state-variable list.');}
  if(requireInitial&&(initialTime===undefined||!initialState))throw new Error('Adaptive integration requires encoded initial data: odesys(states, rhs, t0, initialState).');
  return{constructor:'odesys',independent:'t',states,rhs,initialTime,initialState,eventAst:c.args[4],sourceAst:node};
}

function evaluateNumeric(node:AstNode,values:Record<string,number>):number {
  switch(node.type){
    case 'number':return Number(node.value);
    case 'symbol':if(Object.prototype.hasOwnProperty.call(values,node.name))return values[node.name];if(node.name==='pi')return Math.PI;if(node.name==='e')return Math.E;throw new Error(`Unresolved numeric symbol ${node.name}.`);
    case 'unary':{const v=evaluateNumeric(node.operand,values);return node.operator==='-'?-v:v;}
    case 'binary':{const l=evaluateNumeric(node.left,values),r=evaluateNumeric(node.right,values);if(node.operator==='+')return l+r;if(node.operator==='-')return l-r;if(node.operator==='*')return l*r;if(node.operator==='/')return l/r;return l**r;}
    case 'call':{if(node.args.length!==1)throw new Error(`Unsupported numeric call ${node.name}.`);const v=evaluateNumeric(node.args[0],values);if(node.name==='sin')return Math.sin(v);if(node.name==='cos')return Math.cos(v);if(node.name==='tan')return Math.tan(v);if(node.name==='asin')return Math.asin(v);if(node.name==='acos')return Math.acos(v);if(node.name==='atan')return Math.atan(v);if(node.name==='sinh')return Math.sinh(v);if(node.name==='cosh')return Math.cosh(v);if(node.name==='tanh')return Math.tanh(v);if(node.name==='exp')return Math.exp(v);if(node.name==='ln')return Math.log(v);if(node.name==='log')return Math.log10(v);if(node.name==='sqrt')return Math.sqrt(v);if(node.name==='abs')return Math.abs(v);throw new Error(`Unsupported numeric function ${node.name}(...).`);}
    case 'definition':return evaluateNumeric(node.right,values);
    default:throw new Error('ODE numeric evaluation expects scalar expressions.');
  }
}
function evaluateVector(spec:FirstOrderSystemSpec,t:number,y:number[]):number[] {
  const values:Record<string,number>={[spec.independent]:t};spec.states.forEach((name,index)=>{values[name]=y[index];});const out=spec.rhs.map((item)=>evaluateNumeric(item,values));if(out.some((value)=>!Number.isFinite(value)))throw new Error('The ODE vector field produced a non-finite value during integration.');return out;
}
function addScaled(base:number[],terms:Array<[number,number[]]>):number[]{return base.map((value,i)=>value+terms.reduce((sum,[factor,vec])=>sum+factor*vec[i],0));}
function maxNorm(values:number[]):number{return values.reduce((m,v)=>Math.max(m,Math.abs(v)),0);}
function rk45Step(spec:FirstOrderSystemSpec,t:number,y:number[],h:number):{y5:number[];error:number[]} {
  const k1=evaluateVector(spec,t,y);
  const k2=evaluateVector(spec,t+h*(1/5),addScaled(y,[[h*(1/5),k1]]));
  const k3=evaluateVector(spec,t+h*(3/10),addScaled(y,[[h*(3/40),k1],[h*(9/40),k2]]));
  const k4=evaluateVector(spec,t+h*(4/5),addScaled(y,[[h*(44/45),k1],[h*(-56/15),k2],[h*(32/9),k3]]));
  const k5=evaluateVector(spec,t+h*(8/9),addScaled(y,[[h*(19372/6561),k1],[h*(-25360/2187),k2],[h*(64448/6561),k3],[h*(-212/729),k4]]));
  const k6=evaluateVector(spec,t+h,addScaled(y,[[h*(9017/3168),k1],[h*(-355/33),k2],[h*(46732/5247),k3],[h*(49/176),k4],[h*(-5103/18656),k5]]));
  const y5=addScaled(y,[[h*(35/384),k1],[h*(500/1113),k3],[h*(125/192),k4],[h*(-2187/6784),k5],[h*(11/84),k6]]);
  const k7=evaluateVector(spec,t+h,y5);
  const y4=addScaled(y,[[h*(5179/57600),k1],[h*(7571/16695),k3],[h*(393/640),k4],[h*(-92097/339200),k5],[h*(187/2100),k6],[h*(1/40),k7]]);
  return{y5,error:y5.map((value,index)=>value-y4[index])};
}
function eventValue(spec:FirstOrderSystemSpec,t:number,y:number[],override?:AstNode):number|null {
  const event=override??spec.eventAst;if(!event)return null;const values:Record<string,number>={[spec.independent]:t};spec.states.forEach((name,index)=>{values[name]=y[index];});const value=evaluateNumeric(event,values);return Number.isFinite(value)?value:null;
}
function parseEventOption(source:string|undefined):AstNode|undefined {
  if(!source?.trim())return undefined;const parsed=parseMath(source.trim());if(!parsed.ast||parsed.diagnostics.some((item)=>item.severity==='error'))throw new Error(parsed.diagnostics[0]?.message??'Could not parse the event expression.');return parsed.ast.type==='definition'?parsed.ast.right:parsed.ast;
}

export function adaptiveOdeSolve(node:AstNode,options:{endpoint?:number;tolerance?:number;maxStep?:number;minStep?:number;event?:string}={}):OdeTransform {
  const spec=systemSpec(node,true);const t0=spec.initialTime!,initial=[...spec.initialState!];const endpoint=Number.isFinite(options.endpoint)?Number(options.endpoint):t0+10;const span=endpoint-t0;if(span===0)throw new Error('Adaptive ODE endpoint must differ from the initial time.');
  const direction=Math.sign(span);const tolerance=Number.isFinite(options.tolerance)&&Number(options.tolerance)>0?Number(options.tolerance):1e-7;const maxStepInput=Number.isFinite(options.maxStep)&&Number(options.maxStep)>0?Number(options.maxStep):Math.abs(span)/8;const maxStep=Math.max(Math.abs(span)*1e-12,Math.min(Math.abs(span),maxStepInput));const minStep=Number.isFinite(options.minStep)&&Number(options.minStep)>0?Number(options.minStep):Math.abs(span)*1e-10;
  let h=direction*Math.min(maxStep,Math.max(minStep,Math.abs(span)/50));let t=t0,y=initial;let accepted=0,rejected=0,minUsed=Math.abs(h),maxUsed=0;const samples:Array<{t:number;y:number[]}>= [{t,y:[...y]}];const eventAst=parseEventOption(options.event);let previousEvent=eventValue(spec,t,y,eventAst);let eventHit:{t:number;y:number[]}|null=null;
  const maxAttempts=100000;
  for(let attempt=0;attempt<maxAttempts&&direction*(endpoint-t)>0;attempt+=1){
    if(Math.abs(h)>Math.abs(endpoint-t))h=endpoint-t;const trial=rk45Step(spec,t,y,h);const scale=Math.max(1,maxNorm(y),maxNorm(trial.y5));const err=maxNorm(trial.error)/scale;
    if(err<=tolerance||Math.abs(h)<=minStep*1.0000001){
      const oldT=t,oldY=y;t+=h;y=trial.y5;accepted+=1;minUsed=Math.min(minUsed,Math.abs(h));maxUsed=Math.max(maxUsed,Math.abs(h));
      const currentEvent=eventValue(spec,t,y,eventAst);if(previousEvent!==null&&currentEvent!==null&&(previousEvent===0||currentEvent===0||Math.sign(previousEvent)!==Math.sign(currentEvent))){const denom=Math.abs(previousEvent)+Math.abs(currentEvent);const alpha=denom===0?1:Math.abs(previousEvent)/denom;eventHit={t:oldT+(t-oldT)*alpha,y:oldY.map((value,index)=>value+(y[index]-value)*alpha)};t=eventHit.t;y=eventHit.y;samples.push({t,y:[...y]});break;}previousEvent=currentEvent;
      if(samples.length<160||accepted%Math.max(1,Math.floor(accepted/120))===0)samples.push({t,y:[...y]});
      const factor=err===0?5:Math.min(5,Math.max(0.2,0.9*(tolerance/err)**0.2));h=direction*Math.min(maxStep,Math.max(minStep,Math.abs(h)*factor));
    }else{rejected+=1;const factor=Math.max(0.1,0.9*(tolerance/err)**0.2);h=direction*Math.max(minStep,Math.abs(h)*factor);}
  }
  if(direction*(endpoint-t)>Math.abs(span)*1e-12&&!eventHit)throw new Error('Adaptive RK45 did not reach the requested endpoint within the safety iteration bound.');
  const resultAst=matrix([n(t),...y.map((value)=>n(Number(value.toPrecision(15))))]);const rejectionRatio=rejected/Math.max(1,accepted+rejected);const stiffnessSignal=rejectionRatio>0.35||minUsed<Math.abs(span)*1e-7;const warnings:string[]=['RK45 is an adaptive numerical approximation; local error control is not a proof of global exactness.'];if(stiffnessSignal)warnings.push('Stiffness heuristic triggered: repeated step rejection or severe step contraction was observed. E4 does not yet include an implicit stiff solver, so interpret this trajectory cautiously.');if(eventHit)warnings.push('Integration stopped at the first detected event sign crossing; event time/state use linear interpolation inside the accepted RK45 step.');
  const sampleFacts=samples.filter((_,index)=>index===0||index===samples.length-1||index%Math.max(1,Math.floor(samples.length/10))===0).slice(0,12).map((sample)=>({label:`${spec.independent}=${sample.t.toPrecision(6)}`,display:`[${sample.y.map((v)=>v.toPrecision(8)).join(', ')}]`}));
  return{ast:resultAst,display:`${spec.independent}=${t.toPrecision(10)} · [${y.map((v)=>v.toPrecision(10)).join(', ')}]`,exactness:'approximate',warnings,steps:[],sections:[section('solver','Adaptive Dormand–Prince RK45',[{label:'Initial',display:`${spec.independent}=${t0}; [${initial.join(', ')}]`},{label:'Reached',display:t.toPrecision(12)},{label:'Accepted steps',display:String(accepted)},{label:'Rejected steps',display:String(rejected)},{label:'Tolerance',display:tolerance.toExponential(2)},{label:'Step range',display:`${minUsed.toExponential(3)} … ${maxUsed.toExponential(3)}`},{label:'Stiffness signal',display:stiffnessSignal?'Triggered':'Not triggered',tone:stiffnessSignal?'warning':'positive'},...(eventHit?[{label:'Event',display:`hit at ${spec.independent}≈${eventHit.t.toPrecision(10)}`,tone:'warning' as const}]:[])],'Dormand–Prince 5(4) adapts step size from an embedded local error estimate.'),section('trajectory','Trajectory samples',sampleFacts,'A bounded sample of accepted states is shown; the solver may take many more internal steps.') ]};
}

function pointFromSystemResult(resultAst:AstNode,states:string[]):AstNode[]|null {
  if(resultAst.type!=='system')return null;const map=new Map<string,AstNode>();for(const item of resultAst.items){if(item.type==='equation'&&item.left.type==='symbol')map.set(item.left.name,item.right);}return states.every((name)=>map.has(name))?states.map((name)=>map.get(name)!):null;
}
function approximatePoint(point:AstNode[]):number[]|null {const values=point.map(finiteNumber);return values.some((v)=>v===null)?null:values as number[];}
function zeroPointIfEquilibrium(spec:FirstOrderSystemSpec):EquilibriumPoint|null {
  const point=spec.states.map(()=>ZERO_AST);const approx=spec.states.map(()=>0);try{const values=spec.rhs.map((rhs)=>evaluateNumeric(rhs,Object.fromEntries(spec.states.map((name)=>[name,0]))));if(values.every((v)=>Math.abs(v)<1e-12))return{ast:point,approx,source:'origin test'};}catch{}return null;
}
function uniqueLinearEquilibrium(spec:FirstOrderSystemSpec):EquilibriumPoint|null {
  const system:AstNode={type:'system',items:spec.rhs.map((rhs)=>equation(rhs,ZERO_AST))};const solved=solveLinearSystem(system);if(solved.status!=='unique'||!solved.resultAst)return null;const point=pointFromSystemResult(solved.resultAst,spec.states);if(!point)return null;const approx=approximatePoint(point);return approx?{ast:point,approx,source:'exact linear solve'}:null;
}
function decoupledEquilibria(spec:FirstOrderSystemSpec):EquilibriumPoint[] {
  const solutionSets:AstNode[][]=[];
  for(let i=0;i<spec.states.length;i+=1){const vars=symbolsIn(spec.rhs[i]).filter((name)=>spec.states.includes(name));if(vars.some((name)=>name!==spec.states[i]))return[];const solved=solveEquation(equation(spec.rhs[i],ZERO_AST),spec.states[i]);if(solved.status!=='solved'||!solved.solutions.length)return[];solutionSets.push(solved.solutions);}
  const points:EquilibriumPoint[]=[];const build=(index:number,current:AstNode[])=>{if(points.length>=32)return;if(index===solutionSets.length){const approx=approximatePoint(current);if(approx)points.push({ast:[...current],approx,source:'decoupled exact solve'});return;}for(const value of solutionSets[index])build(index+1,[...current,value]);};build(0,[]);return points;
}
function equilibriumCandidates(spec:FirstOrderSystemSpec):EquilibriumPoint[] {
  if(spec.rhs.some((rhs)=>symbolsIn(rhs).includes(spec.independent)))throw new Error('Equilibrium analysis requires an autonomous system with no explicit dependence on the independent variable.');
  const out:EquilibriumPoint[]=[];const origin=zeroPointIfEquilibrium(spec);if(origin)out.push(origin);const linear=uniqueLinearEquilibrium(spec);if(linear)out.push(linear);out.push(...decoupledEquilibria(spec));return out.filter((point,index,all)=>all.findIndex((candidate)=>JSON.stringify(candidate.ast)===JSON.stringify(point.ast))===index);
}

export function equilibriumProfile(node:AstNode):OdeTransform {
  const spec=systemSpec(node,false);const points=equilibriumCandidates(spec);if(!points.length)throw new Error('No equilibrium could be certified by E4’s bounded exact solvers. Coupled nonlinear equilibrium solving beyond linear or decoupled degree-2 systems is not guessed.');const resultAst:{type:'set';items:AstNode[]}={type:'set',items:points.map((point)=>matrix(point.ast))};
  return{ast:resultAst,display:points.map((point)=>formatState(spec.states,point.ast)).join(' ; '),exactness:'exact',warnings:points.length>=32?['Equilibrium enumeration was capped at 32 points.']:[],steps:[],sections:[section('equilibria','Equilibrium points',points.map((point,index)=>({label:`Point ${index+1}`,display:formatState(spec.states,point.ast),ast:matrix(point.ast)})),'Equilibria satisfy every autonomous right-hand side exactly within the supported linear/decoupled solve boundary.') ]};
}

function parsePointOption(source:string|undefined,states:string[]):AstNode[]|null {
  if(!source?.trim())return null;const parsed=parseMath(`[${source}]`);if(!parsed.ast||parsed.diagnostics.some((item)=>item.severity==='error'))throw new Error(parsed.diagnostics[0]?.message??'Could not parse the equilibrium point.');const items=vectorItems(parsed.ast,'Equilibrium point');if(items.length!==states.length)throw new Error(`Equilibrium point must contain ${states.length} coordinates.`);if(!approximatePoint(items))throw new Error('Linearization point coordinates must resolve to finite real constants.');return items;
}
function chooseLinearizationPoint(spec:FirstOrderSystemSpec,source?:string):EquilibriumPoint {
  const explicit=parsePointOption(source,spec.states);if(explicit){const approx=approximatePoint(explicit)!;const substituted=spec.rhs.map((rhs)=>{let value=rhs;spec.states.forEach((name,index)=>{value=substituteAst(value,name,explicit[index]);});return simplifyAst(value);});if(substituted.some((value)=>{const exact=rationalValue(value);return !exact||!isZero(exact);})){throw new Error('The requested linearization point could not be certified as an exact equilibrium by the current algebra layer.');}return{ast:explicit,approx,source:'requested point'};}
  const candidates=equilibriumCandidates(spec);if(!candidates.length)throw new Error('No certified equilibrium is available for automatic linearization. Provide a point option only when it is an actual equilibrium.');return candidates[0];
}
function jacobianAt(spec:FirstOrderSystemSpec,point:EquilibriumPoint):AstNode {
  const rows=spec.rhs.map((rhs)=>spec.states.map((state)=>{let derivative=differentiateAst(rhs,state).ast;spec.states.forEach((name,index)=>{derivative=substituteAst(derivative,name,point.ast[index]);});return simplifyAst(derivative);}));return{type:'matrix',rows};
}

export function odeLinearization(node:AstNode,pointSource?:string):OdeTransform {
  const spec=systemSpec(node,false);if(spec.rhs.some((rhs)=>symbolsIn(rhs).includes(spec.independent)))throw new Error('Jacobian equilibrium linearization requires an autonomous system.');const point=chooseLinearizationPoint(spec,pointSource);const jacobian=jacobianAt(spec,point);if(jacobian.type!=='matrix')throw new Error('Could not construct a Jacobian matrix.');const shifted=spec.states.map((name,index)=>b('-',s(name),point.ast[index]));const linearField=matrix(jacobian.rows.map((row)=>row.reduce<AstNode>((sum,entry,index)=>simplifyAst(b('+',sum,b('*',entry,shifted[index]))),ZERO_AST)));
  return{ast:jacobian,display:astToPlainText(jacobian),exactness:'exact',warnings:['Jacobian linearization describes first-order local dynamics near the equilibrium. Nonlinear systems can differ globally, and nonhyperbolic equilibria need higher-order analysis.'],steps:[],sections:[section('linearization','Autonomous-system linearization',[{label:'Equilibrium',display:formatState(spec.states,point.ast),ast:matrix(point.ast)},{label:'Jacobian J',display:astToPlainText(jacobian),ast:jacobian},{label:'Linearized field',display:astToPlainText(linearField),ast:linearField}],'The linearized system is u′ = J·u with u = state − equilibrium.') ]};
}

function matrix2Rationals(ast:AstNode):[[Rational,Rational],[Rational,Rational]] {
  if(ast.type!=='matrix'||ast.rows.length!==2||ast.rows.some((row)=>row.length!==2))throw new Error('Local stability classification is currently bounded to 2×2 Jacobians.');const values=ast.rows.map((row)=>row.map((entry)=>rationalValue(simplifyAst(entry))));if(values.flat().some((v)=>v===null))throw new Error('E4 exact stability classification currently requires a 2×2 Jacobian with exact rational entries at the equilibrium.');return values as [[Rational,Rational],[Rational,Rational]];
}
export function odeStability(node:AstNode,pointSource?:string):OdeTransform {
  const spec=systemSpec(node,false);if(spec.states.length!==2)throw new Error('E4 eigenvalue-based local stability classification is currently bounded to two-dimensional autonomous systems.');if(spec.rhs.some((rhs)=>symbolsIn(rhs).includes(spec.independent)))throw new Error('Local equilibrium stability requires an autonomous system.');const point=chooseLinearizationPoint(spec,pointSource);const jacobian=jacobianAt(spec,point);const [[a,bv],[c,d]]=matrix2Rationals(jacobian);const trace=add(a,d),det=sub(mul(a,d),mul(bv,c)),disc=sub(mul(trace,trace),mul(rat(4n),det));const traceSign=sign(trace),detSign=sign(det),discSign=sign(disc);let classification:string,tone:'positive'|'negative'|'warning'='warning',hyperbolic=true;
  if(detSign<0){classification='Saddle · unstable';tone='negative';}
  else if(detSign===0){classification='Nonhyperbolic · linearization inconclusive';hyperbolic=false;}
  else if(discSign>0){if(traceSign<0){classification='Stable node · asymptotically stable';tone='positive';}else if(traceSign>0){classification='Unstable node';tone='negative';}else{classification='Nonhyperbolic repeated balance · inconclusive';hyperbolic=false;}}
  else if(discSign<0){if(traceSign<0){classification='Stable spiral/focus · asymptotically stable';tone='positive';}else if(traceSign>0){classification='Unstable spiral/focus';tone='negative';}else{classification='Center in the linearization · nonlinear stability inconclusive';hyperbolic=false;}}
  else{if(traceSign<0){classification='Repeated stable eigenvalue · locally attracting';tone='positive';}else if(traceSign>0){classification='Repeated unstable eigenvalue';tone='negative';}else{classification='Repeated zero eigenvalue · inconclusive';hyperbolic=false;}}
  const traceN=rationalToNumber(trace),discN=rationalToNumber(disc),sqrtDisc=Math.sqrt(Math.abs(discN));const eigenText=discSign>=0?`${((traceN+sqrtDisc)/2).toPrecision(8)}, ${((traceN-sqrtDisc)/2).toPrecision(8)}`:`${(traceN/2).toPrecision(8)} ± ${(sqrtDisc/2).toPrecision(8)}i`;
  const warnings=['Classification is local to the selected equilibrium and comes from the exact rational Jacobian spectrum sign pattern. It is not a global phase-space proof.'];if(!hyperbolic)warnings.push('The equilibrium is nonhyperbolic (or has zero real-part eigenvalues), so linearization alone cannot certify nonlinear stability.');
  return{ast:jacobian,display:classification,exactness:'exact',warnings,steps:[],sections:[section('stability','Local stability classification',[{label:'Equilibrium',display:formatState(spec.states,point.ast),ast:matrix(point.ast)},{label:'Jacobian',display:astToPlainText(jacobian),ast:jacobian},{label:'trace J',display:astToPlainText(rationalToAst(trace)),ast:rationalToAst(trace)},{label:'det J',display:astToPlainText(rationalToAst(det)),ast:rationalToAst(det)},{label:'Eigenvalues (display approximation)',display:eigenText},{label:'Classification',display:classification,tone}],'For hyperbolic planar equilibria, exact signs of trace, determinant, and discriminant determine the local linear type. Nonhyperbolic cases are explicitly left inconclusive.') ]};
}

export function odeVisualizationVectorField(node:AstNode):{ast:AstNode;variables:string[]}|null {
  try{const spec=systemSpec(node,false);if(spec.states.length!==2||spec.rhs.some((rhs)=>symbolsIn(rhs).includes(spec.independent)))return null;return{ast:matrix(spec.rhs),variables:spec.states};}catch{return null;}
}

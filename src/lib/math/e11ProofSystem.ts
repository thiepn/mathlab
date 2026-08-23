import type { AstNode, ComparisonOperator } from './ast';
import {
  polynomialCoefficient,
  polynomialDegree,
  rationalValue,
  simplifyAst,
  substituteAst,
  symbolsIn,
  toPolynomial,
  type Polynomial,
} from './algebra';
import { differentiabilityAt, continuityAt } from './analysis';
import { rationalMatrixFromAst, symmetryProfile } from './advancedLinearAlgebra';
import { parsePoint } from './calculus';
import { groupProfile, subgroupCheck } from './e10FiniteAlgebra';
import { astToPlainText } from './format';
import { determinantMatrix, subspaceAnalysis } from './linearAlgebra';
import { parseMath } from './parser';
import { verifySingleTransition } from './proofLab';
import { ZERO, div, eq, isZero, mul, sign, type Rational } from './rational';
import { E11_THEOREMS, theoremById } from './e11Theorems';
import type { E11Transform } from './e11Types';
import type { DerivationStep, MathResultFact, MathResultSection } from './types';

const section=(id:string,title:string,facts:MathResultFact[],description?:string):MathResultSection=>({id,title,facts,description});
const n=(value:number|string):AstNode=>({type:'number',value:String(value)});

function parseRequired(source:string):AstNode{
  const parsed=parseMath(source.trim());
  const error=parsed.diagnostics.find(item=>item.severity==='error');
  if(!parsed.ast||error)throw new Error(error?.message??`Could not parse “${source}”.`);
  return parsed.ast.type==='definition'?parsed.ast.right:parsed.ast;
}
function same(a:AstNode,b:AstNode):boolean{return JSON.stringify(simplifyAst(a))===JSON.stringify(simplifyAst(b));}
function fact(sections:MathResultSection[]|undefined,label:string):string|undefined{return sections?.flatMap(item=>item.facts).find(item=>item.label===label)?.display;}
function validSymbol(value:string,label:string):string{const name=value.trim();if(!/^[A-Za-z][A-Za-z0-9_]*$/.test(name))throw new Error(`${label} must be a valid MathLab symbol name.`);return name;}
function theoremFacts(id:string):MathResultFact[]{const theorem=theoremById(id);if(!theorem)throw new Error(`Unknown E11 theorem “${id}”.`);return[{label:'Theorem',display:theorem.name},{label:'Statement',display:theorem.statement},{label:'Checker',display:theorem.checker}];}

export function theoremRegistry():E11Transform{
  return{display:`${E11_THEOREMS.length} deterministic E11 theorems`,exactness:'exact',warnings:[],steps:[],sections:[section('theorem-registry','Deterministic theorem registry',E11_THEOREMS.map(theorem=>({label:`${theorem.name} · ${theorem.domain}`,display:theorem.statement})),"Registry entries are discoverability metadata only when a checker exists. Natural-language resemblance to a theorem never counts as proof.")]};
}

// ---------------------------------------------------------------------------
// Equality-substitution theorem application
// ---------------------------------------------------------------------------
function rewriteAst(node:AstNode,from:AstNode,to:AstNode,all:boolean,state:{count:number}):AstNode{
  if((all||state.count===0)&&same(node,from)){state.count+=1;return to;}
  if(node.type==='number'||node.type==='symbol')return node;
  if(node.type==='unary')return{...node,operand:rewriteAst(node.operand,from,to,all,state)};
  if(node.type==='binary')return{...node,left:rewriteAst(node.left,from,to,all,state),right:rewriteAst(node.right,from,to,all,state)};
  if(node.type==='call')return{...node,args:node.args.map(arg=>rewriteAst(arg,from,to,all,state))};
  if(node.type==='matrix')return{...node,rows:node.rows.map(row=>row.map(cell=>rewriteAst(cell,from,to,all,state)))};
  if(node.type==='system'||node.type==='set')return{...node,items:node.items.map(item=>rewriteAst(item,from,to,all,state))};
  return{...node,left:rewriteAst(node.left,from,to,all,state),right:rewriteAst(node.right,from,to,all,state)};
}

export function lemmaRewrite(source:AstNode,targetSource:string,lemmaSource:string,direction:'forward'|'reverse'='forward',occurrence:'first'|'all'='first'):E11Transform{
  const target=parseRequired(targetSource),lemma=parseRequired(lemmaSource);
  if(lemma.type!=='equation')throw new Error('Equality-lemma rewriting requires a lemma of the form A = B.');
  const from=direction==='forward'?lemma.left:lemma.right,to=direction==='forward'?lemma.right:lemma.left,state={count:0};
  const rewritten=rewriteAst(source,from,to,occurrence==='all',state);
  if(state.count===0)throw new Error(`The ${direction==='forward'?'left':'right'} side of the lemma does not occur as an exact mathematical subtree in the source.`);
  if(!same(rewritten,target))throw new Error(`Applying the lemma rewrites the source to “${astToPlainText(simplifyAst(rewritten))}”, not to the proposed target. E11 will not hide an additional unsupported step.`);
  const before=simplifyAst(source),after=simplifyAst(target);
  const step:DerivationStep={id:'e11-lemma-1',before:astToPlainText(before),after:astToPlainText(after),beforeAst:before,afterAst:after,rule:'equality-substitution',explanation:`Use ${astToPlainText(lemma.left)} = ${astToPlainText(lemma.right)} in the ${direction} direction at ${state.count} certified occurrence${state.count===1?'':'s'}.`,verified:true,verificationStatus:'verified'};
  return{ast:after,display:'VERIFIED THEOREM REWRITE',exactness:'exact',warnings:[],steps:[step],sections:[section('lemma-rewrite','Equality lemma application',[...theoremFacts('equality-substitution'),{label:'Lemma',display:astToPlainText(lemma),ast:lemma},{label:'Direction',display:direction},{label:'Occurrences rewritten',display:String(state.count)},{label:'Target',display:astToPlainText(after),ast:after},{label:'Status',display:'Verified',tone:'positive'}]) ]};
}

// ---------------------------------------------------------------------------
// Exact one-way inequality consequence
// ---------------------------------------------------------------------------
type NormalizedInequality={operator:'<'|'<=';difference:AstNode};
function normalizeInequality(node:AstNode):NormalizedInequality{
  if(node.type!=='comparison'||node.operator==='!=')throw new Error('Inequality consequence mode requires <, <=, >, or >=.');
  if(node.operator==='<'||node.operator==='<=')return{operator:node.operator,difference:{type:'binary',operator:'-',left:node.left,right:node.right}};
  return{operator:node.operator==='>'?'<':'<=',difference:{type:'binary',operator:'-',left:node.right,right:node.left}};
}
function polynomialRatio(source:Polynomial,target:Polynomial):Rational|null{
  const degree=Math.max(polynomialDegree(source),polynomialDegree(target));let ratio:Rational|null=null;
  for(let i=0;i<=degree;i+=1){const a=polynomialCoefficient(source,i),b=polynomialCoefficient(target,i);if(isZero(a)){if(!isZero(b))return null;continue;}const q=div(b,a);if(ratio===null)ratio=q;else if(!eq(ratio,q))return null;}
  return ratio;
}
export function inequalityConsequence(source:AstNode,targetSource:string):E11Transform{
  const target=parseRequired(targetSource),a=normalizeInequality(source),b=normalizeInequality(target);
  const variables=[...new Set([...symbolsIn(a.difference),...symbolsIn(b.difference)].filter(name=>!['pi','e','i','infinity'].includes(name)))];
  if(variables.length>1)throw new Error('E11 inequality consequence checking is bounded to one independent variable.');
  const variable=variables[0]??'x',pa=toPolynomial(simplifyAst(a.difference),variable),pb=toPolynomial(simplifyAst(b.difference),variable);
  if(!pa||!pb)throw new Error('E11 inequality consequence checking currently requires rational polynomial inequalities.');
  const ratio=polynomialRatio(pa,pb);if(!ratio||isZero(ratio)||sign(ratio)<0)throw new Error('The target inequality is not obtained by a positive rational scaling of the represented order difference.');
  if(a.operator==='<='&&b.operator==='<')throw new Error('A non-strict inequality does not imply the corresponding strict inequality.');
  const sourceText=astToPlainText(source),targetText=astToPlainText(target),step:DerivationStep={id:'e11-order-1',before:sourceText,after:targetText,beforeAst:source,afterAst:target,rule:'positive-order-scaling',explanation:`Normalize both inequalities to a difference compared with 0. The target difference is the positive rational multiple ${ratio.n}/${ratio.d} of the source difference${a.operator==='<'&&b.operator==='<='?'; strict order therefore also implies the non-strict statement':''}.`,verified:true,verificationStatus:'verified'};
  return{ast:target,display:'VERIFIED INEQUALITY CONSEQUENCE',exactness:'exact',warnings:[],steps:[step],sections:[section('inequality-consequence','Order-theorem certificate',[...theoremFacts('positive-order-scaling'),{label:'Source',display:sourceText,ast:source},{label:'Target',display:targetText,ast:target},{label:'Positive scale',display:ratio.d===1n?String(ratio.n):`${ratio.n}/${ratio.d}`},{label:'Status',display:'Verified implication',tone:'positive'}]) ]};
}

// ---------------------------------------------------------------------------
// Finite-domain quantified proof obligations, including two nested quantifiers
// ---------------------------------------------------------------------------
type Quantifier='forall'|'exists';
function setItems(node:AstNode):AstNode[]{const q=simplifyAst(node);if(q.type==='call'&&q.name==='set')return q.args;if(q.type==='set')return q.items;throw new Error('Quantified proof domains must be explicit finite sets.');}
function compareExact(left:AstNode,right:AstNode):number{const a=rationalValue(simplifyAst(left)),b=rationalValue(simplifyAst(right));if(!a||!b)throw new Error('Quantified predicate arithmetic must resolve exactly after substitution.');const d=a.n*b.d-b.n*a.d;return d<0n?-1:d>0n?1:0;}
function predicateTruth(node:AstNode):boolean{
  const q=simplifyAst(node);
  if(q.type==='symbol'){if(q.name==='true')return true;if(q.name==='false')return false;}
  if(q.type==='equation')return compareExact(q.left,q.right)===0;
  if(q.type==='comparison'){const c=compareExact(q.left,q.right);return q.operator==='<'?c<0:q.operator==='<='?c<=0:q.operator==='>'?c>0:q.operator==='>='?c>=0:c!==0;}
  if(q.type==='call'){
    if(q.name==='not'&&q.args.length===1)return!predicateTruth(q.args[0]);
    if(q.name==='and'&&q.args.length>=2)return q.args.every(predicateTruth);
    if(q.name==='or'&&q.args.length>=2)return q.args.some(predicateTruth);
    if(['xor','implies','iff'].includes(q.name)&&q.args.length===2){const a=predicateTruth(q.args[0]),b=predicateTruth(q.args[1]);return q.name==='xor'?a!==b:q.name==='implies'?!a||b:a===b;}
  }
  throw new Error('Finite quantified predicates support exact arithmetic equations/comparisons and not/and/or/xor/implies/iff.');
}
function quantify(values:boolean[],q:Quantifier):boolean{return q==='forall'?values.every(Boolean):values.some(Boolean);}
function quantifierText(q:Quantifier):string{return q==='forall'?'∀':'∃';}
export function finiteQuantifierProof(firstSet:AstNode,variable1Source:string,predicateSource:string,quantifier1:Quantifier,secondSetSource='',variable2Source='y',quantifier2:Quantifier='forall'):E11Transform{
  const variable1=validSymbol(variable1Source,'First bound variable'),domain1=setItems(firstSet);if(domain1.length>256)throw new Error('The first E11 finite quantifier domain is limited to 256 represented elements.');
  const predicate=parseRequired(predicateSource);let domain2:AstNode[]|null=null,secondSet:AstNode|undefined,variable2='';
  if(secondSetSource.trim()){secondSet=parseRequired(secondSetSource);domain2=setItems(secondSet);variable2=validSymbol(variable2Source,'Second bound variable');if(variable2===variable1)throw new Error('Nested quantifiers require distinct bound variables.');if(domain2.length>256)throw new Error('The second E11 finite quantifier domain is limited to 256 represented elements.');}
  const assignments=domain1.length*(domain2?.length??1);if(assignments>4096)throw new Error('E11 nested finite quantifier proofs are limited to at most 4096 exhaustive assignments.');
  const outerValues:boolean[]=[];const outerFacts:MathResultFact[]=[];let decisive='None';
  for(const x of domain1){
    const px=substituteAst(predicate,variable1,x);
    if(domain2){const innerValues=domain2.map(y=>predicateTruth(substituteAst(px,variable2,y))),inner=quantify(innerValues,quantifier2);outerValues.push(inner);outerFacts.push({label:`${variable1}=${astToPlainText(x)}`,display:`${quantifierText(quantifier2)} ${variable2}: ${inner?'True':'False'}`,tone:inner?'positive':'negative'});if(decisive==='None'&&((quantifier1==='forall'&&!inner)||(quantifier1==='exists'&&inner))){const index=quantifier2==='forall'?innerValues.findIndex(v=>!v):innerValues.findIndex(Boolean);decisive=`${variable1}=${astToPlainText(x)}${index>=0?`, ${variable2}=${astToPlainText(domain2[index])}`:''}`;}}
    else {const value=predicateTruth(px);outerValues.push(value);outerFacts.push({label:`${variable1}=${astToPlainText(x)}`,display:value?'True':'False',tone:value?'positive':'negative'});if(decisive==='None'&&((quantifier1==='forall'&&!value)||(quantifier1==='exists'&&value)))decisive=`${variable1}=${astToPlainText(x)}`;}
  }
  const value=quantify(outerValues,quantifier1),ast:AstNode={type:'symbol',name:value?'true':'false'},nested=domain2&&secondSet;
  const statement=`${quantifierText(quantifier1)} ${variable1} ∈ ${astToPlainText(firstSet)}${nested?`: ${quantifierText(quantifier2)} ${variable2} ∈ ${astToPlainText(secondSet!)}`:''}: ${predicateSource}`;
  return{ast,display:`${statement} · ${value?'True':'False'}`,exactness:'exact',warnings:[],steps:[],sections:[section('quantified-proof','Finite quantified proof',[...theoremFacts('finite-universal-instantiation'),{label:'Statement',display:statement},{label:'Assignments checked',display:String(assignments)},{label:'Result',display:value?'True':'False',tone:value?'positive':'negative'},...(decisive!=='None'?[{label:value?'Witness / decisive assignment':'Counterexample / decisive assignment',display:decisive}]:[]) ]),section('quantifier-obligations','Exhaustive outer obligations',outerFacts,'Every represented assignment needed by the quantifier semantics is evaluated exactly. No sampling or extrapolation to an infinite domain occurs.')]};
}

// ---------------------------------------------------------------------------
// Ordinary induction certificate for a recursively defined sequence
// ---------------------------------------------------------------------------
function requireEquation(node:AstNode,label:string):Extract<AstNode,{type:'equation'}>{if(node.type!=='equation')throw new Error(`${label} must be an equation.`);return node;}
export function inductionCertificate(claimNode:AstNode,baseSource:string,recurrenceSource:string,indexSource='n',stepVariableSource='k',baseValue=1):E11Transform{
  const claim=requireEquation(claimNode,'Induction claim'),index=validSymbol(indexSource,'Induction index'),k=validSymbol(stepVariableSource,'Induction step variable');if(index===k)throw new Error('The claim index and induction-step variable must be distinct symbols.');if(!Number.isSafeInteger(baseValue))throw new Error('Induction base must be a safe integer.');
  if(claim.left.type!=='call'||claim.left.args.length!==1||claim.left.args[0].type!=='symbol'||claim.left.args[0].name!==index)throw new Error(`E11 ordinary induction expects a sequence/function claim such as S(${index}) = F(${index}).`);
  const baseFact=requireEquation(parseRequired(baseSource),'Base fact'),recurrence=requireEquation(parseRequired(recurrenceSource),'Recurrence premise');
  const claimBase=substituteAst(claim,index,n(baseValue)),baseCheck=verifySingleTransition(astToPlainText(baseFact),astToPlainText(claimBase));if(baseCheck.status!=='verified')throw new Error(`Base obligation is not certified: ${baseCheck.display}.`);
  const claimK=substituteAst(claim,index,{type:'symbol',name:k}),successor:{type:'binary',operator:'+',left:{type:'symbol',name:k},right:n(1)} as AstNode,claimNext=substituteAst(claim,index,successor);
  if(claimK.type!=='equation'||claimNext.type!=='equation')throw new Error('Internal induction claim substitution did not preserve equality.');
  if(!same(recurrence.left,claimNext.left))throw new Error(`The recurrence left side “${astToPlainText(recurrence.left)}” does not match the successor term “${astToPlainText(claimNext.left)}”.`);
  const state={count:0},rewrittenRhs=rewriteAst(recurrence.right,claimK.left,claimK.right,true,state);if(state.count===0)throw new Error('The recurrence successor expression does not contain the induction-hypothesis term, so this bounded induction checker cannot discharge the successor obligation.');
  const successorCheck=verifySingleTransition(astToPlainText(rewrittenRhs),astToPlainText(claimNext.right));if(successorCheck.status!=='verified')throw new Error(`Successor obligation is not certified after substituting the induction hypothesis: ${successorCheck.display}.`);
  const baseAst=simplifyAst(claimBase),nextAst=simplifyAst(claimNext),hypothesisText=astToPlainText(simplifyAst(claimK)),recurrenceText=astToPlainText(recurrence),steps:DerivationStep[]=[
    {id:'induction-base',before:astToPlainText(baseFact),after:astToPlainText(baseAst),beforeAst:baseFact,afterAst:baseAst,rule:'induction-base',explanation:`Verify the claim at ${index}=${baseValue}.`,verified:true,verificationStatus:'verified'},
    {id:'induction-hypothesis',before:hypothesisText,after:hypothesisText,beforeAst:claimK,afterAst:claimK,rule:'induction-hypothesis',explanation:`Assume the claim for an arbitrary integer ${k} ≥ ${baseValue}. This is the induction hypothesis used only inside the successor implication.`,verified:true,verificationStatus:'verified'},
    {id:'induction-recurrence',before:recurrenceText,after:`${astToPlainText(recurrence.left)} = ${astToPlainText(rewrittenRhs)}`,beforeAst:recurrence,afterAst:{type:'equation',left:recurrence.left,right:rewrittenRhs},rule:'substitute-induction-hypothesis',explanation:`Use the represented recurrence premise and replace ${astToPlainText(claimK.left)} by ${astToPlainText(claimK.right)}.`,verified:true,verificationStatus:'verified'},
    {id:'induction-successor',before:astToPlainText(rewrittenRhs),after:astToPlainText(claimNext.right),beforeAst:rewrittenRhs,afterAst:claimNext.right,rule:'induction-successor',explanation:'The exact deterministic algebra verifier establishes the successor formula.',verified:true,verificationStatus:'verified'},
  ];
  return{ast:claim,display:`INDUCTION CERTIFIED FOR INTEGER ${index} ≥ ${baseValue}`,exactness:'exact',warnings:['The recurrence equation is treated as a represented premise/definition; E11 certifies that the claimed closed form follows from that recurrence and the verified base fact.'],steps,sections:[section('induction-certificate','Ordinary induction certificate',[...theoremFacts('ordinary-induction-recurrence'),{label:'Claim',display:astToPlainText(claim),ast:claim},{label:'Base obligation',display:'Discharged',tone:'positive'},{label:'Induction hypothesis',display:hypothesisText},{label:'Recurrence premise',display:recurrenceText},{label:'Successor obligation',display:'Discharged',tone:'positive'},{label:'Hypothesis substitutions',display:String(state.count)},{label:'Conclusion',display:`Claim follows for every integer ${index} ≥ ${baseValue}`,tone:'positive'}],`Base: ${astToPlainText(baseAst)} · Successor target: ${astToPlainText(nextAst)}`)]};
}

// ---------------------------------------------------------------------------
// Upper-division theorem applications
// ---------------------------------------------------------------------------
export function analysisTheoremCertificate(node:AstNode,variable:string,pointSource:string):E11Transform{
  const point=parsePoint(pointSource),diff=differentiabilityAt(node,variable,point),diffConclusion=fact(diff.sections,'Conclusion')??diff.display??'Not established';
  if(diffConclusion!=='Differentiable')return{ast:node,display:'THEOREM PREREQUISITE NOT DISCHARGED',exactness:'exact',warnings:['MathLab did not establish differentiability at the configured point, so the implication theorem cannot be used to assert continuity there.'],steps:[],sections:[section('analysis-theorem','Analysis theorem application',[...theoremFacts('differentiable-implies-continuous'),{label:'Point',display:`${variable} = ${pointSource}`},{label:'Differentiability prerequisite',display:diffConclusion,tone:'warning'},{label:'Conclusion',display:'No theorem conclusion asserted',tone:'warning'}]) ]};
  const continuous=continuityAt(node,variable,point),continuityConclusion=fact(continuous.sections,'Conclusion')??continuous.display??'Continuous';if(!(continuous.ast?.type==='number'&&continuous.ast.value==='1')&&!/continuous/i.test(continuityConclusion))throw new Error('Internal theorem consistency check failed: differentiability was established but continuity was not.');
  const text=astToPlainText(node),step:DerivationStep={id:'analysis-theorem-1',before:`${text} differentiable at ${variable}=${pointSource}`,after:`${text} continuous at ${variable}=${pointSource}`,rule:'differentiable-implies-continuous',explanation:'Apply the deterministic theorem after the differentiability prerequisite has been discharged.',verified:true,verificationStatus:'verified'};
  return{ast:node,display:'VERIFIED ANALYSIS THEOREM APPLICATION',exactness:'exact',warnings:[],steps:[step],sections:[section('analysis-theorem','Analysis theorem certificate',[...theoremFacts('differentiable-implies-continuous'),{label:'Point',display:`${variable} = ${pointSource}`},{label:'Differentiability prerequisite',display:'Discharged',tone:'positive'},{label:'Continuity conclusion',display:'Certified',tone:'positive'}]) ]};
}

export function linearAlgebraTheoremCertificate(node:AstNode,theoremId:'rank-nullity'|'invertible-matrix-equivalences'|'spectral-theorem-hermitian'):E11Transform{
  if(theoremId==='spectral-theorem-hermitian'){
    const profile=symmetryProfile(node);if(!profile.hermitian)return{ast:node,display:'THEOREM PREREQUISITE NOT DISCHARGED',exactness:'exact',warnings:['The represented matrix is not Hermitian, so the Hermitian spectral theorem is not applicable.'],steps:[],sections:[section('spectral-theorem','Spectral-theorem prerequisite',[...theoremFacts(theoremId),{label:'A* = A',display:'No',tone:'negative'},{label:'Conclusion',display:'No spectral-theorem conclusion asserted',tone:'warning'}]) ]};
    return{ast:node,display:'VERIFIED SPECTRAL-THEOREM APPLICATION',exactness:'exact',warnings:[],steps:[],sections:[section('spectral-theorem','Hermitian spectral-theorem certificate',[...theoremFacts(theoremId),{label:'A* = A',display:'Yes',tone:'positive'},{label:'Real spectrum',display:'Follows from theorem',tone:'positive'},{label:'Unitary diagonalizability',display:'Follows from theorem',tone:'positive'}],`Adjoint: ${astToPlainText(profile.adjoint)}`)]};
  }
  const matrix=rationalMatrixFromAst(node),analysis=subspaceAnalysis(matrix),columns=matrix[0].length;
  if(theoremId==='rank-nullity'){
    const sum=analysis.rank+analysis.nullity;if(sum!==columns)throw new Error('Internal rank–nullity consistency check failed.');
    return{ast:node,display:'VERIFIED RANK–NULLITY CERTIFICATE',exactness:'exact',warnings:[],steps:[],sections:[section('rank-nullity','Rank–nullity theorem certificate',[...theoremFacts(theoremId),{label:'rank(A)',display:String(analysis.rank)},{label:'nullity(A)',display:String(analysis.nullity)},{label:'Columns n',display:String(columns)},{label:'rank + nullity',display:String(sum),tone:'positive'}]) ]};
  }
  if(matrix.length!==columns)throw new Error('Invertible-matrix equivalence certification requires a square matrix.');
  const determinant=determinantMatrix(matrix).value,detNonzero=!isZero(determinant),fullRank=analysis.rank===columns,nullityZero=analysis.nullity===0;if(!(detNonzero===fullRank&&fullRank===nullityZero))throw new Error('Internal invertible-matrix equivalence consistency check failed.');
  return{ast:node,display:`VERIFIED INVERTIBLE-MATRIX EQUIVALENCES · ${detNonzero?'INVERTIBLE':'SINGULAR'}`,exactness:'exact',warnings:[],steps:[],sections:[section('invertible-equivalences','Invertible matrix theorem certificate',[...theoremFacts(theoremId),{label:'det(A) ≠ 0',display:detNonzero?'Yes':'No',tone:detNonzero?'positive':'negative'},{label:'rank(A) = n',display:fullRank?'Yes':'No',tone:fullRank?'positive':'negative'},{label:'nullity(A) = 0',display:nullityZero?'Yes':'No',tone:nullityZero?'positive':'negative'},{label:'Certified status',display:detNonzero?'Invertible':'Singular',tone:detNonzero?'positive':'negative'}]) ]};
}

function subsetCardinality(source:string):number{
  const q=simplifyAst(parseRequired(source));let values:AstNode[];
  if(q.type==='call'&&q.name==='set')values=q.args;else if(q.type==='set')values=q.items;else if(q.type==='matrix'&&q.rows.length===1)values=q.rows[0];else throw new Error('Subgroup theorem mode expects set(1,2,...) or a vector of element labels.');
  return new Set(values.map(value=>astToPlainText(simplifyAst(value)))).size;
}
export function finiteGroupTheoremCertificate(node:AstNode,subsetSource:string):E11Transform{
  const group=groupProfile(node),subgroup=subgroupCheck(node,subsetSource),groupOrder=Number(fact(group.sections,'Order')),isSubgroup=fact(subgroup.sections,'Subgroup')==='Yes',subgroupOrder=subsetCardinality(subsetSource);
  if(!Number.isSafeInteger(groupOrder)||groupOrder<1)throw new Error('Could not recover the finite group order for Lagrange certification.');
  if(!isSubgroup)return{ast:node,display:'THEOREM PREREQUISITE NOT DISCHARGED',exactness:'exact',warnings:['The configured subset is not a subgroup, so Lagrange’s theorem does not apply to it.'],steps:[],sections:[section('lagrange','Lagrange theorem prerequisite',[...theoremFacts('lagrange-finite-groups'),{label:'|G|',display:String(groupOrder)},{label:'Candidate |H|',display:String(subgroupOrder)},{label:'Certified subgroup',display:'No',tone:'negative'},{label:'Conclusion',display:'No divisibility theorem asserted',tone:'warning'}]) ]};
  const divides=groupOrder%subgroupOrder===0;if(!divides)throw new Error('Internal Lagrange consistency check failed for a certified subgroup.');
  return{ast:node,display:'VERIFIED LAGRANGE-THEOREM APPLICATION',exactness:'exact',warnings:[],steps:[],sections:[section('lagrange','Lagrange theorem certificate',[...theoremFacts('lagrange-finite-groups'),{label:'|G|',display:String(groupOrder)},{label:'|H|',display:String(subgroupOrder)},{label:'Certified subgroup',display:'Yes',tone:'positive'},{label:'Index |G|/|H|',display:String(groupOrder/subgroupOrder)},{label:'|H| divides |G|',display:'Yes',tone:'positive'}]) ]};
}

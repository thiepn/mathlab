import type { AstNode } from './ast';
import { simplifyAst, substituteAst } from './algebra';
import { astToPlainText } from './format';
import { verifySingleTransition } from './proofLab';
import { e11ParseRequired, e11Same, e11ValidSymbol, rewriteAst, theoremFacts } from './e11ProofLogic';
import type { E11Transform } from './e11Types';
import type { DerivationStep, MathResultFact, MathResultSection } from './types';

const section=(id:string,title:string,facts:MathResultFact[],description?:string):MathResultSection=>({id,title,facts,description});
const n=(value:number|string):AstNode=>({type:'number',value:String(value)});
function requireEquation(node:AstNode,label:string):Extract<AstNode,{type:'equation'}>{if(node.type!=='equation')throw new Error(`${label} must be an equation.`);return node;}

export function inductionCertificate(claimNode:AstNode,baseSource:string,recurrenceSource:string,indexSource='n',stepVariableSource='k',baseValue=1):E11Transform{
  const claim=requireEquation(claimNode,'Induction claim'),index=e11ValidSymbol(indexSource,'Induction index'),k=e11ValidSymbol(stepVariableSource,'Induction step variable');
  if(index===k)throw new Error('The claim index and induction-step variable must be distinct symbols.');if(!Number.isSafeInteger(baseValue))throw new Error('Induction base must be a safe integer.');
  if(claim.left.type!=='call'||claim.left.args.length!==1||claim.left.args[0].type!=='symbol'||claim.left.args[0].name!==index)throw new Error(`E11 ordinary induction expects a sequence/function claim such as S(${index}) = F(${index}).`);
  const baseFact=requireEquation(e11ParseRequired(baseSource),'Base fact'),recurrence=requireEquation(e11ParseRequired(recurrenceSource),'Recurrence premise');
  const claimBase=substituteAst(claim,index,n(baseValue)),baseCheck=verifySingleTransition(astToPlainText(baseFact),astToPlainText(claimBase));
  if(baseCheck.status!=='verified')throw new Error(`Base obligation is not certified: ${baseCheck.display}.`);
  const claimK=substituteAst(claim,index,{type:'symbol',name:k});
  const successor:AstNode={type:'binary',operator:'+',left:{type:'symbol',name:k},right:n(1)};
  const claimNext=substituteAst(claim,index,successor);
  if(claimK.type!=='equation'||claimNext.type!=='equation')throw new Error('Internal induction claim substitution did not preserve equality.');
  if(!e11Same(recurrence.left,claimNext.left))throw new Error(`The recurrence left side “${astToPlainText(recurrence.left)}” does not match the successor term “${astToPlainText(claimNext.left)}”.`);
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

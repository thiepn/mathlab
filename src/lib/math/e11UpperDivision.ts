import type { AstNode } from './ast';
import { simplifyAst } from './algebra';
import { differentiabilityAt, continuityAt } from './analysis';
import { rationalMatrixFromAst, symmetryProfile } from './advancedLinearAlgebra';
import { parsePoint } from './calculus';
import { groupProfile, subgroupCheck } from './e10FiniteAlgebra';
import { e11ParseRequired, theoremFacts } from './e11ProofLogic';
import type { E11Transform } from './e11Types';
import { astToPlainText } from './format';
import { determinantMatrix, subspaceAnalysis } from './linearAlgebra';
import { isZero } from './rational';
import type { DerivationStep, MathResultFact, MathResultSection } from './types';

const section=(id:string,title:string,facts:MathResultFact[],description?:string):MathResultSection=>({id,title,facts,description});
function fact(sections:MathResultSection[]|undefined,label:string):string|undefined{return sections?.flatMap(item=>item.facts).find(item=>item.label===label)?.display;}

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

function subsetCardinality(source:string):number{const q=simplifyAst(e11ParseRequired(source));let values:AstNode[];if(q.type==='call'&&q.name==='set')values=q.args;else if(q.type==='set')values=q.items;else if(q.type==='matrix'&&q.rows.length===1)values=q.rows[0];else throw new Error('Subgroup theorem mode expects set(1,2,...) or a vector of element labels.');return new Set(values.map(value=>astToPlainText(simplifyAst(value)))).size;}
export function finiteGroupTheoremCertificate(node:AstNode,subsetSource:string):E11Transform{
  const group=groupProfile(node),subgroup=subgroupCheck(node,subsetSource),groupOrder=Number(fact(group.sections,'Order')),isSubgroup=fact(subgroup.sections,'Subgroup')==='Yes',subgroupOrder=subsetCardinality(subsetSource);
  if(!Number.isSafeInteger(groupOrder)||groupOrder<1)throw new Error('Could not recover the finite group order for Lagrange certification.');
  if(!isSubgroup)return{ast:node,display:'THEOREM PREREQUISITE NOT DISCHARGED',exactness:'exact',warnings:['The configured subset is not a subgroup, so Lagrange’s theorem does not apply to it.'],steps:[],sections:[section('lagrange','Lagrange theorem prerequisite',[...theoremFacts('lagrange-finite-groups'),{label:'|G|',display:String(groupOrder)},{label:'Candidate |H|',display:String(subgroupOrder)},{label:'Certified subgroup',display:'No',tone:'negative'},{label:'Conclusion',display:'No divisibility theorem asserted',tone:'warning'}]) ]};
  const divides=groupOrder%subgroupOrder===0;if(!divides)throw new Error('Internal Lagrange consistency check failed for a certified subgroup.');
  return{ast:node,display:'VERIFIED LAGRANGE-THEOREM APPLICATION',exactness:'exact',warnings:[],steps:[],sections:[section('lagrange','Lagrange theorem certificate',[...theoremFacts('lagrange-finite-groups'),{label:'|G|',display:String(groupOrder)},{label:'|H|',display:String(subgroupOrder)},{label:'Certified subgroup',display:'Yes',tone:'positive'},{label:'Index |G|/|H|',display:String(groupOrder/subgroupOrder)},{label:'|H| divides |G|',display:'Yes',tone:'positive'}]) ]};
}

import type { AstNode } from './ast';
import { E10MathEngine } from './e10Engine';
import { substituteBindings } from './e5NumericalOptimization';
import { parseMath } from './parser';
import {
  analysisTheoremCertificate,
  finiteGroupTheoremCertificate,
  finiteQuantifierProof,
  inductionCertificate,
  inequalityConsequence,
  lemmaRewrite,
  linearAlgebraTheoremCertificate,
  theoremRegistry,
} from './e11ProofSystem';
import type { E11Transform } from './e11Types';
import type { MathOperationRequest, MathResult } from './types';

const E11_OPERATIONS=new Set([
  'theorem-registry','lemma-rewrite','inequality-consequence','finite-quantifier-proof','induction-certificate',
  'analysis-theorem-certificate','linear-algebra-theorem-certificate','finite-group-theorem-certificate',
]);

function requestAst(request:MathOperationRequest):AstNode{
  let source=request.ast;
  if(!source){const parsed=parseMath(request.input);const error=parsed.diagnostics.find(item=>item.severity==='error');if(!parsed.ast||error)throw new Error(error?.message??'Could not parse the E11 proof input.');source=parsed.ast;}
  const ast=source.type==='definition'?source.right:source;
  return substituteBindings(ast,request.bindings??[],[]);
}
function text(request:MathOperationRequest,name:string,fallback=''):string{const raw=request.options?.[name];return raw===undefined?fallback:String(raw).trim();}
function integer(request:MathOperationRequest,name:string,fallback:number):number{const raw=request.options?.[name],value=raw===undefined||raw===''?fallback:Number(raw);if(!Number.isSafeInteger(value))throw new Error(`${name} must be a safe integer.`);return value;}
function result(request:MathOperationRequest,out:E11Transform):MathResult{return{id:request.id,operation:request.operation,input:request.input,exactness:out.exactness,value:out.display,display:out.display,resultAst:out.ast,variable:request.variable,assumptions:request.assumptions??[],warnings:out.warnings,steps:out.steps,sections:out.sections,createdAt:Date.now()};}

export class E11MathEngine extends E10MathEngine{
  async execute(request:MathOperationRequest):Promise<MathResult>{
    if(!E11_OPERATIONS.has(request.operation))return super.execute(request);
    if(request.operation==='theorem-registry')return result(request,theoremRegistry());
    const ast=requestAst(request);
    switch(request.operation){
      case 'lemma-rewrite': return result(request,lemmaRewrite(ast,text(request,'target'),text(request,'lemma'),text(request,'direction','forward')==='reverse'?'reverse':'forward',text(request,'occurrence','first')==='all'?'all':'first'));
      case 'inequality-consequence': return result(request,inequalityConsequence(ast,text(request,'target')));
      case 'finite-quantifier-proof': return result(request,finiteQuantifierProof(ast,text(request,'variable','x'),text(request,'predicate'),text(request,'quantifier','forall')==='exists'?'exists':'forall',text(request,'secondSet'),text(request,'secondVariable','y'),text(request,'secondQuantifier','forall')==='exists'?'exists':'forall'));
      case 'induction-certificate': return result(request,inductionCertificate(ast,text(request,'baseFact'),text(request,'recurrence'),text(request,'index',request.variable??'n'),text(request,'stepVariable','k'),integer(request,'base',1)));
      case 'analysis-theorem-certificate': return result(request,analysisTheoremCertificate(ast,text(request,'variable',request.variable??'x'),text(request,'point','0')));
      case 'linear-algebra-theorem-certificate': {
        const theorem=text(request,'theorem','rank-nullity');
        if(!['rank-nullity','invertible-matrix-equivalences','spectral-theorem-hermitian'].includes(theorem))throw new Error('Linear-algebra theorem must be rank-nullity, invertible-matrix-equivalences, or spectral-theorem-hermitian.');
        return result(request,linearAlgebraTheoremCertificate(ast,theorem as 'rank-nullity'|'invertible-matrix-equivalences'|'spectral-theorem-hermitian'));
      }
      case 'finite-group-theorem-certificate': return result(request,finiteGroupTheoremCertificate(ast,text(request,'subset','set(1)')||'set(1)'));
      default:return super.execute(request);
    }
  }
}

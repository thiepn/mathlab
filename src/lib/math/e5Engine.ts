import type { AstNode } from './ast';
import { E4MathEngine } from './e4Engine';
import {
  conjugateGradient,
  constrainedOptimize,
  convexityDiagnostic,
  linearProgram2d,
  nonlinearSystemSolve,
  numericalCholesky,
  numericalEigen,
  numericalLu,
  numericalOptimize,
  numericalQr,
  numericalRank,
  numericalSvd,
  pseudoinverse,
  spectralCondition,
  substituteBindings,
  type E5Transform,
  type OptimizationMethod,
} from './e5NumericalOptimization';
import { functionParametersFromSource } from './multivariable';
import type { MathOperationRequest, MathResult } from './types';

const E5_OPERATIONS = new Set([
  'numerical-lu','numerical-cholesky','numerical-qr','numerical-eigen','numerical-svd','pseudoinverse','numerical-rank','spectral-condition','conjugate-gradient',
  'nonlinear-system-solve','numerical-optimize','constrained-optimize','convexity-diagnostic','linear-program',
]);

function numberOption(request:MathOperationRequest,name:string):number|undefined{const raw=request.options?.[name];if(raw===undefined||raw==='')return undefined;const value=Number(raw);return Number.isFinite(value)?value:undefined;}
function textOption(request:MathOperationRequest,name:string):string|undefined{const raw=request.options?.[name];if(raw===undefined)return undefined;const value=String(raw).trim();return value||undefined;}
function requestAst(request:MathOperationRequest):AstNode{
  if(!request.ast)throw new Error('E5 requires a resolved mathematical object.');
  const raw=request.ast.type==='definition'?request.ast.right:request.ast;
  const protectedNames=functionParametersFromSource(request.input,raw);
  return substituteBindings(raw,request.bindings??[],protectedNames);
}
function result(request:MathOperationRequest,out:E5Transform):MathResult{return{id:request.id,operation:request.operation,input:request.input,exactness:out.exactness,value:out.display,display:out.display,resultAst:out.ast,variable:request.variable,assumptions:request.assumptions??[],warnings:out.warnings,steps:[],sections:out.sections,createdAt:Date.now()};}

export class E5MathEngine extends E4MathEngine{
  async execute(request:MathOperationRequest):Promise<MathResult>{
    if(!E5_OPERATIONS.has(request.operation))return super.execute(request);
    const ast=requestAst(request),tolerance=numberOption(request,'tolerance'),maxIterations=numberOption(request,'maxIterations');
    switch(request.operation){
      case'numerical-lu':return result(request,numericalLu(ast));
      case'numerical-cholesky':return result(request,numericalCholesky(ast));
      case'numerical-qr':return result(request,numericalQr(ast));
      case'numerical-eigen':return result(request,numericalEigen(ast,tolerance));
      case'numerical-svd':return result(request,numericalSvd(ast,tolerance));
      case'pseudoinverse':return result(request,pseudoinverse(ast,tolerance));
      case'numerical-rank':return result(request,numericalRank(ast,tolerance));
      case'spectral-condition':return result(request,spectralCondition(ast,tolerance));
      case'conjugate-gradient':return result(request,conjugateGradient(ast,tolerance,maxIterations));
      case'nonlinear-system-solve':return result(request,nonlinearSystemSolve(ast,request.input,textOption(request,'point'),tolerance,maxIterations));
      case'numerical-optimize':return result(request,numericalOptimize(ast,request.input,{method:(textOption(request,'method') as OptimizationMethod|undefined),point:textOption(request,'point'),tolerance,maxIterations}));
      case'constrained-optimize':return result(request,constrainedOptimize(ast,request.input,{constraint:textOption(request,'constraint'),point:textOption(request,'point'),tolerance,maxIterations}));
      case'convexity-diagnostic':return result(request,convexityDiagnostic(ast,request.input,textOption(request,'point')));
      case'linear-program':return result(request,linearProgram2d(ast,{objective:textOption(request,'objective'),sense:textOption(request,'sense')}));
      default:return super.execute(request);
    }
  }
}

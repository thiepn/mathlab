import type { AstNode } from './ast';
import { E5MathEngine } from './e5Engine';
import { substituteBindings } from './e5NumericalOptimization';
import {
  advancedDistributionProbability,
  advancedDistributionProfile,
  advancedDistributionQuantile,
  advancedSamplingMean,
  affineRandomVariable,
  bootstrapMean,
  chiSquareGoodness,
  chiSquareIndependence,
  covarianceCorrelationMatrix,
  isE6DistributionCall,
  jointDistributionProfile,
  mannWhitney,
  markovProfile,
  markovStep,
  multipleLinearRegression,
  oneWayAnova,
  pairedMeanInference,
  regressionDiagnostics,
  simulateAdvancedDistribution,
  twoProportionInference,
  twoSampleMeanInference,
  wilcoxonSignedRank,
  type E6Transform,
} from './e6ProbabilityStatistics';
import { validateContinuousQuantileProbability, validateE6MatrixOperation } from './e6Validation';
import type { MathOperationRequest, MathResult } from './types';

const E6_OPERATIONS=new Set([
  'joint-distribution-profile','affine-rv-transform','covariance-correlation-matrix',
  'two-sample-mean-inference','paired-mean-inference','two-proportion-inference',
  'chi-square-goodness','chi-square-independence','one-way-anova','multiple-linear-regression','regression-diagnostics',
  'mann-whitney','wilcoxon-signed-rank','bootstrap-mean','markov-profile','markov-step',
]);
const DISTRIBUTION_OPERATIONS=new Set(['distribution-profile','distribution-probability','distribution-quantile','sampling-mean-profile','simulate-distribution']);

function requestAst(request:MathOperationRequest):AstNode{if(!request.ast)throw new Error('E6 requires a resolved mathematical object.');const ast=request.ast.type==='definition'?request.ast.right:request.ast;return substituteBindings(ast,request.bindings??[],[]);}
function textOption(request:MathOperationRequest,name:string):string|undefined{const raw=request.options?.[name];if(raw===undefined)return undefined;const value=String(raw).trim();return value||undefined;}
function numberOption(request:MathOperationRequest,name:string,fallback?:number):number|undefined{const raw=request.options?.[name];if(raw===undefined||raw==='')return fallback;const value=Number(raw);return Number.isFinite(value)?value:fallback;}
function finiteResultAst(ast:AstNode|undefined):AstNode|undefined{if(ast?.type==='number'&&!Number.isFinite(Number(ast.value)))return undefined;return ast;}
function result(request:MathOperationRequest,out:E6Transform):MathResult{return{id:request.id,operation:request.operation,input:request.input,exactness:out.exactness,value:out.display,display:out.display,resultAst:finiteResultAst(out.ast),variable:request.variable,assumptions:request.assumptions??[],warnings:out.warnings,steps:[],sections:out.sections,createdAt:Date.now()};}
function isJoint(node:AstNode):boolean{return node.type==='call'&&node.name==='jointpmf';}

export class E6MathEngine extends E5MathEngine{
  async execute(request:MathOperationRequest):Promise<MathResult>{
    const ast=requestAst(request);
    if(DISTRIBUTION_OPERATIONS.has(request.operation)&&isE6DistributionCall(ast)){
      if(request.operation==='distribution-profile')return result(request,advancedDistributionProfile(ast));
      if(request.operation==='distribution-probability')return result(request,advancedDistributionProbability(ast,textOption(request,'event')??'le',textOption(request,'value'),textOption(request,'lower'),textOption(request,'upper')));
      if(request.operation==='distribution-quantile'){
        const probability=textOption(request,'probability')??'0.5';
        validateContinuousQuantileProbability(probability);
        return result(request,advancedDistributionQuantile(ast,probability));
      }
      if(request.operation==='sampling-mean-profile')return result(request,advancedSamplingMean(ast,numberOption(request,'sampleSize',30)!));
      if(request.operation==='simulate-distribution')return result(request,simulateAdvancedDistribution(ast,numberOption(request,'count',1000)!,numberOption(request,'seed',42)!));
    }
    if(request.operation==='distribution-profile'&&isJoint(ast))return result(request,jointDistributionProfile(ast));
    if(!E6_OPERATIONS.has(request.operation))return super.execute(request);
    validateE6MatrixOperation(request.operation,ast);
    const confidence=numberOption(request,'confidence',0.95)!;
    const nullValue=numberOption(request,'nullValue',0)!;
    const alternative=(textOption(request,'alternative')??'two-sided') as 'two-sided'|'less'|'greater';
    switch(request.operation){
      case'joint-distribution-profile':return result(request,jointDistributionProfile(ast));
      case'affine-rv-transform':return result(request,affineRandomVariable(ast,numberOption(request,'scale',1)!,numberOption(request,'shift',0)!));
      case'covariance-correlation-matrix':return result(request,covarianceCorrelationMatrix(ast));
      case'two-sample-mean-inference':return result(request,twoSampleMeanInference(ast,confidence,nullValue,alternative));
      case'paired-mean-inference':return result(request,pairedMeanInference(ast,confidence,nullValue,alternative));
      case'two-proportion-inference':return result(request,twoProportionInference(ast,confidence,nullValue,alternative));
      case'chi-square-goodness':return result(request,chiSquareGoodness(ast,textOption(request,'expected')??''));
      case'chi-square-independence':return result(request,chiSquareIndependence(ast));
      case'one-way-anova':return result(request,oneWayAnova(ast));
      case'multiple-linear-regression':return result(request,multipleLinearRegression(ast));
      case'regression-diagnostics':return result(request,regressionDiagnostics(ast));
      case'mann-whitney':return result(request,mannWhitney(ast));
      case'wilcoxon-signed-rank':return result(request,wilcoxonSignedRank(ast));
      case'bootstrap-mean':return result(request,bootstrapMean(ast,numberOption(request,'count',2000)!,confidence,numberOption(request,'seed',42)!));
      case'markov-profile':return result(request,markovProfile(ast));
      case'markov-step':return result(request,markovStep(ast,textOption(request,'initial')??'',numberOption(request,'steps',1)!));
      default:return super.execute(request);
    }
  }
}

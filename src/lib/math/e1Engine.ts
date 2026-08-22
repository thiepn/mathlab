import type { AstNode } from './ast';
import { astToPlainText } from './format';
import { LocalMathEngine } from './localEngine';
import {
  criticalPointAnalysis,
  directionalDerivative,
  evaluateAtPoint,
  functionParametersFromSource,
  gradient,
  hessian,
  jacobian,
  lagrangeMultipliers,
  linearization,
  mixedPartialDerivative,
  parseCoordinateList,
  partialDerivative,
  pointDisplay,
  scalarFunctionValue,
  substituteExternalBindings,
  tangentPlane,
} from './multivariable';
import type { DerivationStep, MathOperationRequest, MathResult, MathResultSection } from './types';

const E1_OPERATIONS = new Set([
  'partial-derivative','mixed-partial','gradient','jacobian','hessian','directional-derivative','linearization','tangent-plane','multivariable-critical-points','second-derivative-test','lagrange-multipliers',
]);

function toSteps(steps: Array<{ beforeAst: AstNode; afterAst: AstNode; rule: string; explanation: string }>): DerivationStep[] {
  return steps.map((step, index) => ({ id:`step-${index+1}`, before:astToPlainText(step.beforeAst), after:astToPlainText(step.afterAst), beforeAst:step.beforeAst, afterAst:step.afterAst, rule:step.rule, explanation:step.explanation, verified:true }));
}
function section(id:string,title:string,facts:MathResultSection['facts'],description?:string):MathResultSection { return {id,title,facts,description}; }
function makeResult(request:MathOperationRequest,resultAst:AstNode|undefined,steps:DerivationStep[],warnings:string[]=[],sections?:MathResultSection[],displayOverride?:string):MathResult {
  const display=displayOverride??(resultAst?astToPlainText(resultAst):'');
  return {id:request.id,operation:request.operation,input:request.input,exactness:'exact',value:display,display,resultAst,variable:request.variable,assumptions:request.assumptions??[],warnings,steps,sections,createdAt:Date.now()};
}
function requestValueAst(request:MathOperationRequest):AstNode { if(!request.ast)throw new Error('E1 requires a resolved scalar or vector-valued mathematical object.'); return request.ast.type==='definition'?request.ast.right:request.ast; }
function parametersFor(request:MathOperationRequest,ast:AstNode):string[] { const parameters=functionParametersFromSource(request.input,ast); if(parameters.length<2)throw new Error('E1 multivariable calculus requires at least two independent variables. Define f(x,y)=… or enter an expression containing two free variables.'); if(parameters.length>6)throw new Error('E1 derivative tensors are bounded to at most six independent variables to keep exact symbolic results inspectable.'); return parameters; }
function prepared(request:MathOperationRequest):{ast:AstNode;parameters:string[]} { const raw=requestValueAst(request); const parameters=parametersFor(request,raw); return {ast:substituteExternalBindings(raw,parameters,request.bindings),parameters}; }
function mixedVariables(source:string,parameters:string[]):string[] { const parsed=source.split(/[,\s→>]+/).map((item)=>item.trim()).filter(Boolean); return parsed.length?parsed:parameters.slice(0,2); }

export class E1MathEngine extends LocalMathEngine {
  async execute(request: MathOperationRequest): Promise<MathResult> {
    if (request.operation === 'evaluate-function') {
      const raw=request.ast?(request.ast.type==='definition'?request.ast.right:request.ast):undefined;
      if(raw){ const parameters=functionParametersFromSource(request.input,raw); if(parameters.length>1){ const ast=substituteExternalBindings(raw,parameters,request.bindings); const pointSource=String(request.options?.value??'').trim(); if(!pointSource)throw new Error(`Enter ${parameters.length} coordinates in parameter order: ${parameters.join(', ')}.`); const point=parseCoordinateList(pointSource,parameters.length,'function input'); const evaluated=evaluateAtPoint(ast,parameters,point); return makeResult(request,evaluated,[],[],[section('evaluation-point','Evaluation point',[{label:'Point',display:pointDisplay(parameters,point),ast:{type:'matrix',rows:[point]}}])]); } }
      return super.execute(request);
    }
    if(!E1_OPERATIONS.has(request.operation))return super.execute(request);
    const {ast,parameters}=prepared(request);
    switch(request.operation){
      case 'partial-derivative': { const variable=String(request.options?.partialVariable??parameters[0]); const transformed=partialDerivative(ast,parameters,variable); return makeResult(request,transformed.ast,toSteps(transformed.steps),transformed.warnings,[section('partial','Partial derivative',[{label:'Variable',display:variable},{label:`∂/∂${variable}`,display:astToPlainText(transformed.ast),ast:transformed.ast}],'All other independent variables are held constant.')]); }
      case 'mixed-partial': { const variables=mixedVariables(String(request.options?.partialVariables??''),parameters); const transformed=mixedPartialDerivative(ast,parameters,variables); return makeResult(request,transformed.ast,toSteps(transformed.steps),transformed.warnings,[section('mixed','Mixed partial derivative',[{label:'Order',display:variables.join(' → ')},{label:'Result',display:astToPlainText(transformed.ast),ast:transformed.ast}])]); }
      case 'gradient': { const transformed=gradient(ast,parameters); return makeResult(request,transformed.ast,toSteps(transformed.steps),transformed.warnings,[section('gradient','Gradient',parameters.map((parameter,index)=>({label:`∂f/∂${parameter}`,display:transformed.ast.type==='matrix'?astToPlainText(transformed.ast.rows[0][index]):'',ast:transformed.ast.type==='matrix'?transformed.ast.rows[0][index]:undefined}))) ]); }
      case 'jacobian': { const transformed=jacobian(ast,parameters); return makeResult(request,transformed.ast,toSteps(transformed.steps),transformed.warnings,[section('jacobian','Jacobian matrix',[{label:'J',display:astToPlainText(transformed.ast),ast:transformed.ast}],scalarFunctionValue(ast)?'For a scalar-valued function the Jacobian is the 1×n derivative row.':'Rows correspond to output components; columns follow parameter order.')]); }
      case 'hessian': { const transformed=hessian(ast,parameters); return makeResult(request,transformed.ast,toSteps(transformed.steps),transformed.warnings,[section('hessian','Hessian matrix',[{label:'H',display:astToPlainText(transformed.ast),ast:transformed.ast}],`Rows and columns follow ${parameters.join(', ')}.`)]); }
      case 'directional-derivative': { const point=String(request.options?.point??'').trim(); const direction=String(request.options?.direction??'').trim(); if(!point||!direction)throw new Error('Directional derivative requires both a point and a nonzero direction vector.'); const transformed=directionalDerivative(ast,parameters,point,direction); return makeResult(request,transformed.ast,toSteps(transformed.steps),transformed.warnings,[section('directional','Directional derivative',[{label:'Point',display:point},{label:'Direction',display:direction},{label:'Dᵤf',display:astToPlainText(transformed.ast),ast:transformed.ast}])]); }
      case 'linearization': { const point=String(request.options?.point??'').trim(); if(!point)throw new Error('Linearization requires a base point.'); const transformed=linearization(ast,parameters,point); return makeResult(request,transformed.ast,toSteps(transformed.steps),transformed.warnings,[section('linearization','First-order linearization',[{label:'L',display:astToPlainText(transformed.ast),ast:transformed.ast}],`Built from f(a) + ∇f(a)·(x−a) at (${point}).`)]); }
      case 'tangent-plane': { const point=String(request.options?.point??'').trim(); if(!point)throw new Error('Tangent plane requires a point in the xy-plane.'); const transformed=tangentPlane(ast,parameters,point); return makeResult(request,transformed.ast,toSteps(transformed.steps),transformed.warnings,[section('tangent-plane','Tangent plane',[{label:'Plane',display:astToPlainText(transformed.ast),ast:transformed.ast}])]); }
      case 'multivariable-critical-points':
      case 'second-derivative-test': { const analysis=criticalPointAnalysis(ast,parameters); const facts=analysis.records.flatMap((record,index)=>[{label:`Point ${index+1}`,display:pointDisplay(parameters,record.point),ast:{type:'matrix',rows:[record.point]} as AstNode},{label:`f at point ${index+1}`,display:astToPlainText(record.value),ast:record.value},{label:`Classification ${index+1}`,display:record.classification,tone:record.classification==='local minimum'||record.classification==='local maximum'?'positive' as const:record.classification==='saddle point'?'warning' as const:'neutral' as const},...(record.hessianDeterminant?[{label:`det H ${index+1}`,display:astToPlainText(record.hessianDeterminant),ast:record.hessianDeterminant}]:[])]); return makeResult(request,analysis.pointsAst,toSteps(analysis.steps),analysis.warnings,[section('critical-points',request.operation==='second-derivative-test'?'Second-derivative classification':'Critical points',facts,'Exact solving is bounded to separable degree-2 gradient equations or coupled linear gradient systems.')]); }
      case 'lagrange-multipliers': { const constraint=String(request.options?.constraint??'').trim(); if(!constraint)throw new Error('Enter one equality constraint, for example x + y = 1.'); const analysis=lagrangeMultipliers(ast,parameters,constraint); return makeResult(request,analysis.resultAst,toSteps(analysis.steps),analysis.warnings,[section('lagrange','Lagrange stationary point',[{label:'Constraint',display:astToPlainText(analysis.constraintAst),ast:analysis.constraintAst},{label:'Point',display:pointDisplay(parameters,analysis.point),ast:{type:'matrix',rows:[analysis.point]}},{label:'lambda',display:astToPlainText(analysis.lambda),ast:analysis.lambda},{label:'Objective value',display:astToPlainText(analysis.objectiveValue),ast:analysis.objectiveValue}],'E1 solves the exact stationarity system when it reduces to a unique linear system.')]); }
      default:return super.execute(request);
    }
  }
}

import type { AstNode } from './ast';
import { astToPlainText } from './format';
import { E1MathEngine } from './e1Engine';
import { functionParametersFromSource, scalarFunctionValue, substituteExternalBindings } from './multivariable';
import type { DerivationStep, Exactness, MathOperationRequest, MathResult, MathResultSection } from './types';
import {
  coordinateTransform,
  curl,
  divergence,
  fluxIntegral,
  integralDisplay,
  integrateIterated,
  lineIntegral,
  parseIteratedBounds,
  scalarPotential,
  scalarSurfaceIntegral,
  transformedCoordinateEquations,
  vectorFieldProfile,
  verifyGauss,
  verifyGreen,
  verifyStokes,
  type CoordinateSystem,
  type E2Exactness,
  type IntegrationOutcome,
  type TheoremVerification,
} from './vectorCalculus';

const E2_OPERATIONS = new Set([
  'coordinate-transform','double-integral','triple-integral','vector-field-profile','divergence','curl','conservative-field','scalar-potential',
  'line-integral','scalar-line-integral','surface-integral','flux-integral','green-theorem','gauss-theorem','stokes-theorem',
]);

function toSteps(steps: Array<{ beforeAst: AstNode; afterAst: AstNode; rule: string; explanation: string }>): DerivationStep[] {
  return steps.map((step,index)=>({id:`e2-step-${index+1}`,before:astToPlainText(step.beforeAst),after:astToPlainText(step.afterAst),beforeAst:step.beforeAst,afterAst:step.afterAst,rule:step.rule,explanation:step.explanation,verified:true}));
}
function section(id:string,title:string,facts:MathResultSection['facts'],description?:string):MathResultSection{return{id,title,facts,description};}
function exactness(value:E2Exactness):Exactness{return value==='exact'?'exact':'approximate';}
function makeResult(request:MathOperationRequest,resultAst:AstNode|undefined,display:string,quality:Exactness,steps:DerivationStep[]=[],warnings:string[]=[],sections?:MathResultSection[]):MathResult{
  return{id:request.id,operation:request.operation,input:request.input,exactness:quality,value:display,display,resultAst,variable:request.variable,assumptions:request.assumptions??[],warnings,steps,sections,createdAt:Date.now()};
}
function requestValueAst(request:MathOperationRequest):AstNode{if(!request.ast)throw new Error('E2 requires a resolved scalar or vector-valued function/expression.');return request.ast.type==='definition'?request.ast.right:request.ast;}
function prepared(request:MathOperationRequest):{ast:AstNode;parameters:string[]}{const raw=requestValueAst(request);const parameters=functionParametersFromSource(request.input,raw);if(parameters.length<2)throw new Error('E2 requires at least two independent coordinate variables.');if(parameters.length>3)throw new Error('E2 integration and vector-calculus geometry is currently bounded to two or three dimensions.');return{ast:substituteExternalBindings(raw,parameters,request.bindings),parameters};}
function textOption(request:MathOperationRequest,name:string,fallback=''):string{return String(request.options?.[name]??fallback).trim();}
function numberOption(request:MathOperationRequest,name:string,fallback:number):number{const value=Number(request.options?.[name]??fallback);return Number.isFinite(value)?value:fallback;}
function coordinateOption(request:MathOperationRequest,fallback:CoordinateSystem='cartesian'):CoordinateSystem{const value=textOption(request,'coordinate',fallback) as CoordinateSystem;return ['cartesian','polar','cylindrical','spherical'].includes(value)?value:fallback;}

function integrationSections(outcome:IntegrationOutcome,title:string):MathResultSection[]{
  return[
    section('region','Integration region',outcome.bounds.map((bound)=>({label:bound.variable,display:`${astToPlainText(bound.lower)} ≤ ${bound.variable} ≤ ${astToPlainText(bound.upper)}`})),`Nested order is inner → outer: ${outcome.bounds.map((bound)=>bound.variable).join(' → ')}.`),
    section('integrand',title,[{label:'Integrand',display:astToPlainText(outcome.integrandAst),ast:outcome.integrandAst},{label:'Result',display:astToPlainText(outcome.ast),ast:outcome.ast}]),
  ];
}

function doubleIntegral(request:MathOperationRequest,ast:AstNode,parameters:string[]):MathResult{
  if(!scalarFunctionValue(ast)||parameters.length!==2)throw new Error('Double integral requires a scalar function/expression of exactly two variables.');
  const system=coordinateOption(request,'cartesian');
  if(system==='cylindrical'||system==='spherical')throw new Error('Double integrals support Cartesian or polar coordinates.');
  const panels=numberOption(request,'panels',16);
  let integrand=ast;let variables=[...parameters];const warnings:string[]=[];let transformSection:MathResultSection|undefined;
  if(system==='polar'){
    const transformed=coordinateTransform(ast,parameters,'polar');integrand=transformed.ast;variables=transformed.variables;warnings.push(...transformed.warnings);
    transformSection=section('coordinate-transform','Polar transformation',[{label:'Map',display:astToPlainText(transformedCoordinateEquations(transformed)),ast:transformedCoordinateEquations(transformed)},{label:'Jacobian',display:astToPlainText(transformed.jacobian),ast:transformed.jacobian},{label:'Transformed integrand × Jacobian',display:astToPlainText(transformed.ast),ast:transformed.ast}]);
  }else{
    const inner=textOption(request,'innerVariable',parameters[0]);const outer=textOption(request,'outerVariable',parameters.find((item)=>item!==inner)??parameters[1]);variables=[inner,outer];
    if(new Set(variables).size!==2||variables.some((item)=>!parameters.includes(item)))throw new Error(`Integration order must use ${parameters.join(' and ')} exactly once.`);
  }
  const bounds=parseIteratedBounds([{variable:variables[0],lower:textOption(request,'innerLower','0'),upper:textOption(request,'innerUpper','1')},{variable:variables[1],lower:textOption(request,'outerLower','0'),upper:textOption(request,'outerUpper',system==='polar'?'2*pi':'1')}]);
  const outcome=integrateIterated(integrand,bounds,panels);const allWarnings=[...warnings,...outcome.warnings];
  return makeResult(request,outcome.ast,astToPlainText(outcome.ast),exactness(outcome.exactness),toSteps(outcome.steps),allWarnings,[...(transformSection?[transformSection]:[]),...integrationSections(outcome,'Double integral')]);
}

function tripleIntegral(request:MathOperationRequest,ast:AstNode,parameters:string[]):MathResult{
  if(!scalarFunctionValue(ast)||parameters.length!==3)throw new Error('Triple integral requires a scalar function/expression of exactly three variables.');
  const system=coordinateOption(request,'cartesian');if(system==='polar')throw new Error('Use cylindrical coordinates for three-dimensional radial integration.');
  const panels=numberOption(request,'panels',8);let integrand=ast;let variables=[...parameters];const warnings:string[]=[];let transformSection:MathResultSection|undefined;
  if(system!=='cartesian'){
    const transformed=coordinateTransform(ast,parameters,system);integrand=transformed.ast;variables=transformed.variables;warnings.push(...transformed.warnings);
    transformSection=section('coordinate-transform',`${system[0].toUpperCase()+system.slice(1)} transformation`,[{label:'Map',display:astToPlainText(transformedCoordinateEquations(transformed)),ast:transformedCoordinateEquations(transformed)},{label:'Jacobian',display:astToPlainText(transformed.jacobian),ast:transformed.jacobian},{label:'Transformed integrand × Jacobian',display:astToPlainText(transformed.ast),ast:transformed.ast}]);
  }else{
    const first=textOption(request,'innerVariable',parameters[0]);const second=textOption(request,'middleVariable',parameters.find((item)=>item!==first)??parameters[1]);const third=textOption(request,'outerVariable',parameters.find((item)=>item!==first&&item!==second)??parameters[2]);variables=[first,second,third];
    if(new Set(variables).size!==3||variables.some((item)=>!parameters.includes(item)))throw new Error(`Integration order must use ${parameters.join(', ')} exactly once.`);
  }
  const defaults=system==='spherical'?['0','1','0','pi','0','2*pi']:system==='cylindrical'?['0','1','0','2*pi','0','1']:['0','1','0','1','0','1'];
  const bounds=parseIteratedBounds([
    {variable:variables[0],lower:textOption(request,'innerLower',defaults[0]),upper:textOption(request,'innerUpper',defaults[1])},
    {variable:variables[1],lower:textOption(request,'middleLower',defaults[2]),upper:textOption(request,'middleUpper',defaults[3])},
    {variable:variables[2],lower:textOption(request,'outerLower',defaults[4]),upper:textOption(request,'outerUpper',defaults[5])},
  ]);
  const outcome=integrateIterated(integrand,bounds,panels);return makeResult(request,outcome.ast,astToPlainText(outcome.ast),exactness(outcome.exactness),toSteps(outcome.steps),[...warnings,...outcome.warnings],[...(transformSection?[transformSection]:[]),...integrationSections(outcome,'Triple integral')]);
}

function theoremResult(request:MathOperationRequest,verification:TheoremVerification):MathResult{
  const equality:AstNode={type:'equation',left:verification.left,right:verification.right};
  const title=`${verification.theorem} theorem verification`;
  return makeResult(request,equality,astToPlainText(equality),exactness(verification.exactness),toSteps(verification.steps),verification.warnings,[
    section('theorem',title,[{label:'Boundary / flux side',display:astToPlainText(verification.left),ast:verification.left},{label:'Derivative / region side',display:astToPlainText(verification.right),ast:verification.right},{label:'Difference',display:astToPlainText(verification.difference),ast:verification.difference},{label:'Verdict',display:verification.verified?'VERIFIED':'NOT VERIFIED',tone:verification.verified?'positive':'warning'}],verification.exactness==='exact'?'Both sides were computed symbolically within the supported E2 region boundary.':'At least one side used deterministic Simpson approximation; the comparison uses a numerical tolerance.'),
  ]);
}

export class E2MathEngine extends E1MathEngine{
  async execute(request:MathOperationRequest):Promise<MathResult>{
    if(!E2_OPERATIONS.has(request.operation))return super.execute(request);
    const{ast,parameters}=prepared(request);
    switch(request.operation){
      case 'coordinate-transform':{
        if(!scalarFunctionValue(ast))throw new Error('Coordinate transformation currently targets scalar integrands.');
        const system=coordinateOption(request,parameters.length===2?'polar':'cylindrical');if(system==='cartesian')throw new Error('Choose polar, cylindrical, or spherical coordinates to build a transformed integrand.');
        const transformed=coordinateTransform(ast,parameters,system);
        return makeResult(request,transformed.ast,astToPlainText(transformed.ast),'exact',[],transformed.warnings,[section('map','Coordinate map',[{label:'Substitution',display:astToPlainText(transformedCoordinateEquations(transformed)),ast:transformedCoordinateEquations(transformed)},{label:'Jacobian',display:astToPlainText(transformed.jacobian),ast:transformed.jacobian},{label:'Transformed integrand',display:astToPlainText(transformed.transformedIntegrand),ast:transformed.transformedIntegrand},{label:'Integrand × Jacobian',display:astToPlainText(transformed.ast),ast:transformed.ast}])]);
      }
      case 'double-integral':return doubleIntegral(request,ast,parameters);
      case 'triple-integral':return tripleIntegral(request,ast,parameters);
      case 'vector-field-profile':{
        const profile=vectorFieldProfile(ast,parameters);return makeResult(request,undefined,`${profile.dimension}D vector field profile`,'exact',[],profile.warnings,[section('field','Vector field',[{label:'Dimension',display:`${profile.dimension}D`},{label:'Components',display:astToPlainText({type:'matrix',rows:[profile.components]}),ast:{type:'matrix',rows:[profile.components]}},{label:'Divergence',display:astToPlainText(profile.divergence),ast:profile.divergence},{label:'Curl',display:astToPlainText(profile.curl),ast:profile.curl},{label:'Conservative test',display:profile.conservative?'curl = 0 · conservative candidate':'curl ≠ 0 · not conservative',tone:profile.conservative?'positive':'warning'},...(profile.potential?[{label:'Potential',display:astToPlainText(profile.potential),ast:profile.potential}]:[])] ,'Curl = 0 is interpreted on the represented domain; topology/domain holes can matter for global conservativity.')]);
      }
      case 'divergence':{const out=divergence(ast,parameters);return makeResult(request,out.ast,astToPlainText(out.ast),'exact',toSteps(out.steps),out.warnings,[section('divergence','Divergence',[{label:'∇·F',display:astToPlainText(out.ast),ast:out.ast}])]);}
      case 'curl':{const out=curl(ast,parameters);return makeResult(request,out.ast,astToPlainText(out.ast),'exact',toSteps(out.steps),out.warnings,[section('curl','Curl',[{label:parameters.length===2?'scalar curl':'∇×F',display:astToPlainText(out.ast),ast:out.ast}])]);}
      case 'conservative-field':{
        const profile=vectorFieldProfile(ast,parameters);return makeResult(request,profile.potential,profile.conservative?'Conservative field candidate':'Not conservative','exact',[],profile.warnings,[section('conservative','Conservative-field test',[{label:'Curl',display:astToPlainText(profile.curl),ast:profile.curl},{label:'Verdict',display:profile.conservative?'curl = 0':'curl ≠ 0',tone:profile.conservative?'positive':'negative'},...(profile.potential?[{label:'Potential',display:astToPlainText(profile.potential),ast:profile.potential}]:[])],'A zero curl certifies local conservativity on regular regions; global topology still matters.')]);
      }
      case 'scalar-potential':{
        const out=scalarPotential(ast,parameters);return makeResult(request,out.ast,astToPlainText(out.ast),'exact',toSteps(out.steps),out.warnings,[section('potential','Scalar potential',[{label:'φ',display:astToPlainText(out.ast),ast:out.ast},{label:'Verification',display:'∇φ reproduces every field component',tone:'positive'}])]);
      }
      case 'line-integral':
      case 'scalar-line-integral':{
        const curve=textOption(request,'curve',parameters.length===2?'[t,t^2]':'[t,t^2,0]');const curveParameter=textOption(request,'curveParameter','t');const lower=textOption(request,'lower','0');const upper=textOption(request,'upper','1');const out=lineIntegral(ast,parameters,curve,curveParameter,lower,upper,request.operation==='scalar-line-integral',numberOption(request,'panels',16));
        return makeResult(request,out.ast,astToPlainText(out.ast),exactness(out.exactness),toSteps(out.steps),out.warnings,[section('curve',request.operation==='scalar-line-integral'?'Scalar line integral':'Work / circulation line integral',[{label:'Curve',display:curve},{label:'Parameter interval',display:`${lower} ≤ ${curveParameter} ≤ ${upper}`},{label:'Pulled-back integrand',display:astToPlainText(out.integrandAst),ast:out.integrandAst},{label:'Integral',display:astToPlainText(out.ast),ast:out.ast}])]);
      }
      case 'surface-integral':
      case 'flux-integral':{
        const surface=textOption(request,'surface',`${parameters[2]??'z'} = 0`);const xl=textOption(request,'xLower','0');const xu=textOption(request,'xUpper','1');const yl=textOption(request,'yLower','0');const yu=textOption(request,'yUpper','1');const panels=numberOption(request,'panels',16);
        const out=request.operation==='flux-integral'?fluxIntegral(ast,parameters,surface,xl,xu,yl,yu,textOption(request,'orientation','up')==='down'?'down':'up',panels):scalarSurfaceIntegral(ast,parameters,surface,xl,xu,yl,yu,panels);
        return makeResult(request,out.ast,astToPlainText(out.ast),exactness(out.exactness),toSteps(out.steps),out.warnings,[section('surface',request.operation==='flux-integral'?'Flux through graph surface':'Scalar surface integral',[{label:'Surface',display:surface},{label:'Base rectangle',display:`${parameters[0]}: ${xl}..${xu}; ${parameters[1]}: ${yl}..${yu}`},{label:'Surface integrand',display:astToPlainText(out.integrandAst),ast:out.integrandAst},{label:'Integral',display:astToPlainText(out.ast),ast:out.ast}])]);
      }
      case 'green-theorem':return theoremResult(request,verifyGreen(ast,parameters,textOption(request,'xLower','0'),textOption(request,'xUpper','1'),textOption(request,'yLower','0'),textOption(request,'yUpper','1'),numberOption(request,'panels',16)));
      case 'gauss-theorem':return theoremResult(request,verifyGauss(ast,parameters,textOption(request,'xLower','0'),textOption(request,'xUpper','1'),textOption(request,'yLower','0'),textOption(request,'yUpper','1'),textOption(request,'zLower','0'),textOption(request,'zUpper','1'),numberOption(request,'panels',8)));
      case 'stokes-theorem':return theoremResult(request,verifyStokes(ast,parameters,textOption(request,'surface',`${parameters[2]} = 0`),textOption(request,'xLower','0'),textOption(request,'xUpper','1'),textOption(request,'yLower','0'),textOption(request,'yUpper','1'),textOption(request,'orientation','up')==='down'?'down':'up',numberOption(request,'panels',16)));
      default:return super.execute(request);
    }
  }
}

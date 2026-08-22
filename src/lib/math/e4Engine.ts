import type { AstNode } from './ast';
import { substituteAst } from './algebra';
import { E2MathEngine } from './e2Engine';
import {
  adaptiveOdeSolve,
  convertOdeToSystem,
  equilibriumProfile,
  odeIntrinsicSymbols,
  odeLinearization,
  odeProfile,
  odeStability,
  symbolicOdeSolve,
  type OdeTransform,
} from './e4Ode';
import type { MathOperationRequest, MathResult } from './types';

const E4_OPERATIONS = new Set([
  'ode-profile','ode-symbolic-solve','ode-to-system','ode-equilibria','ode-linearize','ode-stability','ode-adaptive-solve',
]);

function requestAst(request:MathOperationRequest):AstNode {
  if(!request.ast)throw new Error('E4 requires a resolved ODE object.');
  let ast=request.ast.type==='definition'?request.ast.right:request.ast;
  const protectedNames=new Set(odeIntrinsicSymbols(ast));
  for(const binding of request.bindings??[]){if(!protectedNames.has(binding.name))ast=substituteAst(ast,binding.name,binding.ast);}
  return ast;
}
function numberOption(request:MathOperationRequest,name:string):number|undefined {
  const raw=request.options?.[name];if(raw===undefined||raw==='')return undefined;const value=Number(raw);return Number.isFinite(value)?value:undefined;
}
function textOption(request:MathOperationRequest,name:string):string|undefined {
  const raw=request.options?.[name];if(raw===undefined)return undefined;const value=String(raw).trim();return value||undefined;
}
function result(request:MathOperationRequest,out:OdeTransform):MathResult {
  return{id:request.id,operation:request.operation,input:request.input,exactness:out.exactness,value:out.display,display:out.display,resultAst:out.ast,variable:request.variable,assumptions:request.assumptions??[],warnings:out.warnings,steps:out.steps,sections:out.sections,createdAt:Date.now()};
}

export class E4MathEngine extends E2MathEngine {
  async execute(request:MathOperationRequest):Promise<MathResult> {
    if(!E4_OPERATIONS.has(request.operation))return super.execute(request);
    const ast=requestAst(request);
    switch(request.operation){
      case 'ode-profile':return result(request,odeProfile(ast));
      case 'ode-symbolic-solve':return result(request,symbolicOdeSolve(ast));
      case 'ode-to-system':return result(request,convertOdeToSystem(ast));
      case 'ode-equilibria':return result(request,equilibriumProfile(ast));
      case 'ode-linearize':return result(request,odeLinearization(ast,textOption(request,'point')));
      case 'ode-stability':return result(request,odeStability(ast,textOption(request,'point')));
      case 'ode-adaptive-solve':return result(request,adaptiveOdeSolve(ast,{endpoint:numberOption(request,'endpoint'),tolerance:numberOption(request,'tolerance'),maxStep:numberOption(request,'maxStep'),minStep:numberOption(request,'minStep'),event:textOption(request,'event')}));
      default:return super.execute(request);
    }
  }
}

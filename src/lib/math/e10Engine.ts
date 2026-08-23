import type { AstNode } from './ast';
import { E9MathEngine } from './e9Engine';
import { substituteBindings } from './e5NumericalOptimization';
import { groupHomomorphismProfile, groupProfile, ringProfile, subgroupCheck } from './e10FiniteAlgebra';
import { affineHullProfile, geometryProfile, metricBall, metricSpaceProfile, pointDistanceMatrix, pointSetProfile, topologyProfile, topologySubsetProfile } from './e10GeometryTopology';
import { pdeModalSolution, pdeProfile, pdeSeparationTemplate } from './e10Pde';
import type { E10Transform } from './e10Types';
import type { MathOperationRequest, MathResult } from './types';

const E10_OPERATIONS = new Set([
  'pde-profile','pde-separation-template','pde-modal-solution',
  'finite-group-profile','subgroup-check','finite-ring-profile','group-homomorphism-profile',
  'metric-space-profile','metric-ball','finite-topology-profile','topology-subset-profile',
  'point-set-profile','point-distance-matrix','affine-hull-profile','geometry-profile',
]);

function requestAst(request: MathOperationRequest): AstNode {
  if (!request.ast) throw new Error('E10 requires a resolved mathematical object.');
  const ast = request.ast.type === 'definition' ? request.ast.right : request.ast;
  return substituteBindings(ast, request.bindings ?? [], []);
}
function textOption(request:MathOperationRequest,name:string,fallback=''):string{const raw=request.options?.[name];return raw===undefined?fallback:String(raw).trim();}
function integerOption(request:MathOperationRequest,name:string,fallback:number):number{const raw=request.options?.[name],value=raw===undefined||raw===''?fallback:Number(raw);if(!Number.isSafeInteger(value))throw new Error(`${name} must be a safe integer.`);return value;}
function booleanOption(request:MathOperationRequest,name:string,fallback=false):boolean{const raw=request.options?.[name];if(raw===undefined)return fallback;return raw===true||raw==='true';}
function result(request: MathOperationRequest, out: E10Transform): MathResult {
  return { id:request.id, operation:request.operation, input:request.input, exactness:out.exactness, value:out.display, display:out.display, resultAst:out.ast, variable:request.variable, assumptions:request.assumptions??[], warnings:out.warnings, steps:out.steps, sections:out.sections, createdAt:Date.now() };
}

export class E10MathEngine extends E9MathEngine {
  async execute(request: MathOperationRequest): Promise<MathResult> {
    if(!E10_OPERATIONS.has(request.operation))return super.execute(request);
    const ast=requestAst(request);
    switch(request.operation){
      case 'pde-profile': return result(request,pdeProfile(ast));
      case 'pde-separation-template': return result(request,pdeSeparationTemplate(ast));
      case 'pde-modal-solution': return result(request,pdeModalSolution(ast));
      case 'finite-group-profile': return result(request,groupProfile(ast));
      case 'subgroup-check': return result(request,subgroupCheck(ast,textOption(request,'subset','set(1)')||'set(1)'));
      case 'finite-ring-profile': return result(request,ringProfile(ast));
      case 'group-homomorphism-profile': return result(request,groupHomomorphismProfile(ast));
      case 'metric-space-profile': return result(request,metricSpaceProfile(ast));
      case 'metric-ball': return result(request,metricBall(ast,integerOption(request,'center',1),textOption(request,'radius','1')||'1',booleanOption(request,'closed',false)));
      case 'finite-topology-profile': return result(request,topologyProfile(ast));
      case 'topology-subset-profile': return result(request,topologySubsetProfile(ast,textOption(request,'subset','set(1)')||'set(1)'));
      case 'point-set-profile': return result(request,pointSetProfile(ast));
      case 'point-distance-matrix': return result(request,pointDistanceMatrix(ast));
      case 'affine-hull-profile': return result(request,affineHullProfile(ast));
      case 'geometry-profile': return result(request,geometryProfile(ast));
      default: return super.execute(request);
    }
  }
}

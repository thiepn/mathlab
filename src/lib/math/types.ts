import type { AstNode } from './ast';

export type MathDomain = 'natural' | 'integer' | 'rational' | 'real' | 'complex' | 'boolean' | 'unknown';

export type MathObjectKind =
  | 'scalar'
  | 'expression'
  | 'equation'
  | 'inequality'
  | 'system'
  | 'function'
  | 'vector'
  | 'matrix'
  | 'sequence'
  | 'dataset'
  | 'distribution'
  | 'probability'
  | 'proposition'
  | 'finite-set'
  | 'relation'
  | 'graph'
  | 'recurrence'
  | 'complexity'
  | 'combinatorics'
  | 'ode'
  | 'unknown';

export type MathShape =
  | { type: 'scalar' }
  | { type: 'vector'; length: number }
  | { type: 'matrix'; rows: number; columns: number }
  | { type: 'function'; arity: number }
  | { type: 'sequence'; index: string }
  | { type: 'dataset'; size: number }
  | { type: 'distribution'; family: string }
  | { type: 'probability' }
  | { type: 'proposition'; variables: number }
  | { type: 'finite-set'; size: number }
  | { type: 'relation'; size: number }
  | { type: 'graph'; vertices: number; edges: number; directed: boolean; weighted: boolean }
  | { type: 'recurrence'; order: number }
  | { type: 'complexity'; family: string }
  | { type: 'combinatorics' }
  | { type: 'ode'; variables: 2 }
  | { type: 'equation' }
  | { type: 'inequality' }
  | { type: 'system'; count: number }
  | { type: 'unknown' };

export interface MathObjectRef {
  id: string;
  name?: string;
  kind: MathObjectKind;
  domain: MathDomain;
  source: string;
  createdAt: number;
}

export type Exactness = 'exact' | 'approximate' | 'heuristic' | 'unknown';

export type AssumptionPredicate =
  | { type: 'domain'; domain: MathDomain }
  | { type: 'comparison'; operator: '>' | '>=' | '<' | '<=' | '!='; value: string }
  | { type: 'property'; property: 'positive' | 'nonnegative' | 'nonzero' | 'symmetric' | 'invertible' | 'orthogonal' | 'diagonalizable' | 'independent' };

export interface MathAssumption {
  id: string;
  label: string;
  source: 'user' | 'inferred' | 'operation';
  subject?: string;
  predicate?: AssumptionPredicate;
  createdAt?: number;
}

export interface SemanticMathObject extends MathObjectRef {
  ast: AstNode;
  valueAst: AstNode;
  shape: MathShape;
  exactness: Exactness;
  parameters: string[];
  variables: string[];
  dependencies: string[];
  assumptions: MathAssumption[];
  updatedAt: number;
  definitionStyle: 'explicit' | 'natural' | 'anonymous';
}

export type SemanticDiagnosticCode =
  | 'unresolved-symbol'
  | 'duplicate-parameter'
  | 'recursive-definition'
  | 'name-conflict'
  | 'invalid-definition-head'
  | 'assumption-parse-error'
  | 'assumption-conflict';

export interface SemanticDiagnostic {
  severity: 'error' | 'warning' | 'info';
  code: SemanticDiagnosticCode;
  message: string;
  symbol?: string;
}

export interface SemanticResolution {
  object: SemanticMathObject | null;
  diagnostics: SemanticDiagnostic[];
  isDefinition: boolean;
  shadowedObjectId?: string;
}

export type WorkspaceActivityType =
  | 'created'
  | 'updated'
  | 'renamed'
  | 'duplicated'
  | 'deleted'
  | 'assumption-added'
  | 'assumption-removed'
  | 'imported';

export interface WorkspaceActivity {
  id: string;
  type: WorkspaceActivityType;
  label: string;
  source?: string;
  objectId?: string;
  objectName?: string;
  createdAt: number;
}

export interface MathWorkspaceState {
  version: 3;
  objects: SemanticMathObject[];
  assumptions: MathAssumption[];
  activeObjectId?: string;
  pinnedObjectIds: string[];
  activity: WorkspaceActivity[];
  updatedAt: number;
}

export interface WorkspaceExport {
  format: 'mathlab-workspace';
  version: 1;
  exportedAt: number;
  workspace: MathWorkspaceState;
}

export interface DerivationStep {
  id: string;
  before: string;
  after: string;
  beforeAst?: AstNode;
  afterAst?: AstNode;
  rule: string;
  explanation?: string;
  assumptions?: MathAssumption[];
  verified: boolean;
  verificationStatus?: 'verified' | 'conditionally-valid' | 'invalid' | 'not-proven';
}

export interface MathResult<T = unknown> {
  id: string;
  operation: string;
  input: string;
  exactness: Exactness;
  value: T;
  display: string;
  resultAst?: AstNode;
  variable?: string;
  assumptions: MathAssumption[];
  warnings: string[];
  steps: DerivationStep[];
  sections?: MathResultSection[];
  createdAt: number;
}

export interface MathResultFact {
  label: string;
  display: string;
  ast?: AstNode;
  tone?: 'neutral' | 'positive' | 'negative' | 'warning';
}

export interface MathResultSection {
  id: string;
  title: string;
  description?: string;
  facts: MathResultFact[];
}

export interface MathOperationRequest {
  id: string;
  operation: string;
  input: string;
  ast?: AstNode;
  variable?: string;
  assumptions?: MathAssumption[];
  options?: Record<string, string | number | boolean>;
  bindings?: Array<{ name: string; ast: AstNode }>;
}

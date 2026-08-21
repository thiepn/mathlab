export type ComparisonOperator = '<' | '<=' | '>' | '>=' | '!=';

export type AstNode =
  | { type: 'number'; value: string }
  | { type: 'symbol'; name: string }
  | { type: 'unary'; operator: '+' | '-'; operand: AstNode }
  | { type: 'binary'; operator: '+' | '-' | '*' | '/' | '^'; left: AstNode; right: AstNode; implicit?: boolean }
  | { type: 'call'; name: string; args: AstNode[] }
  | { type: 'equation'; left: AstNode; right: AstNode }
  | { type: 'comparison'; operator: ComparisonOperator; left: AstNode; right: AstNode }
  | { type: 'definition'; left: AstNode; right: AstNode }
  | { type: 'matrix'; rows: AstNode[][] }
  | { type: 'system'; items: AstNode[] }
  | { type: 'set'; items: AstNode[] };

export interface ParsedMath {
  source: string;
  normalizedSource: string;
  ast: AstNode | null;
  diagnostics: ParseDiagnostic[];
  tokens: MathToken[];
}

export type DiagnosticCode =
  | 'unexpected-character'
  | 'unexpected-token'
  | 'expected-expression'
  | 'missing-closing-delimiter'
  | 'empty-group'
  | 'invalid-number'
  | 'invalid-matrix'
  | 'trailing-input'
  | 'invalid-definition';

export interface ParseDiagnostic {
  severity: 'error' | 'warning';
  code: DiagnosticCode;
  message: string;
  start: number;
  end: number;
}

export type MathTokenKind =
  | 'number' | 'identifier' | 'plus' | 'minus' | 'star' | 'slash' | 'caret'
  | 'equals' | 'define' | 'less' | 'less-equal' | 'greater' | 'greater-equal' | 'not-equal'
  | 'comma' | 'semicolon' | 'lparen' | 'rparen' | 'lbracket' | 'rbracket' | 'eof';

export interface MathToken {
  kind: MathTokenKind;
  text: string;
  start: number;
  end: number;
  implicit?: boolean;
}

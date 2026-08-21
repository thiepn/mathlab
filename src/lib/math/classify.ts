import type { AstNode, ParsedMath } from './ast';
import type { MathObjectKind } from './types';
import { parseMath } from './parser';

const DISTRIBUTIONS = new Set(['bernoulli','binomial','geometric','poisson','uniform','normal']);
const PROBABILITY_CALLS = new Set(['choose','permute','conditional','bayes','unionprob','independentjoint','complement']);
const LOGIC_CALLS = new Set(['not','and','or','xor','implies','iff']);
const GRAPH_CALLS = new Set(['graph','digraph','wgraph','wdigraph']);
const COMBINATORICS_CALLS = new Set(['multinomial','starsbars','derangements','stirling2','bell','pigeonhole']);

function rhsKind(node: AstNode): MathObjectKind {
  if (node.type === 'matrix') return node.rows.length === 1 ? 'vector' : 'matrix';
  if (node.type === 'number') return 'scalar';
  if (node.type === 'call' && node.name === 'data') return 'dataset';
  if (node.type === 'call' && DISTRIBUTIONS.has(node.name)) return 'distribution';
  if (node.type === 'call' && PROBABILITY_CALLS.has(node.name)) return 'probability';
  if (node.type === 'call' && LOGIC_CALLS.has(node.name)) return 'proposition';
  if (node.type === 'call' && node.name === 'set') return 'finite-set';
  if (node.type === 'call' && node.name === 'relation') return 'relation';
  if (node.type === 'call' && GRAPH_CALLS.has(node.name)) return 'graph';
  if (node.type === 'call' && (node.name === 'linrec' || node.name === 'linrec2')) return 'recurrence';
  if (node.type === 'call' && (node.name === 'complexity' || node.name === 'master')) return 'complexity';
  if (node.type === 'call' && COMBINATORICS_CALLS.has(node.name)) return 'combinatorics';
  if (node.type === 'call' && node.name === 'ivp') return 'ode';
  return 'expression';
}

function classifyAst(ast: AstNode | null, source: string): MathObjectKind {
  if (!ast) return 'unknown';
  if (ast.type === 'matrix') return ast.rows.length === 1 ? 'vector' : 'matrix';
  if (ast.type === 'call') return rhsKind(ast);
  if (ast.type === 'definition') {
    if (ast.left.type === 'call') return 'function';
    return rhsKind(ast.right);
  }
  if (ast.type === 'comparison') return 'inequality';
  if (ast.type === 'system') return 'system';
  if (ast.type === 'equation') {
    if (/^\s*[A-Za-z][A-Za-z0-9_]*\s*\([^)]*\)\s*=/.test(source)) return 'function';
    if (/^\s*[A-Za-z][A-Za-z0-9_]*\s*=\s*\[/.test(source) && ast.right.type === 'matrix') {
      return ast.right.rows.length === 1 ? 'vector' : 'matrix';
    }
    if (ast.left.type === 'symbol' && ast.right.type === 'call') {
      const kind = rhsKind(ast.right);
      if (['dataset','distribution','probability','proposition','finite-set','relation','graph','recurrence','complexity','combinatorics','ode'].includes(kind)) return kind;
    }
    return 'equation';
  }
  if (ast.type === 'number') return 'scalar';
  return 'expression';
}

export function classifyParsed(parsed: ParsedMath): MathObjectKind {
  if (parsed.diagnostics.some((item) => item.severity === 'error')) return 'unknown';
  return classifyAst(parsed.ast, parsed.normalizedSource);
}

export function classifyPreview(source: string): MathObjectKind {
  return classifyParsed(parseMath(source));
}

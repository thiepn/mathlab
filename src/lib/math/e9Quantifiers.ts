import type { AstNode } from './ast';
import { rationalValue, simplifyAst } from './algebra';
import { astToPlainText } from './format';
import { parseMath } from './parser';
import type { E9Transform } from './e9Types';
import type { MathResultFact, MathResultSection } from './types';

type Quantifier = 'forall' | 'exists';
const s = (name: string): AstNode => ({ type: 'symbol', name });
const section = (id: string, title: string, facts: MathResultFact[], description?: string): MathResultSection => ({ id, title, facts, description });

function items(node: AstNode): AstNode[] {
  const q = simplifyAst(node);
  if (q.type === 'call' && q.name === 'set') return q.args;
  if (q.type === 'set') return q.items;
  throw new Error('Finite quantifier evaluation requires a finite set object.');
}
function substitute(node: AstNode, variable: string, value: AstNode): AstNode {
  if (node.type === 'symbol') return node.name === variable ? value : node;
  if (node.type === 'number') return node;
  if (node.type === 'unary') return { ...node, operand: substitute(node.operand, variable, value) };
  if (node.type === 'binary') return { ...node, left: substitute(node.left, variable, value), right: substitute(node.right, variable, value) };
  if (node.type === 'call') return { ...node, args: node.args.map(arg => substitute(arg, variable, value)) };
  if (node.type === 'matrix') return { ...node, rows: node.rows.map(row => row.map(cell => substitute(cell, variable, value))) };
  if (node.type === 'system' || node.type === 'set') return { ...node, items: node.items.map(item => substitute(item, variable, value)) };
  return { ...node, left: substitute(node.left, variable, value), right: substitute(node.right, variable, value) };
}
function cmp(left: AstNode, right: AstNode): number {
  const a = rationalValue(simplifyAst(left)), b = rationalValue(simplifyAst(right));
  if (!a || !b) throw new Error('Finite predicate arithmetic must resolve exactly after substituting the bound variable.');
  const d = a.n * b.d - b.n * a.d; return d < 0n ? -1 : d > 0n ? 1 : 0;
}
function truth(node: AstNode): boolean {
  const q = simplifyAst(node);
  if (q.type === 'symbol') { if (q.name === 'true') return true; if (q.name === 'false') return false; }
  if (q.type === 'equation') return cmp(q.left, q.right) === 0;
  if (q.type === 'comparison') {
    const c = cmp(q.left, q.right);
    return q.operator === '<' ? c < 0 : q.operator === '<=' ? c <= 0 : q.operator === '>' ? c > 0 : q.operator === '>=' ? c >= 0 : c !== 0;
  }
  if (q.type === 'call') {
    if (q.name === 'not') { if (q.args.length !== 1) throw new Error('not(...) requires one predicate.'); return !truth(q.args[0]); }
    if (q.name === 'and' || q.name === 'or') { if (q.args.length < 2) throw new Error(`${q.name}(...) requires at least two predicates.`); return q.name === 'and' ? q.args.every(truth) : q.args.some(truth); }
    if (['xor','implies','iff'].includes(q.name)) { if (q.args.length !== 2) throw new Error(`${q.name}(...) requires two predicates.`); const a=truth(q.args[0]),b=truth(q.args[1]); return q.name==='xor'?a!==b:q.name==='implies'?!a||b:a===b; }
  }
  throw new Error('Finite predicates support exact arithmetic equations/comparisons and the existing Boolean connectives.');
}

export function finiteQuantifierOnSet(setNode: AstNode, variable: string, predicateSource: string, quantifier: Quantifier): E9Transform {
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(variable)) throw new Error('Bound variable must be a valid MathLab symbol name.');
  const parsed = parseMath(predicateSource);
  if (!parsed.ast || parsed.diagnostics.some(d => d.severity === 'error')) throw new Error(`Predicate could not be parsed: ${parsed.diagnostics.map(d => d.message).join(' ') || 'empty predicate'}`);
  const domain = items(setNode); if (domain.length > 256) throw new Error('E9 finite quantifiers are limited to at most 256 represented domain elements.');
  const outcomes = domain.map(value => truth(substitute(parsed.ast!, variable, value)));
  const value = quantifier === 'forall' ? outcomes.every(Boolean) : outcomes.some(Boolean);
  const decisive = quantifier === 'forall' ? outcomes.findIndex(v=>!v) : outcomes.findIndex(Boolean);
  const ast = s(value ? 'true' : 'false');
  return {
    ast,
    display: `${quantifier === 'forall' ? '∀' : '∃'} ${variable} ∈ ${astToPlainText(setNode)}: ${predicateSource} · ${value ? 'True' : 'False'}`,
    exactness: 'exact', warnings: [], steps: [],
    sections: [
      section('finite-quantifier','Finite-domain quantifier',[{label:'Quantifier',display:quantifier==='forall'?'Universal (∀)':'Existential (∃)'},{label:'Predicate',display:predicateSource},{label:'Domain size',display:String(domain.length)},{label:'Result',display:value?'True':'False',tone:value?'positive':'negative'},...(decisive>=0?[{label:quantifier==='forall'?'Counterexample':'Witness',display:astToPlainText(domain[decisive])}]:[])]),
      section('quantifier-trace','Exhaustive evaluation',domain.map((item,i)=>({label:`${variable}=${astToPlainText(item)}`,display:outcomes[i]?'True':'False',tone:outcomes[i]?'positive' as const:'negative' as const})),'Every represented finite-domain element is evaluated exactly; no sampling is used.'),
    ],
  };
}

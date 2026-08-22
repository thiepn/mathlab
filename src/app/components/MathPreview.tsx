import type { ReactNode } from 'react';
import type { AstNode } from '../../lib/math/ast';
import { astToPlainText } from '../../lib/math/format';

interface MathPreviewProps {
  ast: AstNode | null;
  fallback?: string;
  compact?: boolean;
}

const GREEK: Record<string, string> = {
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', zeta: 'ζ', eta: 'η', theta: 'θ',
  iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', omicron: 'ο', pi: 'π', rho: 'ρ',
  sigma: 'σ', tau: 'τ', upsilon: 'υ', phi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
  Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π', Sigma: 'Σ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
};

const UPRIGHT_FUNCTIONS = new Set([
  'sin','cos','tan','sec','csc','cot','asin','acos','atan','sinh','cosh','tanh','ln','log','exp','det','rank','gcd','lcm','Re','Im',
]);

function group(node: AstNode): ReactNode {
  return <mrow><mo>(</mo>{renderMathNode(node)}<mo>)</mo></mrow>;
}

function precedence(node: AstNode): number {
  if (node.type === 'equation' || node.type === 'comparison' || node.type === 'definition' || node.type === 'system' || node.type === 'set') return 0;
  if (node.type === 'binary') return node.operator === '+' || node.operator === '-' ? 1 : node.operator === '*' || node.operator === '/' ? 2 : 3;
  if (node.type === 'unary') return 4;
  return 5;
}

function child(node: AstNode, parent: number): ReactNode {
  return precedence(node) < parent ? group(node) : renderMathNode(node);
}

function symbolName(name: string) {
  if (name === 'infinity') return '∞';
  if (name === 'R') return 'ℝ';
  if (name === 'C') return 'ℂ';
  if (name === 'Q') return 'ℚ';
  if (name === 'Z') return 'ℤ';
  if (name === 'N') return 'ℕ';
  return GREEK[name] ?? name;
}

function symbolAtom(name: string): ReactNode {
  const normalized = symbolName(name);
  if (['DNE', 'undefined', 'unknown'].includes(name)) return <mi mathvariant="normal">{normalized}</mi>;
  if (/^[A-Za-zΑ-Ωα-ωℝℂℚℤℕ∞]+$/.test(normalized) && normalized.length > 1 && !GREEK[name]) {
    return <mi mathvariant="normal">{normalized}</mi>;
  }
  return <mi>{normalized}</mi>;
}

function renderSymbol(name: string): ReactNode {
  const underscore = name.indexOf('_');
  if (underscore > 0 && underscore < name.length - 1) {
    const base = name.slice(0, underscore);
    const sub = name.slice(underscore + 1);
    const subNode = /^-?\d+(?:\.\d+)?$/.test(sub) ? <mn>{sub}</mn> : symbolAtom(sub);
    return <msub>{symbolAtom(base)}{subNode}</msub>;
  }
  return symbolAtom(name);
}

function commaSeparated(args: AstNode[]): ReactNode {
  return args.map((arg, index) => <mrow key={index}>{index > 0 && <mo>,</mo>}{renderMathNode(arg)}</mrow>);
}

export function renderMathNode(node: AstNode): ReactNode {
  switch (node.type) {
    case 'number': return <mn>{node.value}</mn>;
    case 'symbol': return renderSymbol(node.name);
    case 'unary': return <mrow><mo>{node.operator}</mo>{child(node.operand, 4)}</mrow>;
    case 'binary': {
      if (node.operator === '/') return <mfrac>{renderMathNode(node.left)}{renderMathNode(node.right)}</mfrac>;
      if (node.operator === '^') return <msup>{child(node.left, 3)}{renderMathNode(node.right)}</msup>;
      const op = node.operator === '*' ? (node.implicit ? '⁢' : '·') : node.operator;
      const p = node.operator === '+' || node.operator === '-' ? 1 : 2;
      return <mrow>{child(node.left, p)}<mo>{op}</mo>{child(node.right, node.operator === '-' ? p + 1 : p)}</mrow>;
    }
    case 'call': {
      if (node.name === 'sqrt' && node.args[0]) return <msqrt>{renderMathNode(node.args[0])}</msqrt>;
      if (node.name === 'abs' && node.args[0]) return <mrow><mo>|</mo>{renderMathNode(node.args[0])}<mo>|</mo></mrow>;
      if (node.name === 'floor' && node.args[0]) return <mrow><mo>⌊</mo>{renderMathNode(node.args[0])}<mo>⌋</mo></mrow>;
      if (node.name === 'ceil' && node.args[0]) return <mrow><mo>⌈</mo>{renderMathNode(node.args[0])}<mo>⌉</mo></mrow>;
      if (node.name === 'sum' && node.args.length === 3) {
        return <mrow><msubsup><mo>∑</mo>{renderMathNode(node.args[1])}{renderMathNode(node.args[2])}</msubsup>{renderMathNode(node.args[0])}</mrow>;
      }
      const functionName = UPRIGHT_FUNCTIONS.has(node.name) ? symbolName(node.name) : symbolName(node.name);
      return <mrow><mi mathvariant={UPRIGHT_FUNCTIONS.has(node.name) ? 'normal' : undefined}>{functionName}</mi><mo>(</mo>{commaSeparated(node.args)}<mo>)</mo></mrow>;
    }
    case 'equation': return <mrow>{renderMathNode(node.left)}<mo>=</mo>{renderMathNode(node.right)}</mrow>;
    case 'comparison': return <mrow>{renderMathNode(node.left)}<mo>{node.operator === '<=' ? '≤' : node.operator === '>=' ? '≥' : node.operator === '!=' ? '≠' : node.operator}</mo>{renderMathNode(node.right)}</mrow>;
    case 'system': return <mrow><mo>{'{'}</mo><mtable>{node.items.map((item, index) => <mtr key={index}><mtd>{renderMathNode(item)}</mtd></mtr>)}</mtable></mrow>;
    case 'set': return node.items.length ? <mrow><mo>{'{'}</mo>{node.items.map((item, index) => <mrow key={index}>{index > 0 && <mo>,</mo>}{renderMathNode(item)}</mrow>)}<mo>{'}'}</mo></mrow> : <mo>∅</mo>;
    case 'definition': return <mrow>{renderMathNode(node.left)}<mo>:=</mo>{renderMathNode(node.right)}</mrow>;
    case 'matrix': return (
      <mrow>
        <mo stretchy="true">[</mo>
        <mtable>
          {node.rows.map((row, rowIndex) => (
            <mtr key={rowIndex}>
              {row.map((cell, cellIndex) => <mtd key={cellIndex}>{renderMathNode(cell)}</mtd>)}
            </mtr>
          ))}
        </mtable>
        <mo stretchy="true">]</mo>
      </mrow>
    );
  }
}

export function MathPreview({ ast, fallback = 'Enter mathematics to preview it.', compact = false }: MathPreviewProps) {
  if (!ast) return <div className={`math-preview-empty ${compact ? 'is-compact' : ''}`}>{fallback}</div>;
  const aria = astToPlainText(ast);
  return (
    <math className={`math-preview ${compact ? 'is-compact' : ''}`} display={compact ? 'inline' : 'block'} aria-label={aria}>
      {renderMathNode(ast)}
    </math>
  );
}

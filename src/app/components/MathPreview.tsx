import type { ReactNode } from 'react';
import type { AstNode } from '../../lib/math/ast';

interface MathPreviewProps {
  ast: AstNode | null;
  fallback?: string;
  compact?: boolean;
}

function group(node: AstNode): ReactNode {
  return <mrow><mo>(</mo>{renderNode(node)}<mo>)</mo></mrow>;
}

function precedence(node: AstNode): number {
  if (node.type === 'equation' || node.type === 'comparison' || node.type === 'definition' || node.type === 'system' || node.type === 'set') return 0;
  if (node.type === 'binary') return node.operator === '+' || node.operator === '-' ? 1 : node.operator === '*' || node.operator === '/' ? 2 : 3;
  if (node.type === 'unary') return 4;
  return 5;
}

function child(node: AstNode, parent: number): ReactNode {
  return precedence(node) < parent ? group(node) : renderNode(node);
}

function symbolName(name: string) {
  if (name === 'pi') return 'π';
  if (name === 'infinity') return '∞';
  if (name === 'R') return 'ℝ';
  if (name === 'C') return 'ℂ';
  if (name === 'Q') return 'ℚ';
  if (name === 'Z') return 'ℤ';
  if (name === 'N') return 'ℕ';
  return name;
}

function renderNode(node: AstNode): ReactNode {
  switch (node.type) {
    case 'number': return <mn>{node.value}</mn>;
    case 'symbol': return <mi>{symbolName(node.name)}</mi>;
    case 'unary': return <mrow><mo>{node.operator}</mo>{child(node.operand, 4)}</mrow>;
    case 'binary': {
      if (node.operator === '/') return <mfrac>{renderNode(node.left)}{renderNode(node.right)}</mfrac>;
      if (node.operator === '^') return <msup>{child(node.left, 3)}{renderNode(node.right)}</msup>;
      const op = node.operator === '*' ? (node.implicit ? '⁢' : '·') : node.operator;
      const p = node.operator === '+' || node.operator === '-' ? 1 : 2;
      return <mrow>{child(node.left, p)}<mo>{op}</mo>{child(node.right, node.operator === '-' ? p + 1 : p)}</mrow>;
    }
    case 'call': {
      if (node.name === 'sqrt' && node.args[0]) return <msqrt>{renderNode(node.args[0])}</msqrt>;
      return <mrow><mi mathvariant="normal">{symbolName(node.name)}</mi><mo>(</mo>{node.args.map((arg, index) => <mrow key={index}>{index > 0 && <mo>,</mo>}{renderNode(arg)}</mrow>)}<mo>)</mo></mrow>;
    }
    case 'equation': return <mrow>{renderNode(node.left)}<mo>=</mo>{renderNode(node.right)}</mrow>;
    case 'comparison': return <mrow>{renderNode(node.left)}<mo>{node.operator === '<=' ? '≤' : node.operator === '>=' ? '≥' : node.operator === '!=' ? '≠' : node.operator}</mo>{renderNode(node.right)}</mrow>;
    case 'system': return <mrow><mo>{'{'} </mo><mtable>{node.items.map((item, index) => <mtr key={index}><mtd>{renderNode(item)}</mtd></mtr>)}</mtable></mrow>;
    case 'set': return node.items.length ? <mrow><mo>{'{'} </mo>{node.items.map((item, index) => <mrow key={index}>{index > 0 && <mo>,</mo>}{renderNode(item)}</mrow>)}<mo>{'}'}</mo></mrow> : <mo>∅</mo>;
    case 'definition': return <mrow>{renderNode(node.left)}<mo>:=</mo>{renderNode(node.right)}</mrow>;
    case 'matrix': return (
      <mrow>
        <mo>[</mo>
        <mtable>
          {node.rows.map((row, rowIndex) => (
            <mtr key={rowIndex}>
              {row.map((cell, cellIndex) => <mtd key={cellIndex}>{renderNode(cell)}</mtd>)}
            </mtr>
          ))}
        </mtable>
        <mo>]</mo>
      </mrow>
    );
  }
}

export function MathPreview({ ast, fallback = 'Enter mathematics to preview it.', compact = false }: MathPreviewProps) {
  if (!ast) return <div className={`math-preview-empty ${compact ? 'is-compact' : ''}`}>{fallback}</div>;
  return (
    <math className={`math-preview ${compact ? 'is-compact' : ''}`} display={compact ? 'inline' : 'block'} aria-label="Rendered mathematical preview">
      {renderNode(ast)}
    </math>
  );
}

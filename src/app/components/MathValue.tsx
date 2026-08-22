import type { ReactNode } from 'react';
import type { AstNode } from '../../lib/math/ast';
import { looksLikeDisplayMath, parseDisplayMath, splitTopLevel } from '../../lib/math/displayMath';
import { MathPreview, renderMathNode } from './MathPreview';

interface MathValueProps {
  ast?: AstNode | null;
  source?: string;
  compact?: boolean;
  className?: string;
  forceMathStyle?: boolean;
}

function parsedNode(source: string): AstNode | null {
  return parseDisplayMath(source.trim());
}

function renderEndpoint(source: string): ReactNode | null {
  const trimmed = source.trim();
  const side = trimmed.match(/^(.*?)([⁺⁻])$/);
  if (side) {
    const base = parsedNode(side[1]);
    if (!base) return null;
    return <msup>{renderMathNode(base)}<mo>{side[2]}</mo></msup>;
  }
  const ast = parsedNode(trimmed);
  return ast ? renderMathNode(ast) : null;
}

function directStructuredMath(source: string): ReactNode | null {
  const text = source.trim();

  const relation = text.match(/^(.+?)\s*(→|←|↔|∈|∉|⊂|⊆)\s*(.+)$/);
  if (relation) {
    const left = renderEndpoint(relation[1]);
    const right = renderEndpoint(relation[3]);
    if (left && right) return <mrow>{left}<mo>{relation[2]}</mo>{right}</mrow>;
  }

  const open = text[0];
  const close = text[text.length - 1];
  if ((open === '(' && close === ')') || (open === '[' && close === ']')) {
    const parts = splitTopLevel(text.slice(1, -1));
    if (parts.length >= 2) {
      const parsed = parts.map(renderEndpoint);
      if (parsed.every(Boolean)) {
        return <mrow><mo>{open}</mo>{parsed.map((node, index) => <mrow key={index}>{index > 0 && <mo>,</mo>}{node}</mrow>)}<mo>{close}</mo></mrow>;
      }
    }
  }

  const list = splitTopLevel(text);
  if (list.length > 1 && list.length <= 12) {
    const parsed = list.map(renderEndpoint);
    if (parsed.every(Boolean)) return <mrow>{parsed.map((node, index) => <mrow key={index}>{index > 0 && <mo>,</mo>}{node}</mrow>)}</mrow>;
  }

  return null;
}

export function MathValue({ ast = null, source = '', compact = true, className = '', forceMathStyle = false }: MathValueProps) {
  if (ast) return <span className={`math-value ${className}`.trim()}><MathPreview ast={ast} compact={compact} /></span>;

  const parsed = parsedNode(source);
  if (parsed) return <span className={`math-value ${className}`.trim()}><MathPreview ast={parsed} compact={compact} /></span>;

  const structured = directStructuredMath(source);
  if (structured) {
    return <math className={`math-preview math-value ${compact ? 'is-compact' : ''} ${className}`.trim()} display={compact ? 'inline' : 'block'} aria-label={source}>{structured}</math>;
  }

  const mathLike = forceMathStyle || looksLikeDisplayMath(source);
  return <span className={`${mathLike ? 'math-text-fallback' : 'text-value'} ${className}`.trim()}>{source}</span>;
}

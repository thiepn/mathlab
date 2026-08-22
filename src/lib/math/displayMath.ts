import type { AstNode } from './ast';
import { parseMath } from './parser';

const PROSE_WORDS = new Set([
  'the','a','an','is','are','was','were','to','of','for','from','with','and','or','but','if','then','when','where','which','this','that','these','those',
  'solution','result','status','reason','verified','exact','approximate','convergent','divergent','increasing','decreasing','continuous','undefined','unknown',
]);

export function normalizeDisplayMathSource(source: string): string {
  let value = source.trim();
  if ((value.startsWith('$') && value.endsWith('$')) || (value.startsWith('\\(') && value.endsWith('\\)'))) {
    value = value.replace(/^\$|\$$/g, '').replace(/^\\\(|\\\)$/g, '');
  }
  return value
    .replace(/∞/g, 'infinity')
    .replace(/ℝ/g, 'R')
    .replace(/ℂ/g, 'C')
    .replace(/ℚ/g, 'Q')
    .replace(/ℤ/g, 'Z')
    .replace(/ℕ/g, 'N')
    .replace(/√\s*\(/g, 'sqrt(')
    .trim();
}

export function splitTopLevel(source: string, delimiter = ','): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === '(' || char === '[' || char === '{') depth += 1;
    else if (char === ')' || char === ']' || char === '}') depth = Math.max(0, depth - 1);
    else if (char === delimiter && depth === 0) {
      parts.push(source.slice(start, index).trim());
      start = index + 1;
    }
  }
  parts.push(source.slice(start).trim());
  return parts.filter(Boolean);
}

function proseWordCount(source: string): number {
  return (source.match(/[A-Za-z]{2,}/g) ?? []).filter((word) => PROSE_WORDS.has(word.toLowerCase())).length;
}

export function looksLikeDisplayMath(source: string): boolean {
  const text = source.trim();
  if (!text || text.length > 180) return false;
  if (/^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(text)) return true;
  if (/^-?\d+\s*\/\s*-?\d+$/.test(text)) return true;
  if (/^[A-Za-zΑ-Ωα-ω](?:_[A-Za-z0-9]+)?$/.test(text) && text.length <= 12) return true;
  if (/^(?:sin|cos|tan|sec|csc|cot|asin|acos|atan|sinh|cosh|tanh|ln|log|exp|sqrt|abs|det|rank)\s*\(/.test(text)) return true;
  if (/^\[.*\]$/.test(text) || /^\{.*\}$/.test(text) || /^\(.*,.+\)$/.test(text)) return true;
  if (/^[A-Za-z][A-Za-z0-9_]*\s*\([^)]*\)\s*(?:=|≠|<=|>=|≤|≥|<|>)/.test(text)) return true;
  const strongSignal = /(?:=|!=|<=|>=|≤|≥|≠|[+*/^]|√|∑|∫|∞|π|→|←|↔|∈|∉|⊂|⊆|Θ\s*\()/.test(text);
  if (!strongSignal) return false;
  if (proseWordCount(text) >= 2 && /[.!?]/.test(text)) return false;
  if (proseWordCount(text) >= 3) return false;
  return true;
}

function parseSingle(source: string): AstNode | null {
  const parsed = parseMath(normalizeDisplayMathSource(source));
  if (!parsed.ast || parsed.diagnostics.some((item) => item.severity === 'error')) return null;
  return parsed.ast;
}

export function parseDisplayMath(source: string): AstNode | null {
  const text = source.trim();
  if (!looksLikeDisplayMath(text)) return null;
  if (text === '∅') return { type: 'set', items: [] };
  if (text.startsWith('{') && text.endsWith('}')) {
    const inside = text.slice(1, -1).trim();
    if (!inside) return { type: 'set', items: [] };
    const items = splitTopLevel(inside).map(parseSingle);
    if (items.every((item): item is AstNode => Boolean(item))) return { type: 'set', items };
  }
  return parseSingle(text);
}

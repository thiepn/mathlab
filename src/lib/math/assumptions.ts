import type { MathAssumption, MathDomain, SemanticDiagnostic } from './types';

const domainAliases: Record<string, MathDomain> = {
  n: 'natural', natural: 'natural', naturals: 'natural', 'ℕ': 'natural',
  z: 'integer', integer: 'integer', integers: 'integer', 'ℤ': 'integer',
  q: 'rational', rational: 'rational', rationals: 'rational', 'ℚ': 'rational',
  r: 'real', real: 'real', reals: 'real', 'ℝ': 'real',
  c: 'complex', complex: 'complex', 'ℂ': 'complex',
};

const properties = new Set(['positive','nonnegative','nonzero','symmetric','invertible','orthogonal','diagonalizable','independent']);

function idFor(label: string) {
  let hash = 2166136261;
  for (let i = 0; i < label.length; i += 1) {
    hash ^= label.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `asm_${(hash >>> 0).toString(36)}`;
}

function normalizeSource(source: string) {
  return source.trim().replace(/\s+/g, ' ').replace(/≥/g, '>=').replace(/≤/g, '<=').replace(/≠/g, '!=').replace(/∈/g, ' in ');
}

export function parseAssumption(source: string): { assumption: MathAssumption | null; diagnostics: SemanticDiagnostic[] } {
  const normalized = normalizeSource(source);
  if (!normalized) return { assumption: null, diagnostics: [] };

  const domainMatch = normalized.match(/^([\p{L}_][\p{L}\p{N}_]*)\s+(?:in\s+)?(N|Z|Q|R|C|ℕ|ℤ|ℚ|ℝ|ℂ|natural|naturals|integer|integers|rational|rationals|real|reals|complex)$/iu);
  if (domainMatch) {
    const subject = domainMatch[1];
    const domain = domainAliases[domainMatch[2].toLowerCase()] ?? domainAliases[domainMatch[2]];
    const label = `${subject} ∈ ${domainSymbol(domain)}`;
    return { assumption: { id: idFor(label), label, source: 'user', subject, predicate: { type: 'domain', domain }, createdAt: Date.now() }, diagnostics: [] };
  }

  const comparison = normalized.match(/^([\p{L}_][\p{L}\p{N}_]*)\s*(>=|<=|!=|>|<)\s*(.+)$/u);
  if (comparison) {
    const [, subject, operator, value] = comparison;
    const label = `${subject} ${operator.replace('>=','≥').replace('<=','≤').replace('!=','≠')} ${value.trim()}`;
    return { assumption: { id: idFor(label), label, source: 'user', subject, predicate: { type: 'comparison', operator: operator as '>' | '>=' | '<' | '<=' | '!=', value: value.trim() }, createdAt: Date.now() }, diagnostics: [] };
  }

  const property = normalized.match(/^([\p{L}_][\p{L}\p{N}_]*)\s+(positive|nonnegative|nonzero|symmetric|invertible|orthogonal|diagonalizable|independent)$/iu);
  if (property && properties.has(property[2].toLowerCase())) {
    const subject = property[1];
    const prop = property[2].toLowerCase() as 'positive' | 'nonnegative' | 'nonzero' | 'symmetric' | 'invertible' | 'orthogonal' | 'diagonalizable' | 'independent';
    const label = `${subject} ${prop}`;
    return { assumption: { id: idFor(label), label, source: 'user', subject, predicate: { type: 'property', property: prop }, createdAt: Date.now() }, diagnostics: [] };
  }

  return {
    assumption: null,
    diagnostics: [{ severity: 'error', code: 'assumption-parse-error', message: 'Use forms such as “x > 0”, “x in R”, “n integer”, or “A symmetric”.' }],
  };
}

export function domainSymbol(domain: MathDomain): string {
  return ({ natural: 'ℕ', integer: 'ℤ', rational: 'ℚ', real: 'ℝ', complex: 'ℂ', boolean: '𝔹', unknown: '?' } as Record<MathDomain,string>)[domain];
}

export function assumptionsForSubject(assumptions: MathAssumption[], subject: string): MathAssumption[] {
  return assumptions.filter((item) => item.subject === subject);
}

export function domainFromAssumptions(assumptions: MathAssumption[], subject: string): MathDomain | null {
  const explicit = [...assumptions].reverse().find((item) => item.subject === subject && item.predicate?.type === 'domain');
  return explicit?.predicate?.type === 'domain' ? explicit.predicate.domain : null;
}

export function detectAssumptionConflicts(assumptions: MathAssumption[]): SemanticDiagnostic[] {
  const diagnostics: SemanticDiagnostic[] = [];
  const bySubject = new Map<string, MathAssumption[]>();
  for (const item of assumptions) {
    if (!item.subject) continue;
    const list = bySubject.get(item.subject) ?? [];
    list.push(item);
    bySubject.set(item.subject, list);
  }
  for (const [subject, list] of bySubject) {
    const domains = new Set(list.filter((item) => item.predicate?.type === 'domain').map((item) => item.predicate?.type === 'domain' ? item.predicate.domain : 'unknown'));
    if (domains.size > 1) diagnostics.push({ severity: 'warning', code: 'assumption-conflict', symbol: subject, message: `Multiple domain assumptions are active for ${subject}. The most recent explicit domain will take precedence.` });
  }
  return diagnostics;
}

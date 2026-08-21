export interface NormalizedMathSource {
  original: string;
  normalized: string;
}

const COMMAND_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\\left/g, ''],
  [/\\right/g, ''],
  [/\\cdot/g, '*'],
  [/\\times/g, '*'],
  [/\\div/g, '/'],
  [/\\pi\b/g, 'pi'],
  [/\\infty\b/g, 'infinity'],
  [/\\operatorname\s*\{([A-Za-z]+)\}/g, '$1'],
  [/\\(sin|cos|tan|sec|csc|cot|asin|acos|atan|sinh|cosh|tanh|ln|log|exp)\b/g, '$1'],
];

function replaceSimpleFrac(source: string): string {
  // Deliberately handles balanced single groups only. Complex LaTeX belongs to a
  // future dedicated LaTeX parser, but common pasted fractions should work in P1.
  let previous = '';
  let current = source;
  const pattern = /\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g;
  while (current !== previous) {
    previous = current;
    current = current.replace(pattern, '(($1)/($2))');
  }
  return current;
}

function replaceSimpleSqrt(source: string): string {
  let previous = '';
  let current = source;
  const pattern = /\\sqrt\s*\{([^{}]+)\}/g;
  while (current !== previous) {
    previous = current;
    current = current.replace(pattern, 'sqrt($1)');
  }
  return current;
}

export function normalizeMathSource(source: string): NormalizedMathSource {
  let normalized = source
    .replace(/\^\s*\{([^{}]+)\}/g, '^($1)')
    .replace(/_\s*\{([A-Za-z0-9]+)\}/g, '_$1')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/[−–—]/g, '-')
    .replace(/[×·]/g, '*')
    .replace(/÷/g, '/')
    .replace(/π/g, 'pi')
    .replace(/≤/g, '<=')
    .replace(/≥/g, '>=')
    .replace(/≠/g, '!=')
    .replace(/[（]/g, '(')
    .replace(/[）]/g, ')')
    .replace(/[［]/g, '[')
    .replace(/[］]/g, ']');

  normalized = replaceSimpleFrac(normalized);
  normalized = replaceSimpleSqrt(normalized);

  for (const [pattern, replacement] of COMMAND_REPLACEMENTS) {
    normalized = normalized.replace(pattern, replacement);
  }

  return { original: source, normalized };
}

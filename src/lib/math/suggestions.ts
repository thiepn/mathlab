export interface MathSuggestion {
  label: string;
  insert: string;
  detail: string;
}

const SUGGESTIONS: MathSuggestion[] = [
  { label: 'sin(x)', insert: 'sin()', detail: 'Sine function' },
  { label: 'cos(x)', insert: 'cos()', detail: 'Cosine function' },
  { label: 'tan(x)', insert: 'tan()', detail: 'Tangent function' },
  { label: 'sqrt(x)', insert: 'sqrt()', detail: 'Square root' },
  { label: 'ln(x)', insert: 'ln()', detail: 'Natural logarithm' },
  { label: 'log(x)', insert: 'log()', detail: 'Logarithm' },
  { label: 'exp(x)', insert: 'exp()', detail: 'Exponential function' },
  { label: 'pi', insert: 'pi', detail: 'π constant' },
  { label: 'Matrix', insert: 'A = [[1, 2], [3, 4]]', detail: '2 × 2 matrix' },
  { label: 'Vector', insert: 'v = [1, 2, 3]', detail: 'Length-3 vector' },
  { label: 'Function', insert: 'f(x) = x^2', detail: 'Define a function' },
  { label: 'ivp(x,y)', insert: 'ivp(x + y, 0, 1)', detail: 'P12 first-order ODE initial-value problem' },
];

export function getMathSuggestions(value: string, cursor: number): MathSuggestion[] {
  const before = value.slice(0, cursor);
  const match = before.match(/([A-Za-z]+)$/);
  if (!match) return [];
  const fragment = match[1].toLowerCase();
  if (fragment.length < 1) return [];
  return SUGGESTIONS.filter((item) => item.label.toLowerCase().startsWith(fragment)).slice(0, 6);
}

export function applySuggestion(value: string, cursor: number, suggestion: MathSuggestion): { value: string; cursor: number } {
  const before = value.slice(0, cursor);
  const match = before.match(/([A-Za-z]+)$/);
  const fragmentLength = match?.[1].length ?? 0;
  const start = cursor - fragmentLength;
  const next = value.slice(0, start) + suggestion.insert + value.slice(cursor);
  const parenIndex = suggestion.insert.indexOf('()');
  const nextCursor = start + (parenIndex >= 0 ? parenIndex + 1 : suggestion.insert.length);
  return { value: next, cursor: nextCursor };
}

export interface InputEdit {
  value: string;
  start: number;
  end: number;
}

export interface MathInputTemplate {
  id: string;
  label: string;
  detail: string;
  category: MathKeypadCategory;
  template: string;
  selectedTemplate?: string;
}

export type MathKeypadCategory = 'basic' | 'functions' | 'structure' | 'data' | 'symbols';

export const MATH_KEYPAD_CATEGORIES: ReadonlyArray<{ id: MathKeypadCategory; label: string }> = [
  { id: 'basic', label: 'Basic' },
  { id: 'functions', label: 'Functions' },
  { id: 'structure', label: 'Structure' },
  { id: 'data', label: 'Data & probability' },
  { id: 'symbols', label: 'Symbols' },
];

export const MATH_INPUT_TEMPLATES: readonly MathInputTemplate[] = [
  { id: 'fraction', label: 'a/b', detail: 'Fraction', category: 'basic', template: '(|)/()', selectedTemplate: '({{selection}})/(|)' },
  { id: 'sqrt', label: '√', detail: 'Square root', category: 'basic', template: 'sqrt(|)', selectedTemplate: 'sqrt({{selection}})|' },
  { id: 'square', label: 'x²', detail: 'Square', category: 'basic', template: '|^2', selectedTemplate: '({{selection}})^2|' },
  { id: 'power', label: 'xⁿ', detail: 'Power', category: 'basic', template: '|^()', selectedTemplate: '({{selection}})^(|)' },
  { id: 'abs', label: '|x|', detail: 'Absolute value', category: 'basic', template: 'abs(|)', selectedTemplate: 'abs({{selection}})|' },
  { id: 'paren', label: '( )', detail: 'Parentheses', category: 'basic', template: '(|)', selectedTemplate: '({{selection}})|' },
  { id: 'lte', label: '≤', detail: 'Less than or equal', category: 'basic', template: ' <= |' },
  { id: 'gte', label: '≥', detail: 'Greater than or equal', category: 'basic', template: ' >= |' },
  { id: 'neq', label: '≠', detail: 'Not equal', category: 'basic', template: ' != |' },

  { id: 'sin', label: 'sin', detail: 'Sine', category: 'functions', template: 'sin(|)', selectedTemplate: 'sin({{selection}})|' },
  { id: 'cos', label: 'cos', detail: 'Cosine', category: 'functions', template: 'cos(|)', selectedTemplate: 'cos({{selection}})|' },
  { id: 'tan', label: 'tan', detail: 'Tangent', category: 'functions', template: 'tan(|)', selectedTemplate: 'tan({{selection}})|' },
  { id: 'ln', label: 'ln', detail: 'Natural logarithm', category: 'functions', template: 'ln(|)', selectedTemplate: 'ln({{selection}})|' },
  { id: 'log', label: 'log', detail: 'Base-10 logarithm', category: 'functions', template: 'log(|)', selectedTemplate: 'log({{selection}})|' },
  { id: 'exp', label: 'exp', detail: 'Exponential', category: 'functions', template: 'exp(|)', selectedTemplate: 'exp({{selection}})|' },
  { id: 'floor', label: '⌊x⌋', detail: 'Floor', category: 'functions', template: 'floor(|)', selectedTemplate: 'floor({{selection}})|' },
  { id: 'ceil', label: '⌈x⌉', detail: 'Ceiling', category: 'functions', template: 'ceil(|)', selectedTemplate: 'ceil({{selection}})|' },

  { id: 'definition', label: 'f(x) :=', detail: 'Function definition', category: 'structure', template: 'f(x) := |' },
  { id: 'piecewise', label: '{ cases', detail: 'Piecewise function', category: 'structure', template: 'f(x) := piecewise(|x^2, x < 0; 2x + 1, x >= 0)' },
  { id: 'system', label: 'system', detail: 'Semicolon-separated equations', category: 'structure', template: 'x + y = 3; x - y = 1|' },
  { id: 'vector', label: '[v]', detail: 'Vector', category: 'structure', template: '[1, 2, 3]|' },
  { id: 'matrix', label: '[A]', detail: '2 × 2 matrix', category: 'structure', template: '[[1, 2], [3, 4]]|' },
  { id: 'set', label: '{set}', detail: 'Finite set', category: 'structure', template: 'set(1, 2, 3)|' },
  { id: 'and', label: 'and', detail: 'Compound condition', category: 'structure', template: 'and(x >= 0, x < 1)|' },

  { id: 'data', label: 'data', detail: 'Dataset', category: 'data', template: 'data(1, 2, 3, 4)|' },
  { id: 'normal', label: 'N(μ,σ)', detail: 'Normal distribution', category: 'data', template: 'normal(0, 1)|' },
  { id: 'binomial', label: 'Bin(n,p)', detail: 'Binomial distribution', category: 'data', template: 'binomial(10, 0.5)|' },
  { id: 'choose', label: 'nCr', detail: 'Combination', category: 'data', template: 'choose(10, 3)|' },
  { id: 'conditional', label: 'P(A|B)', detail: 'Conditional probability', category: 'data', template: 'conditional(0.2, 0.5)|' },
  { id: 'ivp', label: 'IVP', detail: 'First-order initial value problem', category: 'data', template: 'ivp(x + y, 0, 1)|' },

  { id: 'pi', label: 'π', detail: 'Pi', category: 'symbols', template: 'pi|' },
  { id: 'infinity', label: '∞', detail: 'Infinity', category: 'symbols', template: 'infinity|' },
  { id: 'alpha', label: 'α', detail: 'alpha', category: 'symbols', template: 'alpha|' },
  { id: 'beta', label: 'β', detail: 'beta', category: 'symbols', template: 'beta|' },
  { id: 'theta', label: 'θ', detail: 'theta', category: 'symbols', template: 'theta|' },
  { id: 'lambda', label: 'λ', detail: 'lambda', category: 'symbols', template: 'lambda|' },
  { id: 'mu', label: 'μ', detail: 'mu', category: 'symbols', template: 'mu|' },
  { id: 'sigma', label: 'σ', detail: 'sigma', category: 'symbols', template: 'sigma|' },
];

function materialize(template: string, selection: string): { text: string; marker: number } {
  const withSelection = template.replace(/\{\{selection\}\}/g, selection);
  const marker = withSelection.indexOf('|');
  const text = withSelection.replace('|', '');
  return { text, marker: marker >= 0 ? marker : text.length };
}

export function applyInputTemplate(
  value: string,
  start: number,
  end: number,
  template: MathInputTemplate,
): InputEdit {
  const selection = value.slice(start, end);
  const source = selection && template.selectedTemplate ? template.selectedTemplate : template.template;
  const inserted = materialize(source, selection);
  const next = value.slice(0, start) + inserted.text + value.slice(end);
  const cursor = start + inserted.marker;
  return { value: next, start: cursor, end: cursor };
}

export function applyLiteralInsert(value: string, start: number, end: number, text: string): InputEdit {
  const next = value.slice(0, start) + text + value.slice(end);
  const cursor = start + text.length;
  return { value: next, start: cursor, end: cursor };
}

export function applyOpeningDelimiter(value: string, start: number, end: number, opener: '(' | '['): InputEdit {
  const closer = opener === '(' ? ')' : ']';
  const selection = value.slice(start, end);
  const inserted = opener + selection + closer;
  const next = value.slice(0, start) + inserted + value.slice(end);
  const cursor = selection ? start + inserted.length : start + 1;
  return { value: next, start: cursor, end: cursor };
}

export function skipClosingDelimiter(value: string, cursor: number, closer: ')' | ']'): InputEdit | null {
  if (value[cursor] !== closer) return null;
  return { value, start: cursor + 1, end: cursor + 1 };
}

export function removeEmptyDelimiterPair(value: string, cursor: number): InputEdit | null {
  if (cursor <= 0 || cursor >= value.length) return null;
  const pair = value.slice(cursor - 1, cursor + 1);
  if (pair !== '()' && pair !== '[]') return null;
  const next = value.slice(0, cursor - 1) + value.slice(cursor + 1);
  return { value: next, start: cursor - 1, end: cursor - 1 };
}

export function nextInputBoundary(value: string, cursor: number): number | null {
  for (let index = cursor; index < value.length; index += 1) {
    if ([')', ']', ',', ';'].includes(value[index])) return index + (value[index] === ',' || value[index] === ';' ? 2 : 1);
  }
  return null;
}

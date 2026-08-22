import type {
  AstNode,
  MathToken,
  MathTokenKind,
  ParseDiagnostic,
  ParsedMath,
} from './ast';
import { normalizeMathSource } from './normalize';

const KNOWN_FUNCTIONS = new Set([
  'sin', 'cos', 'tan', 'sec', 'csc', 'cot',
  'asin', 'acos', 'atan', 'sinh', 'cosh', 'tanh',
  'sqrt', 'ln', 'log', 'exp', 'abs', 'floor', 'ceil',
  // P10 data/probability constructors and exact probability helpers.
  'data', 'bernoulli', 'binomial', 'geometric', 'poisson', 'uniform', 'normal',
  'choose', 'permute', 'conditional', 'bayes', 'unionprob', 'independentjoint', 'complement',
  // P11 logic, finite sets/relations, graphs, recurrences, complexity, and combinatorics.
  'not', 'and', 'or', 'xor', 'implies', 'iff',
  'set', 'relation', 'graph', 'digraph', 'wgraph', 'wdigraph',
  'linrec', 'linrec2', 'complexity', 'master',
  'multinomial', 'starsbars', 'derangements', 'stirling2', 'bell', 'pigeonhole',
  // P12 numerical IVP + E4 ODE/dynamical-system constructors.
  'ivp', 'odesys', 'separable', 'linearode', 'exactode', 'ode2', 'oden',
]);

const SINGLE_CHAR_TOKENS: Record<string, MathTokenKind> = {
  '+': 'plus', '-': 'minus', '*': 'star', '/': 'slash', '^': 'caret',
  '=': 'equals', ',': 'comma', ';': 'semicolon', '(': 'lparen', ')': 'rparen',
  '[': 'lbracket', ']': 'rbracket',
};

function lex(source: string): { tokens: MathToken[]; diagnostics: ParseDiagnostic[] } {
  const tokens: MathToken[] = [];
  const diagnostics: ParseDiagnostic[] = [];
  let i = 0;

  while (i < source.length) {
    const ch = source[i];
    if (/\s/.test(ch)) { i += 1; continue; }

    const two = source.slice(i, i + 2);
    if (two === ':=') {
      tokens.push({ kind: 'define', text: ':=', start: i, end: i + 2 });
      i += 2;
      continue;
    }
    if (two === '<=' || two === '>=' || two === '!=') {
      const kind = two === '<=' ? 'less-equal' : two === '>=' ? 'greater-equal' : 'not-equal';
      tokens.push({ kind, text: two, start: i, end: i + 2 });
      i += 2;
      continue;
    }
    if (ch === '<' || ch === '>') {
      tokens.push({ kind: ch === '<' ? 'less' : 'greater', text: ch, start: i, end: i + 1 });
      i += 1;
      continue;
    }

    const singleKind = SINGLE_CHAR_TOKENS[ch];
    if (singleKind) {
      tokens.push({ kind: singleKind, text: ch, start: i, end: i + 1 });
      i += 1;
      continue;
    }

    if (/\d/.test(ch) || (ch === '.' && /\d/.test(source[i + 1] ?? ''))) {
      const start = i;
      let dots = 0;
      while (i < source.length && /[\d.]/.test(source[i])) {
        if (source[i] === '.') dots += 1;
        i += 1;
      }
      const text = source.slice(start, i);
      if (dots > 1) {
        diagnostics.push({
          severity: 'error', code: 'invalid-number', message: `Invalid number “${text}”.`, start, end: i,
        });
      }
      tokens.push({ kind: 'number', text, start, end: i });
      continue;
    }

    if (/[\p{L}_]/u.test(ch)) {
      const start = i;
      i += 1;
      while (i < source.length && /[\p{L}\p{N}_]/u.test(source[i])) i += 1;
      tokens.push({ kind: 'identifier', text: source.slice(start, i), start, end: i });
      continue;
    }

    diagnostics.push({
      severity: 'error', code: 'unexpected-character', message: `Unexpected character “${ch}”.`, start: i, end: i + 1,
    });
    i += 1;
  }

  tokens.push({ kind: 'eof', text: '', start: source.length, end: source.length });
  return { tokens, diagnostics };
}

function canEndValue(token: MathToken): boolean {
  return token.kind === 'number' || token.kind === 'identifier' || token.kind === 'rparen' || token.kind === 'rbracket';
}

function canStartValue(token: MathToken): boolean {
  return token.kind === 'number' || token.kind === 'identifier' || token.kind === 'lparen' || token.kind === 'lbracket';
}

function looksLikeFunctionDefinition(tokens: MathToken[], identifierIndex: number): boolean {
  if (tokens[identifierIndex + 1]?.kind !== 'lparen') return false;
  let depth = 0;
  for (let i = identifierIndex + 1; i < tokens.length; i += 1) {
    if (tokens[i].kind === 'lparen') depth += 1;
    if (tokens[i].kind === 'rparen') {
      depth -= 1;
      if (depth === 0) return tokens[i + 1]?.kind === 'equals' || tokens[i + 1]?.kind === 'define';
    }
  }
  return false;
}

function shouldInsertImplicitMultiply(left: MathToken, right: MathToken, tokens: MathToken[], leftIndex: number): boolean {
  if (!canEndValue(left) || !canStartValue(right)) return false;
  if (left.kind === 'number' && right.kind === 'number') return false;

  // Known functions and explicit function-definition heads are calls. Conventional
  // f/g/h notation is also treated as a call, while x(y+1) remains multiplication.
  if (left.kind === 'identifier' && right.kind === 'lparen') {
    if (KNOWN_FUNCTIONS.has(left.text) || /^[fghFGH]$/.test(left.text) || looksLikeFunctionDefinition(tokens, leftIndex)) return false;
  }

  // `][` or `](` is allowed as multiplication, but matrix rows are separated by
  // commas so this does not interfere with matrix construction.
  return true;
}

function insertImplicitMultiplication(tokens: MathToken[]): MathToken[] {
  const result: MathToken[] = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    result.push(token);
    const next = tokens[i + 1];
    if (!next || token.kind === 'eof' || next.kind === 'eof') continue;
    if (shouldInsertImplicitMultiply(token, next, tokens, i)) {
      result.push({ kind: 'star', text: '*', start: token.end, end: next.start, implicit: true });
    }
  }
  return result;
}

class Parser {
  private index = 0;
  readonly diagnostics: ParseDiagnostic[] = [];

  constructor(private readonly tokens: MathToken[]) {}

  parse(): AstNode | null {
    if (this.peek().kind === 'eof') return null;
    const first = this.parseEquation();
    if (!first) return null;
    if (this.match('semicolon')) {
      const items: AstNode[] = [first];
      do {
        const next = this.parseEquation();
        if (!next) {
          const token = this.previous();
          this.error('expected-expression', 'Expected another equation or expression after “;”.', token.end, token.end);
          break;
        }
        items.push(next);
      } while (this.match('semicolon'));
      if (this.peek().kind !== 'eof') {
        const token = this.peek();
        this.error('trailing-input', `Unexpected “${token.text || token.kind}” after the system.`, token);
      }
      return { type: 'system', items };
    }
    const node = first;
    if (this.peek().kind !== 'eof') {
      const token = this.peek();
      this.error('trailing-input', `Unexpected “${token.text || token.kind}” after the expression.`, token);
    }
    return node;
  }

  private parseEquation(): AstNode | null {
    const left = this.parseAdditive();
    if (!left) return null;
    if (this.match('define')) {
      const define = this.previous();
      const right = this.parseAdditive();
      if (!right) {
        this.error('expected-expression', 'Expected an expression after “:=”.', define.end, define.end);
        return left;
      }
      if (left.type !== 'symbol' && left.type !== 'call') {
        this.error('invalid-definition', 'A definition must name a symbol or function on the left of “:=”.', define.start, define.end);
      }
      return { type: 'definition', left, right };
    }
    if (this.match('equals')) {
      const equals = this.previous();
      const right = this.parseAdditive();
      if (!right) {
        this.error('expected-expression', 'Expected an expression after “=”.', equals.end, equals.end);
        return left;
      }
      return { type: 'equation', left, right };
    }
    const comparisonKinds = new Set(['less','less-equal','greater','greater-equal','not-equal']);
    if (comparisonKinds.has(this.peek().kind)) {
      const comparison = this.advance();
      const right = this.parseAdditive();
      if (!right) {
        this.error('expected-expression', `Expected an expression after “${comparison.text}”.`, comparison.end, comparison.end);
        return left;
      }
      const operator = comparison.kind === 'less' ? '<' : comparison.kind === 'less-equal' ? '<=' : comparison.kind === 'greater' ? '>' : comparison.kind === 'greater-equal' ? '>=' : '!=';
      return { type: 'comparison', operator, left, right };
    }
    return left;
  }

  private parseAdditive(): AstNode | null {
    let left = this.parseMultiplicative();
    while (left && (this.peek().kind === 'plus' || this.peek().kind === 'minus')) {
      const op = this.advance();
      const right = this.parseMultiplicative();
      if (!right) {
        this.error('expected-expression', `Expected an expression after “${op.text}”.`, op.end, op.end);
        break;
      }
      left = { type: 'binary', operator: op.kind === 'plus' ? '+' : '-', left, right };
    }
    return left;
  }

  private parseMultiplicative(): AstNode | null {
    let left = this.parseUnary();
    while (left && (this.peek().kind === 'star' || this.peek().kind === 'slash')) {
      const op = this.advance();
      const right = this.parseUnary();
      if (!right) {
        this.error('expected-expression', `Expected an expression after “${op.text}”.`, op.end, op.end);
        break;
      }
      left = {
        type: 'binary',
        operator: op.kind === 'star' ? '*' : '/',
        left,
        right,
        implicit: op.kind === 'star' ? Boolean(op.implicit) : undefined,
      };
    }
    return left;
  }

  private parseUnary(): AstNode | null {
    if (this.peek().kind === 'plus' || this.peek().kind === 'minus') {
      const token = this.advance();
      const operand = this.parseUnary();
      if (!operand) {
        this.error('expected-expression', `Expected an expression after unary “${token.text}”.`, token.end, token.end);
        return null;
      }
      return { type: 'unary', operator: token.kind === 'plus' ? '+' : '-', operand };
    }
    return this.parsePower();
  }

  private parsePower(): AstNode | null {
    const left = this.parsePrimary();
    if (!left) return null;
    if (this.match('caret')) {
      const op = this.previous();
      const right = this.parseUnary(); // right-associative and permits 2^-3
      if (!right) {
        this.error('expected-expression', 'Expected an exponent after “^”.', op.end, op.end);
        return left;
      }
      return { type: 'binary', operator: '^', left, right };
    }
    return left;
  }

  private parsePrimary(): AstNode | null {
    const token = this.peek();

    if (this.match('number')) return { type: 'number', value: token.text };

    if (this.match('identifier')) {
      const name = token.text;
      if (this.match('lparen')) return this.finishCall(name, this.previous());
      return { type: 'symbol', name };
    }

    if (this.match('lparen')) {
      const open = this.previous();
      if (this.peek().kind === 'rparen') {
        const close = this.advance();
        this.error('empty-group', 'Empty parentheses do not contain an expression.', open.start, close.end);
        return null;
      }
      const expr = this.parseEquation();
      if (!this.match('rparen')) {
        this.error('missing-closing-delimiter', 'Missing closing parenthesis “)”.', open.start, open.end);
      }
      return expr;
    }

    if (this.match('lbracket')) return this.finishBracket(this.previous());

    if (token.kind === 'rparen' || token.kind === 'rbracket' || token.kind === 'comma') {
      this.error('unexpected-token', `Unexpected “${token.text}”.`, token);
      this.advance();
      return null;
    }

    if (token.kind !== 'eof') {
      this.error('unexpected-token', `Unexpected token “${token.text}”.`, token);
      this.advance();
    }
    return null;
  }

  private finishCall(name: string, open: MathToken): AstNode | null {
    const args: AstNode[] = [];
    if (this.match('rparen')) {
      this.error('empty-group', `Function “${name}” requires an argument.`, open.start, this.previous().end);
      return { type: 'call', name, args };
    }

    while (this.peek().kind !== 'eof') {
      const arg = this.parseEquation();
      if (arg) args.push(arg);
      if (!this.match('comma')) break;
    }

    if (!this.match('rparen')) {
      this.error('missing-closing-delimiter', `Missing closing parenthesis for “${name}(…)”.`, open.start, open.end);
    }
    return { type: 'call', name, args };
  }

  private finishBracket(open: MathToken): AstNode | null {
    // `[[...],[...]]` is a matrix. `[a,b,c]` is represented as a one-row matrix
    // in P1 so it can evolve into vector semantics in P2 without reparsing text.
    const rows: AstNode[][] = [];

    if (this.peek().kind === 'lbracket') {
      while (this.match('lbracket')) {
        const rowOpen = this.previous();
        const row = this.parseCommaSeparatedUntil('rbracket');
        if (!this.match('rbracket')) {
          this.error('missing-closing-delimiter', 'Missing closing bracket for matrix row.', rowOpen.start, rowOpen.end);
          break;
        }
        rows.push(row);
        if (!this.match('comma')) break;
      }
    } else {
      rows.push(this.parseCommaSeparatedUntil('rbracket'));
    }

    if (!this.match('rbracket')) {
      this.error('missing-closing-delimiter', 'Missing closing bracket “]”.', open.start, open.end);
    }

    if (!rows.length || rows.some((row) => row.length === 0)) {
      this.error('invalid-matrix', 'A matrix or vector cannot contain an empty row.', open.start, this.previous().end);
    } else {
      const width = rows[0].length;
      if (rows.some((row) => row.length !== width)) {
        this.error('invalid-matrix', 'All matrix rows must contain the same number of entries.', open.start, this.previous().end);
      }
    }

    return { type: 'matrix', rows };
  }

  private parseCommaSeparatedUntil(endKind: MathTokenKind): AstNode[] {
    const items: AstNode[] = [];
    if (this.peek().kind === endKind) return items;

    while (this.peek().kind !== 'eof' && this.peek().kind !== endKind) {
      const item = this.parseAdditive();
      if (item) items.push(item);
      if (!this.match('comma')) break;
    }
    return items;
  }

  private match(kind: MathTokenKind): boolean {
    if (this.peek().kind !== kind) return false;
    this.advance();
    return true;
  }

  private advance(): MathToken {
    if (this.index < this.tokens.length - 1) this.index += 1;
    return this.tokens[this.index - 1];
  }

  private peek(): MathToken { return this.tokens[this.index]; }
  private previous(): MathToken { return this.tokens[Math.max(0, this.index - 1)]; }

  private error(code: ParseDiagnostic['code'], message: string, tokenOrStart: MathToken | number, end?: number) {
    const start = typeof tokenOrStart === 'number' ? tokenOrStart : tokenOrStart.start;
    const finish = typeof tokenOrStart === 'number' ? (end ?? start) : tokenOrStart.end;
    this.diagnostics.push({ severity: 'error', code, message, start, end: finish });
  }
}

export function parseMath(source: string): ParsedMath {
  const { normalized } = normalizeMathSource(source);
  const lexed = lex(normalized);
  const tokens = insertImplicitMultiplication(lexed.tokens);
  const parser = new Parser(tokens);
  const ast = parser.parse();
  return {
    source,
    normalizedSource: normalized,
    ast,
    diagnostics: [...lexed.diagnostics, ...parser.diagnostics],
    tokens,
  };
}

export function isKnownFunction(name: string): boolean {
  return KNOWN_FUNCTIONS.has(name);
}
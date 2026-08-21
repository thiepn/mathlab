import type { AstNode } from './ast';

const PRECEDENCE: Record<string, number> = { equation: 0, '+': 1, '-': 1, '*': 2, '/': 2, '^': 3, unary: 4, atom: 5 };

function precedence(node: AstNode): number {
  if (node.type === 'equation' || node.type === 'comparison' || node.type === 'definition' || node.type === 'system' || node.type === 'set') return PRECEDENCE.equation;
  if (node.type === 'binary') return PRECEDENCE[node.operator];
  if (node.type === 'unary') return PRECEDENCE.unary;
  return PRECEDENCE.atom;
}

function parensIf(child: AstNode, parentPrec: number, content: string): string {
  return precedence(child) < parentPrec ? `\\left(${content}\\right)` : content;
}

export function astToLatex(node: AstNode): string {
  switch (node.type) {
    case 'number': return node.value;
    case 'symbol': {
      if (node.name === 'pi') return '\\pi';
      if (node.name === 'infinity') return '\\infty';
      return node.name.replace(/_/g, '\\_');
    }
    case 'unary': return `${node.operator}${parensIf(node.operand, PRECEDENCE.unary, astToLatex(node.operand))}`;
    case 'binary': {
      const p = PRECEDENCE[node.operator];
      const left = parensIf(node.left, p, astToLatex(node.left));
      const rightRaw = astToLatex(node.right);
      if (node.operator === '/') return `\\frac{${astToLatex(node.left)}}{${rightRaw}}`;
      if (node.operator === '^') return `${parensIf(node.left, p, astToLatex(node.left))}^{${rightRaw}}`;
      const right = parensIf(node.right, p + (node.operator === '-' ? 1 : 0), rightRaw);
      if (node.operator === '*') return node.implicit ? `${left}${right}` : `${left} \\cdot ${right}`;
      return `${left} ${node.operator} ${right}`;
    }
    case 'call': {
      const args = node.args.map(astToLatex).join(', ');
      if (node.name === 'sqrt' && node.args[0]) return `\\sqrt{${astToLatex(node.args[0])}}`;
      if (['sin','cos','tan','ln','log','exp'].includes(node.name)) return `\\${node.name}\\left(${args}\\right)`;
      return `${node.name}\\left(${args}\\right)`;
    }
    case 'equation': return `${astToLatex(node.left)} = ${astToLatex(node.right)}`;
    case 'comparison': { const op = node.operator === '<=' ? '\\le' : node.operator === '>=' ? '\\ge' : node.operator === '!=' ? '\\ne' : node.operator; return `${astToLatex(node.left)} ${op} ${astToLatex(node.right)}`; }
    case 'system': return `\\left\\{\\begin{aligned}${node.items.map(astToLatex).join(' \\\\ ')}\\end{aligned}\\right.`;
    case 'set': return node.items.length ? `\\left\\{${node.items.map(astToLatex).join(', ')}\\right\\}` : '\\varnothing';
    case 'definition': return `${astToLatex(node.left)} := ${astToLatex(node.right)}`;
    case 'matrix': return `\\begin{bmatrix}${node.rows.map((row) => row.map(astToLatex).join(' & ')).join(' \\\\ ')}\\end{bmatrix}`;
  }
}

function plainPrecedence(node: AstNode): number {
  if (node.type === 'equation' || node.type === 'comparison' || node.type === 'definition' || node.type === 'system' || node.type === 'set') return 0;
  if (node.type === 'binary') return node.operator === '+' || node.operator === '-' ? 1 : node.operator === '*' || node.operator === '/' ? 2 : 3;
  if (node.type === 'unary') return 4;
  return 5;
}

function plainChild(node: AstNode, parent: number, forceEqual = false): string {
  const text = astToPlainText(node);
  return plainPrecedence(node) < parent || (forceEqual && plainPrecedence(node) === parent) ? `(${text})` : text;
}

export function astToPlainText(node: AstNode): string {
  switch (node.type) {
    case 'number': return node.value;
    case 'symbol': return node.name;
    case 'unary': return `${node.operator}${plainChild(node.operand, 4)}`;
    case 'binary': {
      const p = node.operator === '+' || node.operator === '-' ? 1 : node.operator === '*' || node.operator === '/' ? 2 : 3;
      const left = plainChild(node.left, p);
      const right = plainChild(node.right, p, node.operator === '-' || node.operator === '/' || node.operator === '^');
      if (node.operator === '*' && node.implicit) return `${left}${right}`;
      return `${left} ${node.operator} ${right}`;
    }
    case 'call': return `${node.name}(${node.args.map(astToPlainText).join(', ')})`;
    case 'equation': return `${astToPlainText(node.left)} = ${astToPlainText(node.right)}`;
    case 'comparison': return `${astToPlainText(node.left)} ${node.operator} ${astToPlainText(node.right)}`;
    case 'system': return node.items.map(astToPlainText).join('; ');
    case 'set': return node.items.length ? `{${node.items.map(astToPlainText).join(', ')}}` : '∅';
    case 'definition': return `${astToPlainText(node.left)} := ${astToPlainText(node.right)}`;
    case 'matrix': return node.rows.length === 1 ? `[${node.rows[0].map(astToPlainText).join(', ')}]` : `[${node.rows.map((row) => `[${row.map(astToPlainText).join(', ')}]`).join(', ')}]`;
  }
}

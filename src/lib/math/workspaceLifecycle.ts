import type { AstNode } from './ast';
import { astToPlainText } from './format';
import { parseMath } from './parser';
import { recomputeSemanticObjects, resolveSemanticObject } from './semantic';
import type { MathAssumption, SemanticMathObject } from './types';

function replaceNodeSymbol(node: AstNode, oldName: string, newName: string): AstNode {
  switch (node.type) {
    case 'number': return node;
    case 'symbol': return node.name === oldName ? { ...node, name: newName } : node;
    case 'unary': return { ...node, operand: replaceNodeSymbol(node.operand, oldName, newName) };
    case 'binary': return { ...node, left: replaceNodeSymbol(node.left, oldName, newName), right: replaceNodeSymbol(node.right, oldName, newName) };
    case 'call': return { ...node, name: node.name === oldName ? newName : node.name, args: node.args.map((arg) => replaceNodeSymbol(arg, oldName, newName)) };
    case 'equation': return { ...node, left: replaceNodeSymbol(node.left, oldName, newName), right: replaceNodeSymbol(node.right, oldName, newName) };
    case 'comparison': return { ...node, left: replaceNodeSymbol(node.left, oldName, newName), right: replaceNodeSymbol(node.right, oldName, newName) };
    case 'definition': return { ...node, left: replaceNodeSymbol(node.left, oldName, newName), right: replaceNodeSymbol(node.right, oldName, newName) };
    case 'matrix': return { ...node, rows: node.rows.map((row) => row.map((cell) => replaceNodeSymbol(cell, oldName, newName))) };
    case 'system': return { ...node, items: node.items.map((item) => replaceNodeSymbol(item, oldName, newName)) };
    case 'set': return { ...node, items: node.items.map((item) => replaceNodeSymbol(item, oldName, newName)) };
  }
}

export function dependentObjects(objects: SemanticMathObject[], objectName?: string): SemanticMathObject[] {
  if (!objectName) return [];
  return objects.filter((item) => item.dependencies.includes(objectName));
}

export function renameObjectAndReferences(
  objects: SemanticMathObject[],
  assumptions: MathAssumption[],
  objectId: string,
  nextName: string,
): { objects: SemanticMathObject[]; assumptions: MathAssumption[] } {
  const trimmed = nextName.trim();
  if (!/^[\p{L}_][\p{L}\p{N}_]*$/u.test(trimmed)) throw new Error('Use a mathematical identifier such as A, alpha, or matrix_1.');
  const target = objects.find((item) => item.id === objectId);
  if (!target?.name) throw new Error('Only named workspace objects can be renamed.');
  if (objects.some((item) => item.id !== objectId && item.name === trimmed)) throw new Error(`“${trimmed}” already exists in this workspace.`);
  if (target.name === trimmed) return { objects, assumptions };

  const oldName = target.name;
  const rewritten = objects.map((item) => {
    const ast = replaceNodeSymbol(item.ast, oldName, trimmed);
    const source = astToPlainText(ast);
    const context = objects.filter((candidate) => candidate.id !== item.id);
    const resolved = resolveSemanticObject(parseMath(source), context, assumptions);
    return resolved.object ? { ...resolved.object, id: item.id, createdAt: item.createdAt } : { ...item, ast, source };
  });

  const renamedAssumptions = assumptions.map((assumption) => assumption.subject === oldName
    ? { ...assumption, subject: trimmed, label: assumption.label.replace(oldName, trimmed) }
    : assumption);
  return { objects: recomputeSemanticObjects(rewritten, renamedAssumptions), assumptions: renamedAssumptions };
}

export function duplicateObject(
  objects: SemanticMathObject[],
  assumptions: MathAssumption[],
  objectId: string,
): SemanticMathObject {
  const source = objects.find((item) => item.id === objectId);
  if (!source?.name) throw new Error('Only named objects can be duplicated.');
  let suffix = 2;
  let name = `${source.name}_${suffix}`;
  while (objects.some((item) => item.name === name)) name = `${source.name}_${++suffix}`;

  const copiedAst = replaceNodeSymbol(source.ast, source.name, name);
  const parsed = parseMath(astToPlainText(copiedAst));
  const resolved = resolveSemanticObject(parsed, objects, assumptions);
  if (!resolved.object) throw new Error('Could not duplicate this object.');
  return resolved.object;
}

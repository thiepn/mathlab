import type { AstNode } from './ast';
import { simplifyAst } from './algebra';
import { parseMath } from './parser';
import { exactIntegerMatrix, exactIntegerVector, matrix, n, section } from './e10Common';
import type { E10Transform } from './e10Types';

interface MagmaAnalysis {
  table: number[][];
  order: number;
  associative: boolean;
  commutative: boolean;
  identity: number | null;
  inverses: Array<number | null>;
  validGroup: boolean;
  reasons: string[];
}

function tableFromNode(node: AstNode, label: string): number[][] {
  const raw = exactIntegerMatrix(node, label);
  const order = raw.length;
  if (order < 1 || order > 16 || raw.some((row) => row.length !== order)) {
    throw new Error(`${label} must be a square Cayley table of order 1–16.`);
  }
  return raw.map((row, i) => row.map((value, j) => {
    const x = Number(value);
    if (!Number.isSafeInteger(x) || x < 1 || x > order) {
      throw new Error(`${label} entry (${i + 1},${j + 1}) must be an element label in {1,…,${order}}.`);
    }
    return x;
  }));
}

function analyzeTable(table: number[][]): MagmaAnalysis {
  const order = table.length;
  let associative = true;
  outer: for (let a = 1; a <= order; a += 1) {
    for (let b = 1; b <= order; b += 1) {
      for (let c = 1; c <= order; c += 1) {
        const left = table[table[a - 1][b - 1] - 1][c - 1];
        const right = table[a - 1][table[b - 1][c - 1] - 1];
        if (left !== right) { associative = false; break outer; }
      }
    }
  }
  let commutative = true;
  outer2: for (let a = 1; a <= order; a += 1) {
    for (let b = a + 1; b <= order; b += 1) {
      if (table[a - 1][b - 1] !== table[b - 1][a - 1]) { commutative = false; break outer2; }
    }
  }
  let identity: number | null = null;
  for (let e = 1; e <= order; e += 1) {
    let ok = true;
    for (let a = 1; a <= order; a += 1) {
      if (table[e - 1][a - 1] !== a || table[a - 1][e - 1] !== a) { ok = false; break; }
    }
    if (ok) { identity = e; break; }
  }
  const inverses: Array<number | null> = Array(order).fill(null);
  if (identity !== null) {
    for (let a = 1; a <= order; a += 1) {
      for (let b = 1; b <= order; b += 1) {
        if (table[a - 1][b - 1] === identity && table[b - 1][a - 1] === identity) {
          inverses[a - 1] = b;
          break;
        }
      }
    }
  }
  const reasons: string[] = [];
  if (!associative) reasons.push('Associativity fails.');
  if (identity === null) reasons.push('No two-sided identity exists.');
  if (identity !== null && inverses.some((x) => x === null)) reasons.push('At least one element lacks a two-sided inverse.');
  return { table, order, associative, commutative, identity, inverses, validGroup: associative && identity !== null && inverses.every((x) => x !== null), reasons };
}

function groupFromConstructor(node: AstNode): MagmaAnalysis {
  const q = simplifyAst(node);
  if (q.type !== 'call' || q.name !== 'group' || q.args.length !== 1) throw new Error('Finite groups use group(cayleyTable).');
  return analyzeTable(tableFromNode(q.args[0], 'Group Cayley table'));
}

export function isE10FiniteAlgebraConstructorCall(node: AstNode): boolean {
  return node.type === 'call' && ['group', 'ring', 'grouphom'].includes(node.name);
}

export function e10FiniteAlgebraShapeInfo(node: AstNode): { family: string; order: number; targetOrder?: number } | null {
  try {
    const q = simplifyAst(node);
    if (q.type !== 'call') return null;
    if (q.name === 'group') return { family: 'group', order: tableFromNode(q.args[0], 'Group table').length };
    if (q.name === 'ring') return { family: 'ring', order: tableFromNode(q.args[0], 'Addition table').length };
    if (q.name === 'grouphom') return { family: 'grouphom', order: tableFromNode(q.args[0], 'Source table').length, targetOrder: tableFromNode(q.args[1], 'Target table').length };
    return null;
  } catch { return null; }
}

function elementOrders(group: MagmaAnalysis): number[] {
  if (!group.validGroup || group.identity === null) throw new Error('Element orders require a valid finite group.');
  return Array.from({ length: group.order }, (_v, i) => {
    const a = i + 1;
    let x = group.identity!;
    for (let k = 1; k <= group.order; k += 1) {
      x = group.table[x - 1][a - 1];
      if (x === group.identity) return k;
    }
    throw new Error('Internal finite-group order bound was exceeded.');
  });
}

export function groupProfile(node: AstNode): E10Transform {
  const g = groupFromConstructor(node);
  const sections = [section('group-axioms', 'Finite group axioms', [
    { label: 'Order', display: String(g.order) },
    { label: 'Associative', display: g.associative ? 'Yes' : 'No', tone: g.associative ? 'positive' : 'negative' },
    { label: 'Identity', display: g.identity === null ? 'None' : String(g.identity) },
    { label: 'Every element invertible', display: g.inverses.every((x) => x !== null) ? 'Yes' : 'No' },
    { label: 'Group', display: g.validGroup ? 'Yes' : 'No', tone: g.validGroup ? 'positive' : 'negative' },
  ], g.reasons.join(' ') || 'Closure is encoded by table entries in the represented element set.')];
  if (g.validGroup) {
    const orders = elementOrders(g);
    sections.push(section('group-structure', 'Group structure', [
      { label: 'Abelian', display: g.commutative ? 'Yes' : 'No' },
      { label: 'Cyclic', display: orders.some((value) => value === g.order) ? 'Yes' : 'No' },
      { label: 'Element orders', display: orders.map((value, i) => `${i + 1}:${value}`).join(', ') },
      { label: 'Inverse map', display: g.inverses.map((value, i) => `${i + 1}↦${value}`).join(', ') },
    ]));
  }
  return { display: g.validGroup ? `Finite group of order ${g.order}` : 'Cayley table is not a group', exactness: 'exact', warnings: [], steps: [], sections };
}

function parseSubset(source: string, order: number): number[] {
  const parsed = parseMath(source);
  if (!parsed.ast || parsed.diagnostics.some((d) => d.severity === 'error')) throw new Error('Subset must parse as set(1,2,...) or a vector [1,2,...].');
  const q = simplifyAst(parsed.ast);
  let values: bigint[];
  if (q.type === 'call' && q.name === 'set') {
    values = q.args.map((x, i) => {
      const value = simplifyAst(x);
      if (value.type !== 'number' || value.value.includes('.')) throw new Error(`Subset entry ${i + 1} must be an integer label.`);
      return BigInt(value.value);
    });
  } else values = exactIntegerVector(q, 'Subset');
  const out = [...new Set(values.map(Number))].sort((a, b) => a - b);
  if (out.some((x) => !Number.isSafeInteger(x) || x < 1 || x > order)) throw new Error(`Subset labels must lie in {1,…,${order}}.`);
  return out;
}

export function subgroupCheck(node: AstNode, subsetSource: string): E10Transform {
  const g = groupFromConstructor(node);
  if (!g.validGroup || g.identity === null) throw new Error('Subgroup checking requires a valid finite group.');
  const subset = parseSubset(subsetSource, g.order);
  const H = new Set(subset);
  let closed = true;
  let inverses = true;
  for (const a of subset) {
    if (!H.has(g.inverses[a - 1]!)) inverses = false;
    for (const b of subset) if (!H.has(g.table[a - 1][b - 1])) closed = false;
  }
  const containsIdentity = H.has(g.identity);
  const isSubgroup = subset.length > 0 && containsIdentity && closed && inverses;
  return { ast: matrix([subset.map(n)]), display: isSubgroup ? 'Verified subgroup' : 'Not a subgroup', exactness: 'exact', warnings: [], steps: [], sections: [section('subgroup', 'Subgroup certificate', [
    { label: 'Subset', display: `{${subset.join(', ')}}` },
    { label: 'Nonempty', display: subset.length ? 'Yes' : 'No' },
    { label: 'Contains identity', display: containsIdentity ? 'Yes' : 'No' },
    { label: 'Closed under operation', display: closed ? 'Yes' : 'No' },
    { label: 'Closed under inverses', display: inverses ? 'Yes' : 'No' },
    { label: 'Subgroup', display: isSubgroup ? 'Yes' : 'No', tone: isSubgroup ? 'positive' : 'negative' },
  ])] };
}

interface RingAnalysis {
  order: number; add: MagmaAnalysis; mul: MagmaAnalysis; zero: number | null; one: number | null;
  distributive: boolean; validRing: boolean; commutative: boolean; units: number[]; zeroDivisors: number[]; field: boolean; reasons: string[];
}

function ringFromConstructor(node: AstNode): RingAnalysis {
  const q = simplifyAst(node);
  if (q.type !== 'call' || q.name !== 'ring' || q.args.length !== 2) throw new Error('Finite rings use ring(additionTable, multiplicationTable).');
  const addTable = tableFromNode(q.args[0], 'Addition table');
  const mulTable = tableFromNode(q.args[1], 'Multiplication table');
  if (addTable.length !== mulTable.length) throw new Error('Ring addition and multiplication tables must have the same order.');
  const addA = analyzeTable(addTable), mulA = analyzeTable(mulTable), order = addTable.length, zero = addA.identity;
  let distributive = true;
  outer: for (let a = 1; a <= order; a += 1) for (let b = 1; b <= order; b += 1) for (let c = 1; c <= order; c += 1) {
    const left1 = mulTable[a - 1][addTable[b - 1][c - 1] - 1];
    const right1 = addTable[mulTable[a - 1][b - 1] - 1][mulTable[a - 1][c - 1] - 1];
    const left2 = mulTable[addTable[a - 1][b - 1] - 1][c - 1];
    const right2 = addTable[mulTable[a - 1][c - 1] - 1][mulTable[b - 1][c - 1] - 1];
    if (left1 !== right1 || left2 !== right2) { distributive = false; break outer; }
  }
  let one: number | null = null;
  if (mulA.associative) for (let e = 1; e <= order; e += 1) {
    let ok = true;
    for (let a = 1; a <= order; a += 1) if (mulTable[e - 1][a - 1] !== a || mulTable[a - 1][e - 1] !== a) { ok = false; break; }
    if (ok) { one = e; break; }
  }
  const units: number[] = [];
  if (one !== null) for (let a = 1; a <= order; a += 1) for (let b = 1; b <= order; b += 1) {
    if (mulTable[a - 1][b - 1] === one && mulTable[b - 1][a - 1] === one) { units.push(a); break; }
  }
  const zeroDiv = new Set<number>();
  if (zero !== null) for (let a = 1; a <= order; a += 1) for (let b = 1; b <= order; b += 1) {
    if (a !== zero && b !== zero && (mulTable[a - 1][b - 1] === zero || mulTable[b - 1][a - 1] === zero)) { zeroDiv.add(a); zeroDiv.add(b); }
  }
  const validRing = addA.validGroup && addA.commutative && mulA.associative && distributive;
  const commutative = mulA.commutative;
  const field = validRing && commutative && one !== null && zero !== null && Array.from({ length: order }, (_v, i) => i + 1).filter((x) => x !== zero).every((x) => units.includes(x));
  const reasons: string[] = [];
  if (!addA.validGroup || !addA.commutative) reasons.push('Addition is not an abelian group.');
  if (!mulA.associative) reasons.push('Multiplication is not associative.');
  if (!distributive) reasons.push('A distributive law fails.');
  return { order, add: addA, mul: mulA, zero, one, distributive, validRing, commutative, units, zeroDivisors: [...zeroDiv].sort((a, b) => a - b), field, reasons };
}

export function ringProfile(node: AstNode): E10Transform {
  const r = ringFromConstructor(node);
  return { display: r.validRing ? `Finite ring of order ${r.order}` : 'Tables do not define a ring', exactness: 'exact', warnings: [], steps: [], sections: [
    section('ring-axioms', 'Finite ring axioms', [
      { label: 'Order', display: String(r.order) }, { label: 'Additive abelian group', display: r.add.validGroup && r.add.commutative ? 'Yes' : 'No' },
      { label: 'Additive identity 0_R', display: r.zero === null ? 'None' : String(r.zero) }, { label: 'Multiplication associative', display: r.mul.associative ? 'Yes' : 'No' },
      { label: 'Distributive', display: r.distributive ? 'Yes' : 'No' }, { label: 'Ring', display: r.validRing ? 'Yes' : 'No', tone: r.validRing ? 'positive' : 'negative' },
    ], r.reasons.join(' ')),
    section('ring-structure', 'Ring / field structure', [
      { label: 'Multiplication commutative', display: r.commutative ? 'Yes' : 'No' }, { label: 'Multiplicative identity 1_R', display: r.one === null ? 'None' : String(r.one) },
      { label: 'Units', display: r.units.length ? r.units.join(', ') : 'None' }, { label: 'Zero divisors', display: r.zeroDivisors.length ? r.zeroDivisors.join(', ') : 'None' },
      { label: 'Field', display: r.field ? 'Yes' : 'No', tone: r.field ? 'positive' : 'neutral' },
    ], 'Field certification requires a commutative finite ring with identity in which every nonzero element is a unit.'),
  ] };
}

interface HomSpec { source: MagmaAnalysis; target: MagmaAnalysis; map: number[] }
function homSpec(node: AstNode): HomSpec {
  const q = simplifyAst(node);
  if (q.type !== 'call' || q.name !== 'grouphom' || q.args.length !== 3) throw new Error('Group homomorphisms use grouphom(sourceTable, targetTable, [f(1),...,f(n)]).');
  const source = analyzeTable(tableFromNode(q.args[0], 'Source group table'));
  const target = analyzeTable(tableFromNode(q.args[1], 'Target group table'));
  if (!source.validGroup || !target.validGroup) throw new Error('Both source and target Cayley tables must define valid groups.');
  const raw = exactIntegerVector(q.args[2], 'Map vector');
  if (raw.length !== source.order) throw new Error('Map vector length must equal the source-group order.');
  const map = raw.map((value, i) => {
    const x = Number(value);
    if (!Number.isSafeInteger(x) || x < 1 || x > target.order) throw new Error(`Map value ${i + 1} must lie in the target group.`);
    return x;
  });
  return { source, target, map };
}

export function groupHomomorphismProfile(node: AstNode): E10Transform {
  const h = homSpec(node);
  let preserves = true;
  let counterexample = 'None';
  outer: for (let a = 1; a <= h.source.order; a += 1) for (let b = 1; b <= h.source.order; b += 1) {
    const lhs = h.map[h.source.table[a - 1][b - 1] - 1];
    const rhs = h.target.table[h.map[a - 1] - 1][h.map[b - 1] - 1];
    if (lhs !== rhs) { preserves = false; counterexample = `f(${a}·${b})=${lhs}, but f(${a})·f(${b})=${rhs}`; break outer; }
  }
  const targetIdentity = h.target.identity!, sourceIdentity = h.source.identity!;
  const kernel = preserves ? Array.from({ length: h.source.order }, (_v, i) => i + 1).filter((x) => h.map[x - 1] === targetIdentity) : [];
  const image = preserves ? [...new Set(h.map)].sort((a, b) => a - b) : [];
  const injective = preserves && image.length === h.source.order;
  const surjective = preserves && image.length === h.target.order;
  const isomorphism = injective && surjective;
  return { ast: matrix([h.map.map(n)]), display: preserves ? (isomorphism ? 'Group isomorphism' : 'Verified group homomorphism') : 'Map is not a homomorphism', exactness: 'exact', warnings: [], steps: [], sections: [
    section('homomorphism', 'Group homomorphism certificate', [
      { label: 'Operation preserving', display: preserves ? 'Yes' : 'No', tone: preserves ? 'positive' : 'negative' }, { label: 'Counterexample', display: counterexample },
      { label: 'Source identity', display: String(sourceIdentity) }, { label: 'Target identity', display: String(targetIdentity) },
    ]),
    section('kernel-image', 'Kernel and image', [
      { label: 'Kernel', display: preserves ? `{${kernel.join(', ')}}` : 'Undefined' }, { label: 'Image', display: preserves ? `{${image.join(', ')}}` : 'Undefined' },
      { label: 'Injective', display: injective ? 'Yes' : 'No' }, { label: 'Surjective', display: surjective ? 'Yes' : 'No' },
      { label: 'Isomorphism', display: isomorphism ? 'Yes' : 'No', tone: isomorphism ? 'positive' : 'neutral' },
    ]),
  ] };
}

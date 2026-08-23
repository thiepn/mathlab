export interface E11Theorem {
  id: string;
  name: string;
  domain: 'logic'|'algebra'|'order'|'induction'|'analysis'|'linear-algebra'|'abstract-algebra';
  statement: string;
  prerequisites: string[];
  checker: string;
}

export const E11_THEOREMS: E11Theorem[] = [
  {id:'equality-substitution',name:'Substitution of equals',domain:'algebra',statement:'If A = B, an occurrence of A may be replaced by B (or conversely) inside a represented expression or statement.',prerequisites:['The supplied lemma is an equality.','The selected side occurs as an exact AST subtree.'],checker:'lemma-rewrite'},
  {id:'positive-order-scaling',name:'Order preservation under positive scaling',domain:'order',statement:'Multiplying both sides of an inequality by the same positive quantity preserves the inequality direction; a strict inequality also implies the corresponding non-strict inequality.',prerequisites:['Both inequalities reduce to one-variable rational polynomials.','The target difference is a positive rational multiple of the source difference.'],checker:'inequality-consequence'},
  {id:'finite-universal-instantiation',name:'Finite-domain quantifier semantics',domain:'logic',statement:'A universal statement over an explicitly finite domain holds iff every represented assignment satisfies its predicate; an existential statement holds iff at least one represented assignment does.',prerequisites:['All quantifier domains are explicit finite sets.','Every predicate evaluation resolves exactly.'],checker:'finite-quantifier-proof'},
  {id:'ordinary-induction-recurrence',name:'Ordinary mathematical induction for a recursively defined sequence',domain:'induction',statement:'A base equality plus a recurrence-compatible successor proof establishes the represented closed form for every integer index from the base onward.',prerequisites:['The base case is certified.','The recurrence left side matches the successor term.','After substituting the induction hypothesis into the recurrence, the successor formula is certified exactly.'],checker:'induction-certificate'},
  {id:'differentiable-implies-continuous',name:'Differentiability implies continuity',domain:'analysis',statement:'If a real function is differentiable at a point, then it is continuous at that point.',prerequisites:['Differentiability at the configured point is established by the deterministic analysis engine.'],checker:'analysis-theorem-certificate'},
  {id:'rank-nullity',name:'Rank–nullity theorem',domain:'linear-algebra',statement:'For an m×n matrix A, rank(A) + nullity(A) = n.',prerequisites:['The represented matrix has exact rational entries.'],checker:'linear-algebra-theorem-certificate'},
  {id:'invertible-matrix-equivalences',name:'Invertible matrix theorem (bounded certificate)',domain:'linear-algebra',statement:'For a square matrix in the supported exact domain, det(A) ≠ 0, full rank, and nullity 0 are equivalent certificates of invertibility.',prerequisites:['A is square.','The represented entries are exact rationals.'],checker:'linear-algebra-theorem-certificate'},
  {id:'spectral-theorem-hermitian',name:'Finite-dimensional spectral theorem for Hermitian matrices',domain:'linear-algebra',statement:'A Hermitian matrix has a real spectrum and admits unitary diagonalization.',prerequisites:['The exact Hermitian condition A* = A is certified.'],checker:'linear-algebra-theorem-certificate'},
  {id:'lagrange-finite-groups',name:"Lagrange's theorem",domain:'abstract-algebra',statement:'If H is a finite subgroup of G, then |H| divides |G|.',prerequisites:['The Cayley table defines a finite group.','The configured subset is certified as a subgroup.'],checker:'finite-group-theorem-certificate'},
];

export function theoremById(id:string):E11Theorem|undefined{return E11_THEOREMS.find(theorem=>theorem.id===id);}

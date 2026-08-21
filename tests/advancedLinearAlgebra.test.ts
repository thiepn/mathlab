import { describe, expect, it } from 'vitest';
import { astToPlainText } from '../src/lib/math/format';
import { LocalMathEngine } from '../src/lib/math/localEngine';
import { parseMath } from '../src/lib/math/parser';

const engine = new LocalMathEngine();
async function run(input:string, operation:string, options?:Record<string,string|number|boolean>) {
  const parsed=parseMath(input);
  expect(parsed.diagnostics.filter(item=>item.severity==='error')).toHaveLength(0);
  return engine.execute({id:`${operation}:${input}`,operation,input,ast:parsed.ast??undefined,options});
}
function text(result:Awaited<ReturnType<typeof run>>) { return result.resultAst ? astToPlainText(result.resultAst) : result.display; }

describe('P8 advanced linear algebra',()=>{
  it('materializes saved matrix expressions before advanced operations',async()=>{
    const A=parseMath('[[1,0],[0,2]]').ast!;
    const parsed=parseMath('A*A');
    const result=await engine.execute({id:'bound-eigen',operation:'eigen',input:'A*A',ast:parsed.ast!,bindings:[{name:'A',ast:A}]});
    expect(result.resultAst && astToPlainText(result.resultAst)).toBe('{4, 1}');
  });
  it('projects a vector exactly',async()=>{
    expect(text(await run('[1,0]','projection',{target:'[2,3]'}))).toBe('[2, 0]');
  });
  it('projects onto a dependent column space using a pivot-column basis',async()=>{
    expect(text(await run('[[1,2],[2,4]]','project-column-space',{target:'[3,0]'}))).toBe('[3 / 5, 6 / 5]');
  });
  it('computes conjugate-inner-product orthogonality data',async()=>{
    const result=await run('[[1,i],[-i,2]]','orthogonality-profile');
    expect(result.sections?.[0].facts.find(f=>f.label==='Gram matrix')?.display).toBe('[[2, 3i], [-(3i), 5]]');
  });
  it('detects Hermitian structure exactly',async()=>{
    const result=await run('[[1,i],[-i,2]]','symmetry-profile');
    expect(result.sections?.[0].facts.find(f=>f.label==='Hermitian?')?.display).toBe('Yes');
    expect(result.sections?.[0].facts.find(f=>f.label==='Normal?')?.display).toBe('Yes');
  });
  it('performs exact Gram-Schmidt without decimal normalization',async()=>{
    const result=await run('[[1,1],[1,0],[0,1]]','gram-schmidt');
    expect(result.sections?.[0].facts.find(f=>f.label==='Orthogonal basis')?.display).toBe('[[1, 1 / 2], [1, -(1 / 2)], [0, 1]]');
    expect(result.sections?.[0].facts.find(f=>f.label==='Orthonormal basis')?.display).toContain('sqrt');
  });
  it('computes reduced QR with exact radicals',async()=>{
    const result=await run('[[1,1],[1,0],[0,1]]','qr');
    expect(result.sections?.[0].facts.find(f=>f.label==='R')?.display).toContain('sqrt');
    expect(result.exactness).toBe('exact');
  });
  it('solves full-column-rank least squares exactly',async()=>{
    expect(text(await run('[[1,0],[1,1],[1,2]]','least-squares',{target:'[1,2,2]'}))).toBe('[7 / 6, 1 / 2]');
  });
  it('computes characteristic polynomials and eigenvalues exactly',async()=>{
    const result=await run('[[2,1],[1,2]]','eigen');
    expect(result.sections?.[0].facts.find(f=>f.label==='Characteristic polynomial')?.display).toBe('lambda ^ 2 - 4lambda + 3');
    expect(text(result)).toBe('{3, 1}');
  });
  it('supports exact complex eigenvalues for real 2x2 matrices',async()=>{
    const result=await run('[[0,-1],[1,0]]','eigen');
    expect(text(result)).toContain('i');
  });
  it('computes rational eigenspaces and diagonalization',async()=>{
    const spaces=await run('[[2,1],[1,2]]','eigenspaces');
    expect(spaces.sections?.[0].facts.some(f=>f.display==='{[1, 1]}')).toBe(true);
    const diag=await run('[[2,1],[1,2]]','diagonalize');
    expect(diag.sections?.[0].facts.find(f=>f.label==='Diagonalizable?')?.display).toBe('Yes');
    expect(diag.sections?.[0].facts.find(f=>f.label==='D')?.display).toBe('[[3, 0], [0, 1]]');
  });
  it('extracts a rational root from a cubic characteristic polynomial',async()=>{
    expect(text(await run('[[1,0,0],[0,2,0],[0,0,3]]','eigen'))).toBe('{1, 3, 2}');
  });
});

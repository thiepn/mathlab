import type { AstNode } from './ast';
import { simplifyAst } from './algebra';
import { b, bigintAbs, egcd, exactInteger, gcdBig, matrix, n, normalizeMod, section } from './e9Exact';
import type { E9Transform } from './e9Types';

function factorInteger(value:bigint):Array<[bigint,bigint]>{
  let x=bigintAbs(value);if(x===0n)throw new Error('Prime factorization is undefined for 0.');if(x>1_000_000_000_000n)throw new Error('E9 bounded trial factorization is limited to |n|≤10^12.');
  const out:Array<[bigint,bigint]>=[];const take=(p:bigint)=>{let e=0n;while(x%p===0n){x/=p;e+=1n;}if(e)out.push([p,e]);};take(2n);for(let p=3n;p*p<=x;p+=2n)take(p);if(x>1n)out.push([x,1n]);return out;
}
function factorText(value:bigint,factors:Array<[bigint,bigint]>):string{if(value===1n)return'1';if(value===-1n)return'-1';return`${value<0n?'-1 · ':''}${factors.map(([p,e])=>e===1n?String(p):`${p}^${e}`).join(' · ')}`;}
function factorAst(value:bigint,factors:Array<[bigint,bigint]>):AstNode{const terms:AstNode[]=[];if(value<0n)terms.push(n(-1));terms.push(...factors.map(([p,e])=>e===1n?n(p):b('^',n(p),n(e))));if(!terms.length)return n(1);return terms.reduce((a,d)=>b('*',a,d));}

export function numberTheoryProfile(node:AstNode):E9Transform{
  const value=exactInteger(node,'n');if(value===0n)throw new Error('Number-theory factor/arithmetic-function profile requires n≠0.');const factors=factorInteger(value),abs=bigintAbs(value),prime=value>1n&&factors.length===1&&factors[0][1]===1n;
  let phi=abs,tau=1n,sigma=1n,mu=1n;for(const[p,e]of factors){phi=phi/p*(p-1n);tau*=e+1n;let geom=1n,term=1n;for(let i=0n;i<e;i+=1n){term*=p;geom+=term;}sigma*=geom;if(e>1n)mu=0n;else if(mu!==0n)mu=-mu;}
  const ast=factorAst(value,factors);return{ast,display:factorText(value,factors),exactness:'exact',warnings:[],steps:[],sections:[section('factorization','Integer factorization',[{label:'n',display:String(value)},{label:'Prime factorization',display:factorText(value,factors),ast},{label:'Prime?',display:prime?'Yes':'No'}]),section('arithmetic-functions','Arithmetic functions',[{label:'Euler φ(|n|)',display:String(phi),ast:n(phi)},{label:'τ(|n|) divisors',display:String(tau),ast:n(tau)},{label:'σ(|n|) divisor sum',display:String(sigma),ast:n(sigma)},{label:'μ(|n|)',display:String(mu),ast:n(mu)}]) ]};
}

export function extendedGcd(node:AstNode,other:bigint):E9Transform{
  const a=exactInteger(node,'a'),out=egcd(a,other),ast=matrix([[n(out.g),n(out.x),n(out.y)]]);
  return{ast,display:`gcd=${out.g}; ${a}·(${out.x}) + ${other}·(${out.y}) = ${out.g}`,exactness:'exact',warnings:[],steps:[],sections:[section('egcd','Extended Euclidean algorithm',[{label:'gcd(a,b)',display:String(out.g),ast:n(out.g)},{label:'Bézout x',display:String(out.x),ast:n(out.x)},{label:'Bézout y',display:String(out.y),ast:n(out.y)},{label:'Certificate',display:`${a}(${out.x}) + ${other}(${out.y}) = ${out.g}`}]) ]};
}

export function modularInverse(node:AstNode,modulus:bigint):E9Transform{
  const a=exactInteger(node,'a');if(modulus<=1n)throw new Error('Modulus must be an integer >1.');const out=egcd(a,modulus);if(out.g!==1n)throw new Error(`No modular inverse exists because gcd(${a},${modulus})=${out.g}≠1.`);const inv=normalizeMod(out.x,modulus);
  return{ast:n(inv),display:`${a}^(-1) mod ${modulus} = ${inv}`,exactness:'exact',warnings:[],steps:[],sections:[section('mod-inverse','Modular inverse',[{label:'Inverse',display:String(inv),ast:n(inv)},{label:'Verification',display:`${a}·${inv} ≡ 1 (mod ${modulus})`}]) ]};
}

export function solveLinearCongruence(node:AstNode,rhs:bigint,modulus:bigint):E9Transform{
  const a=exactInteger(node,'a');if(modulus<=0n)throw new Error('Congruence modulus m must be positive.');const g=gcdBig(a,modulus);if(rhs%g!==0n)throw new Error(`No solution: gcd(a,m)=${g} does not divide b=${rhs}.`);const aa=a/g,bb=rhs/g,mm=modulus/g,inv=normalizeMod(egcd(aa,mm).x,mm),x0=normalizeMod(inv*bb,mm),solutions=Array.from({length:Number(g)},(_v,k)=>normalizeMod(x0+BigInt(k)*mm,modulus)).sort((x,y)=>x<y?-1:x>y?1:0),ast=matrix([solutions.map(n)]);
  return{ast,display:`x ≡ ${solutions.join(', ')} (mod ${modulus})`,exactness:'exact',warnings:[],steps:[],sections:[section('linear-congruence','Linear congruence',[{label:'Equation',display:`${a}x ≡ ${rhs} (mod ${modulus})`},{label:'gcd(a,m)',display:String(g)},{label:'Solution classes',display:solutions.join(', '),ast}]) ]};
}

export function chineseRemainder(node:AstNode):E9Transform{
  const q=simplifyAst(node);if(q.type!=='matrix'||q.rows.length<1||q.rows.length>20||q.rows.some(r=>r.length!==2))throw new Error('CRT expects a matrix [[residue,modulus],...] with 1–20 congruences.');
  const pairs=q.rows.map((r,i)=>{const a=exactInteger(r[0],`Residue ${i+1}`),m=exactInteger(r[1],`Modulus ${i+1}`);if(m<=1n)throw new Error('CRT moduli must be >1.');return{a:normalizeMod(a,m),m};});let a=pairs[0].a,m=pairs[0].m;const trace:string[]=[];
  for(let i=1;i<pairs.length;i+=1){const p=pairs[i],g=gcdBig(m,p.m),diff=p.a-a;if(diff%g!==0n)throw new Error(`CRT system is inconsistent at congruence ${i+1}.`);const m1=m/g,n1=p.m/g,inv=normalizeMod(egcd(m1,n1).x,n1),t=normalizeMod((diff/g)*inv,n1);a=normalizeMod(a+m*t,m*n1);m=m*n1;trace.push(`Merge ${i+1}: x ≡ ${a} (mod ${m})`);}const ast=matrix([[n(a),n(m)]]);
  return{ast,display:`x ≡ ${a} (mod ${m})`,exactness:'exact',warnings:[],steps:[],sections:[section('crt','Chinese remainder theorem',[{label:'Canonical solution',display:String(a),ast:n(a)},{label:'Combined modulus',display:String(m),ast:n(m)},{label:'Solution',display:`x ≡ ${a} (mod ${m})`}]),section('crt-trace','Congruence merge trace',trace.map((line,i)=>({label:`Merge ${i+1}`,display:line})),'The generalized CRT path also supports compatible non-coprime moduli.')]};
}

export function linearDiophantine(node:AstNode,bCoef:bigint,cValue:bigint):E9Transform{
  const a=exactInteger(node,'a'),out=egcd(a,bCoef);if(cValue%out.g!==0n)throw new Error(`No integer solution because gcd(${a},${bCoef})=${out.g} does not divide ${cValue}.`);const scale=cValue/out.g,x0=out.x*scale,y0=out.y*scale,dx=bCoef/out.g,dy=-(a/out.g),ast=matrix([[n(x0),n(y0),n(dx),n(dy)]]);
  return{ast,display:`x=${x0}+(${dx})t, y=${y0}+(${dy})t`,exactness:'exact',warnings:[],steps:[],sections:[section('diophantine','Linear Diophantine equation',[{label:'Equation',display:`${a}x + ${bCoef}y = ${cValue}`},{label:'One solution',display:`(x0,y0)=(${x0},${y0})`},{label:'All solutions',display:`x=${x0}+(${dx})t, y=${y0}+(${dy})t, t∈Z`},{label:'gcd(a,b)',display:String(out.g)}]) ]};
}

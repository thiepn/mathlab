import type { AstNode } from './ast';
import { simplifyAst } from './algebra';
import { astToPlainText } from './format';
import { add, ZERO, rationalToString, type Rational } from './rational';
import { compareRat, exactInteger, exactRational, matrix, n, rationalAst, section } from './e9Exact';
import type { E9Transform } from './e9Types';

function vectorValues(node:AstNode):Rational[]{
  const q=simplifyAst(node);if(q.type!=='matrix'||q.rows.length!==1)throw new Error('Expected a resolved vector [a1,a2,...].');
  if(q.rows[0].length<1||q.rows[0].length>256)throw new Error('E9 vector dynamic programming is limited to 1–256 entries.');
  return q.rows[0].map((x,i)=>exactRational(x,`Vector entry ${i+1}`));
}

export function longestIncreasingSubsequence(node:AstNode):E9Transform{
  const values=vectorValues(node),len=Array(values.length).fill(1),prev=Array(values.length).fill(-1),trace:string[]=[];
  for(let i=0;i<values.length;i+=1){for(let j=0;j<i;j+=1)if(compareRat(values[j],values[i])<0&&len[j]+1>len[i]){len[i]=len[j]+1;prev[i]=j;}trace.push(`i=${i}: L=${len[i]}, predecessor=${prev[i]<0?'none':prev[i]}`);}
  let end=0;for(let i=1;i<len.length;i+=1)if(len[i]>len[end])end=i;const indices:number[]=[];for(let i=end;i>=0;i=prev[i]){indices.push(i);if(prev[i]<0)break;}indices.reverse();const seq=indices.map(i=>values[i]),ast=matrix([seq.map(rationalAst)]);
  return {ast,display:`LIS length ${seq.length}: ${seq.map(rationalToString).join(', ')}`,exactness:'exact',warnings:[],steps:[],sections:[section('lis','Longest increasing subsequence',[{label:'Length',display:String(seq.length),ast:n(seq.length)},{label:'One optimal subsequence',display:astToPlainText(ast),ast},{label:'Indices (0-based)',display:indices.join(', ')}]),section('lis-trace','DP trace',trace.map((line,i)=>({label:`State ${i}`,display:line})),'This O(n²) dynamic program uses strict increasing order and deterministic earliest predecessors.')]};
}

export function knapsackTrace(node:AstNode,capacity:number):E9Transform{
  const q=simplifyAst(node);if(q.type!=='matrix'||q.rows.some(row=>row.length!==2)||q.rows.length<1||q.rows.length>100)throw new Error('0/1 knapsack expects an n×2 matrix [[weight,value],...] with 1–100 items.');
  if(!Number.isInteger(capacity)||capacity<0||capacity>500)throw new Error('Knapsack capacity must be an integer in [0,500].');
  const items=q.rows.map((row,i)=>{const w=Number(exactInteger(row[0],`Weight ${i+1}`));if(w<=0)throw new Error('Knapsack item weights must be positive integers.');return{w,v:exactRational(row[1],`Value ${i+1}`)};});
  const dp:Rational[][]=Array.from({length:items.length+1},()=>Array.from({length:capacity+1},()=>ZERO)),take:boolean[][]=Array.from({length:items.length+1},()=>Array(capacity+1).fill(false));
  for(let i=1;i<=items.length;i+=1){const item=items[i-1];for(let c=0;c<=capacity;c+=1){dp[i][c]=dp[i-1][c];if(item.w<=c){const candidate=add(dp[i-1][c-item.w],item.v);if(compareRat(candidate,dp[i][c])>0){dp[i][c]=candidate;take[i][c]=true;}}}}
  const chosen:number[]=[];let c=capacity;for(let i=items.length;i>=1;i-=1)if(take[i][c]){chosen.push(i);c-=items[i-1].w;}chosen.reverse();const ast=matrix([chosen.map(n)]),rowFacts=dp.slice(1).map((row,i)=>({label:`After item ${i+1}`,display:`best at capacity ${capacity}: ${rationalToString(row[capacity])}`}));
  return {ast,display:`optimal value ${rationalToString(dp[items.length][capacity])}`,exactness:'exact',warnings:[],steps:[],sections:[section('knapsack','0/1 knapsack optimum',[{label:'Capacity',display:String(capacity)},{label:'Optimal value',display:rationalToString(dp[items.length][capacity]),ast:rationalAst(dp[items.length][capacity])},{label:'Chosen item indices (1-based)',display:chosen.join(', ')||'None',ast}]),section('knapsack-trace','DP row trace',rowFacts,'The full integer-capacity dynamic program is evaluated exactly; ties keep the earlier solution deterministically.')]};
}

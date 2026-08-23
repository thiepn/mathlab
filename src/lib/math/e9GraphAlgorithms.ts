import type { AstNode } from './ast';
import { astToPlainText } from './format';
import { add, sub, ZERO, rationalToString, type Rational } from './rational';
import { compareRat, directedEdges, graphSpec, matrix, minRat, n, rationalAst, section } from './e9Exact';
import type { E9Transform } from './e9Types';

function pathAst(path:number[]):AstNode{return matrix([path.map(n)]);}

export function bellmanFord(node:AstNode,start:number,target:number):E9Transform{
  const spec=graphSpec(node); if(!spec.weighted) throw new Error('Bellman–Ford is exposed for weighted graphs; use wgraph or wdigraph.');
  if(![start,target].every(v=>Number.isInteger(v)&&v>=1&&v<=spec.vertices)) throw new Error(`Start and target must lie in {1,…,${spec.vertices}}.`);
  const edges=directedEdges(spec),dist:Array<Rational|null>=Array(spec.vertices+1).fill(null),prev=Array<number|null>(spec.vertices+1).fill(null),trace:string[]=[]; dist[start]=ZERO;
  for(let pass=1;pass<spec.vertices;pass+=1){let changed=false,relaxations=0;for(const e of edges)if(dist[e.u]){const candidate=add(dist[e.u]!,e.w);if(!dist[e.v]||compareRat(candidate,dist[e.v]!)<0){dist[e.v]=candidate;prev[e.v]=e.u;changed=true;relaxations+=1;}}trace.push(`Pass ${pass}: ${relaxations} relaxation${relaxations===1?'':'s'}`);if(!changed)break;}
  const cycleEdge=edges.find(e=>dist[e.u]&&(!dist[e.v]||compareRat(add(dist[e.u]!,e.w),dist[e.v]!)<0));
  if(cycleEdge) throw new Error(`A negative-weight cycle reachable from ${start} was detected; shortest-path distances are not well-defined.`);
  if(!dist[target]) return {display:`No path from ${start} to ${target}`,exactness:'exact',warnings:[],steps:[],sections:[section('bellman-ford','Bellman–Ford',[{label:'Reachable?',display:'No'},{label:'Passes',display:String(trace.length)}]),section('trace','Relaxation trace',trace.map((line,i)=>({label:`Pass ${i+1}`,display:line})))]};
  const path:number[]=[];let cur:number|null=target;const guard=new Set<number>();while(cur!==null){if(guard.has(cur))throw new Error('Internal predecessor cycle encountered after Bellman–Ford certification.');guard.add(cur);path.push(cur);if(cur===start)break;cur=prev[cur];}path.reverse();const ast=pathAst(path);
  return {ast,display:`${path.join(' → ')} · distance ${rationalToString(dist[target]!)}`,exactness:'exact',warnings:[],steps:[],sections:[section('bellman-ford','Bellman–Ford shortest path',[{label:'Path',display:path.join(' → '),ast},{label:'Exact distance',display:rationalToString(dist[target]!),ast:rationalAst(dist[target]!)},{label:'Negative cycle reachable?',display:'No'}]),section('trace','Relaxation trace',trace.map((line,i)=>({label:`Pass ${i+1}`,display:line})))]};
}

export function maxFlowMinCut(node:AstNode,source:number,sink:number):E9Transform{
  const spec=graphSpec(node);if(!spec.directed||!spec.weighted)throw new Error('Max-flow/min-cut requires a weighted directed graph written as wdigraph(...), with weights interpreted as capacities.');
  if(![source,sink].every(v=>Number.isInteger(v)&&v>=1&&v<=spec.vertices)||source===sink)throw new Error('Source and sink must be distinct valid vertices.');
  if(spec.edges.some(e=>e.w.n<0n))throw new Error('Flow capacities must be nonnegative.');
  const cap=Array.from({length:spec.vertices+1},()=>Array.from({length:spec.vertices+1},()=>ZERO));for(const e of spec.edges)cap[e.u][e.v]=add(cap[e.u][e.v],e.w);
  const residual=cap.map(row=>row.map(x=>x));let total=ZERO;const augmentations:string[]=[];
  while(true){const parent=Array(spec.vertices+1).fill(-1);parent[source]=source;const queue=[source];while(queue.length&&parent[sink]===-1){const u=queue.shift()!;for(let v=1;v<=spec.vertices;v+=1)if(parent[v]===-1&&residual[u][v].n>0n){parent[v]=u;queue.push(v);}}if(parent[sink]===-1)break;
    let bottleneck:Rational|null=null;const path=[sink];for(let v=sink;v!==source;v=parent[v]){bottleneck=bottleneck?minRat(bottleneck,residual[parent[v]][v]):residual[parent[v]][v];path.push(parent[v]);}path.reverse();const delta=bottleneck!;
    for(let v=sink;v!==source;v=parent[v]){const u=parent[v];residual[u][v]=sub(residual[u][v],delta);residual[v][u]=add(residual[v][u],delta);}total=add(total,delta);augmentations.push(`${path.join(' → ')} : +${rationalToString(delta)}`);if(augmentations.length>2000)throw new Error('E9 max-flow augmentation limit exceeded.');}
  const reachable=new Set<number>([source]),q=[source];while(q.length){const u=q.shift()!;for(let v=1;v<=spec.vertices;v+=1)if(!reachable.has(v)&&residual[u][v].n>0n){reachable.add(v);q.push(v);}}
  const cutEdges=spec.edges.filter(e=>reachable.has(e.u)&&!reachable.has(e.v)),cutCapacity=cutEdges.reduce((sum,e)=>add(sum,e.w),ZERO),cutAst=matrix(cutEdges.map(e=>[n(e.u),n(e.v),rationalAst(e.w)]));
  return {ast:rationalAst(total),display:`max flow = min cut = ${rationalToString(total)}`,exactness:'exact',warnings:[],steps:[],sections:[section('max-flow','Maximum flow',[{label:'Value',display:rationalToString(total),ast:rationalAst(total)},{label:'Augmentations',display:String(augmentations.length)}]),section('min-cut','Minimum cut certificate',[{label:'Source side',display:`{${[...reachable].sort((a,d)=>a-d).join(', ')}}`},{label:'Cut edges',display:astToPlainText(cutAst),ast:cutAst},{label:'Cut capacity',display:rationalToString(cutCapacity),ast:rationalAst(cutCapacity)}],compareRat(total,cutCapacity)===0?'The exact flow value equals the residual-reachability cut capacity.':'Internal mismatch: flow/cut equality was not certified.'),section('augmentations','Edmonds–Karp trace',augmentations.map((line,i)=>({label:`Augment ${i+1}`,display:line})))]};
}

export function bipartiteMatching(node:AstNode):E9Transform{
  const spec=graphSpec(node);if(spec.directed||spec.weighted)throw new Error('E9 bipartite matching currently expects an unweighted undirected graph(...).');
  const adj=Array.from({length:spec.vertices+1},()=>[] as number[]);spec.edges.forEach(e=>{adj[e.u].push(e.v);if(e.u!==e.v)adj[e.v].push(e.u);});const color=Array(spec.vertices+1).fill(-1);
  for(let start=1;start<=spec.vertices;start+=1)if(color[start]===-1){color[start]=0;const queue=[start];while(queue.length){const u=queue.shift()!;for(const v of adj[u]){if(color[v]===-1){color[v]=1-color[u];queue.push(v);}else if(color[v]===color[u])throw new Error('Graph is not bipartite, so a bipartite matching workflow is not applicable.');}}}
  const left=Array.from({length:spec.vertices},(_v,i)=>i+1).filter(v=>color[v]===0),matchR=Array(spec.vertices+1).fill(0),trace:string[]=[];
  const augment=(u:number,seen:boolean[]):boolean=>{for(const v of [...adj[u]].sort((a,d)=>a-d)){if(seen[v])continue;seen[v]=true;if(matchR[v]===0||augment(matchR[v],seen)){matchR[v]=u;return true;}}return false;};let size=0;
  for(const u of left){const ok=augment(u,Array(spec.vertices+1).fill(false));if(ok)size+=1;trace.push(`Left vertex ${u}: ${ok?'augmenting path found':'no augmentation'}`);}
  const pairs=matchR.map((u,v)=>({u,v})).filter(p=>p.u!==0).map(p=>[p.u,p.v] as [number,number]),ast=matrix(pairs.map(([u,v])=>[n(u),n(v)]));
  return {ast,display:`maximum matching size ${size}`,exactness:'exact',warnings:[],steps:[],sections:[section('matching','Maximum bipartite matching',[{label:'Cardinality',display:String(size),ast:n(size)},{label:'Matched pairs',display:astToPlainText(ast),ast}]),section('matching-trace','Deterministic augmenting-path trace',trace.map((line,i)=>({label:`Step ${i+1}`,display:line})))]};
}

import type { AstNode } from './ast';
import { rationalValue, simplifyAst } from './algebra';
import { parseMath } from './parser';
import { rationalToNumber } from './rational';

function scalar(node:AstNode,label:string):number{const value=rationalValue(simplifyAst(node));if(!value)throw new Error(`${label} must resolve to a finite real number.`);const out=rationalToNumber(value);if(!Number.isFinite(out))throw new Error(`${label} must be finite.`);return out;}
function matrix(node:AstNode):number[][]{const ast=node.type==='definition'?node.right:node;if(ast.type!=='matrix'||!ast.rows.length||!ast.rows[0]?.length)throw new Error('This E6 workflow requires a numeric matrix.');return ast.rows.map((row,i)=>row.map((cell,j)=>scalar(cell,`matrix entry (${i+1},${j+1})`)));}
function variance(values:number[]):number{if(values.length<2)return 0;const mean=values.reduce((s,v)=>s+v,0)/values.length;return values.reduce((s,v)=>s+(v-mean)**2,0)/(values.length-1);}
function probability(source:string):number{const parsed=parseMath(source);if(!parsed.ast||parsed.diagnostics.some(item=>item.severity==='error'))throw new Error('Quantile probability must be a numeric scalar.');return scalar(parsed.ast,'Quantile probability');}

export function validateContinuousQuantileProbability(source:string):void{const p=probability(source);if(!(p>0&&p<1))throw new Error('E6 continuous-distribution quantiles require 0 < p < 1 so the requested quantile is finite.');}

export function validateE6MatrixOperation(operation:string,node:AstNode):void{
  if(!['covariance-correlation-matrix','two-sample-mean-inference','paired-mean-inference','two-proportion-inference','one-way-anova','multiple-linear-regression','regression-diagnostics'].includes(operation))return;
  const A=matrix(node),columns=Array.from({length:A[0].length},(_,j)=>A.map(row=>row[j]));
  if(operation==='covariance-correlation-matrix'&&columns.some(values=>variance(values)<=1e-30))throw new Error('A correlation matrix is undefined when any variable column has zero variance.');
  if(operation==='two-sample-mean-inference'&&columns.length===2&&variance(columns[0])/columns[0].length+variance(columns[1])/columns[1].length<=1e-30)throw new Error('Welch inference is undefined because the estimated standard error is zero.');
  if(operation==='paired-mean-inference'&&columns.length===2){const differences=columns[0].map((value,i)=>value-columns[1][i]);if(variance(differences)<=1e-30)throw new Error('Paired t inference is undefined because the paired differences have zero sample variance.');}
  if(operation==='two-proportion-inference'&&columns.length===2){const successes=columns.map(values=>values.reduce((s,v)=>s+v,0)),total=columns[0].length+columns[1].length,pooled=(successes[0]+successes[1])/total;if(pooled<=0||pooled>=1)throw new Error('The pooled two-proportion standard error is zero because every observation has the same binary outcome.');}
  if(operation==='one-way-anova'){const means=columns.map(values=>values.reduce((s,v)=>s+v,0)/values.length),within=columns.reduce((s,values,i)=>s+values.reduce((t,v)=>t+(v-means[i])**2,0),0);if(within<=1e-30)throw new Error('Classical one-way ANOVA is undefined because the within-group mean square is zero.');}
  if(['multiple-linear-regression','regression-diagnostics'].includes(operation)){const response=columns[columns.length-1];if(variance(response)<=1e-30)throw new Error('OLS regression diagnostics require a response column with nonzero sample variance.');}
}

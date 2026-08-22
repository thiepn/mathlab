import type { ObjectCapability } from './capabilities';
import type { SemanticMathObject } from './types';

type Seed=Omit<ObjectCapability,'applicable'|'available'|'reason'>;
const MATRIX:Seed[]=[
  {id:'covariance-correlation-matrix',label:'Covariance & correlation matrix',phase:'E6',group:'Multivariate statistics'},
  {id:'two-sample-mean-inference',label:'Welch two-sample mean inference…',phase:'E6',group:'Inference'},
  {id:'paired-mean-inference',label:'Paired mean inference…',phase:'E6',group:'Inference'},
  {id:'two-proportion-inference',label:'Two-proportion inference…',phase:'E6',group:'Inference'},
  {id:'chi-square-independence',label:'Chi-square independence test',phase:'E6',group:'Categorical inference'},
  {id:'one-way-anova',label:'One-way ANOVA',phase:'E6',group:'ANOVA'},
  {id:'multiple-linear-regression',label:'Multiple linear regression',phase:'E6',group:'Regression'},
  {id:'regression-diagnostics',label:'Regression diagnostics',phase:'E6',group:'Regression'},
  {id:'mann-whitney',label:'Mann–Whitney U test',phase:'E6',group:'Nonparametric'},
  {id:'wilcoxon-signed-rank',label:'Wilcoxon signed-rank test',phase:'E6',group:'Nonparametric'},
  {id:'markov-profile',label:'Finite Markov-chain profile',phase:'E6',group:'Stochastic processes'},
  {id:'markov-step',label:'Propagate Markov distribution…',phase:'E6',group:'Stochastic processes'},
];
const SAMPLE:Seed[]=[
  {id:'chi-square-goodness',label:'Chi-square goodness of fit…',phase:'E6',group:'Categorical inference'},
  {id:'bootstrap-mean',label:'Bootstrap mean interval…',phase:'E6',group:'Resampling'},
];
const DISTRIBUTION:Seed[]=[
  {id:'affine-rv-transform',label:'Affine random-variable transform…',phase:'E6',group:'Random variables'},
  {id:'joint-distribution-profile',label:'Joint distribution profile',phase:'E6',group:'Joint distributions'},
];
function ready(seed:Seed):ObjectCapability{return{...seed,applicable:true,available:true};}
function blocked(seed:Seed,reason:string):ObjectCapability{return{...seed,applicable:false,available:false,reason};}
function numericResolved(object:SemanticMathObject):boolean{return object.variables.length===0&&object.domain!=='complex';}
export function e6CapabilitiesForObject(object:SemanticMathObject):ObjectCapability[]{
  if(object.kind==='matrix'&&object.shape.type==='matrix'){
    const {rows,columns}=object.shape;
    return MATRIX.map(seed=>{
      if(!numericResolved(object))return blocked(seed,'E6 statistical matrix workflows require resolved real numeric entries.');
      if(seed.id==='covariance-correlation-matrix'&&(rows<2||columns<2))return blocked(seed,'Covariance/correlation requires at least two observations and two variable columns.');
      if(['two-sample-mean-inference','paired-mean-inference','two-proportion-inference','mann-whitney','wilcoxon-signed-rank'].includes(seed.id)&&(columns!==2||rows<2))return blocked(seed,'This E6 two-sample workflow expects an n×2 matrix with one sample or pair per column.');
      if(seed.id==='chi-square-independence'&&(rows<2||columns<2))return blocked(seed,'Chi-square independence requires at least a 2×2 contingency table.');
      if(seed.id==='one-way-anova'&&(rows<2||columns<2))return blocked(seed,'One-way ANOVA requires at least two group columns and two observations per group.');
      if(['multiple-linear-regression','regression-diagnostics'].includes(seed.id)&&(columns<2||rows<=columns))return blocked(seed,'Regression expects predictor columns followed by one response column, with more rows than model coefficients.');
      if(['markov-profile','markov-step'].includes(seed.id)&&rows!==columns)return blocked(seed,'Finite Markov workflows require a square transition matrix.');
      return ready(seed);
    });
  }
  if(object.kind==='vector'||object.kind==='dataset')return SAMPLE.map(seed=>numericResolved(object)?ready(seed):blocked(seed,'E6 sample workflows require resolved real numeric observations.'));
  if(object.kind==='distribution'){
    const joint=object.valueAst.type==='call'&&object.valueAst.name==='jointpmf';
    return DISTRIBUTION.map(seed=>{
      if(seed.id==='joint-distribution-profile')return joint?ready(seed):blocked(seed,'Joint profile requires jointpmf([[...], [...]]) with a normalized probability table.');
      return joint?blocked(seed,'Affine transform currently targets univariate distributions.'):ready(seed);
    });
  }
  return[];
}

export function filterBaseCapabilitiesForE6(object:SemanticMathObject,base:ObjectCapability[]):ObjectCapability[]{
  if(object.kind==='distribution'&&object.valueAst.type==='call'&&object.valueAst.name==='jointpmf')return base.filter(item=>!['distribution-probability','distribution-quantile','sampling-mean-profile','simulate-distribution'].includes(item.id));
  return base;
}

import type { ObjectCapability } from './capabilities';
import type { SemanticMathObject } from './types';

type Seed=Omit<ObjectCapability,'applicable'|'available'|'reason'>;
const ready=(seed:Seed):ObjectCapability=>({...seed,applicable:true,available:true});
const blocked=(seed:Seed,reason:string):ObjectCapability=>({...seed,applicable:false,available:false,reason});

const REWRITE:Seed={id:'lemma-rewrite',label:'Apply equality lemma…',phase:'E11',group:'Proof system II'};
const ORDER:Seed={id:'inequality-consequence',label:'Prove inequality consequence…',phase:'E11',group:'Proof system II'};
const QUANTIFIER:Seed={id:'finite-quantifier-proof',label:'Finite quantified proof…',phase:'E11',group:'Quantified reasoning'};
const INDUCTION:Seed={id:'induction-certificate',label:'Induction certificate…',phase:'E11',group:'Induction'};
const ANALYSIS:Seed={id:'analysis-theorem-certificate',label:'Analysis theorem certificate…',phase:'E11',group:'Upper-division reasoning'};
const LINEAR:Seed={id:'linear-algebra-theorem-certificate',label:'Linear-algebra theorem certificate…',phase:'E11',group:'Upper-division reasoning'};
const GROUP:Seed={id:'finite-group-theorem-certificate',label:'Finite-group theorem certificate…',phase:'E11',group:'Upper-division reasoning'};

export function e11CapabilitiesForObject(object:SemanticMathObject):ObjectCapability[]{
  const out:ObjectCapability[]=[];
  if(['expression','equation','inequality','function'].includes(object.kind))out.push(ready(REWRITE));
  if(object.kind==='inequality')out.push(ready(ORDER));
  if(object.kind==='finite-set')out.push(ready(QUANTIFIER));
  if(object.kind==='equation'||(object.kind==='function'&&object.parameters.length===1&&object.definitionStyle==='natural'))out.push(ready(INDUCTION));
  if(object.kind==='expression'||object.kind==='function'){
    const variables=object.kind==='function'?object.parameters:object.variables;
    out.push(variables.length===1?ready(ANALYSIS):blocked(ANALYSIS,'The E11 point theorem certificate currently requires exactly one independent real variable.'));
  }
  if(object.kind==='matrix')out.push(ready(LINEAR));
  if(object.kind==='finite-group')out.push(ready(GROUP));
  return out;
}

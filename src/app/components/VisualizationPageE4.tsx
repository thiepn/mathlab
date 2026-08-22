import { useMemo } from 'react';
import { odeVisualizationVectorField } from '../../lib/math/e4Ode';
import type { SemanticMathObject } from '../../lib/math/types';
import { VisualizationPageE3 } from './VisualizationPageE3';

interface VisualizationPageProps {
  objects: SemanticMathObject[];
  activeObject: SemanticMathObject | null;
  onActivateObject: (id: string) => void;
  onOpenObject: (id: string) => void;
}

function adaptOdeForE3(object: SemanticMathObject): SemanticMathObject {
  if (object.kind !== 'ode') return object;
  const field = odeVisualizationVectorField(object.valueAst);
  if (!field) return object;
  return {
    ...object,
    kind: 'function',
    valueAst: field.ast,
    shape: { type: 'function', arity: field.variables.length },
    parameters: field.variables,
    variables: [],
  };
}

export function VisualizationPageE4(props: VisualizationPageProps) {
  const objects = useMemo(() => props.objects.map(adaptOdeForE3), [props.objects]);
  const activeObject = useMemo(() => props.activeObject ? adaptOdeForE3(props.activeObject) : null, [props.activeObject]);
  return <VisualizationPageE3 {...props} objects={objects} activeObject={activeObject} />;
}

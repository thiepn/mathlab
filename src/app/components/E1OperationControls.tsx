import { useEffect, useState } from 'react';
import type { SemanticMathObject } from '../../lib/math/types';

export const E1_CONTROLLED_OPERATIONS = new Set([
  'partial-derivative',
  'mixed-partial',
  'directional-derivative',
  'linearization',
  'tangent-plane',
  'lagrange-multipliers',
]);

export function isE1ControlledOperation(operation: string): boolean {
  return E1_CONTROLLED_OPERATIONS.has(operation);
}

interface E1OperationControlsProps {
  operation: string;
  object: SemanticMathObject;
  running: boolean;
  onAction?: (operation: string, options?: Record<string, string | number | boolean>) => void;
}

function dimensions(object: SemanticMathObject): string[] {
  if (object.kind === 'function' && object.parameters.length) return object.parameters;
  return object.variables;
}

function pointPlaceholder(parameters: string[]): string {
  return parameters.map((_, index) => String(index + 1)).join(', ');
}

export function E1OperationControls({ operation, object, running, onAction }: E1OperationControlsProps) {
  const parameters = dimensions(object);
  const [partialVariable, setPartialVariable] = useState(parameters[0] ?? 'x');
  const [partialVariables, setPartialVariables] = useState(parameters.slice(0, 2).join(', '));
  const [point, setPoint] = useState(parameters.map(() => '0').join(', '));
  const [direction, setDirection] = useState(parameters.map((_, index) => index === 0 ? '1' : '0').join(', '));
  const [constraint, setConstraint] = useState(parameters.length >= 2 ? `${parameters[0]} + ${parameters[1]} = 1` : 'x + y = 1');

  useEffect(() => {
    setPartialVariable(parameters[0] ?? 'x');
    setPartialVariables(parameters.slice(0, 2).join(', '));
    setPoint(parameters.map(() => '0').join(', '));
    setDirection(parameters.map((_, index) => index === 0 ? '1' : '0').join(', '));
    setConstraint(parameters.length >= 2 ? `${parameters[0]} + ${parameters[1]} = 1` : 'x + y = 1');
  }, [object.id, object.source]);

  if (!isE1ControlledOperation(operation)) return null;

  if (operation === 'partial-derivative') {
    return (
      <div className="operation-control e1-operation-control">
        <label><span>Differentiate with respect to</span><select value={partialVariable} onChange={(event) => setPartialVariable(event.target.value)}>{parameters.map((parameter) => <option value={parameter} key={parameter}>{parameter}</option>)}</select></label>
        <button disabled={!partialVariable || running} onClick={() => onAction?.(operation, { partialVariable })}>Compute partial derivative</button>
      </div>
    );
  }

  if (operation === 'mixed-partial') {
    return (
      <div className="operation-control e1-operation-control">
        <label><span>Differentiation order</span><input value={partialVariables} onChange={(event) => setPartialVariables(event.target.value)} placeholder={parameters.slice(0, 2).join(', ')} /></label>
        <small>Enter variables in derivative order, for example {parameters.slice(0, 2).join(', ')}.</small>
        <button disabled={!partialVariables.trim() || running} onClick={() => onAction?.(operation, { partialVariables: partialVariables.trim() })}>Compute mixed partial</button>
      </div>
    );
  }

  if (operation === 'directional-derivative') {
    return (
      <div className="operation-control e1-operation-control">
        <label><span>Point ({parameters.join(', ')})</span><input value={point} onChange={(event) => setPoint(event.target.value)} placeholder={pointPlaceholder(parameters)} /></label>
        <label><span>Direction vector</span><input value={direction} onChange={(event) => setDirection(event.target.value)} placeholder={parameters.map((_, index) => index === 0 ? '1' : '0').join(', ')} /></label>
        <small>The direction is normalized automatically before evaluating ∇f · u.</small>
        <button disabled={!point.trim() || !direction.trim() || running} onClick={() => onAction?.(operation, { point: point.trim(), direction: direction.trim() })}>Compute directional derivative</button>
      </div>
    );
  }

  if (operation === 'linearization' || operation === 'tangent-plane') {
    return (
      <div className="operation-control e1-operation-control">
        <label><span>Base point ({parameters.join(', ')})</span><input value={point} onChange={(event) => setPoint(event.target.value)} placeholder={pointPlaceholder(parameters)} /></label>
        <button disabled={!point.trim() || running} onClick={() => onAction?.(operation, { point: point.trim() })}>{operation === 'tangent-plane' ? 'Build tangent plane' : 'Build linearization'}</button>
      </div>
    );
  }

  return (
    <div className="operation-control e1-operation-control">
      <label><span>Equality constraint</span><input value={constraint} onChange={(event) => setConstraint(event.target.value)} placeholder={`${parameters[0] ?? 'x'} + ${parameters[1] ?? 'y'} = 1`} /></label>
      <small>E1 currently handles one equality constraint when the stationarity equations reduce to a unique exact linear system.</small>
      <button disabled={!constraint.trim() || running} onClick={() => onAction?.('lagrange-multipliers', { constraint: constraint.trim() })}>Solve Lagrange system</button>
    </div>
  );
}

import type { SemanticMathObject } from '../../lib/math/types';
import { objectJourneyState } from '../objectJourney';
interface ObjectJourneyProps {
  object: SemanticMathObject;
  saved: boolean;
  ready?: boolean;
  variant: 'work' | 'graph';
  onEdit?: () => void;
  onGraph?: () => void;
  onTools?: () => void;
  onProof?: () => void;
  onBrowse?: () => void;
}

// One consistent object identity across work, graph, tools and proof.
// Navigation is explicit: the component never commits or mutates mathematics.
export function ObjectJourney({ object, saved, ready = true, variant, onEdit, onGraph, onTools, onProof, onBrowse }: ObjectJourneyProps) {
  const context = objectJourneyState(object, saved);
  return (
    <section className={`d1-object-journey is-${variant}`} aria-label={`Object workflow for ${context.name}`}>
      <div className="d1-journey-source">
        <span>{context.ownership}</span>
        <strong>{context.name}</strong>
      </div>
      <div className="d1-journey-actions" role="group" aria-label="Continue working with this object">
        {context.canReopen && onEdit && <button type="button" onClick={onEdit}>Edit {context.name}</button>}
        {context.canExplore && onGraph && <button type="button" disabled={!ready} title={!ready ? 'Finish saving locally before opening this graph.' : undefined} onClick={onGraph}>Graph {context.name}</button>}
        {onTools && <button type="button" onClick={onTools}>Tools for {context.name}</button>}
        {onProof && <button type="button" onClick={onProof}>Proof for {context.name}</button>}
        {onBrowse && <button type="button" onClick={onBrowse}>Saved objects</button>}
      </div>
    </section>
  );
}

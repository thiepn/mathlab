import { capabilitiesFor } from '../../lib/math/capabilities';
import type { SemanticMathObject } from '../../lib/math/types';
import { preferredWorkspaceActions } from '../workspaceOperations';

interface WorkspaceActionsProps {
  object: SemanticMathObject | null;
  runningOperation?: string;
  onRun: (operation: string) => void;
  onOpenTools: () => void;
  onOpenProof: () => void;
}

export function WorkspaceActions({ object, runningOperation = '', onRun, onOpenTools, onOpenProof }: WorkspaceActionsProps) {
  if (!object) {
    return (
      <section className="workspace-actions is-empty" aria-label="Available mathematical actions">
        <div><span className="section-kicker">Next step</span><strong>Enter or open mathematics first.</strong></div>
        <p>MathLab will surface the most relevant operations here once it knows what kind of object you are working with.</p>
      </section>
    );
  }

  const capabilities = capabilitiesFor(object);
  const available = capabilities.filter((item) => item.available);
  const preferred = preferredWorkspaceActions(capabilities);
  const groups = [...new Set(available.map((item) => item.group))];

  return (
    <section className="workspace-actions" aria-label="Suggested mathematical actions">
      <div className="workspace-actions-head">
        <div>
          <span className="section-kicker">Suggested actions</span>
          <strong>{available.length ? `${available.length} operations available` : 'No operation available for this object'}</strong>
        </div>
        <div className="workspace-actions-head-buttons">
          <button onClick={onOpenProof}>Proof Lab</button>
          <button className="all-tools-button" onClick={onOpenTools}>All tools <span>{available.length}</span></button>
        </div>
      </div>

      {preferred.length > 0 && (
        <div className="workspace-action-list">
          {preferred.map((item, index) => (
            <button
              key={item.id}
              className={index === 0 ? 'is-primary' : ''}
              disabled={Boolean(runningOperation)}
              onClick={() => onRun(item.id)}
            >
              <span>{runningOperation === item.id ? 'Computing…' : item.label}</span>
              <small>{item.group}</small>
            </button>
          ))}
        </div>
      )}

      <div className="workspace-action-groups" aria-label="Available tool groups">
        {groups.slice(0, 8).map((group) => <span key={group}>{group}</span>)}
        {groups.length > 8 && <span>+{groups.length - 8} more</span>}
      </div>
    </section>
  );
}

import { domainSymbol } from '../../lib/math/assumptions';
import { shapeLabel } from '../../lib/math/semantic';
import type { SemanticMathObject, WorkspaceActivity } from '../../lib/math/types';

interface ObjectSidebarProps {
  open?: boolean;
  onClose?: () => void;
  objects: SemanticMathObject[];
  activity: WorkspaceActivity[];
  pinnedObjectIds: string[];
  activeObjectId?: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
  onNew: () => void;
}

function glyph(object: SemanticMathObject) {
  return ({ matrix:'▦', vector:'→', function:'ƒ', sequence:'aₙ', scalar:'·', equation:'=', inequality:'≤', system:'≡', expression:'∑', unknown:'?' } as Record<string,string>)[object.kind] ?? '∑';
}

function timeLabel(timestamp: number) {
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return 'now';
  if (diff < 3_600_000) return `${Math.max(1, Math.floor(diff / 60_000))}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function ObjectSidebar({
  open = false,
  onClose,
  objects,
  activity,
  pinnedObjectIds,
  activeObjectId,
  onSelect,
  onDelete,
  onTogglePin,
  onNew,
}: ObjectSidebarProps) {
  const sorted = [...objects].sort((a, b) => {
    const ap = pinnedObjectIds.includes(a.id) ? 1 : 0;
    const bp = pinnedObjectIds.includes(b.id) ? 1 : 0;
    return bp - ap || b.updatedAt - a.updatedAt;
  });

  return (
    <aside className={`object-sidebar ${open ? 'is-open' : ''}`}>
      <div className="sidebar-top-action"><button className="new-object-button" onClick={onNew}><span>＋</span> New work</button></div>
      <div className="side-heading"><span>Objects</span><span className="object-count">{objects.length}</span></div>
      <div className="object-list semantic-object-list">
        {objects.length === 0 && (
          <div className="sidebar-empty">
            Named definitions live here. Try <code>A = [[1,2],[3,4]]</code> or <code>f(x) = x^2</code>.
          </div>
        )}
        {sorted.map((object) => (
          <div className={`semantic-object-row ${activeObjectId === object.id ? 'is-active' : ''}`} key={object.id}>
            <button className="semantic-object-main" onClick={() => onSelect(object.id)}>
              <span className="object-symbol">{glyph(object)}</span>
              <span className="object-source">{object.name ?? 'Anonymous'}</span>
              <span className="object-meta">{shapeLabel(object.shape)} · {domainSymbol(object.domain)}</span>
            </button>
            <button className={`object-pin ${pinnedObjectIds.includes(object.id) ? 'is-pinned' : ''}`} onClick={() => onTogglePin(object.id)} aria-label={`${pinnedObjectIds.includes(object.id) ? 'Unpin' : 'Pin'} ${object.name ?? 'object'}`}>◇</button>
            <button className="object-delete" onClick={() => onDelete(object.id)} aria-label={`Delete ${object.name ?? 'object'}`}>×</button>
          </div>
        ))}
      </div>

      <div className="side-rule" />
      <div className="side-heading"><span>Recent activity</span><span className="object-count">{Math.min(activity.length, 8)}</span></div>
      <div className="activity-list">
        {activity.length === 0 && <div className="sidebar-empty compact">Workspace changes will appear here.</div>}
        {activity.slice(0, 8).map((item) => (
          <button key={item.id} className="activity-row" disabled={!item.objectId || !objects.some((object) => object.id === item.objectId)} onClick={() => item.objectId && onSelect(item.objectId)}>
            <span className="activity-mark">{item.type === 'deleted' ? '−' : item.type === 'created' ? '+' : '·'}</span>
            <span><strong>{item.label}</strong><small>{timeLabel(item.createdAt)}</small></span>
          </button>
        ))}
      </div>

      <div className="side-spacer" />
      <div className="sidebar-footnote">Named objects are saved automatically. Anonymous expressions stay in the current scratch workspace.</div>
      {onClose && <button className="drawer-close mobile-only" onClick={onClose}>Close</button>}
    </aside>
  );
}

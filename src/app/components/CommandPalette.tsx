import { useEffect, useMemo, useRef, useState } from 'react';
import type { SemanticMathObject } from '../../lib/math/types';

interface CommandPaletteProps {
  onClose: () => void;
  objects: SemanticMathObject[];
  onNew: () => void;
  onOpenObject: (id: string) => void;
  onRoute: (route: 'workspace' | 'visualize' | 'proof' | 'practice' | 'reference') => void;
}

interface CommandItem { id: string; label: string; detail: string; run: () => void; }

export function CommandPalette({ onClose, objects, onNew, onOpenObject, onRoute }: CommandPaletteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    inputRef.current?.focus();
    return () => previous?.focus();
  }, []);

  const items = useMemo<CommandItem[]>(() => [
    { id: 'new', label: 'New work', detail: 'Start an empty mathematical scratch workspace', run: onNew },
    { id: 'workspace', label: 'Workspace', detail: 'Open the mathematical workspace', run: () => onRoute('workspace') },
    { id: 'visualize', label: 'Visualize', detail: 'Interactive 2D mathematical visualization', run: () => onRoute('visualize') },
    { id: 'proof', label: 'Proof Lab', detail: 'Verify transformations and logical entailment', run: () => onRoute('proof') },
    { id: 'practice', label: 'Practice', detail: 'Adaptive courses, review, and exams', run: () => onRoute('practice') },
    { id: 'reference', label: 'Course Reference', detail: 'Curriculum and capability map', run: () => onRoute('reference') },
    ...objects.map((object) => ({
      id: `object:${object.id}`,
      label: object.name ?? 'Anonymous object',
      detail: `${object.kind} · ${object.source}`,
      run: () => onOpenObject(object.id),
    })),
  ], [objects, onNew, onOpenObject, onRoute]);

  const filtered = items.filter((item) => `${item.label} ${item.detail}`.toLowerCase().includes(query.trim().toLowerCase()));
  const selected = filtered[Math.min(index, Math.max(0, filtered.length - 1))];

  const run = (item?: CommandItem) => {
    if (!item) return;
    item.run();
    onClose();
  };

  return (
    <div className="command-overlay" role="presentation" onMouseDown={onClose}>
      <section ref={dialogRef} className="command-palette" role="dialog" aria-modal="true" aria-label="Command palette" onMouseDown={(e) => e.stopPropagation()} onKeyDown={(event) => {
        if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
        if (event.key !== 'Tab') return;
        const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('input,button,[href],[tabindex]:not([tabindex="-1"])') ?? []).filter((node) => !node.hasAttribute('disabled'));
        if (!focusable.length) return;
        const first = focusable[0]; const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }}>
        <div className="command-search"><span>⌘</span><input ref={inputRef} value={query} onChange={(event) => { setQuery(event.target.value); setIndex(0); }} onKeyDown={(event) => {
          if (event.key === 'ArrowDown') { event.preventDefault(); setIndex((value) => Math.min(value + 1, filtered.length - 1)); }
          if (event.key === 'ArrowUp') { event.preventDefault(); setIndex((value) => Math.max(0, value - 1)); }
          if (event.key === 'Enter') { event.preventDefault(); run(selected); }
          if (event.key === 'Escape') onClose();
        }} placeholder="Search commands or workspace objects…" /></div>
        <div className="command-results">
          {filtered.length === 0 && <div className="command-empty">No matching command.</div>}
          {filtered.slice(0, 10).map((item, itemIndex) => (
            <button key={item.id} className={itemIndex === index ? 'is-active' : ''} onMouseEnter={() => setIndex(itemIndex)} onClick={() => run(item)}>
              <span>{item.label}<small>{item.detail}</small></span><kbd>↵</kbd>
            </button>
          ))}
        </div>
        <div className="command-hint">↑↓ navigate · Enter open · Esc close</div>
      </section>
    </div>
  );
}

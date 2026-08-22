import { useEffect, useMemo, useRef, useState } from 'react';
import type { SemanticMathObject } from '../../lib/math/types';
import { ALL_TOOL_CATALOG } from '../allToolCatalog';
import type { Route } from '../hooks/useHashRoute';
import { toolSearchText } from '../toolCatalog';

interface CommandPaletteProps {
  onClose: () => void;
  objects: SemanticMathObject[];
  onNew: () => void;
  onOpenObject: (id: string) => void;
  onRoute: (route: Route) => void;
  onTool: (toolId: string) => void;
}

interface CommandItem { id: string; label: string; detail: string; search: string; badge?: string; run: () => void; }

export function CommandPalette({ onClose, objects, onNew, onOpenObject, onRoute, onTool }: CommandPaletteProps) {
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
    { id: 'new', label: 'New work', detail: 'Start an empty mathematical scratch workspace', search: 'new work scratch input', badge: 'Action', run: onNew },
    { id: 'workspace', label: 'Workspace', detail: 'Open the mathematical workspace', search: 'workspace calculate input', badge: 'Page', run: () => onRoute('workspace') },
    { id: 'tools', label: 'Tools', detail: 'Browse the complete mathematical tool catalog', search: 'tools catalog functions features operations', badge: 'Page', run: () => onRoute('tools') },
    { id: 'visualize', label: 'Visualize', detail: 'Interactive mathematical visualization', search: 'visualize graph plot', badge: 'Page', run: () => onRoute('visualize') },
    { id: 'proof', label: 'Proof Lab', detail: 'Verify transformations and logical entailment', search: 'proof verify check work', badge: 'Page', run: () => onRoute('proof') },
    { id: 'practice', label: 'Practice', detail: 'Adaptive courses, review, and exams', search: 'practice course exam review', badge: 'Page', run: () => onRoute('practice') },
    { id: 'reference', label: 'Course Reference', detail: 'Curriculum and capability map', search: 'reference curriculum course', badge: 'Page', run: () => onRoute('reference') },
    ...ALL_TOOL_CATALOG.map((tool) => ({
      id: `tool:${tool.id}`,
      label: tool.label,
      detail: `${tool.category} · ${tool.phase} · ${tool.description}`,
      search: toolSearchText(tool),
      badge: 'Tool',
      run: () => onTool(tool.id),
    })),
    ...objects.map((object) => ({
      id: `object:${object.id}`,
      label: object.name ?? 'Anonymous object',
      detail: `${object.kind} · ${object.source}`,
      search: `${object.name ?? ''} ${object.kind} ${object.source}`.toLowerCase(),
      badge: 'Object',
      run: () => onOpenObject(object.id),
    })),
  ], [objects, onNew, onOpenObject, onRoute, onTool]);

  const normalized = query.trim().toLowerCase();
  const filtered = items.filter((item) => !normalized || `${item.label} ${item.detail} ${item.search}`.toLowerCase().includes(normalized));
  const selected = filtered[Math.min(index, Math.max(0, filtered.length - 1))];

  const run = (item?: CommandItem) => {
    if (!item) return;
    item.run();
    onClose();
  };

  return (
    <div className="command-overlay" role="presentation" onMouseDown={onClose}>
      <section ref={dialogRef} className="command-palette command-palette-m4" role="dialog" aria-modal="true" aria-label="Search MathLab" onMouseDown={(e) => e.stopPropagation()} onKeyDown={(event) => {
        if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
        if (event.key !== 'Tab') return;
        const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('input,button,[href],[tabindex]:not([tabindex="-1"])') ?? []).filter((node) => !node.hasAttribute('disabled'));
        if (!focusable.length) return;
        const first = focusable[0]; const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }}>
        <div className="command-search"><span>⌕</span><input ref={inputRef} value={query} onChange={(event) => { setQuery(event.target.value); setIndex(0); }} onKeyDown={(event) => {
          if (event.key === 'ArrowDown') { event.preventDefault(); setIndex((value) => Math.min(value + 1, filtered.length - 1)); }
          if (event.key === 'ArrowUp') { event.preventDefault(); setIndex((value) => Math.max(0, value - 1)); }
          if (event.key === 'Enter') { event.preventDefault(); run(selected); }
          if (event.key === 'Escape') onClose();
        }} placeholder="Search ANOVA, regression, Markov, SVD, Taylor, Bayes, RREF…" /></div>
        <div className="command-results">
          {filtered.length === 0 && <div className="command-empty">No matching tool, page, or workspace object.</div>}
          {filtered.slice(0, 12).map((item, itemIndex) => (
            <button key={item.id} className={itemIndex === index ? 'is-active' : ''} onMouseEnter={() => setIndex(itemIndex)} onClick={() => run(item)}>
              <span>{item.label}<small>{item.detail}</small></span><em>{item.badge}</em><kbd>↵</kbd>
            </button>
          ))}
        </div>
        <div className="command-hint">Search the full mathematics catalog · ↑↓ navigate · Enter open · Esc close</div>
      </section>
    </div>
  );
}
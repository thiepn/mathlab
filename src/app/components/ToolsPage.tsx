import { useEffect, useMemo, useState } from 'react';
import { capabilitiesFor } from '../../lib/math/capabilitiesE5';
import type { SemanticMathObject } from '../../lib/math/types';
import { ALL_TOOL_CATALOG } from '../allToolCatalog';
import { TOOL_CATEGORIES, toolNeedsConfiguration, toolSearchText, type ToolCatalogItem, type ToolCategory } from '../toolCatalog';
import { MathValue } from './MathValue';

interface ToolsPageProps {
  currentObject: SemanticMathObject | null;
  initialToolId?: string;
  onRun: (tool: ToolCatalogItem) => void;
  onConfigure: (tool: ToolCatalogItem) => void;
  onTryExample: (tool: ToolCatalogItem) => void;
}

const ALL_TOOLS: ToolCatalogItem[] = ALL_TOOL_CATALOG;

function kindLabel(kind: SemanticMathObject['kind']) {
  return kind.replace('finite-set', 'set').replace('ode', 'ODE');
}

export function ToolsPage({ currentObject, initialToolId = '', onRun, onConfigure, onTryExample }: ToolsPageProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ToolCategory | 'All'>('All');
  const [selectedId, setSelectedId] = useState(initialToolId || ALL_TOOLS[0]?.id || '');
  const capabilities = useMemo(() => capabilitiesFor(currentObject), [currentObject]);

  useEffect(() => {
    if (!initialToolId) return;
    setSelectedId(initialToolId);
    const tool = ALL_TOOLS.find((item) => item.id === initialToolId);
    if (tool) setCategory(tool.category);
  }, [initialToolId]);

  const normalized = query.trim().toLowerCase();
  const filtered = ALL_TOOLS.filter((tool) => (category === 'All' || tool.category === category) && (!normalized || toolSearchText(tool).includes(normalized)));
  const selected = ALL_TOOLS.find((tool) => tool.id === selectedId) ?? filtered[0] ?? ALL_TOOLS[0];
  const selectedCapability = selected ? capabilities.find((capability) => capability.id === selected.operation) : undefined;
  const readyCount = currentObject ? ALL_TOOLS.filter((tool) => capabilities.some((capability) => capability.id === tool.operation && capability.available)).length : 0;

  const statusFor = (tool: ToolCatalogItem) => {
    if (tool.specialRoute === 'visualize') return { label: 'Visualization workspace', tone: 'route' };
    if (tool.specialRoute === 'proof') return { label: 'Proof workspace', tone: 'route' };
    const capability = capabilities.find((item) => item.id === tool.operation);
    if (capability?.available) return { label: toolNeedsConfiguration(tool) ? 'Configure' : 'Ready now', tone: 'ready' };
    if (capability && !capability.applicable) return { label: 'Input needs adjustment', tone: 'blocked' };
    return { label: 'Try example', tone: 'example' };
  };

  const openSpecialRoute = (tool: ToolCatalogItem) => {
    if (tool.specialRoute === 'visualize') sessionStorage.setItem('mathlab:e3-mode', tool.operation);
    onConfigure(tool);
  };

  return (
    <main className="tools-page">
      <section className="tools-hero">
        <div>
          <span className="section-kicker">Mathematical tool catalog</span>
          <h1>Find the operation you need.</h1>
          <p>Search MathLab by mathematical task instead of memorizing object types or menus. Every item below maps to a real implemented engine or visualization workflow.</p>
        </div>
        <div className="tools-current-context">
          <span>Current work</span>
          <strong>{currentObject ? currentObject.name ?? kindLabel(currentObject.kind) : 'No mathematical object selected'}</strong>
          <small>{currentObject ? `${readyCount} computational catalog tool${readyCount === 1 ? '' : 's'} ready for this ${kindLabel(currentObject.kind)}.` : 'Choose a tool and start from its example or dedicated workspace.'}</small>
        </div>
      </section>

      <section className="tool-finder" aria-label="Search mathematical tools">
        <div className="tool-search-box">
          <span aria-hidden="true">⌕</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search ANOVA, regression, Markov, SVD, BFGS, RK45, Bayes, RREF…" aria-label="Search tools" />
          {query && <button onClick={() => setQuery('')}>Clear</button>}
        </div>
        <div className="tool-category-strip" role="group" aria-label="Tool categories">
          {(['All', ...TOOL_CATEGORIES] as const).map((item) => (
            <button key={item} className={category === item ? 'is-active' : ''} onClick={() => setCategory(item)}>{item}</button>
          ))}
        </div>
      </section>

      <div className="tools-layout">
        <section className="tool-results" aria-label="Tool search results">
          <div className="tool-results-heading"><strong>{category === 'All' ? 'All tools' : category}</strong><span>{filtered.length} result{filtered.length === 1 ? '' : 's'}</span></div>
          {filtered.length === 0 && <div className="tool-empty">No tool matches that search. Try a mathematical term such as “regression”, “Markov”, “SVD”, “optimization”, “phase plane”, “probability”, or “proof”.</div>}
          <div className="tool-card-list">
            {filtered.map((tool) => {
              const status = statusFor(tool);
              return (
                <button key={tool.id} className={`tool-card ${selected?.id === tool.id ? 'is-selected' : ''}`} onClick={() => setSelectedId(tool.id)}>
                  <span className="tool-card-main"><strong>{tool.label}</strong><small>{tool.description}</small></span>
                  <span className="tool-card-meta"><i className={`tool-status status-${status.tone}`}>{status.label}</i><b>{tool.phase}</b></span>
                </button>
              );
            })}
          </div>
        </section>

        {selected && (
          <aside className="tool-detail" aria-label={`${selected.label} details`}>
            <div className="tool-detail-heading">
              <span>{selected.category} · {selected.phase}</span>
              <h2>{selected.label}</h2>
              <p>{selected.description}</p>
            </div>

            <div className="tool-detail-section">
              <span>Works with</span>
              <div className="tool-kind-list">
                {selected.objectKinds.length ? selected.objectKinds.map((kind) => <b key={kind}>{kindLabel(kind)}</b>) : <b>Proof Lab</b>}
              </div>
            </div>

            <div className="tool-detail-section">
              <span>Example input</span>
              <div className="tool-example"><MathValue source={selected.example} compact={false} /></div>
              <button className="quiet-tool-button" onClick={() => void navigator.clipboard?.writeText(selected.example)}>Copy source</button>
            </div>

            {selectedCapability && !selectedCapability.applicable && selectedCapability.reason && (
              <div className="tool-requirement"><strong>Why it cannot run yet</strong><p>{selectedCapability.reason}</p></div>
            )}

            <div className="tool-detail-actions">
              {selected.specialRoute ? (
                <>
                  <button className="primary-action" onClick={() => openSpecialRoute(selected)}>{selected.specialRoute === 'visualize' ? 'Open visualization' : 'Open Proof Lab'}</button>
                  <button onClick={() => onTryExample(selected)}>Start from example</button>
                </>
              ) : selectedCapability?.available ? (
                toolNeedsConfiguration(selected)
                  ? <button className="primary-action" onClick={() => onConfigure(selected)}>Configure for current work</button>
                  : <button className="primary-action" onClick={() => onRun(selected)}>{selected.operation === 'graph' ? 'Open visualization' : 'Run on current work'}</button>
              ) : (
                <button className="primary-action" onClick={() => onTryExample(selected)}>Try this example</button>
              )}
              {selectedCapability?.available && !selected.specialRoute && <button onClick={() => onTryExample(selected)}>Start from example</button>}
            </div>
          </aside>
        )}
      </div>
    </main>
  );
}
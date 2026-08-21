import { useMemo, useRef, useState } from 'react';
import type { ParsedMath } from '../../lib/math/ast';
import { domainSymbol } from '../../lib/math/assumptions';
import { astToLatex, astToPlainText } from '../../lib/math/format';
import { dependentObjects } from '../../lib/math/workspaceLifecycle';
import { resolveSemanticObject, shapeLabel } from '../../lib/math/semantic';
import type { MathResult } from '../../lib/math/types';
import type { MathWorkspaceController } from '../hooks/useMathWorkspace';
import { AssumptionBar } from './AssumptionBar';
import { MathInput } from './MathInput';
import { MathPreview } from './MathPreview';
import { AlgebraResult } from './AlgebraResult';

interface WorkspaceProps {
  controller: MathWorkspaceController;
  onActiveParsed?: (parsed: ParsedMath) => void;
  mathResult?: MathResult | null;
  engineStatus?: 'idle' | 'running' | 'error' | 'done';
  engineError?: string;
  onClearResult?: () => void;
}

function downloadWorkspace(raw: string) {
  const blob = new Blob([raw], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `mathlab-workspace-${new Date().toISOString().slice(0, 10)}.json`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function Workspace({ controller, onActiveParsed, mathResult = null, engineStatus = 'idle', engineError = '', onClearResult }: WorkspaceProps) {
  const [submitted, setSubmitted] = useState<ParsedMath | null>(null);
  const [resolutionMessage, setResolutionMessage] = useState('');
  const [transferMessage, setTransferMessage] = useState('');
  const importRef = useRef<HTMLInputElement>(null);
  const editorSource = controller.activeObject?.source ?? '';

  const resolution = useMemo(
    () => submitted ? resolveSemanticObject(submitted, controller.state.objects, controller.state.assumptions) : null,
    [submitted, controller.state.objects, controller.state.assumptions],
  );
  const object = resolution?.object ?? controller.activeObject;
  const submittedErrors = submitted?.diagnostics.filter((item) => item.severity === 'error') ?? [];
  const persistedObject = object ? controller.state.objects.find((item) => item.id === object.id || (!!object.name && item.name === object.name)) : undefined;
  const usedBy = persistedObject ? dependentObjects(controller.state.objects, persistedObject.name) : [];

  const commit = (parsed: ParsedMath) => {
    setSubmitted(parsed);
    const result = controller.commitParsed(parsed);
    const error = result.diagnostics.find((item) => item.severity === 'error');
    if (error) setResolutionMessage(error.message);
    else if (result.object?.name && result.isDefinition) setResolutionMessage(result.shadowedObjectId ? `Updated ${result.object.name}.` : `Saved ${result.object.name} to the workspace.`);
    else setResolutionMessage('Working expression ready. Anonymous work stays temporary.');
  };

  const importFile = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > 5_000_000) throw new Error('Workspace file is too large. The release import limit is 5 MB.');
      const raw = await file.text();
      if (!window.confirm('Import this workspace and replace the current workspace? The previous autosave remains available through Recovery.')) return;
      controller.importWorkspace(raw);
      setSubmitted(null);
      setTransferMessage(`Imported ${file.name}.`);
    } catch (error) {
      setTransferMessage(error instanceof Error ? error.message : 'Could not import this workspace.');
    } finally {
      if (importRef.current) importRef.current.value = '';
    }
  };

  const restore = async () => {
    try {
      const restored = await controller.restoreRecovery();
      setSubmitted(null);
      setTransferMessage(restored ? 'Restored the previous autosave snapshot.' : 'No recovery snapshot is available yet.');
    } catch {
      setTransferMessage('Recovery storage could not be read. Close other MathLab tabs and try again.');
    }
  };

  return (
    <main className="workspace-main">
      <div className="workspace-heading p3-workspace-heading">
        <div>
          <span className="eyebrow">Mathematical workspace</span>
          <h1>{controller.activeObject?.name ? `Working on ${controller.activeObject.name}` : 'Work directly with mathematics.'}</h1>
        </div>
        <div className="workspace-heading-actions">
          <span className={`save-state save-${controller.saveState}`}><i />{controller.saveState === 'saving' ? 'Saving' : controller.saveState === 'error' ? 'Storage issue' : controller.saveState === 'loading' ? 'Loading' : 'Saved locally'}</span>
          <button onClick={() => downloadWorkspace(controller.exportWorkspace())}>Export</button>
          <button onClick={() => importRef.current?.click()}>Import</button>
          <button onClick={() => void restore()}>Recovery</button>
          <input ref={importRef} className="visually-hidden" type="file" accept="application/json,.json" onChange={(event) => void importFile(event.target.files?.[0])} />
        </div>
      </div>

      <MathInput initialValue={editorSource} onChangeParsed={onActiveParsed} onSubmit={commit} />

      <AssumptionBar
        assumptions={controller.state.assumptions}
        diagnostics={controller.assumptionDiagnostics}
        onAdd={controller.addAssumption}
        onRemove={controller.removeAssumption}
      />

      <section className="object-stage p3-stage">
        <div className="stage-heading">
          <div>
            <span className="section-kicker">{persistedObject ? 'Saved object' : object ? 'Scratch object' : 'Workspace canvas'}</span>
            <div className="object-type">
              {object ? `${object.name ?? 'Anonymous'} · ${shapeLabel(object.shape)} · ${domainSymbol(object.domain)}` : 'Enter an expression or choose a saved object'}
            </div>
          </div>
          {object?.ast && (
            <div className="stage-actions">
              <button onClick={() => void navigator.clipboard?.writeText(astToPlainText(object.ast))}>Copy</button>
              <button onClick={() => void navigator.clipboard?.writeText(astToLatex(object.ast))}>LaTeX</button>
            </div>
          )}
        </div>

        <div className="submitted-math-display p3-math-display">
          <MathPreview ast={submittedErrors.length ? null : object?.ast ?? null} fallback="Your current mathematical object will appear here." />
        </div>

        {object && (
          <div className="semantic-ledger p3-ledger">
            <div><span>Kind</span><strong>{object.kind}</strong></div>
            <div><span>Domain</span><strong>{domainSymbol(object.domain)}</strong></div>
            <div><span>Exactness</span><strong>{object.exactness}</strong></div>
            <div><span>Status</span><strong>{persistedObject ? 'saved' : 'temporary'}</strong></div>
          </div>
        )}
      </section>

      <AlgebraResult result={mathResult} status={engineStatus} error={engineError} onClear={onClearResult} />

      {object && (
        <section className="workspace-relations">
          <div className="result-heading"><span className="section-kicker">Object relationships</span><span>{persistedObject ? 'Persistent workspace' : 'Current scratch work'}</span></div>
          <div className="relationship-grid">
            <article>
              <span>Depends on</span>
              <strong>{object.dependencies.join(', ') || 'Nothing'}</strong>
              <p>{object.dependencies.length ? 'These named objects are referenced by the current definition.' : 'This object is independent of other saved workspace objects.'}</p>
            </article>
            <article>
              <span>Used by</span>
              <strong>{usedBy.map((item) => item.name).filter(Boolean).join(', ') || 'Nothing'}</strong>
              <p>{usedBy.length ? 'Renaming this object will update these dependent definitions.' : 'No saved object currently depends on this one.'}</p>
            </article>
            <article>
              <span>Assumptions</span>
              <strong>{object.assumptions.length ? object.assumptions.map((item) => item.label).join(' · ') : 'None'}</strong>
              <p>Assumptions remain explicit and travel with the semantic context.</p>
            </article>
          </div>
        </section>
      )}

      {(resolutionMessage || resolution?.diagnostics.length || transferMessage) && (
        <div className="semantic-message p3-message">
          {resolution?.diagnostics.map((item) => <span key={`${item.code}:${item.symbol ?? ''}`}>{item.severity === 'error' ? '!' : '·'} {item.message}</span>)}
          {resolutionMessage && <span>· {resolutionMessage}</span>}
          {transferMessage && <span>· {transferMessage}</span>}
        </div>
      )}

      <div className="phase-notice p3-notice">
        <strong>MathLab v1.0 RC2 release candidate.</strong> Exact symbolic mathematics, numerical methods, verification, visualization, and persistent practice now share one local-first workspace. Saved mathematical objects remain separate from learning progress.
      </div>
    </main>
  );
}

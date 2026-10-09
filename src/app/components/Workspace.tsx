import { lazy, Suspense, useMemo, useRef, useState } from 'react';
import type { ParsedMath } from '../../lib/math/ast';
import { domainSymbol } from '../../lib/math/assumptions';
import { astToLatex, astToPlainText } from '../../lib/math/format';
import { dependentObjects } from '../../lib/math/workspaceLifecycle';
import { resolveSemanticObject, shapeLabel } from '../../lib/math/semantic';
import type { MathResult } from '../../lib/math/types';
import { inspectStorageHealth, requestPersistentStorage, type StorageHealth } from '../../lib/storage/health';
import type { MathWorkspaceController } from '../hooks/useMathWorkspace';
import type { WorksheetController } from '../hooks/useWorksheet';
import { AssumptionBar } from './AssumptionBar';
import { MathInput } from './MathInput';
import { MathPreview } from './MathPreview';
import { AlgebraResult } from './AlgebraResult';
import { WorksheetTimeline } from './WorksheetTimeline';

const LazyWorkspaceActions = lazy(() => import('./WorkspaceActions').then((module) => ({ default: module.WorkspaceActions })));
const LazyShareSnapshotDialog = lazy(() => import('./ShareSnapshotDialog').then((module) => ({ default: module.ShareSnapshotDialog })));

interface WorkspaceProps {
  controller: MathWorkspaceController;
  onActiveParsed?: (parsed: ParsedMath) => void;
  mathResult?: MathResult | null;
  engineStatus?: 'idle' | 'running' | 'error' | 'done';
  engineError?: string;
  onClearResult?: () => void;
  onAction: (operation: string) => void;
  onOpenTools: () => void;
  onOpenProof: () => void;
  runningOperation?: string;
  worksheet: WorksheetController;
  editorSourceOverride?: string | null;
  onReuseSource: (source: string) => void;
  onCommitComplete?: () => void;
  onOpenSharedSnapshot: () => void;
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

export function Workspace({
  controller,
  onActiveParsed,
  mathResult = null,
  engineStatus = 'idle',
  engineError = '',
  onClearResult,
  onAction,
  onOpenTools,
  onOpenProof,
  runningOperation = '',
  worksheet,
  editorSourceOverride = null,
  onReuseSource,
  onCommitComplete,
  onOpenSharedSnapshot,
}: WorkspaceProps) {
  const [submitted, setSubmitted] = useState<ParsedMath | null>(null);
  const [resolutionMessage, setResolutionMessage] = useState('');
  const [transferMessage, setTransferMessage] = useState('');
  const [shareOpen,setShareOpen]=useState(false);
  const [storageHealth,setStorageHealth]=useState<StorageHealth|null>(null);
  const [storageChecking,setStorageChecking]=useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const editorSource = editorSourceOverride ?? controller.activeObject?.source ?? '';

  const resolution = useMemo(
    () => submitted ? resolveSemanticObject(submitted, controller.state.objects, controller.state.assumptions) : null,
    [submitted, controller.state.objects, controller.state.assumptions],
  );
  const object = resolution?.object ?? controller.activeObject;
  const persistedObject = object ? controller.state.objects.find((item) => item.id === object.id || (!!object.name && item.name === object.name)) : undefined;
  const usedBy = persistedObject ? dependentObjects(controller.state.objects, persistedObject.name) : [];

  const commit = (parsed: ParsedMath) => {
    if (!controller.hydrated || !worksheet.hydrated) {
      setResolutionMessage('Local workspace history is still loading. Commit will unlock when both object and worksheet storage are ready.');
      return;
    }
    setSubmitted(parsed);
    const result = controller.commitParsed(parsed);
    const error = result.diagnostics.find((item) => item.severity === 'error');
    if (error) setResolutionMessage(error.message);
    else if (result.object) {
      worksheet.recordInput(result.object.source, parsed.normalizedSource, result.object.kind, result);
      if (result.object.name && result.isDefinition) setResolutionMessage(result.shadowedObjectId ? `Updated ${result.object.name}.` : `Saved ${result.object.name} to the workspace.`);
      else setResolutionMessage('Working expression ready. Anonymous work stays temporary.');
      onCommitComplete?.();
    }
  };

  const importFile = async (file?: File) => {
    if (!file) return;
    if (!controller.hydrated) {
      setTransferMessage('Workspace storage is still loading. Import will unlock when the saved workspace is ready.');
      return;
    }
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
    if (!controller.hydrated) {
      setTransferMessage('Workspace storage is still loading. Recovery will unlock when the saved workspace is ready.');
      return;
    }
    try {
      const restored = await controller.restoreRecovery();
      setSubmitted(null);
      setTransferMessage(restored ? 'Restored the previous autosave snapshot.' : 'No recovery snapshot is available yet.');
    } catch {
      setTransferMessage('Recovery storage could not be read. Close other MathLab tabs and try again.');
    }
  };

  const checkStorageHealth = async () => {
    if (storageChecking) return;
    setStorageChecking(true);
    try { setStorageHealth(await inspectStorageHealth()); }
    finally { setStorageChecking(false); }
  };

  const makeStoragePersistent = async () => {
    const granted = await requestPersistentStorage();
    setTransferMessage(granted === true
      ? 'Browser granted durable storage for MathLab.'
      : granted === false
        ? 'Browser did not grant durable storage. Export important work periodically.'
        : 'Persistent-storage requests are not supported in this browser.');
    await checkStorageHealth();
  };

  const storagePercent = storageHealth?.ratio === null || storageHealth?.ratio === undefined
    ? null
    : Math.round(storageHealth.ratio * 100);

  return (
    <main className="workspace-main m3-workspace-main">
      <div className="workspace-heading p3-workspace-heading">
        <div>
          <span className="eyebrow">01 / Mathematics workspace</span>
          <h1>{controller.activeObject?.name ? controller.activeObject.name : 'The workbench'}</h1>
          <p className="workspace-heading-subtitle">Define a symbol, explore an expression, or pick up where you left off. Your calculations stay in one working notebook.</p>
        </div>
        <div className="workspace-heading-actions m3-heading-actions">
          <span className={`save-state save-${controller.saveState}`}><i />{controller.saveState === 'saving' ? 'Saving' : controller.saveState === 'error' ? 'Storage issue' : controller.saveState === 'loading' ? 'Loading' : 'Saved locally'}</span>
          <button className="p8-share-button" disabled={!controller.hydrated||!worksheet.hydrated} onClick={()=>setShareOpen(true)}>Share</button>
          <details className="workspace-data-menu" onToggle={(event) => { if (event.currentTarget.open && !storageHealth) void checkStorageHealth(); }}>
            <summary>Workspace data</summary>
            <div>
              <button disabled={!controller.hydrated} onClick={() => downloadWorkspace(controller.exportWorkspace())}>Export workspace</button>
              <button disabled={!controller.hydrated} onClick={() => importRef.current?.click()}>Import workspace</button>
              <button disabled={!controller.hydrated} onClick={() => void restore()}>Restore recovery</button>
              <button onClick={onOpenSharedSnapshot}>Open shared snapshot</button>
              <div className={`p9-storage-health is-${storageHealth?.pressure ?? 'unknown'}`}>
                <div role="status" aria-live="polite">
                  <strong>{storageChecking ? 'Checking local storage…' : storageHealth?.indexedDbReady === false ? 'Local storage unavailable' : 'Local storage health'}</strong>
                  {storageHealth && <span>
                    {storageHealth.indexedDbReady ? 'IndexedDB ready' : storageHealth.message ?? 'IndexedDB unavailable'}
                    {storagePercent !== null ? ` · ${storagePercent}% of browser quota used` : ''}
                    {storageHealth.persisted === true ? ' · durable storage granted' : storageHealth.persisted === false ? ' · eviction protection not granted' : ''}
                  </span>}
                </div>
                {storageHealth?.persistenceSupported && storageHealth.persisted === false && <button type="button" onClick={() => void makeStoragePersistent()}>Request durable storage</button>}
              </div>
            </div>
          </details>
          <input ref={importRef} className="visually-hidden" type="file" accept="application/json,.json" aria-label="Import workspace JSON" disabled={!controller.hydrated} onChange={(event) => void importFile(event.target.files?.[0])} />
        </div>
      </div>

      <MathInput initialValue={editorSource} canSubmit={controller.hydrated && worksheet.hydrated} onChangeParsed={onActiveParsed} onSubmit={commit} />

      <AssumptionBar
        assumptions={controller.state.assumptions}
        diagnostics={controller.assumptionDiagnostics}
        disabled={!controller.hydrated}
        onAdd={controller.addAssumption}
        onRemove={controller.removeAssumption}
      />

      <section className="current-work-card" aria-label="Current mathematical work">
        <div className="current-work-summary">
          <div>
            <span className="section-kicker">{persistedObject ? 'Saved object' : object ? 'Current work' : 'Ready'}</span>
            <strong>{object ? object.name ?? shapeLabel(object.shape) : 'Commit mathematics to unlock tools'}</strong>
            <small>{object ? `${shapeLabel(object.shape)} · ${domainSymbol(object.domain)} · ${object.exactness}` : 'The live preview above is editable; Commit turns it into the active mathematical object.'}</small>
          </div>
          {object?.ast && <div className="current-work-math"><MathPreview ast={object.ast} compact /></div>}
          {object?.ast && (
            <div className="current-work-copy">
              <button onClick={() => void navigator.clipboard?.writeText(astToPlainText(object.ast))}>Copy</button>
              <button onClick={() => void navigator.clipboard?.writeText(astToLatex(object.ast))}>LaTeX</button>
            </div>
          )}
        </div>
        {object && (
          <div className="current-work-ledger">
            <span>{persistedObject ? 'Saved' : 'Temporary'}</span>
            <span>{object.dependencies.length ? `${object.dependencies.length} dependenc${object.dependencies.length === 1 ? 'y' : 'ies'}` : 'Independent'}</span>
            <span>{object.assumptions.length ? `${object.assumptions.length} assumption${object.assumptions.length === 1 ? '' : 's'}` : 'No assumptions'}</span>
          </div>
        )}
      </section>

      {object ? (
        <Suspense fallback={<section className="workspace-actions is-loading" aria-live="polite">Loading available actions…</section>}>
          <LazyWorkspaceActions
            object={object}
            runningOperation={runningOperation}
            onRun={onAction}
            onOpenTools={onOpenTools}
            onOpenProof={onOpenProof}
          />
        </Suspense>
      ) : (
        <section className="workspace-actions is-empty" aria-label="Available mathematical actions">
          <div><span className="section-kicker">Next step</span><strong>Enter or open mathematics first.</strong></div>
          <p>MathLab will surface the most relevant operations here once it knows what kind of object you are working with.</p>
        </section>
      )}

      <AlgebraResult result={mathResult} status={engineStatus} error={engineError} onClear={onClearResult} onUseResult={onReuseSource} />

      <WorksheetTimeline
        controller={worksheet}
        excludeResultId={mathResult?.id}
        onUseSource={onReuseSource}
      />

      {object && (object.dependencies.length > 0 || usedBy.length > 0 || object.assumptions.length > 0) && (
        <details className="workspace-relations m3-relations">
          <summary>Object relationships &amp; assumptions</summary>
          <div className="relationship-grid">
            <article>
              <span>Depends on</span>
              <strong>{object.dependencies.join(', ') || 'Nothing'}</strong>
              <p>{object.dependencies.length ? 'Named objects referenced by this definition.' : 'Independent of other saved objects.'}</p>
            </article>
            <article>
              <span>Used by</span>
              <strong>{usedBy.map((item) => item.name).filter(Boolean).join(', ') || 'Nothing'}</strong>
              <p>{usedBy.length ? 'Saved definitions that depend on this object.' : 'No saved object currently depends on this one.'}</p>
            </article>
            <article>
              <span>Assumptions</span>
              <strong>{object.assumptions.length ? object.assumptions.map((item) => item.label).join(' · ') : 'None'}</strong>
              <p>Explicit mathematical assumptions carried with the current context.</p>
            </article>
          </div>
        </details>
      )}

      {(resolutionMessage || resolution?.diagnostics.length || transferMessage) && (
        <div className="semantic-message p3-message">
          {resolution?.diagnostics.map((item) => <span key={`${item.code}:${item.symbol ?? ''}`}>{item.severity === 'error' ? '!' : '·'} {item.message}</span>)}
          {resolutionMessage && <span>· {resolutionMessage}</span>}
          {transferMessage && <span>· {transferMessage}</span>}
        </div>
      )}

      <div className="phase-notice p3-notice m3-notice">
        <strong>Local-first workspace.</strong> Your saved mathematical objects and practice progress stay on this device unless you explicitly export or share them.
      </div>
      {shareOpen&&<Suspense fallback={null}><LazyShareSnapshotDialog workspace={controller.state} worksheet={worksheet.activeSession} onClose={()=>setShareOpen(false)}/></Suspense>}
    </main>
  );
}

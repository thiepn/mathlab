import { useEffect, useMemo, useRef, useState } from 'react';
import { astToLatex, astToPlainText } from '../../lib/math/format';
import type { WorksheetEntry } from '../../lib/math/worksheetTypes';
import type { WorksheetController } from '../hooks/useWorksheet';
import { operationLabels } from './AlgebraResult';
import { MathValue } from './MathValue';

interface WorksheetTimelineProps {
  controller: WorksheetController;
  excludeResultId?: string;
  onUseSource: (source: string) => void;
}

function resultSource(entry: Extract<WorksheetEntry, { type: 'result' }>) {
  return entry.result.resultAst ? astToPlainText(entry.result.resultAst) : entry.result.display;
}

function formatTime(value: number) {
  try {
    return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
  } catch {
    return new Date(value).toISOString().slice(11, 16);
  }
}

function downloadWorksheet(raw: string) {
  const blob = new Blob([raw], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `mathlab-worksheet-${new Date().toISOString().slice(0, 10)}.json`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function WorksheetTimeline({ controller, excludeResultId, onUseSource }: WorksheetTimelineProps) {
  const [title, setTitle] = useState(controller.activeSession?.title ?? '');
  const [message, setMessage] = useState('');
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => setTitle(controller.activeSession?.title ?? ''), [controller.activeSession?.id, controller.activeSession?.title]);

  const entries = useMemo(
    () => (controller.activeSession?.entries ?? []).filter((entry) => entry.type !== 'result' || entry.result.id !== excludeResultId),
    [controller.activeSession?.entries, excludeResultId],
  );

  const restoreRecovery = async () => {
    try {
      const restored = await controller.restoreRecovery();
      setMessage(restored ? 'Restored the previous worksheet autosave.' : 'No worksheet recovery snapshot is available yet.');
    } catch {
      setMessage('Worksheet recovery could not be read.');
    }
  };

  const importWorksheet = async (file?: File) => {
    if (!file) return;
    try {
      if (!window.confirm('Import this worksheet and replace the current worksheet sessions? The previous autosave remains available through Recovery.')) return;
      controller.importWorksheet(await file.text());
      setMessage(`Imported ${file.name}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not import this worksheet.');
    } finally {
      if (importRef.current) importRef.current.value = '';
    }
  };

  return (
    <section className="worksheet-timeline" aria-labelledby="worksheet-heading">
      <header className="worksheet-header">
        <div className="worksheet-heading">
          <span className="section-kicker" id="worksheet-heading">Mathematical worksheet</span>
          <div className="worksheet-title-row">
            <input
              value={title}
              aria-label="Worksheet session title"
              onChange={(event) => setTitle(event.target.value)}
              onBlur={() => controller.renameSession(title)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.currentTarget.blur();
                }
              }}
            />
            <span className={`worksheet-save save-${controller.saveState}`}>
              {controller.saveState === 'saving' ? 'Saving' : controller.saveState === 'error' ? 'Storage issue' : controller.saveState === 'loading' ? 'Loading' : 'Saved'}
            </span>
          </div>
          <p>{controller.activeSession?.entries.length ?? 0} persistent calculation entr{controller.activeSession?.entries.length === 1 ? 'y' : 'ies'} in this session.</p>
        </div>

        <div className="worksheet-controls" aria-label="Worksheet controls">
          <button disabled={!controller.canUndo} onClick={controller.undo} title="Undo the last worksheet change">Undo</button>
          <button disabled={!controller.canRedo} onClick={controller.redo} title="Redo the last worksheet change">Redo</button>
          <button onClick={() => void controller.checkpoint()}>Checkpoint</button>
          <button onClick={controller.newSession}>New session</button>
          <details className="worksheet-more">
            <summary>History</summary>
            <div className="worksheet-history-menu">
              <label>
                <span>Session</span>
                <select aria-label="Worksheet session" value={controller.state.activeSessionId} onChange={(event) => controller.selectSession(event.target.value)}>
                  {[...controller.state.sessions].reverse().map((session) => (
                    <option key={session.id} value={session.id}>{session.title} · {session.entries.length}</option>
                  ))}
                </select>
              </label>

              <div className="worksheet-history-actions">
                <button onClick={() => downloadWorksheet(controller.exportWorksheet())}>Export worksheet</button>
                <button onClick={() => importRef.current?.click()}>Import worksheet</button>
                <button onClick={() => void restoreRecovery()}>Restore recovery</button>
                <button disabled={!controller.activeSession?.entries.length} onClick={() => {
                  if (window.confirm('Clear this worksheet session? You can undo immediately afterward.')) controller.clearSession();
                }}>Clear session</button>
              </div>

              <div className="worksheet-checkpoints">
                <span>Saved checkpoints</span>
                {controller.checkpoints.length === 0 && <small>No manual checkpoints yet.</small>}
                {controller.checkpoints.map((checkpoint) => (
                  <button key={checkpoint.id} onClick={() => controller.restoreCheckpoint(checkpoint.id)}>
                    <strong>{checkpoint.label}</strong>
                    <small>{checkpoint.session.entries.length} entries · {formatTime(checkpoint.createdAt)}</small>
                  </button>
                ))}
              </div>
            </div>
          </details>
          <input ref={importRef} className="visually-hidden" type="file" accept="application/json,.json" aria-label="Import worksheet JSON" onChange={(event) => void importWorksheet(event.target.files?.[0])} />
        </div>
      </header>

      {message && <div className="worksheet-message" role="status">{message}</div>}

      <div className="worksheet-entries" aria-live="polite">
        {entries.length === 0 ? (
          <div className="worksheet-empty">
            <strong>This session is ready.</strong>
            <p>Commit mathematics or run an operation. Inputs and successful results will remain here across reloads.</p>
          </div>
        ) : entries.map((entry, index) => (
          <article className={`worksheet-entry worksheet-entry-${entry.type}`} key={entry.id}>
            <div className="worksheet-entry-index">{String(index + 1).padStart(2, '0')}</div>
            <div className="worksheet-entry-body">
              {entry.type === 'input' ? (
                <>
                  <header>
                    <div><span>Input</span><strong>{entry.objectName ?? entry.kind}</strong></div>
                    <time>{formatTime(entry.createdAt)}</time>
                  </header>
                  <div className="worksheet-entry-math"><MathValue source={entry.source} compact={false} /></div>
                  <footer>
                    <button onClick={() => onUseSource(entry.source)}>Use input</button>
                    <button onClick={() => void navigator.clipboard?.writeText(entry.source)}>Copy</button>
                    <button onClick={() => controller.removeEntry(entry.id)}>Remove</button>
                  </footer>
                </>
              ) : (
                <>
                  <header>
                    <div><span>Result</span><strong>{operationLabels[entry.operation] ?? entry.operation.replace(/-/g, ' ')}</strong></div>
                    <time>{formatTime(entry.createdAt)}</time>
                  </header>
                  <div className="worksheet-entry-math"><MathValue ast={entry.result.resultAst} source={entry.result.display || 'No symbolic result.'} compact={false} /></div>
                  <div className="worksheet-result-meta">
                    <span>{entry.result.exactness.toUpperCase()}</span>
                    <span>{entry.result.steps.length} step{entry.result.steps.length === 1 ? '' : 's'}</span>
                    {entry.result.warnings.length > 0 && <span>{entry.result.warnings.length} warning{entry.result.warnings.length === 1 ? '' : 's'}</span>}
                  </div>
                  {entry.result.warnings.length > 0 && (
                    <details className="worksheet-result-warnings">
                      <summary>Warnings</summary>
                      {entry.result.warnings.map((warning) => <p key={warning}>{warning}</p>)}
                    </details>
                  )}
                  <footer>
                    <button onClick={() => onUseSource(resultSource(entry))}>Use result</button>
                    <button onClick={() => void navigator.clipboard?.writeText(resultSource(entry))}>Copy</button>
                    {entry.result.resultAst && <button onClick={() => void navigator.clipboard?.writeText(astToLatex(entry.result.resultAst!))}>LaTeX</button>}
                    <button onClick={() => controller.removeEntry(entry.id)}>Remove</button>
                  </footer>
                </>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ParsedMath } from '../lib/math/ast';
import { parseMath } from '../lib/math/parser';
import { dependentObjects } from '../lib/math/workspaceLifecycle';
import { resolveSemanticObject } from '../lib/math/semantic';
import type { MathResult } from '../lib/math/types';
import { MathWorkerClient } from '../lib/worker/client';
import { Header } from './components/Header';
import { ObjectSidebar } from './components/ObjectSidebar';
import { ContextPanel } from './components/ContextPanel';
import { Workspace } from './components/Workspace';
import { VisualizationPage } from './components/VisualizationPage';
import { ProofLabPage } from './components/ProofLabPage';
import { PracticePage } from './components/PracticePage';
import { CourseReferencePage } from './components/CourseReferencePage';
import { CommandPalette } from './components/CommandPalette';
import { useHashRoute } from './hooks/useHashRoute';
import { useMathWorkspace } from './hooks/useMathWorkspace';

export function App() {
  const [route, setRoute] = useHashRoute();
  const [commandOpen, setCommandOpen] = useState(false);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeParsed, setActiveParsed] = useState<ParsedMath>(() => parseMath(''));
  const [mathResult, setMathResult] = useState<MathResult | null>(null);
  const [engineStatus, setEngineStatus] = useState<'idle' | 'running' | 'error' | 'done'>('idle');
  const [engineError, setEngineError] = useState('');
  const [runningOperation, setRunningOperation] = useState('');
  const workerClient = useRef<MathWorkerClient | null>(null);
  const controller = useMathWorkspace();

  const liveResolution = useMemo(
    () => resolveSemanticObject(activeParsed, controller.state.objects, controller.state.assumptions),
    [activeParsed, controller.state.objects, controller.state.assumptions],
  );
  const contextObject = liveResolution.object ?? controller.activeObject;
  const persistedContext = contextObject
    ? controller.state.objects.find((item) => item.id === contextObject.id || (!!contextObject.name && item.name === contextObject.name))
    : undefined;
  const dependents = persistedContext ? dependentObjects(controller.state.objects, persistedContext.name) : [];

  useEffect(() => () => workerClient.current?.dispose(), []);

  useEffect(() => {
    const label = route === 'proof' ? 'Proof Lab' : route[0].toUpperCase() + route.slice(1);
    document.title = `${label} · MathLab`;
  }, [route]);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);

  const clearResult = () => { setMathResult(null); setEngineStatus('idle'); setEngineError(''); setRunningOperation(''); };

  const changeActiveParsed = (parsed: ParsedMath) => {
    setActiveParsed(parsed);
    if (engineStatus !== 'idle') clearResult();
  };

  const executeOperation = async (operation: string, options?: Record<string, string | number | boolean>) => {
    if (!contextObject) return;
    if (!workerClient.current) workerClient.current = new MathWorkerClient();
    setRunningOperation(operation);
    setEngineStatus('running');
    setEngineError('');
    try {
      const result = await workerClient.current.execute({
        operation,
        input: contextObject.source,
        ast: contextObject.valueAst,
        assumptions: contextObject.assumptions,
        variable: contextObject.kind === 'function' && contextObject.parameters.length === 1
          ? contextObject.parameters[0]
          : contextObject.variables.length === 1 ? contextObject.variables[0] : undefined,
        options,
        bindings: controller.state.objects
          .filter((item) => item.name && ['scalar','expression','vector','matrix'].includes(item.kind))
          .map((item) => ({ name: item.name!, ast: item.valueAst })),
      });
      setMathResult(result);
      setEngineStatus('done');
    } catch (error) {
      setMathResult(null);
      setEngineStatus('error');
      setEngineError(error instanceof Error ? error.message : 'The local mathematics engine could not complete this operation.');
    } finally {
      setRunningOperation('');
    }
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen(true);
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        controller.clearSelection();
        setActiveParsed(parseMath(''));
        setRoute('workspace');
      }
      if (event.key === 'Escape') setCommandOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [controller.clearSelection, setRoute]);

  const activateObject = (id: string) => {
    controller.selectObject(id);
    const object = controller.state.objects.find((item) => item.id === id);
    setActiveParsed(parseMath(object?.source ?? ''));
    setDrawerOpen(false);
  };

  const openObject = (id: string) => {
    activateObject(id);
    setRoute('workspace');
  };

  const newWork = () => {
    controller.clearSelection();
    setActiveParsed(parseMath(''));
    setRoute('workspace');
    setDrawerOpen(false);
  };

  const requestDelete = (id: string) => {
    const object = controller.state.objects.find((item) => item.id === id);
    if (!object) return;
    const usedBy = controller.getDependents(id);
    const dependencyWarning = usedBy.length ? `\n\nUsed by: ${usedBy.map((item) => item.name).join(', ')}. Those definitions will keep their source and the symbol will become a free variable until it is defined again.` : '';
    if (window.confirm(`Delete ${object.name ?? 'this object'}?${dependencyWarning}`)) controller.removeObject(id);
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#mathlab-main">Skip to main content</a>
      <Header route={route} online={online} onRoute={setRoute} onCommand={() => setCommandOpen(true)} onMobileMenu={() => setDrawerOpen(true)} />
      <div className="app-grid" id="mathlab-main" tabIndex={-1}>
        <ObjectSidebar
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          objects={controller.state.objects}
          activity={controller.state.activity}
          pinnedObjectIds={controller.state.pinnedObjectIds}
          activeObjectId={controller.state.activeObjectId}
          onSelect={openObject}
          onDelete={requestDelete}
          onTogglePin={controller.togglePin}
          onNew={newWork}
        />
        {route === 'workspace' && <Workspace controller={controller} onActiveParsed={changeActiveParsed} mathResult={mathResult} engineStatus={engineStatus} engineError={engineError} onClearResult={clearResult} />}
        {route === 'visualize' && <VisualizationPage objects={controller.state.objects} activeObject={controller.activeObject} onActivateObject={activateObject} onOpenObject={openObject} />}
        {route === 'proof' && <ProofLabPage initialSource={contextObject?.source ?? ''} />}
        {route === 'practice' && <PracticePage />}
        {route === 'reference' && <CourseReferencePage />}
        <ContextPanel
          object={contextObject}
          diagnostics={liveResolution.diagnostics}
          persisted={Boolean(persistedContext)}
          pinned={persistedContext ? controller.state.pinnedObjectIds.includes(persistedContext.id) : false}
          dependents={dependents}
          onRename={persistedContext ? (name) => controller.renameObject(persistedContext.id, name) : undefined}
          onDuplicate={persistedContext ? () => controller.duplicate(persistedContext.id) : undefined}
          onTogglePin={persistedContext ? () => controller.togglePin(persistedContext.id) : undefined}
          onDelete={persistedContext ? () => requestDelete(persistedContext.id) : undefined}
          onAction={(operation, options) => {
            if (operation === 'graph') { setRoute('visualize'); return; }
            if (route !== 'workspace') setRoute('workspace');
            void executeOperation(operation, options);
          }}
          runningOperation={runningOperation}
        />
      </div>
      <nav className="mobile-nav mobile-only mobile-nav-five" aria-label="Mobile primary navigation">
        <button className={route === 'workspace' ? 'is-active' : ''} onClick={() => setRoute('workspace')}>Workspace</button>
        <button className={route === 'visualize' ? 'is-active' : ''} onClick={() => setRoute('visualize')}>Visualize</button>
        <button className={route === 'proof' ? 'is-active' : ''} onClick={() => setRoute('proof')}>Proof</button>
        <button className={route === 'practice' ? 'is-active' : ''} onClick={() => setRoute('practice')}>Practice</button>
        <button className={route === 'reference' ? 'is-active' : ''} onClick={() => setRoute('reference')}>Reference</button>
      </nav>
      {drawerOpen && <button className="drawer-backdrop mobile-only" onClick={() => setDrawerOpen(false)} aria-label="Close navigation" />}
      {commandOpen && (
        <CommandPalette
          onClose={() => setCommandOpen(false)}
          objects={controller.state.objects}
          onNew={newWork}
          onOpenObject={openObject}
          onRoute={(nextRoute) => setRoute(nextRoute)}
        />
      )}
    </div>
  );
}

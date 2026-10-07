import { lazy } from 'react';

export const LazyToolsPage = lazy(() => import('./components/ToolsPage').then((module) => ({ default: module.ToolsPage })));
export const LazyVisualizationPage = lazy(() => import('./components/VisualizationPage').then((module) => ({ default: module.VisualizationPage })));
export const LazyProofLabPage = lazy(() => import('./components/ProofLabPage').then((module) => ({ default: module.ProofLabPage })));
export const LazyPracticePage = lazy(() => import('./components/PracticePage').then((module) => ({ default: module.PracticePage })));
export const LazyCourseReferencePage = lazy(() => import('./components/CourseReferencePage').then((module) => ({ default: module.CourseReferencePage })));
export const LazySharedSnapshotPage = lazy(() => import('./components/SharedSnapshotPage').then((module) => ({ default: module.SharedSnapshotPage })));
export const LazyContextPanel = lazy(() => import('./components/ContextPanel').then((module) => ({ default: module.ContextPanel })));
export const LazyCommandPalette = lazy(() => import('./components/CommandPalette').then((module) => ({ default: module.CommandPalette })));

export function RouteLoading({ label = 'Loading MathLab module…' }: { label?: string }) {
  return (
    <div className="p9-route-loading" role="status" aria-live="polite">
      <span className="section-kicker">MathLab</span>
      <strong>{label}</strong>
    </div>
  );
}

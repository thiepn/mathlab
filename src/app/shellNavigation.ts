import type { Route } from './hooks/useHashRoute';

export type PrimarySection = 'work' | 'visualize' | 'learn';

export interface PrimaryDestination {
  id: PrimarySection;
  label: string;
  route: Route;
}

export interface SectionDestination {
  route: Route;
  label: string;
}

export const PRIMARY_NAV: readonly PrimaryDestination[] = [
  { id: 'work', label: 'Work', route: 'workspace' },
  { id: 'visualize', label: 'Visualize', route: 'visualize' },
  { id: 'learn', label: 'Learn', route: 'practice' },
];

export const SECTION_NAV: Readonly<Record<PrimarySection, readonly SectionDestination[]>> = {
  work: [
    { route: 'workspace', label: 'Workbench' },
    { route: 'tools', label: 'Tools' },
    { route: 'proof', label: 'Proof & Verify' },
  ],
  visualize: [],
  learn: [
    { route: 'practice', label: 'Practice' },
    { route: 'reference', label: 'Reference' },
  ],
};

export const ROUTE_TITLES: Readonly<Record<Route, string>> = {
  workspace: 'Work',
  tools: 'Tools',
  visualize: 'Visualize',
  proof: 'Proof & Verification',
  practice: 'Learn',
  reference: 'Reference',
};

export function primarySectionForRoute(route: Route): PrimarySection {
  if (route === 'visualize') return 'visualize';
  if (route === 'practice' || route === 'reference') return 'learn';
  return 'work';
}

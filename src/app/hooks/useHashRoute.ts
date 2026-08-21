import { useEffect, useState } from 'react';

export const ROUTES = ['workspace', 'visualize', 'proof', 'practice', 'reference'] as const;
export type Route = (typeof ROUTES)[number];

function readRoute(): Route {
  const candidate = window.location.hash.replace(/^#\/?/, '').split('/')[0];
  return ROUTES.includes(candidate as Route) ? (candidate as Route) : 'workspace';
}

export function useHashRoute(): [Route, (route: Route) => void] {
  const [route, setRouteState] = useState<Route>(() => readRoute());

  useEffect(() => {
    const listener = () => setRouteState(readRoute());
    window.addEventListener('hashchange', listener);
    return () => window.removeEventListener('hashchange', listener);
  }, []);

  const setRoute = (next: Route) => {
    window.location.hash = `/${next}`;
  };

  return [route, setRoute];
}

import { Logo } from './Logo';
import type { Route } from '../hooks/useHashRoute';

const labels: Record<Route, string> = {
  workspace: 'Workspace',
  visualize: 'Visualize',
  proof: 'Proof Lab',
  practice: 'Practice',
  reference: 'Reference',
};

interface HeaderProps {
  route: Route;
  online: boolean;
  onRoute: (route: Route) => void;
  onCommand: () => void;
  onMobileMenu: () => void;
}

export function Header({ route, online, onRoute, onCommand, onMobileMenu }: HeaderProps) {
  return (
    <header className="topbar">
      <button className="icon-button mobile-only" onClick={onMobileMenu} aria-label="Open navigation">☰</button>
      <Logo />
      <nav className="topnav" aria-label="Primary navigation">
        {(Object.keys(labels) as Route[]).map((item) => (
          <button
            key={item}
            className={`topnav__item ${route === item ? 'is-active' : ''}`}
            onClick={() => onRoute(item)}
            aria-current={route === item ? 'page' : undefined}
          >
            {labels[item]}
          </button>
        ))}
      </nav>
      <div className="topbar__actions">
        <span className={`release-connectivity ${online ? 'is-online' : 'is-offline'}`} role="status" aria-live="polite">
          <i />{online ? 'Local ready' : 'Offline'}
        </span>
        <span className="release-badge" title="MathLab v1.0.0-rc.2 release candidate">v1.0 RC2</span>
        <button className="command-button" onClick={onCommand} aria-label="Open command palette">
          <span>Search tools</span><kbd>Ctrl K</kbd>
        </button>
      </div>
    </header>
  );
}

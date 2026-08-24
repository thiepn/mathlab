import { Logo } from './Logo';
import type { Route } from '../hooks/useHashRoute';

const labels: Record<Route, string> = {
  workspace: 'Workspace',
  tools: 'Tools',
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
      <button className="icon-button mobile-only" onClick={onMobileMenu} aria-label="Open workspace objects">☰</button>
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
        <span className="release-badge" title="MathLab v2.0.0 stable release">v2.0</span>
        <button className="command-button" onClick={onCommand} aria-label="Search mathematical tools and workspace">
          <span>Search math</span><kbd>Ctrl K</kbd>
        </button>
      </div>
    </header>
  );
}

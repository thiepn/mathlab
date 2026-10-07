import { Logo } from './Logo';
import type { Route } from '../hooks/useHashRoute';
import { PRIMARY_NAV, SECTION_NAV, primarySectionForRoute } from '../shellNavigation';

interface HeaderProps {
  route: Route;
  online: boolean;
  onRoute: (route: Route) => void;
  onCommand: () => void;
  onMobileMenu: () => void;
}

export function Header({ route, online, onRoute, onCommand, onMobileMenu }: HeaderProps) {
  const activeSection = primarySectionForRoute(route);
  const sectionDestinations = SECTION_NAV[activeSection];

  return (
    <>
      <header className="topbar">
        <div className="mobile-shell-leading mobile-only">
          {route === 'workspace' && <button className="icon-button" onClick={onMobileMenu} aria-label="Open workspace objects">☰</button>}
        </div>
        <Logo />
        <nav className="topnav" aria-label="Primary navigation">
          {PRIMARY_NAV.map((destination) => (
            <button
              key={destination.id}
              className={`topnav__item ${activeSection === destination.id ? 'is-active' : ''}`}
              onClick={() => onRoute(destination.route)}
              aria-current={activeSection === destination.id ? 'location' : undefined}
            >
              {destination.label}
            </button>
          ))}
        </nav>
        <div className="topbar__actions">
          <span className={`release-connectivity ${online ? 'is-online' : 'is-offline'}`} role="status" aria-live="polite">
            <i />{online ? 'Local ready' : 'Offline'}
          </span>
          <span className="release-badge" title="MathLab v2.1.0 stable release">v2.1</span>
          <button className="command-button" onClick={onCommand} aria-label="Search mathematical tools and workspace">
            <span>Search math</span><kbd>Ctrl K</kbd>
          </button>
        </div>
      </header>

      {sectionDestinations.length > 0 && (
        <nav className="section-nav" aria-label={`${activeSection === 'work' ? 'Work' : 'Learn'} section navigation`}>
          <div className="section-nav__inner">
            {sectionDestinations.map((destination) => (
              <button
                key={destination.route}
                className={`section-nav__item ${route === destination.route ? 'is-active' : ''}`}
                onClick={() => onRoute(destination.route)}
                aria-current={route === destination.route ? 'page' : undefined}
              >
                {destination.label}
              </button>
            ))}
          </div>
        </nav>
      )}
    </>
  );
}

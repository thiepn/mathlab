import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State { return { error }; }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('MathLab application error', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="release-crash" role="alert">
        <span className="section-kicker">Release safety boundary</span>
        <h1>MathLab hit an unexpected interface error.</h1>
        <p>Your saved workspace and practice progress remain in local storage. Reload first; if the problem persists, use the browser's site-storage tools only after exporting any accessible workspace.</p>
        <details><summary>Technical detail</summary><pre>{this.state.error.message}</pre></details>
        <div className="release-crash-actions">
          <button className="primary-action" onClick={() => window.location.reload()}>Reload MathLab</button>
          <button onClick={() => this.setState({ error: null })}>Try returning to the app</button>
        </div>
      </main>
    );
  }
}

import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import './ErrorBoundary.scss';

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="eb-screen">
        <div className="eb-card">
          <div className="eb-icon" aria-hidden>⚠</div>
          <h2 className="eb-title">Что-то пошло не так</h2>
          <p className="eb-desc">
            В приложении произошла непредвиденная ошибка.<br />
            Попробуй перезагрузить страницу.
          </p>
          <details className="eb-details">
            <summary>Подробности</summary>
            <pre className="eb-stack">{this.state.error.message}</pre>
          </details>
          <button className="eb-btn" onClick={this.handleReload}>
            Перезагрузить
          </button>
        </div>
      </div>
    );
  }
}

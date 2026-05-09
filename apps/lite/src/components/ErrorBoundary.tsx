import * as React from 'react';

interface Props { children: React.ReactNode; }
interface State { error: Error | null; }

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(JSON.stringify({
      ts: new Date().toISOString(),
      level: 'ERROR',
      msg: 'react_error_boundary',
      error: error.message,
      componentStack: info.componentStack?.slice(0, 500),
    }));
  }

  render() {
    if (this.state.error) {
      return (
        <div className="h-dvh w-full flex flex-col items-center justify-center gap-4 bg-zinc-50 dark:bg-zinc-950 p-8 text-center">
          <div className="text-4xl">⚠️</div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Algo deu errado</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-md font-mono">
            {this.state.error.message}
          </p>
          <button
            onClick={() => this.setState({ error: null })}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
          >
            Tentar novamente
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

// If a screen throws while drawing, React would otherwise remove the whole page and leave it blank.
// This catches it and says so, with a way back. (React only offers this as a class component.)
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('A screen crashed', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="grid min-h-dvh place-items-center bg-canvas p-6 text-sm">
        <div className="grid max-w-md gap-3 text-center">
          <h1 className="text-lg font-semibold">Something went wrong on this page</h1>
          <p className="text-muted-foreground">Your picks and the food party are safe on the server. Reload to carry on.</p>
          <Button className="mx-auto" onClick={() => window.location.reload()}>Reload</Button>
        </div>
      </div>
    );
  }
}

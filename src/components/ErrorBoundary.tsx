import { Component, type ReactNode } from 'react';
import { SleepyCat } from './SleepyCat';

/** If something unexpected breaks, show a friendly screen instead of a blank page */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error('Snug crashed', error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-cream px-8 text-center">
        <SleepyCat className="w-40" />
        <h1 className="mt-4 text-2xl font-semibold">Oops, the cat knocked something over</h1>
        <p className="mt-2 max-w-xs text-sm text-cocoa">Your books are safe. Reload Snug to carry on.</p>
        <button
          className="mt-6 rounded-full bg-wine px-6 py-3 text-sm font-medium text-cream"
          onClick={() => {
            location.href = '/';
          }}
        >
          Reload
        </button>
      </div>
    );
  }
}

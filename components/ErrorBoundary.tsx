"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";

interface BoundaryProps {
  children: ReactNode;
  /** Short label shown in the fallback so the user knows which card failed. */
  label?: string;
}

interface BoundaryState {
  error: Error | null;
}

/**
 * Widget-level error boundary. A crashing card (corrupted storage shape, a
 * schema drift this build doesn't understand, an unexpected runtime error)
 * degrades to a compact fallback card instead of unmounting the whole page —
 * the rest of the dashboard keeps working.
 */
export class WidgetErrorBoundary extends Component<
  BoundaryProps,
  BoundaryState
> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[chizle] ${this.props.label ?? "widget"} crashed`, error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <section
        className="card p-5"
        role="alert"
        aria-label={`${this.props.label ?? "Widget"} failed to render`}
      >
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/25">
            <TriangleAlert className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">
              {this.props.label ?? "This card"} couldn&apos;t load
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-white/50">
              Something in your saved data confused it. Reloading usually
              helps — or clear the card&apos;s data and start fresh.
            </p>
          </div>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="btn-secondary shrink-0 !px-3 !py-1.5 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      </section>
    );
  }
}

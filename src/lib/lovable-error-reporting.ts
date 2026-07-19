// Lovable error reporting removed — no-op implementation
// This file replaces the previous Lovable integration so the app no longer
// depends on window.__lovableEvents at runtime. Keep the exported function
// signature so existing callers do not need to change.

type LovableErrorOptions = {
  mechanism?: "manual" | "onerror" | "unhandledrejection" | "react_error_boundary";
  handled?: boolean;
  severity?: "error" | "warning" | "info";
};

// Preserve the global declaration so any runtime references to
// window.__lovableEvents do not cause type errors during builds.
declare global {
  interface Window {
    __lovableEvents?: { captureException?: (...args: unknown[]) => void };
  }
}

export function reportLovableError(_error: unknown, _context: Record<string, unknown> = {}) {
  // no-op: Lovable runtime integration removed.
  // If you'd like application-level error reporting, replace this with
  // a call to your chosen provider (Sentry, Logflare, etc.) here.
}

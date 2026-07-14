import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createContext, useContext, type ReactNode } from "react";
import { getPageContent } from "@/lib/content.functions";

type PageBundle = { content: Record<string, string>; colors: Record<string, string> };

const PageContentCtx = createContext<PageBundle>({ content: {}, colors: {} });

/**
 * List of editable pages surfaced in the admin content editor.
 * Adding a page here makes it selectable in the admin UI.
 */
export const EDITABLE_PAGES = [
  { key: "index", label: "Landing page (/)" },
  { key: "auth", label: "Sign in / Register" },
  { key: "dashboard", label: "Dashboard" },
  { key: "plans", label: "Plans list" },
  { key: "deposit", label: "Deposit" },
  { key: "withdraw", label: "Withdraw" },
  { key: "profile", label: "Profile" },
  { key: "my-plans", label: "My plans" },
  { key: "referrals", label: "Referrals" },
  { key: "tasks", label: "Tasks" },
  { key: "support", label: "Support" },
] as const;

/**
 * Editable CSS variables. Values may be HSL like "220 90% 60%" (Tailwind theme
 * uses HSL vars) OR a hex/rgb — we inject as-is.
 */
export const EDITABLE_COLORS: { key: string; label: string; hint: string }[] = [
  { key: "--primary", label: "Primary", hint: "HSL e.g. 220 90% 60%" },
  { key: "--primary-foreground", label: "Primary text", hint: "HSL" },
  { key: "--background", label: "Background", hint: "HSL" },
  { key: "--foreground", label: "Text", hint: "HSL" },
  { key: "--card", label: "Card", hint: "HSL" },
  { key: "--muted", label: "Muted", hint: "HSL" },
  { key: "--muted-foreground", label: "Muted text", hint: "HSL" },
  { key: "--border", label: "Border", hint: "HSL" },
  { key: "--accent", label: "Accent", hint: "HSL" },
];

export function PageContentProvider({ pageKey, children }: { pageKey: string; children: ReactNode }) {
  const fetchPage = useServerFn(getPageContent);
  const { data } = useQuery({
    queryKey: ["page-content", pageKey],
    queryFn: () => fetchPage({ data: { pageKey } }),
    staleTime: 60_000,
  });
  const bundle: PageBundle = data ?? { content: {}, colors: {} };
  const styleVars = Object.entries(bundle.colors)
    .filter(([_, v]) => !!v)
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
  return (
    <PageContentCtx.Provider value={bundle}>
      {styleVars ? (
        <div style={{ display: "contents" } as any}>
          <style>{`[data-page="${pageKey}"]{${styleVars}}`}</style>
          <div data-page={pageKey} style={{ display: "contents" } as any}>
            {children}
          </div>
        </div>
      ) : children}
    </PageContentCtx.Provider>
  );
}

/** t(key, fallback) → override if set, else fallback (source of truth in code). */
export function usePageText() {
  const ctx = useContext(PageContentCtx);
  return (key: string, fallback: string) => {
    const v = ctx.content?.[key];
    return v && v.length ? v : fallback;
  };
}

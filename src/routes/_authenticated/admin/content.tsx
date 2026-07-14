import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getPageContent } from "@/lib/content.functions";
import { adminUpsertPageContent } from "@/lib/admin.functions";
import { EDITABLE_PAGES, EDITABLE_COLORS } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/content")({
  component: ContentAdmin,
});

function ContentAdmin() {
  const [pageKey, setPageKey] = useState<string>(EDITABLE_PAGES[0].key);
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Page</Label>
        <select className="w-full border border-input rounded-md h-10 px-2 bg-background mt-1" value={pageKey} onChange={(e) => setPageKey(e.target.value)}>
          {EDITABLE_PAGES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
      </div>
      <PageEditor key={pageKey} pageKey={pageKey} />
    </div>
  );
}

function PageEditor({ pageKey }: { pageKey: string }) {
  const fetchPage = useServerFn(getPageContent);
  const { data, isLoading } = useQuery({
    queryKey: ["page-content", pageKey],
    queryFn: () => fetchPage({ data: { pageKey } }),
  });
  const [content, setContent] = useState<Record<string, string>>({});
  const [colors, setColors] = useState<Record<string, string>>({});
  const [newKey, setNewKey] = useState("");

  useEffect(() => {
    if (data) {
      setContent(data.content ?? {});
      setColors(data.colors ?? {});
    }
  }, [data]);

  const qc = useQueryClient();
  const save = useServerFn(adminUpsertPageContent);
  const mut = useMutation({
    mutationFn: () => save({ data: {
      pageKey,
      content: Object.fromEntries(Object.entries(content).filter(([_, v]) => v && v.length)),
      colors: Object.fromEntries(Object.entries(colors).filter(([_, v]) => v && v.length)),
    } }),
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["page-content", pageKey] }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-xs text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Text overrides</h2>
        <p className="text-[11px] text-muted-foreground">Keys added below override the same-named `t(key, fallback)` call in that page's code. Leave blank to fall back to code default.</p>
        {Object.keys(content).length === 0 && <p className="text-xs text-muted-foreground italic">No custom overrides yet. Add a text key below.</p>}
        {Object.entries(content).map(([k, v]) => (
          <div key={k} className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] font-mono">{k}</Label>
              <button onClick={() => setContent((c) => { const n = { ...c }; delete n[k]; return n; })} className="text-destructive"><Trash2 className="size-3" /></button>
            </div>
            <Textarea rows={2} value={v} onChange={(e) => setContent((c) => ({ ...c, [k]: e.target.value }))} />
          </div>
        ))}
        <div className="flex gap-2">
          <Input placeholder="new.text.key (e.g. hero.title)" value={newKey} onChange={(e) => setNewKey(e.target.value)} />
          <Button variant="outline" onClick={() => { if (newKey) { setContent((c) => ({ ...c, [newKey]: "" })); setNewKey(""); } }}>
            <Plus className="size-4" />
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Colors (scoped to this page)</h2>
        <p className="text-[11px] text-muted-foreground">Values are CSS variables. Use HSL like <code className="text-[10px]">220 90% 60%</code> (matches the app's theme). Leave blank to inherit the site theme.</p>
        {EDITABLE_COLORS.map((c) => (
          <div key={c.key} className="grid grid-cols-[1fr_2fr] gap-2 items-center">
            <div>
              <Label className="text-[11px]">{c.label}</Label>
              <p className="text-[9px] text-muted-foreground font-mono">{c.key}</p>
            </div>
            <Input placeholder={c.hint} value={colors[c.key] ?? ""} onChange={(e) => setColors((cc) => ({ ...cc, [c.key]: e.target.value }))} />
          </div>
        ))}
      </section>

      <Button className="w-full" onClick={() => mut.mutate()} disabled={mut.isPending}>{mut.isPending ? "Saving…" : "Save changes"}</Button>
    </div>
  );
}

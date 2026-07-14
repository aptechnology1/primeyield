import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { adminListInvestments, adminDeleteInvestment, adminCompleteInvestment, adminRestartInvestment } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatNaira, formatDate } from "@/lib/format";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, RotateCcw, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/investments")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({ queryKey: ["admin-investments"], queryFn: () => (adminListInvestments as any)() }),
  component: InvestmentsPage,
});

function InvestmentsPage() {
  const fetch = useServerFn(adminListInvestments);
  const { data: invs } = useSuspenseQuery({ queryKey: ["admin-investments"], queryFn: () => fetch() });
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "completed">("all");
  const filtered = invs.filter((i: any) => {
    if (statusFilter !== "all" && i.status !== statusFilter) return false;
    if (!q) return true;
    const s = q.toLowerCase();
    return i.plan_name?.toLowerCase().includes(s) || i.profile?.email?.toLowerCase().includes(s) || i.profile?.full_name?.toLowerCase().includes(s);
  });
  return (
    <div className="space-y-4">
      <Input placeholder="Search by plan or user…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="flex gap-2 text-xs">
        {(["all", "active", "completed"] as const).map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1 rounded-full font-bold uppercase ${statusFilter === s ? "bg-foreground text-background" : "bg-card border border-border text-muted-foreground"}`}>{s}</button>
        ))}
      </div>
      <div className="space-y-2">
        {filtered.map((i: any) => <InvestmentCard key={i.id} inv={i} />)}
        {filtered.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No investments.</p>}
      </div>
    </div>
  );
}

function InvestmentCard({ inv }: { inv: any }) {
  const qc = useQueryClient();
  const del = useServerFn(adminDeleteInvestment);
  const complete = useServerFn(adminCompleteInvestment);
  const restart = useServerFn(adminRestartInvestment);
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-investments"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };
  const mDel = useMutation({ mutationFn: () => del({ data: { id: inv.id } }), onSuccess: () => { toast.success("Deleted"); invalidate(); }, onError: (e: any) => toast.error(e.message) });
  const mComplete = useMutation({ mutationFn: () => complete({ data: { id: inv.id } }), onSuccess: () => { toast.success("Marked complete"); invalidate(); }, onError: (e: any) => toast.error(e.message) });
  const mRestart = useMutation({ mutationFn: () => restart({ data: { id: inv.id } }), onSuccess: () => { toast.success("Restarted"); invalidate(); }, onError: (e: any) => toast.error(e.message) });

  const pct = Math.min(100, (Number(inv.days_paid) / Number(inv.duration_days)) * 100);
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold truncate">{inv.plan_name} <span className={`text-[10px] font-bold uppercase ml-1 ${inv.status === "active" ? "text-primary" : "text-muted-foreground"}`}>· {inv.status}</span></p>
          <p className="text-[11px] text-muted-foreground truncate">{inv.profile?.full_name ?? "—"} · {inv.profile?.email ?? "—"}</p>
          <p className="text-[10px] text-muted-foreground font-mono">{formatNaira(inv.amount)} · {inv.daily_roi_pct}%/day · {inv.duration_days}d · {inv.return_principal ? "returns principal" : "no principal"}</p>
          <p className="text-[10px] text-muted-foreground">Start {formatDate(inv.started_at)} · End {formatDate(inv.ends_at)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-mono font-bold text-primary">+{formatNaira(inv.total_earned)}</p>
          <p className="text-[10px] text-muted-foreground">{inv.days_paid}/{inv.duration_days} days</p>
        </div>
      </div>
      <div className="w-full bg-muted h-1 rounded-full overflow-hidden"><div className="bg-primary h-full" style={{ width: `${pct}%` }} /></div>
      <div className="flex gap-2 flex-wrap">
        {inv.status !== "completed" && (
          <Button size="sm" variant="outline" onClick={() => mComplete.mutate()} disabled={mComplete.isPending}>
            <CheckCircle2 className="size-4 mr-1" />Complete
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => { if (confirm("Restart this investment? Days paid and earned reset.")) mRestart.mutate(); }} disabled={mRestart.isPending}>
          <RotateCcw className="size-4 mr-1" />Restart
        </Button>
        <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete this investment permanently?")) mDel.mutate(); }} disabled={mDel.isPending}>
          <Trash2 className="size-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

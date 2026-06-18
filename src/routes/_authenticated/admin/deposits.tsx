import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { adminListDeposits, adminApproveDeposit, adminRejectDeposit } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatNaira, formatDateTime } from "@/lib/format";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/deposits")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({ queryKey: ["admin-deposits"], queryFn: () => (adminListDeposits as any)() }),
  component: DepositsAdmin,
});

function DepositsAdmin() {
  const fetch = useServerFn(adminListDeposits);
  const { data: deps } = useSuspenseQuery({ queryKey: ["admin-deposits"], queryFn: () => fetch() });
  const [filter, setFilter] = useState<"all" | "pending">("pending");
  const filtered = deps.filter((d: any) => filter === "all" || d.status === "pending");
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <FilterChip active={filter === "pending"} onClick={() => setFilter("pending")}>Pending</FilterChip>
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>All</FilterChip>
      </div>
      {filtered.map((d: any) => <DepCard key={d.id} d={d} />)}
      {filtered.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No deposits.</p>}
    </div>
  );
}

function FilterChip({ active, onClick, children }: any) {
  return (
    <button onClick={onClick} className={`px-3 py-1 rounded-full text-xs font-bold ${active ? "bg-foreground text-background" : "bg-card border border-border"}`}>
      {children}
    </button>
  );
}

function DepCard({ d }: { d: any }) {
  const qc = useQueryClient();
  const approve = useServerFn(adminApproveDeposit);
  const reject = useServerFn(adminRejectDeposit);
  const [note, setNote] = useState("");

  const aMut = useMutation({
    mutationFn: () => approve({ data: { id: d.id } }),
    onSuccess: () => { toast.success("Approved"); qc.invalidateQueries({ queryKey: ["admin-deposits"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const rMut = useMutation({
    mutationFn: () => reject({ data: { id: d.id, note } }),
    onSuccess: () => { toast.success("Rejected"); qc.invalidateQueries({ queryKey: ["admin-deposits"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-2">
      <div className="flex justify-between items-start">
        <div className="min-w-0">
          <p className="text-sm font-bold font-mono">{formatNaira(d.amount)}</p>
          <p className="text-[11px] text-muted-foreground">{d.profile?.full_name ?? "—"} · {d.profile?.email}</p>
          <p className="text-[10px] text-muted-foreground">{d.method.toUpperCase()} · {formatDateTime(d.created_at)}</p>
        </div>
        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
          d.status === "completed" ? "bg-primary-soft text-primary" :
          d.status === "rejected" || d.status === "failed" ? "bg-destructive/10 text-destructive" :
          "bg-muted text-muted-foreground"
        }`}>{d.status}</span>
      </div>
      {d.proof_note && <p className="text-[11px] bg-muted/40 p-2 rounded">{d.proof_note}</p>}
      {d.paystack_ref && <p className="text-[10px] text-muted-foreground font-mono">ref: {d.paystack_ref}</p>}
      {d.admin_note && <p className="text-[11px] text-destructive">{d.admin_note}</p>}
      {d.status === "pending" && (
        <div className="flex gap-2 pt-1">
          <Button size="sm" disabled={aMut.isPending} onClick={() => aMut.mutate()}>Approve & credit</Button>
          <Dialog>
            <DialogTrigger asChild><Button size="sm" variant="outline">Reject</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Reject deposit</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-4">
                <Input placeholder="Reason" value={note} onChange={(e) => setNote(e.target.value)} />
                <Button variant="destructive" disabled={!note || rMut.isPending} onClick={() => rMut.mutate()}>Reject</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { adminListWithdrawals, adminMarkWithdrawalPaid, adminRejectWithdrawal } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatNaira, formatDateTime } from "@/lib/format";
import { useState } from "react";
import { toast } from "sonner";
import { Copy } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/withdrawals")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({ queryKey: ["admin-withdrawals"], queryFn: () => (adminListWithdrawals as any)() }),
  component: WithdrawalsAdmin,
});

function WithdrawalsAdmin() {
  const fetch = useServerFn(adminListWithdrawals);
  const { data: ws } = useSuspenseQuery({ queryKey: ["admin-withdrawals"], queryFn: () => fetch() });
  const [filter, setFilter] = useState<"all" | "pending">("pending");
  const filtered = ws.filter((w: any) => filter === "all" || w.status === "pending");
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button onClick={() => setFilter("pending")} className={`px-3 py-1 rounded-full text-xs font-bold ${filter === "pending" ? "bg-foreground text-background" : "bg-card border border-border"}`}>Pending</button>
        <button onClick={() => setFilter("all")} className={`px-3 py-1 rounded-full text-xs font-bold ${filter === "all" ? "bg-foreground text-background" : "bg-card border border-border"}`}>All</button>
      </div>
      {filtered.map((w: any) => <WCard key={w.id} w={w} />)}
      {filtered.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">Nothing here.</p>}
    </div>
  );
}

function WCard({ w }: { w: any }) {
  const qc = useQueryClient();
  const pay = useServerFn(adminMarkWithdrawalPaid);
  const reject = useServerFn(adminRejectWithdrawal);
  const [note, setNote] = useState("");

  const payMut = useMutation({
    mutationFn: () => pay({ data: { id: w.id } }),
    onSuccess: () => { toast.success("Marked paid"); qc.invalidateQueries({ queryKey: ["admin-withdrawals"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const rMut = useMutation({
    mutationFn: () => reject({ data: { id: w.id, note } }),
    onSuccess: () => { toast.success("Rejected & refunded"); qc.invalidateQueries({ queryKey: ["admin-withdrawals"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div className="min-w-0">
          <p className="text-sm font-bold font-mono">{formatNaira(w.amount)} → {formatNaira(w.net_amount)} net</p>
          <p className="text-[11px] text-muted-foreground">{w.profile?.full_name ?? "—"} · {w.profile?.email}</p>
          <p className="text-[10px] text-muted-foreground">{formatDateTime(w.created_at)}</p>
        </div>
        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
          w.status === "completed" ? "bg-primary-soft text-primary" :
          w.status === "rejected" ? "bg-destructive/10 text-destructive" :
          "bg-muted text-muted-foreground"
        }`}>{w.status}</span>
      </div>
      <div className="bg-muted/40 rounded p-2 text-xs space-y-0.5">
        <p className="font-bold">{w.bank_account_name}</p>
        <p className="font-mono flex items-center gap-1.5">
          {w.bank_name} · {w.bank_account_no}
          <button onClick={() => { navigator.clipboard.writeText(w.bank_account_no); toast.success("Copied"); }}><Copy className="size-3" /></button>
        </p>
      </div>
      {w.admin_note && <p className="text-[11px] text-destructive">{w.admin_note}</p>}
      {w.status === "pending" && (
        <div className="flex gap-2">
          <Button size="sm" disabled={payMut.isPending} onClick={() => { if (confirm("Confirm you've sent the money?")) payMut.mutate(); }}>Mark paid</Button>
          <Dialog>
            <DialogTrigger asChild><Button size="sm" variant="outline">Reject & refund</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Reject & refund</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-4">
                <Input placeholder="Reason" value={note} onChange={(e) => setNote(e.target.value)} />
                <Button variant="destructive" disabled={!note || rMut.isPending} onClick={() => rMut.mutate()}>Reject & refund</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}

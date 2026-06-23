import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getWithdrawals } from "@/lib/user.functions";
import { formatNaira, formatDateTime } from "@/lib/format";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/withdraw-history")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({ queryKey: ["withdrawals"], queryFn: () => (getWithdrawals as any)() }),
  component: Page,
});

function Page() {
  const fetchW = useServerFn(getWithdrawals);
  const { data: withdrawals } = useSuspenseQuery({ queryKey: ["withdrawals"], queryFn: () => fetchW() });
  return (
    <div className="px-5 pt-6 pb-6 space-y-4">
      <Link to="/withdraw" className="text-xs text-muted-foreground inline-flex items-center gap-1"><ChevronLeft className="size-3" /> Back to withdraw</Link>
      <h1 className="text-2xl font-bold tracking-tight">Withdrawal history</h1>
      {withdrawals.length === 0 ? (
        <p className="text-xs text-muted-foreground">No withdrawals yet.</p>
      ) : (
        <div className="divide-y divide-border border-t border-b border-border">
          {withdrawals.map((w: any) => (
            <div key={w.id} className="py-3 flex justify-between items-start">
              <div>
                <p className="text-xs font-bold">{formatNaira(w.amount)} → {formatNaira(w.net_amount)} net</p>
                <p className="text-[10px] text-muted-foreground">{formatDateTime(w.created_at)}</p>
                {w.admin_note && <p className="text-[10px] text-destructive mt-0.5">{w.admin_note}</p>}
              </div>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                w.status === "completed" ? "bg-primary-soft text-primary" :
                w.status === "rejected" ? "bg-destructive/10 text-destructive" :
                "bg-muted text-muted-foreground"
              }`}>{w.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getDeposits } from "@/lib/user.functions";
import { formatNaira, formatDateTime } from "@/lib/format";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/deposit-history")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({ queryKey: ["deposits"], queryFn: () => (getDeposits as any)() }),
  component: Page,
});

function Page() {
  const fetchDeps = useServerFn(getDeposits);
  const { data: deposits } = useSuspenseQuery({ queryKey: ["deposits"], queryFn: () => fetchDeps() });
  return (
    <div className="px-5 pt-6 pb-6 space-y-4">
      <Link to="/deposit" className="text-xs text-muted-foreground inline-flex items-center gap-1"><ChevronLeft className="size-3" /> Back to deposit</Link>
      <h1 className="text-2xl font-bold tracking-tight">Deposit history</h1>
      {deposits.length === 0 ? (
        <p className="text-xs text-muted-foreground">No deposits yet.</p>
      ) : (
        <div className="divide-y divide-border border-t border-b border-border">
          {deposits.map((d: any) => (
            <div key={d.id} className="py-3 flex justify-between items-center">
              <div>
                <p className="text-xs font-bold">{formatNaira(d.amount)} · {d.method}</p>
                <p className="text-[10px] text-muted-foreground">{formatDateTime(d.created_at)}</p>
              </div>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                d.status === "completed" ? "bg-primary-soft text-primary" :
                d.status === "rejected" || d.status === "failed" ? "bg-destructive/10 text-destructive" :
                "bg-muted text-muted-foreground"
              }`}>{d.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

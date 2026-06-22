import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getTransactions } from "@/lib/user.functions";
import { formatNaira, formatDate } from "@/lib/format";
import { ArrowLeft, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/transactions")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({
      queryKey: ["transactions"],
      queryFn: () => (getTransactions as any)(),
    }),
  component: TransactionsPage,
});

const LABELS: Record<string, (tx: any) => string> = {
  daily_checkin: () => "Daily login bonus",
  roi: (tx) => tx.description ?? "Profits from investment",
  deposit: () => "Deposit",
  withdrawal: (tx) => `Withdrew ${formatNaira(tx.amount).replace("₦", "")}`,
  investment: (tx) => tx.description ?? "Plan purchase",
  referral: (tx) => tx.description ?? "Referral commission",
  welcome_bonus: () => "Welcome bonus",
  refund: (tx) => tx.description ?? "Principal returned",
};

function TransactionsPage() {
  const fetchTx = useServerFn(getTransactions);
  const { data: txs } = useSuspenseQuery({
    queryKey: ["transactions"],
    queryFn: () => fetchTx(),
  });

  return (
    <div className="px-5 pt-6 pb-6 space-y-5">
      <header className="flex items-center gap-3">
        <Link
          to="/dashboard"
          className="size-10 rounded-lg bg-card border border-border flex items-center justify-center"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Transaction Records</h1>
      </header>

      <div className="border-t border-border pt-4 flex items-center gap-2 text-sm text-muted-foreground">
        <span className="size-2 rounded-full bg-primary" />
        {txs.length} {txs.length === 1 ? "record" : "records"}
      </div>

      {txs.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">No transactions yet.</p>
      ) : (
        <div className="space-y-3">
          {txs.map((tx: any) => {
            const labelFn = LABELS[tx.type];
            const label = labelFn ? labelFn(tx) : (tx.description ?? tx.type);
            return (
              <div
                key={tx.id}
                className="bg-card border border-border rounded-xl p-3 flex items-center gap-3"
              >
                <div className="size-12 rounded-lg bg-primary-soft flex items-center justify-center shrink-0">
                  <Clock className="size-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold font-mono">{formatNaira(tx.amount)}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(tx.created_at)}</p>
                </div>
                <span className="text-xs font-semibold text-primary text-right max-w-[45%]">
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

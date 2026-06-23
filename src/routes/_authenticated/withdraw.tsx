import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { requestWithdrawal, getWithdrawals, getDashboard } from "@/lib/user.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatNaira, formatDateTime } from "@/lib/format";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/withdraw")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData({ queryKey: ["dashboard"], queryFn: () => (getDashboard as any)() }),
      context.queryClient.ensureQueryData({ queryKey: ["withdrawals"], queryFn: () => (getWithdrawals as any)() }),
    ]),
  component: WithdrawPage,
});

function WithdrawPage() {
  const fetchDash = useServerFn(getDashboard);
  const fetchW = useServerFn(getWithdrawals);
  const { data: dash } = useSuspenseQuery({ queryKey: ["dashboard"], queryFn: () => fetchDash() });
  const { data: withdrawals } = useSuspenseQuery({ queryKey: ["withdrawals"], queryFn: () => fetchW() });
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");
  const req = useServerFn(requestWithdrawal);
  const mut = useMutation({
    mutationFn: (a: number) => req({ data: { amount: a } }),
    onSuccess: () => {
      toast.success("Withdrawal requested");
      setAmount("");
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["withdrawals"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const hasBank = dash.profile?.bank_name && dash.profile?.bank_account_no && dash.profile?.bank_account_name;
  const withdrawable = Number(dash.wallet?.balance ?? 0) - Number(dash.wallet?.non_withdrawable ?? 0);

  return (
    <div className="px-5 pt-6 pb-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Withdraw</h1>
        <p className="text-sm text-muted-foreground">Withdrawals are processed manually by our team.</p>
      </header>

      <div className="bg-foreground text-background rounded-xl p-4 space-y-1">
        <p className="text-[10px] uppercase tracking-widest opacity-60">Withdrawable balance</p>
        <p className="text-2xl font-bold font-mono">{formatNaira(withdrawable)}</p>
        {Number(dash.wallet?.non_withdrawable ?? 0) > 0 && (
          <p className="text-[10px] opacity-60">Locked / bonus: {formatNaira(dash.wallet?.non_withdrawable ?? 0)}</p>
        )}
      </div>

      {!hasBank ? (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive p-4 rounded-xl flex items-start gap-3">
          <AlertCircle className="size-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-bold">Bank details required</p>
            <p className="text-xs mt-1">Add your bank account in your profile so we can pay you.</p>
            <Link to="/profile" className="text-xs font-bold underline mt-2 inline-block">Go to profile →</Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-card border border-border p-4 rounded-xl text-sm space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Pays out to</p>
            <p className="font-semibold">{dash.profile?.bank_account_name}</p>
            <p className="font-mono text-xs">{dash.profile?.bank_name} · {dash.profile?.bank_account_no}</p>
          </div>
          <Input type="number" placeholder={`Amount (min ₦${dash.settings?.min_withdrawal})`} value={amount} onChange={(e) => setAmount(e.target.value)} min={dash.settings?.min_withdrawal ?? 0} max={Math.min(withdrawable, Number(dash.settings?.max_withdrawal ?? Infinity))} step={100} />
          {Number(dash.settings?.withdrawal_fee_pct ?? 0) > 0 && amount && (
            <p className="text-[11px] text-muted-foreground">
              Fee {dash.settings?.withdrawal_fee_pct}% = {formatNaira(Number(amount) * Number(dash.settings?.withdrawal_fee_pct ?? 0) / 100)}.
              You receive {formatNaira(Number(amount) - (Number(amount) * Number(dash.settings?.withdrawal_fee_pct ?? 0) / 100))}.
            </p>
          )}
          <Button className="w-full h-11" disabled={mut.isPending || !amount} onClick={() => mut.mutate(Number(amount))}>
            {mut.isPending ? "Submitting…" : "Request withdrawal"}
          </Button>
        </div>
      )}

      <section className="bg-primary-soft/40 border border-primary/20 rounded-xl p-4 space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-primary">Instructions</h2>
        <ul className="text-[11px] text-foreground/80 space-y-1 list-disc pl-4">
          <li>Minimum withdrawal: {formatNaira(dash.settings?.min_withdrawal ?? 0)} · Maximum: {formatNaira(dash.settings?.max_withdrawal ?? 0)}.</li>
          <li>Withdrawal fee: {dash.settings?.withdrawal_fee_pct ?? 0}% — deducted from the amount you request.</li>
          <li>You must have made at least one deposit and purchased at least one investment plan to withdraw.</li>
          <li>Welcome bonus and locked balances cannot be withdrawn directly.</li>
          <li>Requests are reviewed and paid out manually — usually within 24 hours on working days.</li>
          <li>Make sure your bank details are correct; wrong details can delay or fail the payout.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Recent withdrawals</h2>
          <Link to="/withdraw-history" className="text-[11px] font-bold text-primary">View full history →</Link>
        </div>
        {withdrawals.length === 0 ? (
          <p className="text-xs text-muted-foreground">No withdrawals yet.</p>
        ) : (
          <div className="divide-y divide-border border-t border-b border-border">
            {withdrawals.slice(0, 2).map((w: any) => (
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
      </section>
    </div>
  );
}

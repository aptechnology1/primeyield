import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { listPlans, purchasePlan, getDashboard } from "@/lib/user.functions";
import { formatNaira } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/plans")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData({ queryKey: ["plans"], queryFn: () => (listPlans as any)() }),
      context.queryClient.ensureQueryData({ queryKey: ["dashboard"], queryFn: () => (getDashboard as any)() }),
    ]),
  component: PlansPage,
});

function PlansPage() {
  const fetchPlans = useServerFn(listPlans);
  const fetchDash = useServerFn(getDashboard);
  const { data: plans } = useSuspenseQuery({ queryKey: ["plans"], queryFn: () => fetchPlans() });
  const { data: dash } = useSuspenseQuery({ queryKey: ["dashboard"], queryFn: () => fetchDash() });

  return (
    <div className="px-5 pt-6 pb-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Investment plans</h1>
        <p className="text-sm text-muted-foreground">Pick a plan and start earning daily.</p>
      </header>

      <div className="bg-card border border-border rounded-xl p-4 flex justify-between items-center">
        <span className="text-xs text-muted-foreground">Available balance</span>
        <span className="font-mono font-bold">{formatNaira(dash.wallet?.balance ?? 0)}</span>
      </div>

      {plans.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">No active plans yet.</p>
      ) : (
        <div className="space-y-3">
          {plans.map((p: any) => <PlanCard key={p.id} plan={p} balance={Number(dash.wallet?.balance ?? 0)} />)}
        </div>
      )}
    </div>
  );
}

function PlanCard({ plan, balance }: { plan: any; balance: number }) {
  const qc = useQueryClient();
  const purchase = useServerFn(purchasePlan);
  const mut = useMutation({
    mutationFn: () => purchase({ data: { planId: plan.id } }),
    onSuccess: () => {
      toast.success("Investment activated");
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const price = Number(plan.price ?? plan.min_amount ?? 0);
  const dailyReturn = price * (Number(plan.daily_roi_pct) / 100);
  const totalReturn = dailyReturn * plan.duration_days + (plan.return_principal ? price : 0);
  const canBuy = balance >= price;

  return (
    <div className="bg-card border border-border p-4 rounded-xl">
      <div className="flex items-start gap-3">
        <div className="size-12 bg-primary-soft text-primary rounded-lg flex items-center justify-center">
          <TrendingUp className="size-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2">
            <h3 className="text-sm font-bold">{plan.name}</h3>
            <span className="text-sm font-bold text-primary">{plan.daily_roi_pct}% / day</span>
          </div>
          {plan.description && <p className="text-[11px] text-muted-foreground mt-0.5">{plan.description}</p>}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-mono">
        <Stat label="Price" value={formatNaira(price)} />
        <Stat label="Validity" value={`${plan.duration_days} days`} />
        <Stat label="Daily earnings" value={formatNaira(dailyReturn)} highlight />
        <Stat label="Total earnings" value={formatNaira(totalReturn)} highlight />
      </div>

      <Button className="mt-4 w-full" disabled={!canBuy || mut.isPending} onClick={() => mut.mutate()}>
        {mut.isPending ? "Processing…" : !canBuy ? `Need ${formatNaira(price - balance)} more` : `Invest ${formatNaira(price)}`}
      </Button>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-muted/50 rounded-lg px-2.5 py-2">
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`font-bold ${highlight ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}

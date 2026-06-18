import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { listPlans, purchasePlan, getDashboard } from "@/lib/user.functions";
import { formatNaira } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle, SheetTrigger, SheetHeader, SheetDescription } from "@/components/ui/sheet";
import { useState } from "react";
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
        <p className="text-sm text-muted-foreground">Pick a plan and start earning daily ROI.</p>
      </header>

      <div className="bg-card border border-border rounded-xl p-4 flex justify-between items-center">
        <span className="text-xs text-muted-foreground">Available balance</span>
        <span className="font-mono font-bold">{formatNaira(dash.wallet?.balance ?? 0)}</span>
      </div>

      {plans.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">No active plans yet.</p>
      ) : (
        <div className="space-y-3">
          {plans.map((p: any) => <PlanCard key={p.id} plan={p} maxBalance={Number(dash.wallet?.balance ?? 0)} />)}
        </div>
      )}
    </div>
  );
}

function PlanCard({ plan, maxBalance }: { plan: any; maxBalance: number }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<string>(String(plan.min_amount));
  const qc = useQueryClient();
  const purchase = useServerFn(purchasePlan);
  const mut = useMutation({
    mutationFn: (a: number) => purchase({ data: { planId: plan.id, amount: a } }),
    onSuccess: () => {
      toast.success("Investment activated");
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const a = Number(amount) || 0;
  const dailyReturn = a * (Number(plan.daily_roi_pct) / 100);
  const totalReturn = dailyReturn * plan.duration_days + (plan.return_principal ? a : 0);

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
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-muted-foreground font-mono">
            <span>{plan.duration_days} days</span>
            <span>{plan.return_principal ? "Principal returned" : "No principal"}</span>
            <span>Min {formatNaira(plan.min_amount)}</span>
            <span>Max {formatNaira(plan.max_amount)}</span>
          </div>
        </div>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button className="mt-4 w-full" disabled={maxBalance < Number(plan.min_amount)}>
            {maxBalance < Number(plan.min_amount) ? "Insufficient balance" : "Invest"}
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-2xl max-w-md mx-auto">
          <SheetHeader>
            <SheetTitle>Invest in {plan.name}</SheetTitle>
            <SheetDescription>{plan.daily_roi_pct}% daily for {plan.duration_days} days</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Amount (₦)</label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                min={plan.min_amount} max={Math.min(maxBalance, Number(plan.max_amount))} step={100} />
              <p className="text-[10px] text-muted-foreground mt-1">
                Min {formatNaira(plan.min_amount)} · Max {formatNaira(plan.max_amount)} · Balance {formatNaira(maxBalance)}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Daily ROI</span><span className="font-mono font-bold text-primary">+{formatNaira(dailyReturn)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total return</span><span className="font-mono font-bold">{formatNaira(totalReturn)}</span></div>
            </div>
            <Button
              className="w-full h-11"
              disabled={mut.isPending || a < Number(plan.min_amount) || a > maxBalance || a > Number(plan.max_amount)}
              onClick={() => mut.mutate(a)}
            >
              {mut.isPending ? "Processing…" : "Confirm investment"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

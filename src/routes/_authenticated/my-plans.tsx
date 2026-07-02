import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getDashboard } from "@/lib/user.functions";
import { formatNaira, formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Clock, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/my-plans")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({ queryKey: ["dashboard"], queryFn: () => (getDashboard as any)() }),
  component: MyPlansPage,
  head: () => ({ meta: [{ title: "My Plans — PrimeYield" }] }),
});

function MyPlansPage() {
  const fetchDash = useServerFn(getDashboard);
  const { data } = useSuspenseQuery({ queryKey: ["dashboard"], queryFn: () => fetchDash() });
  const investments: any[] = data.investments ?? [];
  const active = investments.filter((i) => i.status === "active");
  const past = investments.filter((i) => i.status !== "active");

  return (
    <div className="px-5 pt-6 pb-6 space-y-6">
      <header className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Plans</h1>
          <p className="text-sm text-muted-foreground">Your active investment plans and their progress.</p>
        </div>
        <Link to="/plans"><Button size="sm">Buy plan</Button></Link>
      </header>

      <section className="space-y-3">
        <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Running plans</h2>
        {active.length === 0 ? (
          <p className="text-sm text-muted-foreground bg-card border border-border p-6 rounded-xl text-center">
            You don't have any running plan yet.
          </p>
        ) : active.map((inv) => <InvCard key={inv.id} inv={inv} />)}
      </section>

      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Past plans</h2>
          {past.map((inv) => <InvCard key={inv.id} inv={inv} />)}
        </section>
      )}
    </div>
  );
}

function InvCard({ inv }: { inv: any }) {
  const amount = Number(inv.amount);
  const dailyPct = Number(inv.daily_roi_pct);
  const dailyAmount = amount * (dailyPct / 100);
  const daysPaid = Number(inv.days_paid ?? 0);
  const duration = Number(inv.duration_days);
  const pct = Math.min(100, Math.round((daysPaid / duration) * 100));
  const earned = Number(inv.total_earned ?? 0);
  const totalExpected = dailyAmount * duration + (inv.return_principal ? amount : 0);
  const StatusIcon = inv.status === "active" ? Clock : inv.status === "completed" ? CheckCircle2 : XCircle;
  const statusClass =
    inv.status === "active" ? "text-primary bg-primary-soft" :
    inv.status === "completed" ? "text-primary bg-primary-soft" :
    "text-destructive bg-destructive/10";

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="size-11 bg-primary-soft text-primary rounded-lg flex items-center justify-center">
          <TrendingUp className="size-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2">
            <h3 className="text-sm font-bold truncate">{inv.plan_name}</h3>
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded flex items-center gap-1 ${statusClass}`}>
              <StatusIcon className="size-3" /> {inv.status}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">{dailyPct}% per day · {duration} days</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
        <Stat label="Invested" value={formatNaira(amount)} />
        <Stat label="Daily earning" value={formatNaira(dailyAmount)} highlight />
        <Stat label="Earned so far" value={formatNaira(earned)} highlight />
        <Stat label="Total expected" value={formatNaira(totalExpected)} />
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Day {daysPaid} of {duration}</span>
          <span>{pct}%</span>
        </div>
        <Progress value={pct} className="h-1.5" />
      </div>

      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>Started {formatDateTime(inv.started_at)}</span>
        <span>Ends {formatDateTime(inv.ends_at)}</span>
      </div>
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

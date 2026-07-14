import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useSuspenseQuery, queryOptions, useQueryClient } from "@tanstack/react-query";
import { getDashboard, claimDailyCheckin } from "@/lib/user.functions";
import { formatNaira, formatDateTime } from "@/lib/format";
import { BrandMark } from "@/components/BrandMark";
import { DashboardPopup } from "@/components/DashboardPopup";
import { Zap, Copy, ArrowUpRight, ArrowDownLeft, ShieldCheck, ListChecks, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const dashboardQuery = queryOptions({
  queryKey: ["dashboard"],
  queryFn: () => fetch(""), // placeholder — replaced below in loader
});

export const Route = createFileRoute("/_authenticated/dashboard")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({
      queryKey: ["dashboard"],
      queryFn: () => (getDashboard as any)(),
    }),
  component: Dashboard,
});

function Dashboard() {
  const router = useRouter();
  const qc = useQueryClient();
  const fetchDash = useServerFn(getDashboard);
  const { data } = useSuspenseQuery({
    queryKey: ["dashboard"],
    queryFn: () => fetchDash(),
  });
  const claim = useServerFn(claimDailyCheckin);
  const claimMutation = useMutation({
    mutationFn: () => claim(),
    onSuccess: (r: any) => {
      toast.success(`+${formatNaira(r.amount)} added to your wallet`);
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const wallet = data.wallet ?? { balance: 0, total_earned: 0, referral_earned: 0, non_withdrawable: 0 };
  const refLink = typeof window !== "undefined" && data.profile?.referral_code
    ? `${window.location.origin}/auth?ref=${data.profile.referral_code}` : "";

  return (
    <div className="px-5 pt-6 pb-6 space-y-6">
      <DashboardPopup
        enabled={!!data.settings?.dashboard_popup_enabled}
        title={data.settings?.dashboard_popup_title ?? ""}
        message={data.settings?.dashboard_popup_message ?? ""}
        buttons={(data.settings?.dashboard_popup_buttons as any) ?? []}
      />
      <header className="flex items-center justify-between -mt-2 mb-2">
        <BrandMark name={data.settings?.site_name ?? "PrimeYield"} />
        <div className="flex items-center gap-2">
          {data.isAdmin && (
            <Link to="/admin" className="inline-flex items-center gap-1 bg-foreground text-background px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-widest">
              <ShieldCheck className="size-3" /> Admin
            </Link>
          )}
          <div className="size-8 rounded-full bg-primary-soft border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
            {(data.profile?.full_name ?? data.profile?.email ?? "U").slice(0, 2).toUpperCase()}
          </div>
        </div>
      </header>

      {/* Balance */}
      <section className="animate-slide-up">
        <div className="bg-foreground text-background rounded-2xl p-6 relative overflow-hidden">
          <div className="relative z-10 space-y-4">
            <div className="flex justify-between items-start">
              <span className="text-xs font-medium opacity-60 uppercase tracking-widest">Total balance</span>
              <span className="bg-primary px-2 py-0.5 rounded text-[10px] font-bold text-primary-foreground">
                Earned {formatNaira(wallet.total_earned)}
              </span>
            </div>
            <div className="space-y-1">
              <h1 className="text-4xl font-bold tracking-tight font-mono">{formatNaira(wallet.balance)}</h1>
              {Number(wallet.non_withdrawable) > 0 && (
                <p className="text-[10px] opacity-50">Non-withdrawable: {formatNaira(wallet.non_withdrawable)}</p>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <Link to="/deposit" className="flex-1 bg-primary text-primary-foreground py-3 rounded-lg font-semibold text-sm text-center">Deposit</Link>
              <Link to="/withdraw" className="flex-1 bg-white/10 text-background py-3 rounded-lg font-semibold text-sm border border-white/10 text-center">Withdraw</Link>
            </div>
          </div>
          <div className="absolute -bottom-10 -right-10 size-40 bg-primary/30 blur-3xl" />
        </div>
      </section>

      {/* Daily check-in */}
      {Number(data.settings?.daily_checkin_amount ?? 0) > 0 && (
        <section>
          <div className="bg-primary-soft border border-primary/20 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 bg-card rounded-full border border-primary/10 flex items-center justify-center">
                <Zap className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">Daily rewards</p>
                <p className="text-[11px] text-muted-foreground">
                  {data.checkedInToday ? "You've checked in today" : `Check in to earn ${formatNaira(data.settings?.daily_checkin_amount ?? 0)}`}
                </p>
              </div>
            </div>
            <button
              disabled={data.checkedInToday || claimMutation.isPending}
              onClick={() => claimMutation.mutate()}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-xs font-bold disabled:opacity-50"
            >
              {data.checkedInToday ? "Done" : claimMutation.isPending ? "…" : "Claim"}
            </button>
          </div>
        </section>
      )}

      {/* Tasks (only if enabled) */}
      {data.settings?.tasks_enabled && (
        <Link to="/tasks" className="flex items-center justify-between bg-primary-soft border border-primary/20 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="size-10 bg-card rounded-full border border-primary/10 flex items-center justify-center">
              <ListChecks className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">Tasks</p>
              <p className="text-[11px] text-muted-foreground">Complete tasks to earn rewards</p>
            </div>
          </div>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
      )}

      {/* Active investments */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Active investments</h2>
          <Link to="/plans" className="text-xs font-semibold text-primary">Add new</Link>
        </div>
        {data.investments.length === 0 ? (
          <Link to="/plans" className="block bg-card border border-dashed border-border p-6 rounded-xl text-center text-sm text-muted-foreground">
            No active plans. <span className="text-primary font-semibold">Pick a plan →</span>
          </Link>
        ) : (
          <div className="space-y-3">
            {data.investments.map((inv: any) => {
              const pct = Math.min(100, (inv.days_paid / inv.duration_days) * 100);
              const done = inv.status !== "active";
              return (
                <div key={inv.id} className={`bg-card border border-border p-4 rounded-xl flex items-center gap-4 ${done ? "opacity-60" : ""}`}>
                  <div className="size-12 bg-muted rounded-lg flex items-center justify-center text-xl font-bold">
                    {inv.plan_name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between">
                      <h3 className="text-sm font-bold truncate">{inv.plan_name}</h3>
                      <span className="text-xs font-bold text-primary">{inv.daily_roi_pct}% / day</span>
                    </div>
                    <div className="mt-2 w-full bg-muted h-1 rounded-full overflow-hidden">
                      <div className="bg-primary h-full rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="mt-2 flex justify-between text-[10px] text-muted-foreground font-mono">
                      <span>{formatNaira(inv.total_earned)} earned</span>
                      <span>{inv.days_paid}/{inv.duration_days} days</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Referral */}
      <section className="bg-foreground text-background rounded-2xl p-5 space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-bold">Grow together</h2>
          <p className="text-xs opacity-60">
            Earn {data.settings?.ref_l1_pct}% L1 · {data.settings?.ref_l2_pct}% L2 · {data.settings?.ref_l3_pct}% L3
            {" on every "}{data.settings?.ref_source}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-white/10 px-3 py-2.5 rounded border border-white/5 font-mono text-[10px] truncate">{refLink}</div>
          <button
            onClick={() => { navigator.clipboard.writeText(refLink); toast.success("Link copied"); }}
            className="bg-background text-foreground px-3 py-2.5 rounded text-[10px] font-bold inline-flex items-center gap-1"
          ><Copy className="size-3" /> COPY</button>
        </div>
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10">
          <div className="text-center"><p className="text-lg font-bold font-mono">{data.referralCounts.l1}</p><p className="text-[9px] opacity-60 uppercase">L1</p></div>
          <div className="text-center"><p className="text-lg font-bold font-mono">{data.referralCounts.l2}</p><p className="text-[9px] opacity-60 uppercase">L2</p></div>
          <div className="text-center"><p className="text-lg font-bold font-mono">{data.referralCounts.l3}</p><p className="text-[9px] opacity-60 uppercase">L3</p></div>
        </div>
        <Link to="/referrals" className="block text-center text-[10px] font-bold uppercase tracking-widest opacity-70">View earnings →</Link>
      </section>

      {/* Recent activity */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Recent activity</h2>
          <Link to="/transactions" className="text-xs font-semibold text-primary">View all</Link>
        </div>
        {data.transactions.length === 0 ? (
          <p className="text-xs text-muted-foreground">No transactions yet.</p>
        ) : (
          <div className="divide-y divide-border border-t border-b border-border">
            {data.transactions.map((tx: any) => {
              const negative = tx.type === "investment" || tx.type === "withdrawal";
              return (
                <div key={tx.id} className="py-3 flex justify-between items-center">
                  <div className="flex gap-3 min-w-0">
                    <div className={`size-8 rounded flex items-center justify-center text-xs font-bold ${negative ? "bg-muted text-muted-foreground" : "bg-primary-soft text-primary"}`}>
                      {negative ? <ArrowUpRight className="size-4" /> : <ArrowDownLeft className="size-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">{tx.description ?? tx.type}</p>
                      <p className="text-[10px] text-muted-foreground">{formatDateTime(tx.created_at)}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-mono font-bold ${negative ? "text-foreground" : "text-primary"}`}>
                    {negative ? "−" : "+"}{formatNaira(tx.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

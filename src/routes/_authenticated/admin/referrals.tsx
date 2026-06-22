import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery } from "@tanstack/react-query";
import { adminListReferrals } from "@/lib/admin.functions";
import { formatNaira, formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/referrals")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({
      queryKey: ["admin-referrals"],
      queryFn: () => (adminListReferrals as any)(),
    }),
  component: AdminReferralsPage,
});

function AdminReferralsPage() {
  const fetch = useServerFn(adminListReferrals);
  const { data } = useSuspenseQuery({ queryKey: ["admin-referrals"], queryFn: () => fetch() });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold tracking-tight">Referrals</h1>
        <p className="text-xs text-muted-foreground">Network, commissions and top referrers.</p>
      </header>

      <Section title={`Top referrers (${data.topReferrers.length})`}>
        {data.topReferrers.length === 0 ? (
          <Empty label="No referrers yet." />
        ) : (
          <div className="divide-y divide-border border-t border-b border-border">
            {data.topReferrers.map((r: any) => (
              <div key={r.user.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">{r.user.email ?? r.user.id}</p>
                  <p className="text-[10px] text-muted-foreground">L1 {r.l1} · L2 {r.l2} · L3 {r.l3} · {r.total} total</p>
                </div>
                <span className="text-xs font-mono font-bold text-primary shrink-0">{formatNaira(r.earned)}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title={`All referrals (${data.referrals.length})`}>
        {data.referrals.length === 0 ? (
          <Empty label="No referral links used yet." />
        ) : (
          <div className="divide-y divide-border border-t border-b border-border">
            {data.referrals.map((r: any) => (
              <div key={r.id} className="py-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold truncate">
                    {r.referrer?.email ?? "—"} → {r.referred?.email ?? "—"}
                  </p>
                  <span className="bg-primary-soft text-primary text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">L{r.level}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{formatDateTime(r.created_at)}</span>
                  <span className="font-mono">Deposited {formatNaira(r.referred_deposited)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title={`Commission history (${data.earnings.length})`}>
        {data.earnings.length === 0 ? (
          <Empty label="No commissions paid yet." />
        ) : (
          <div className="divide-y divide-border border-t border-b border-border">
            {data.earnings.map((e: any) => (
              <div key={e.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">
                    {e.referrer?.email ?? "—"} ← {e.from?.email ?? "—"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">L{e.level} · {e.source_type} · {formatDateTime(e.created_at)}</p>
                </div>
                <span className="text-xs font-mono font-bold text-primary shrink-0">+{formatNaira(e.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}
function Empty({ label }: { label: string }) {
  return <p className="text-xs text-muted-foreground">{label}</p>;
}

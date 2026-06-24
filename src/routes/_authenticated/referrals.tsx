import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getReferralInfo } from "@/lib/user.functions";
import { formatNaira, formatDateTime } from "@/lib/format";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { InstructionsBlock } from "@/components/InstructionsBlock";

export const Route = createFileRoute("/_authenticated/referrals")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({ queryKey: ["referrals"], queryFn: () => (getReferralInfo as any)() }),
  component: ReferralsPage,
});

function ReferralsPage() {
  const fetch = useServerFn(getReferralInfo);
  const { data } = useSuspenseQuery({ queryKey: ["referrals"], queryFn: () => fetch() });
  const link = typeof window !== "undefined" && data.referral_code
    ? `${window.location.origin}/auth?ref=${data.referral_code}` : "";

  return (
    <div className="px-5 pt-6 pb-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Referrals</h1>
        <p className="text-sm text-muted-foreground">Earn on 3 levels of your network.</p>
      </header>

      <div className="bg-foreground text-background rounded-2xl p-5 space-y-4">
        <p className="text-[10px] uppercase tracking-widest opacity-60">Your link</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-white/10 px-3 py-2.5 rounded border border-white/5 font-mono text-[10px] truncate">{link}</div>
          <button onClick={() => { navigator.clipboard.writeText(link); toast.success("Copied"); }}
            className="bg-background text-foreground px-3 py-2.5 rounded text-[10px] font-bold inline-flex items-center gap-1">
            <Copy className="size-3" /> COPY
          </button>
        </div>
        <p className="text-[11px] opacity-60">Code: <span className="font-mono font-bold opacity-100">{data.referral_code}</span></p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {([1, 2, 3] as const).map((lvl) => (
          <div key={lvl} className="bg-card border border-border p-4 rounded-xl text-center">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Level {lvl}</p>
            <p className="text-2xl font-bold font-mono mt-1">{(data.counts as any)[`l${lvl}`]}</p>
            <p className="text-[10px] text-primary font-mono mt-1">{formatNaira((data.totals as any)[`l${lvl}`])}</p>
          </div>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Your network</h2>
        {(!data.referredUsers || data.referredUsers.length === 0) ? (
          <p className="text-xs text-muted-foreground">No one has joined with your link yet.</p>
        ) : (
          <div className="divide-y divide-border border-t border-b border-border">
            {data.referredUsers.map((u: any) => (
              <div key={u.id + u.level} className="py-3 flex justify-between items-center gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold font-mono truncate">{u.masked_email}</p>
                  <p className="text-[10px] text-muted-foreground">{formatDateTime(u.joined_at)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-mono">{formatNaira(u.deposited)}</span>
                  <span className="bg-primary-soft text-primary text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">L{u.level}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <InstructionsBlock text={(data as any)?.settings?.referral_instructions ?? ""} />


      <section className="space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Earnings history</h2>
          <Link to="/referrals-history" className="text-[11px] font-bold text-primary">View full history →</Link>
        </div>
        {data.earnings.length === 0 ? (
          <p className="text-xs text-muted-foreground">No referral earnings yet.</p>
        ) : (
          <div className="divide-y divide-border border-t border-b border-border">
            {data.earnings.slice(0, 2).map((e: any) => (
              <div key={e.id} className="py-3 flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold">L{e.level} · {e.source_type}</p>
                  <p className="text-[10px] text-muted-foreground">{formatDateTime(e.created_at)}</p>
                </div>
                <span className="text-xs font-mono font-bold text-primary">+{formatNaira(e.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

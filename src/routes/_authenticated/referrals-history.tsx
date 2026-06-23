import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getReferralInfo } from "@/lib/user.functions";
import { formatNaira, formatDateTime } from "@/lib/format";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/referrals-history")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({ queryKey: ["referrals"], queryFn: () => (getReferralInfo as any)() }),
  component: Page,
});

function Page() {
  const fetch = useServerFn(getReferralInfo);
  const { data } = useSuspenseQuery({ queryKey: ["referrals"], queryFn: () => fetch() });
  return (
    <div className="px-5 pt-6 pb-6 space-y-4">
      <Link to="/referrals" className="text-xs text-muted-foreground inline-flex items-center gap-1"><ChevronLeft className="size-3" /> Back to referrals</Link>
      <h1 className="text-2xl font-bold tracking-tight">Referral earnings</h1>
      {data.earnings.length === 0 ? (
        <p className="text-xs text-muted-foreground">No referral earnings yet.</p>
      ) : (
        <div className="divide-y divide-border border-t border-b border-border">
          {data.earnings.map((e: any) => (
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
    </div>
  );
}

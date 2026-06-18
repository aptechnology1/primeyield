import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery } from "@tanstack/react-query";
import { adminOverview } from "@/lib/admin.functions";
import { formatNaira } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({ queryKey: ["admin-overview"], queryFn: () => (adminOverview as any)() }),
  component: AdminOverview,
});

function AdminOverview() {
  const fetch = useServerFn(adminOverview);
  const { data } = useSuspenseQuery({ queryKey: ["admin-overview"], queryFn: () => fetch() });
  const cards = [
    { label: "Total users", value: data.userCount, mono: false },
    { label: "Active plans", value: data.planCount, mono: false },
    { label: "Pending deposits", value: data.pendingDeposits, highlight: data.pendingDeposits > 0 },
    { label: "Pending withdrawals", value: data.pendingWithdrawals, highlight: data.pendingWithdrawals > 0 },
    { label: "Total deposited", value: formatNaira(data.totalDeposits), mono: true },
    { label: "Total invested", value: formatNaira(data.totalInvested), mono: true },
  ];
  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((c) => (
        <div key={c.label} className={`bg-card border ${c.highlight ? "border-primary" : "border-border"} p-4 rounded-xl`}>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{c.label}</p>
          <p className={`text-xl font-bold mt-1 ${c.mono ? "font-mono" : ""}`}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}

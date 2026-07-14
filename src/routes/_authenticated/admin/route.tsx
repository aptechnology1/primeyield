import { createFileRoute, Outlet, Link, useRouterState, redirect } from "@tanstack/react-router";
import { getDashboard } from "@/lib/user.functions";
import { ArrowLeft, Users, TrendingUp, ArrowDownToLine, ArrowUpFromLine, Settings, Network, FileText, Package, ListChecks, PenSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin")({
  loader: async ({ context }) => {
    const d: any = await context.queryClient.ensureQueryData({
      queryKey: ["dashboard"], queryFn: () => (getDashboard as any)(),
    });
    if (!d?.isAdmin) throw redirect({ to: "/dashboard" });
  },
  component: AdminLayout,
});

const tabs = [
  { to: "/admin", label: "Overview", icon: TrendingUp, exact: true },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/plans", label: "Plans", icon: TrendingUp },
  { to: "/admin/investments", label: "Investments", icon: Package },
  { to: "/admin/deposits", label: "Deposits", icon: ArrowDownToLine },
  { to: "/admin/withdrawals", label: "Withdrawals", icon: ArrowUpFromLine },
  { to: "/admin/referrals", label: "Referrals", icon: Network },
  { to: "/admin/tasks", label: "Tasks", icon: ListChecks },
  { to: "/admin/content", label: "Content", icon: PenSquare },
  { to: "/admin/instructions", label: "Instructions", icon: FileText },
  { to: "/admin/settings", label: "Settings", icon: Settings },
] as const;

function AdminLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="pb-6">
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border px-5 py-4 flex items-center gap-3">
        <Link to="/dashboard" className="text-muted-foreground"><ArrowLeft className="size-5" /></Link>
        <h1 className="text-base font-bold">Admin panel</h1>
      </header>
      <nav className="overflow-x-auto px-3 py-3 border-b border-border flex gap-2 sticky top-[57px] bg-background z-20">
        {tabs.map((t) => {
          const active = (t as any).exact ? path === t.to : path.startsWith(t.to);
          return (
            <Link key={t.to} to={t.to} className={cn(
              "px-3 py-1.5 rounded-full text-xs font-bold uppercase whitespace-nowrap",
              active ? "bg-foreground text-background" : "bg-card border border-border text-muted-foreground",
            )}>{t.label}</Link>
          );
        })}
      </nav>
      <div className="px-5 pt-5">
        <Outlet />
      </div>
    </div>
  );
}

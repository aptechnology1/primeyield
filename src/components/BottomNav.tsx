import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Home, TrendingUp, ArrowDownToLine, User, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTasksFeature } from "@/lib/tasks.functions";

const baseItems = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/plans", label: "Plans", icon: TrendingUp },
  { to: "/deposit", label: "Deposit", icon: ArrowDownToLine },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const fetchFeat = useServerFn(getTasksFeature);
  const { data: feat } = useQuery({
    queryKey: ["tasks-feature"],
    queryFn: () => fetchFeat(),
    staleTime: 60_000,
  });
  const items = feat?.enabled
    ? [baseItems[0], baseItems[1], baseItems[2], { to: "/tasks", label: "Tasks", icon: ListChecks } as const, baseItems[3]]
    : baseItems;
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-card border-t border-border px-4 py-2 flex justify-around items-center z-50">
      {items.map((it) => {
        const active = path === it.to || (it.to !== "/dashboard" && path.startsWith(it.to));
        const Icon = it.icon;
        return (
          <Link
            key={it.to}
            to={it.to}
            className={cn(
              "flex flex-col items-center gap-1 p-2 transition-colors",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon className="size-5" strokeWidth={active ? 2.5 : 2} />
            <span className={cn("text-[10px]", active ? "font-bold" : "font-medium")}>{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

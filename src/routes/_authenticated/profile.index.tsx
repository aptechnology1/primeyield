import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { getDashboard } from "@/lib/user.functions";
import { formatNaira } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  Users,
  Receipt,
  ArrowDownCircle,
  ArrowUpCircle,
  CreditCard,
  Lock,
  UserCog,
  LogOut,
  LifeBuoy,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile/")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({ queryKey: ["dashboard"], queryFn: () => (getDashboard as any)() }),
  component: ProfileIndex,
});

function ProfileIndex() {
  const fetchDash = useServerFn(getDashboard);
  const { data } = useSuspenseQuery({ queryKey: ["dashboard"], queryFn: () => fetchDash() });
  const qc = useQueryClient();
  const navigate = useNavigate();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const balance = Number(data.wallet?.balance ?? 0);
  const initials = (data.profile?.full_name ?? data.profile?.email ?? "U").slice(0, 2).toUpperCase();

  return (
    <div className="px-5 pt-6 pb-6 space-y-5">
      <div className="flex flex-col items-center gap-2 pt-2">
        <div className="size-16 rounded-full bg-primary-soft border border-primary/20 flex items-center justify-center text-lg font-bold text-primary">
          {initials}
        </div>
        <p className="text-sm font-bold">{data.profile?.full_name ?? data.profile?.email}</p>
        <p className="text-[11px] text-muted-foreground">Member Account</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Available balance</p>
        <p className="text-2xl font-bold font-mono text-primary mt-1">{formatNaira(balance)}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link to="/deposit" className="flex items-center justify-center gap-2 bg-card border border-border py-3 rounded-xl">
          <ArrowDownToLine className="size-4 text-primary" />
          <span className="text-sm font-bold">Deposit</span>
        </Link>
        <Link to="/withdraw" className="flex items-center justify-center gap-2 bg-card border border-border py-3 rounded-xl">
          <ArrowUpFromLine className="size-4 text-primary" />
          <span className="text-sm font-bold">Withdraw</span>
        </Link>
      </div>

      {data.isAdmin && (
        <Link to="/admin" className="flex items-center justify-between bg-foreground text-background p-4 rounded-xl">
          <div className="flex items-center gap-3">
            <ShieldCheck className="size-5" />
            <span className="text-sm font-bold">Admin panel</span>
          </div>
          <ChevronRight className="size-4 opacity-60" />
        </Link>
      )}

      <Section title="My Account">
        <Item to="/my-plans" icon={BarChart3} label="My Plans" />
        <Item to="/referrals" icon={Users} label="My Network" />
      </Section>


      <Section title="Transactions">
        <Item to="/transactions" icon={Receipt} label="Transaction History" />
        <Item to="/deposit-history" icon={ArrowDownCircle} label="Deposit History" />
        <Item to="/withdraw-history" icon={ArrowUpCircle} label="Withdrawal History" />
      </Section>

      <Section title="Settings">
        <Item to="/profile/personal" icon={UserCog} label="Profile Information" />
        <Item to="/profile/bank" icon={CreditCard} label="Bank Details" />
        <Item to="/profile/password" icon={Lock} label="Change Password" />
        <button
          onClick={signOut}
          className="w-full flex items-center justify-between px-4 py-3 text-left"
        >
          <div className="flex items-center gap-3">
            <span className="size-8 rounded-lg bg-destructive/10 flex items-center justify-center">
              <LogOut className="size-4 text-destructive" />
            </span>
            <span className="text-sm font-semibold text-destructive">Sign Out</span>
          </div>
          <ChevronRight className="size-4 text-muted-foreground" />
        </button>
      </Section>

      <Link
        to="/support"
        className="flex items-center justify-center gap-2 bg-card border border-border rounded-xl py-3 text-primary text-sm font-semibold"
      >
        <LifeBuoy className="size-4" /> Contact Support
      </Link>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-card border border-border rounded-xl overflow-hidden">
      <p className="px-4 pt-3 pb-2 text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
        {title}
      </p>
      <div className="divide-y divide-border">{children}</div>
    </section>
  );
}

function Item({ to, icon: Icon, label }: { to: string; icon: any; label: string }) {
  return (
    <Link to={to} className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="size-8 rounded-lg bg-primary-soft flex items-center justify-center">
          <Icon className="size-4 text-primary" />
        </span>
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <ChevronRight className="size-4 text-muted-foreground" />
    </Link>
  );
}

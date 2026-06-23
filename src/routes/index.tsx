import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPublicSettings } from "@/lib/user.functions";
import { BrandMark } from "@/components/BrandMark";
import { ArrowRight, ShieldCheck, TrendingUp, Users } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PrimeYield — Invest, earn daily" },
      { name: "description", content: "Open your PrimeYield account, fund your wallet, and start earning daily cash back from curated investment plans." },
      { property: "og:title", content: "PrimeYield — Invest, earn daily" },
      { property: "og:description", content: "Open your PrimeYield account, fund your wallet, and start earning daily cash back." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const fetchSettings = useServerFn(getPublicSettings);
  const { data: settings } = useQuery({
    queryKey: ["public-settings"],
    queryFn: () => fetchSettings(),
  });
  const name = settings?.site_name ?? "PrimeYield";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border px-5 py-4 flex items-center justify-between max-w-md mx-auto">
        <BrandMark name={name} />
        <Link to="/auth" className="text-xs font-bold text-primary">Sign in</Link>
      </header>

      <main className="px-5 py-10 max-w-md mx-auto space-y-10">
        <section className="space-y-5">
          <div className="inline-flex items-center gap-2 bg-primary-soft text-primary px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
            <span className="size-1.5 bg-primary rounded-full" /> Now live in Nigeria
          </div>
          <h1 className="text-4xl font-bold tracking-tight leading-tight">
            Grow your money on autopilot with {name}.
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Fund your wallet, pick a plan, and earn daily cash back straight to your balance. Invite friends and earn across 3 levels.
          </p>
          <div className="flex gap-2 pt-2">
            <Link to="/auth" className="flex-1 bg-foreground text-background py-3 rounded-lg font-semibold text-sm text-center inline-flex items-center justify-center gap-2">
              Get started <ArrowRight className="size-4" />
            </Link>
            <Link to="/auth" className="flex-1 bg-card border border-border py-3 rounded-lg font-semibold text-sm text-center">
              Sign in
            </Link>
          </div>
        </section>

        <section className="bg-foreground text-background rounded-2xl p-6 space-y-4 relative overflow-hidden">
          <span className="text-xs font-medium opacity-60 uppercase tracking-widest">Sample portfolio</span>
          <p className="text-4xl font-bold font-mono">₦1,450,200.00</p>
          <div className="flex justify-between text-xs opacity-70 pt-2 border-t border-white/10">
            <span>Daily ROI</span><span className="font-mono">+₦12,400.00</span>
          </div>
          <div className="absolute -bottom-10 -right-10 size-40 bg-primary/30 blur-3xl" />
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Why {name}</h2>
          <div className="space-y-3">
            {[
              { icon: TrendingUp, title: "Daily ROI", body: "Returns credited automatically every 24 hours." },
              { icon: Users, title: "3-Level referrals", body: "Earn on your friends, their friends, and the next generation." },
              { icon: ShieldCheck, title: "Manual withdrawals", body: "Every payout is reviewed and processed by our team." },
            ].map((f) => (
              <div key={f.title} className="flex gap-3 bg-card border border-border p-4 rounded-xl">
                <div className="size-10 bg-primary-soft rounded-lg flex items-center justify-center shrink-0">
                  <f.icon className="size-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold">{f.title}</p>
                  <p className="text-xs text-muted-foreground">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <footer className="pt-6 pb-12 border-t border-border text-center">
          <p className="text-[10px] text-muted-foreground">© {new Date().getFullYear()} {name}. All rights reserved.</p>
        </footer>
      </main>
    </div>
  );
}

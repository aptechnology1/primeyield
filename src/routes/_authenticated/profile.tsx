import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { getDashboard, updateProfile } from "@/lib/user.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { LogOut, Users, ShieldCheck, LifeBuoy } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({ queryKey: ["dashboard"], queryFn: () => (getDashboard as any)() }),
  component: ProfilePage,
});

function ProfilePage() {
  const fetchDash = useServerFn(getDashboard);
  const { data } = useSuspenseQuery({ queryKey: ["dashboard"], queryFn: () => fetchDash() });
  const qc = useQueryClient();
  const navigate = useNavigate();
  const update = useServerFn(updateProfile);

  const [name, setName] = useState(data.profile?.full_name ?? "");
  const [bankName, setBankName] = useState(data.profile?.bank_name ?? "");
  const [bankNo, setBankNo] = useState(data.profile?.bank_account_no ?? "");
  const [bankHolder, setBankHolder] = useState(data.profile?.bank_account_name ?? "");

  useEffect(() => {
    setName(data.profile?.full_name ?? "");
    setBankName(data.profile?.bank_name ?? "");
    setBankNo(data.profile?.bank_account_no ?? "");
    setBankHolder(data.profile?.bank_account_name ?? "");
  }, [data.profile]);

  const mut = useMutation({
    mutationFn: () => update({ data: { full_name: name, bank_name: bankName, bank_account_no: bankNo, bank_account_name: bankHolder } }),
    onSuccess: () => { toast.success("Profile updated"); qc.invalidateQueries({ queryKey: ["dashboard"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="px-5 pt-6 pb-6 space-y-6">
      <header className="flex items-center gap-3">
        <div className="size-12 rounded-full bg-primary-soft border border-primary/20 flex items-center justify-center text-sm font-bold text-primary">
          {(data.profile?.full_name ?? data.profile?.email ?? "U").slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate">{data.profile?.full_name ?? "User"}</p>
          <p className="text-xs text-muted-foreground truncate">{data.profile?.email}</p>
        </div>
      </header>

      {data.isAdmin && (
        <Link to="/admin" className="flex items-center justify-between bg-foreground text-background p-4 rounded-xl">
          <div className="flex items-center gap-3">
            <ShieldCheck className="size-5" />
            <span className="text-sm font-bold">Admin panel</span>
          </div>
          <span className="text-xs opacity-60">→</span>
        </Link>
      )}

      <Link to="/referrals" className="flex items-center justify-between bg-card border border-border p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <Users className="size-5 text-primary" />
          <span className="text-sm font-bold">My referrals</span>
        </div>
        <span className="text-xs text-muted-foreground">→</span>
      </Link>

      <section className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Personal</h2>
        <div className="space-y-1.5">
          <Label>Full name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Bank details</h2>
        <div className="space-y-1.5">
          <Label>Bank name</Label>
          <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. GTBank" />
        </div>
        <div className="space-y-1.5">
          <Label>Account number</Label>
          <Input value={bankNo} onChange={(e) => setBankNo(e.target.value)} inputMode="numeric" maxLength={20} />
        </div>
        <div className="space-y-1.5">
          <Label>Account holder name</Label>
          <Input value={bankHolder} onChange={(e) => setBankHolder(e.target.value)} />
        </div>
      </section>

      <Button className="w-full h-11" disabled={mut.isPending} onClick={() => mut.mutate()}>
        {mut.isPending ? "Saving…" : "Save changes"}
      </Button>

      <button onClick={signOut} className="w-full text-destructive font-semibold text-sm py-3 flex items-center justify-center gap-2">
        <LogOut className="size-4" /> Sign out
      </button>
    </div>
  );
}

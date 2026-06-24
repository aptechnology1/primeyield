import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { adminGetSettings, adminUpdateSettings } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/instructions")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({ queryKey: ["admin-settings"], queryFn: () => (adminGetSettings as any)() }),
  component: InstructionsPage,
});

function InstructionsPage() {
  const fetch = useServerFn(adminGetSettings);
  const { data: s } = useSuspenseQuery({ queryKey: ["admin-settings"], queryFn: () => fetch() });
  const [dep, setDep] = useState<string>((s as any)?.deposit_instructions ?? "");
  const [wd, setWd] = useState<string>((s as any)?.withdraw_instructions ?? "");
  const [ref, setRef] = useState<string>((s as any)?.referral_instructions ?? "");
  useEffect(() => {
    setDep((s as any)?.deposit_instructions ?? "");
    setWd((s as any)?.withdraw_instructions ?? "");
    setRef((s as any)?.referral_instructions ?? "");
  }, [s]);

  const qc = useQueryClient();
  const save = useServerFn(adminUpdateSettings);
  const mut = useMutation({
    mutationFn: () => save({ data: { ...(s as any), deposit_instructions: dep, withdraw_instructions: wd, referral_instructions: ref } as any }),
    onSuccess: () => {
      toast.success("Instructions saved");
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      qc.invalidateQueries({ queryKey: ["bank-info"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["referrals"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-bold">Page instructions</h2>
        <p className="text-xs text-muted-foreground mt-1">
          These show up at the bottom of the user's Deposit, Withdraw and Referral pages.
          Write one point per line — each line will be shown as a bullet.
        </p>
      </div>

      <Block label="Deposit page instructions" value={dep} onChange={setDep} />
      <Block label="Withdraw page instructions" value={wd} onChange={setWd} />
      <Block label="Referral page instructions" value={ref} onChange={setRef} />

      <Button className="w-full h-11" disabled={mut.isPending} onClick={() => mut.mutate()}>
        {mut.isPending ? "Saving…" : "Save instructions"}
      </Button>
    </div>
  );
}

function Block({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-2">
      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</Label>
      <Textarea rows={7} value={value} onChange={(e) => onChange(e.target.value)} className="font-mono text-xs leading-relaxed" />
    </div>
  );
}

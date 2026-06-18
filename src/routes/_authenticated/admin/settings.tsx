import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { adminGetSettings, adminUpdateSettings } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({ queryKey: ["admin-settings"], queryFn: () => (adminGetSettings as any)() }),
  component: SettingsPage,
});

function SettingsPage() {
  const fetch = useServerFn(adminGetSettings);
  const { data: s } = useSuspenseQuery({ queryKey: ["admin-settings"], queryFn: () => fetch() });
  const [form, setForm] = useState<any>(s);
  useEffect(() => setForm(s), [s]);
  const qc = useQueryClient();
  const save = useServerFn(adminUpdateSettings);
  const mut = useMutation({
    mutationFn: () => save({ data: {
      site_name: form.site_name,
      welcome_bonus_amount: Number(form.welcome_bonus_amount),
      welcome_bonus_withdrawable: !!form.welcome_bonus_withdrawable,
      daily_checkin_amount: Number(form.daily_checkin_amount),
      ref_l1_pct: Number(form.ref_l1_pct),
      ref_l2_pct: Number(form.ref_l2_pct),
      ref_l3_pct: Number(form.ref_l3_pct),
      ref_source: form.ref_source,
      min_withdrawal: Number(form.min_withdrawal),
      max_withdrawal: Number(form.max_withdrawal),
      withdrawal_fee_pct: Number(form.withdrawal_fee_pct),
      paystack_enabled: !!form.paystack_enabled,
      manual_deposit_enabled: !!form.manual_deposit_enabled,
      manual_bank_name: form.manual_bank_name ?? "",
      manual_bank_account: form.manual_bank_account ?? "",
      manual_bank_account_name: form.manual_bank_account_name ?? "",
      dashboard_popup_enabled: !!form.dashboard_popup_enabled,
      dashboard_popup_title: form.dashboard_popup_title ?? "",
      dashboard_popup_message: form.dashboard_popup_message ?? "",
      dashboard_popup_buttons: Array.isArray(form.dashboard_popup_buttons)
        ? form.dashboard_popup_buttons.filter((b: any) => b?.title && b?.link)
        : [],
    } as any }),
    onSuccess: () => {
      toast.success("Settings saved");
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      qc.invalidateQueries({ queryKey: ["public-settings"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["bank-info"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!form) return null;
  const set = (k: string, v: any) => setForm({ ...form, [k]: v });

  return (
    <div className="space-y-6">
      <Section title="Branding">
        <Field label="Site name"><Input value={form.site_name} onChange={(e) => set("site_name", e.target.value)} /></Field>
      </Section>

      <Section title="Welcome bonus">
        <Field label="Amount (₦)"><Input type="number" value={form.welcome_bonus_amount} onChange={(e) => set("welcome_bonus_amount", e.target.value)} /></Field>
        <Toggle label="Withdrawable" value={!!form.welcome_bonus_withdrawable} onChange={(v) => set("welcome_bonus_withdrawable", v)} />
      </Section>

      <Section title="Daily check-in">
        <Field label="Amount per day (₦) — 0 to disable">
          <Input type="number" value={form.daily_checkin_amount} onChange={(e) => set("daily_checkin_amount", e.target.value)} />
        </Field>
      </Section>

      <Section title="Referral commissions">
        <div className="grid grid-cols-3 gap-2">
          <Field label="L1 %"><Input type="number" step="0.1" value={form.ref_l1_pct} onChange={(e) => set("ref_l1_pct", e.target.value)} /></Field>
          <Field label="L2 %"><Input type="number" step="0.1" value={form.ref_l2_pct} onChange={(e) => set("ref_l2_pct", e.target.value)} /></Field>
          <Field label="L3 %"><Input type="number" step="0.1" value={form.ref_l3_pct} onChange={(e) => set("ref_l3_pct", e.target.value)} /></Field>
        </div>
        <Field label="Paid on">
          <Select value={form.ref_source} onValueChange={(v) => set("ref_source", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="deposit">Deposits</SelectItem>
              <SelectItem value="investment">Investments</SelectItem>
              <SelectItem value="roi">Daily ROI</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </Section>

      <Section title="Withdrawals">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Min (₦)"><Input type="number" value={form.min_withdrawal} onChange={(e) => set("min_withdrawal", e.target.value)} /></Field>
          <Field label="Max (₦)"><Input type="number" value={form.max_withdrawal} onChange={(e) => set("max_withdrawal", e.target.value)} /></Field>
        </div>
        <Field label="Fee %"><Input type="number" step="0.1" value={form.withdrawal_fee_pct} onChange={(e) => set("withdrawal_fee_pct", e.target.value)} /></Field>
      </Section>

      <Section title="Deposit methods">
        <Toggle label="Paystack enabled" value={!!form.paystack_enabled} onChange={(v) => set("paystack_enabled", v)} />
        <Toggle label="Manual deposit enabled" value={!!form.manual_deposit_enabled} onChange={(v) => set("manual_deposit_enabled", v)} />
        <Field label="Manual bank name"><Input value={form.manual_bank_name ?? ""} onChange={(e) => set("manual_bank_name", e.target.value)} /></Field>
        <Field label="Manual bank account number"><Input value={form.manual_bank_account ?? ""} onChange={(e) => set("manual_bank_account", e.target.value)} /></Field>
        <Field label="Manual bank account name"><Input value={form.manual_bank_account_name ?? ""} onChange={(e) => set("manual_bank_account_name", e.target.value)} /></Field>
      </Section>

      <Button className="w-full h-11" disabled={mut.isPending} onClick={() => mut.mutate()}>
        {mut.isPending ? "Saving…" : "Save settings"}
      </Button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</h2>
      {children}
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}
function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return <div className="flex items-center justify-between py-1"><Label className="text-xs">{label}</Label><Switch checked={value} onCheckedChange={onChange} /></div>;
}

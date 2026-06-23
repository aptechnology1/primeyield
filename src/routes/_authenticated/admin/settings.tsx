import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { adminGetSettings, adminUpdateSettings, adminWipeAllData } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { Plus, Trash2, AlertTriangle } from "lucide-react";
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
      min_deposit: Number(form.min_deposit ?? 0),
      min_withdrawal: Number(form.min_withdrawal),
      max_withdrawal: Number(form.max_withdrawal),
      withdrawal_fee_pct: Number(form.withdrawal_fee_pct),
      paystack_enabled: !!form.paystack_enabled,
      manual_deposit_enabled: !!form.manual_deposit_enabled,
      manual_bank_name: form.manual_bank_name ?? "",
      manual_bank_account: form.manual_bank_account ?? "",
      manual_bank_account_name: form.manual_bank_account_name ?? "",
      deposit_enabled: !!form.deposit_enabled,
      withdrawal_enabled: !!form.withdrawal_enabled,
      investment_enabled: !!form.investment_enabled,
      maintenance_mode: !!form.maintenance_mode,
      maintenance_message: form.maintenance_message ?? "",
      dashboard_popup_enabled: !!form.dashboard_popup_enabled,
      dashboard_popup_title: form.dashboard_popup_title ?? "",
      dashboard_popup_message: form.dashboard_popup_message ?? "",
      dashboard_popup_buttons: Array.isArray(form.dashboard_popup_buttons)
        ? form.dashboard_popup_buttons.filter((b: any) => b?.title && b?.link)
        : [],
      support_title: form.support_title ?? "Support",
      support_agent_name: form.support_agent_name ?? "",
      support_agent_details: form.support_agent_details ?? "",
      support_contact_link: form.support_contact_link ?? "",
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

      <Section title="Site controls">
        <Toggle label="Maintenance mode (block all user activity)" value={!!form.maintenance_mode} onChange={(v) => set("maintenance_mode", v)} />
        <Field label="Maintenance message">
          <Textarea rows={2} value={form.maintenance_message ?? ""} onChange={(e) => set("maintenance_message", e.target.value)} />
        </Field>
        <Toggle label="Deposits enabled" value={form.deposit_enabled !== false} onChange={(v) => set("deposit_enabled", v)} />
        <Toggle label="Withdrawals enabled" value={form.withdrawal_enabled !== false} onChange={(v) => set("withdrawal_enabled", v)} />
        <Toggle label="Investments enabled" value={form.investment_enabled !== false} onChange={(v) => set("investment_enabled", v)} />
      </Section>

      <Section title="Deposits">
        <Field label="Minimum deposit (₦)">
          <Input type="number" value={form.min_deposit ?? 0} onChange={(e) => set("min_deposit", e.target.value)} />
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
        <Toggle label="Automated payments enabled" value={!!form.paystack_enabled} onChange={(v) => set("paystack_enabled", v)} />
        <Toggle label="Bank transfer enabled" value={!!form.manual_deposit_enabled} onChange={(v) => set("manual_deposit_enabled", v)} />
        <Field label="Bank name"><Input value={form.manual_bank_name ?? ""} onChange={(e) => set("manual_bank_name", e.target.value)} /></Field>
        <Field label="Bank account number"><Input value={form.manual_bank_account ?? ""} onChange={(e) => set("manual_bank_account", e.target.value)} /></Field>
        <Field label="Bank account name"><Input value={form.manual_bank_account_name ?? ""} onChange={(e) => set("manual_bank_account_name", e.target.value)} /></Field>
      </Section>

      <Section title="Dashboard popup">
        <Toggle
          label="Show popup on dashboard"
          value={!!form.dashboard_popup_enabled}
          onChange={(v) => set("dashboard_popup_enabled", v)}
        />
        <Field label="Title">
          <Input
            value={form.dashboard_popup_title ?? ""}
            onChange={(e) => set("dashboard_popup_title", e.target.value)}
            placeholder="Welcome"
          />
        </Field>
        <Field label="Message">
          <Textarea
            rows={4}
            value={form.dashboard_popup_message ?? ""}
            onChange={(e) => set("dashboard_popup_message", e.target.value)}
            placeholder="Write the message users will see…"
          />
        </Field>
        <div className="space-y-2">
          <Label className="text-xs">Buttons</Label>
          {(form.dashboard_popup_buttons ?? []).map((btn: any, i: number) => (
            <div key={i} className="grid grid-cols-[1fr_1.5fr_auto] gap-2 items-center">
              <Input
                value={btn.title ?? ""}
                placeholder="Title"
                onChange={(e) => {
                  const arr = [...(form.dashboard_popup_buttons ?? [])];
                  arr[i] = { ...arr[i], title: e.target.value };
                  set("dashboard_popup_buttons", arr);
                }}
              />
              <Input
                value={btn.link ?? ""}
                placeholder="https://… or /plans"
                onChange={(e) => {
                  const arr = [...(form.dashboard_popup_buttons ?? [])];
                  arr[i] = { ...arr[i], link: e.target.value };
                  set("dashboard_popup_buttons", arr);
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const arr = [...(form.dashboard_popup_buttons ?? [])];
                  arr.splice(i, 1);
                  set("dashboard_popup_buttons", arr);
                }}
                className="size-9 inline-flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-destructive"
                aria-label="Remove button"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          {(form.dashboard_popup_buttons ?? []).length < 8 && (
            <button
              type="button"
              onClick={() => set("dashboard_popup_buttons", [...(form.dashboard_popup_buttons ?? []), { title: "", link: "" }])}
              className="w-full inline-flex items-center justify-center gap-1 py-2 rounded-md border border-dashed border-border text-xs text-muted-foreground hover:text-foreground"
            >
              <Plus className="size-3" /> Add button
            </button>
          )}
        </div>
      </Section>

      <Section title="Support page">
        <Field label="Page title">
          <Input
            value={form.support_title ?? ""}
            onChange={(e) => set("support_title", e.target.value)}
            placeholder="Support"
          />
        </Field>
        <Field label="Agent / team name">
          <Input
            value={form.support_agent_name ?? ""}
            onChange={(e) => set("support_agent_name", e.target.value)}
            placeholder="e.g. Sarah from PrimeYield Support"
          />
        </Field>
        <Field label="Details / message to users">
          <Textarea
            rows={5}
            value={form.support_agent_details ?? ""}
            onChange={(e) => set("support_agent_details", e.target.value)}
            placeholder="Email, WhatsApp number, working hours, etc."
          />
        </Field>
        <Field label="Contact link (WhatsApp / Telegram / mailto:)">
          <Input
            value={form.support_contact_link ?? ""}
            onChange={(e) => set("support_contact_link", e.target.value)}
            placeholder="https://wa.me/234… or mailto:support@…"
          />
        </Field>
      </Section>

      <Button className="w-full h-11" disabled={mut.isPending} onClick={() => mut.mutate()}>
        {mut.isPending ? "Saving…" : "Save settings"}
      </Button>

      <DangerZone />
    </div>
  );
}

function DangerZone() {
  const wipe = useServerFn(adminWipeAllData);
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const mut = useMutation({
    mutationFn: () => wipe({ data: { confirm: "DELETE EVERYTHING" } }),
    onSuccess: () => {
      toast.success("All site data wiped");
      setText("");
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <div className="bg-destructive/5 border border-destructive/40 rounded-xl p-4 space-y-3">
      <h2 className="text-xs font-bold uppercase tracking-widest text-destructive flex items-center gap-2">
        <AlertTriangle className="size-3.5" /> Danger zone
      </h2>
      <p className="text-xs text-muted-foreground">
        Permanently delete every deposit, withdrawal, investment, transaction, referral, check-in and reset every wallet to ₦0. Users, plans and settings are preserved. This cannot be undone.
      </p>
      <Label className="text-xs">Type <span className="font-mono font-bold">DELETE EVERYTHING</span> to confirm</Label>
      <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="DELETE EVERYTHING" />
      <Button
        variant="destructive"
        className="w-full h-11"
        disabled={mut.isPending || text !== "DELETE EVERYTHING"}
        onClick={() => mut.mutate()}
      >
        {mut.isPending ? "Wiping…" : "Wipe all site data"}
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

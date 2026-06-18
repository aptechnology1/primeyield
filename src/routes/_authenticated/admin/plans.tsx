import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { adminListPlans, adminUpsertPlan, adminDeletePlan } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatNaira } from "@/lib/format";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/plans")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({ queryKey: ["admin-plans"], queryFn: () => (adminListPlans as any)() }),
  component: PlansAdmin,
});

const emptyPlan = {
  name: "", description: "", daily_roi_pct: 2, duration_days: 30,
  min_amount: 1000, max_amount: 1000000, return_principal: true, is_active: true, sort_order: 0,
};

function PlansAdmin() {
  const fetch = useServerFn(adminListPlans);
  const { data: plans } = useSuspenseQuery({ queryKey: ["admin-plans"], queryFn: () => fetch() });
  return (
    <div className="space-y-3">
      <PlanForm initial={emptyPlan as any} trigger={<Button className="w-full"><Plus className="size-4 mr-1" /> New plan</Button>} />
      {plans.map((p: any) => (
        <div key={p.id} className="bg-card border border-border rounded-xl p-4 space-y-2">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-bold">{p.name} {!p.is_active && <span className="text-[10px] text-muted-foreground">(inactive)</span>}</p>
              <p className="text-[11px] text-muted-foreground">{p.daily_roi_pct}% / day · {p.duration_days} days · {p.return_principal ? "principal returned" : "no principal"}</p>
              <p className="text-[10px] text-muted-foreground font-mono">{formatNaira(p.min_amount)} – {formatNaira(p.max_amount)}</p>
            </div>
            <div className="flex gap-1">
              <PlanForm initial={p} trigger={<Button size="icon" variant="ghost"><Pencil className="size-4" /></Button>} />
              <DeleteBtn id={p.id} />
            </div>
          </div>
        </div>
      ))}
      {plans.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No plans yet. Create one above.</p>}
    </div>
  );
}

function PlanForm({ initial, trigger }: { initial: any; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initial);
  const qc = useQueryClient();
  const save = useServerFn(adminUpsertPlan);
  const mut = useMutation({
    mutationFn: () => save({ data: {
      ...(initial.id ? { id: initial.id } : {}),
      name: form.name,
      description: form.description || null,
      daily_roi_pct: Number(form.daily_roi_pct),
      duration_days: Number(form.duration_days),
      min_amount: Number(form.min_amount),
      max_amount: Number(form.max_amount),
      return_principal: !!form.return_principal,
      is_active: !!form.is_active,
      sort_order: Number(form.sort_order),
    } as any }),
    onSuccess: () => { toast.success("Plan saved"); qc.invalidateQueries({ queryKey: ["admin-plans"] }); setOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setForm(initial); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial.id ? "Edit plan" : "New plan"}</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-4">
          <Field label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Description"><Textarea rows={2} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Daily ROI %"><Input type="number" step="0.01" value={form.daily_roi_pct} onChange={(e) => setForm({ ...form, daily_roi_pct: e.target.value })} /></Field>
            <Field label="Duration (days)"><Input type="number" value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: e.target.value })} /></Field>
            <Field label="Min amount (₦)"><Input type="number" value={form.min_amount} onChange={(e) => setForm({ ...form, min_amount: e.target.value })} /></Field>
            <Field label="Max amount (₦)"><Input type="number" value={form.max_amount} onChange={(e) => setForm({ ...form, max_amount: e.target.value })} /></Field>
            <Field label="Sort order"><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} /></Field>
          </div>
          <div className="flex items-center justify-between"><Label>Return principal at end</Label><Switch checked={!!form.return_principal} onCheckedChange={(v) => setForm({ ...form, return_principal: v })} /></div>
          <div className="flex items-center justify-between"><Label>Active</Label><Switch checked={!!form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /></div>
          <Button className="w-full" disabled={mut.isPending} onClick={() => mut.mutate()}>{mut.isPending ? "Saving…" : "Save plan"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label>{label}</Label>{children}</div>;
}

function DeleteBtn({ id }: { id: string }) {
  const qc = useQueryClient();
  const del = useServerFn(adminDeletePlan);
  const mut = useMutation({
    mutationFn: () => del({ data: { id } }),
    onSuccess: () => { toast.success("Plan deleted"); qc.invalidateQueries({ queryKey: ["admin-plans"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete this plan?")) mut.mutate(); }}>
      <Trash2 className="size-4 text-destructive" />
    </Button>
  );
}

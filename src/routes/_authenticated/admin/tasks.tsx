import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminListTasks, adminUpsertTask, adminDeleteTask, adminSetTasksEnabled,
  adminListTaskClaims, adminApproveTaskClaim, adminListPlans,
} from "@/lib/admin.functions";
import { getPublicSettings } from "@/lib/user.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatNaira, formatDateTime } from "@/lib/format";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/tasks")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData({ queryKey: ["admin-tasks"], queryFn: () => (adminListTasks as any)() }),
      context.queryClient.ensureQueryData({ queryKey: ["admin-task-claims"], queryFn: () => (adminListTaskClaims as any)() }),
      context.queryClient.ensureQueryData({ queryKey: ["admin-plans"], queryFn: () => (adminListPlans as any)() }),
      context.queryClient.ensureQueryData({ queryKey: ["public-settings"], queryFn: () => (getPublicSettings as any)() }),
    ]);
  },
  component: TasksAdmin,
});

const emptyTask = {
  title: "", description: "", task_type: "refer_users", target_value: 1,
  target_plan_id: null as string | null, reward: 500, sort_order: 0, is_active: true,
};

function TasksAdmin() {
  const fetchTasks = useServerFn(adminListTasks);
  const fetchClaims = useServerFn(adminListTaskClaims);
  const fetchPlans = useServerFn(adminListPlans);
  const fetchSettings = useServerFn(getPublicSettings);
  const { data: tasks } = useSuspenseQuery({ queryKey: ["admin-tasks"], queryFn: () => fetchTasks() });
  const { data: claims } = useSuspenseQuery({ queryKey: ["admin-task-claims"], queryFn: () => fetchClaims() });
  const { data: plans } = useSuspenseQuery({ queryKey: ["admin-plans"], queryFn: () => fetchPlans() });
  const { data: settings } = useSuspenseQuery({ queryKey: ["public-settings"], queryFn: () => fetchSettings() });

  const qc = useQueryClient();
  const toggle = useServerFn(adminSetTasksEnabled);
  const mToggle = useMutation({
    mutationFn: (enabled: boolean) => toggle({ data: { enabled } }),
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["public-settings"] }); qc.invalidateQueries({ queryKey: ["tasks-feature"] }); },
  });

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold">Tasks feature</p>
          <p className="text-[11px] text-muted-foreground">When off, users see no sign the feature exists.</p>
        </div>
        <Switch checked={!!(settings as any).tasks_enabled} onCheckedChange={(v) => mToggle.mutate(v)} />
      </div>

      <TaskForm initial={emptyTask as any} plans={plans as any} trigger={<Button className="w-full"><Plus className="size-4 mr-1" /> New task</Button>} />

      <section className="space-y-2">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">All tasks (ordered)</h2>
        {tasks.map((t: any) => (
          <div key={t.id} className="bg-card border border-border rounded-xl p-4 space-y-2">
            <div className="flex justify-between items-start">
              <div className="min-w-0">
                <p className="text-sm font-bold">#{t.sort_order} · {t.title} {!t.is_active && <span className="text-[10px] text-muted-foreground">(inactive)</span>}</p>
                <p className="text-[11px] text-muted-foreground">{t.task_type} · target {t.target_value} · reward {formatNaira(t.reward)}</p>
                {t.description && <p className="text-[11px] text-muted-foreground mt-1">{t.description}</p>}
              </div>
              <div className="flex gap-1">
                <TaskForm initial={t} plans={plans as any} trigger={<Button size="icon" variant="ghost"><Pencil className="size-4" /></Button>} />
                <DeleteBtn id={t.id} />
              </div>
            </div>
          </div>
        ))}
        {tasks.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No tasks yet.</p>}
      </section>

      <section className="space-y-2">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Manual claim queue</h2>
        {claims.map((c: any) => <ClaimRow key={c.id} c={c} />)}
        {claims.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No pending claims.</p>}
      </section>
    </div>
  );
}

function TaskForm({ initial, trigger, plans }: { initial: any; trigger: React.ReactNode; plans: any[] }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initial);
  const qc = useQueryClient();
  const save = useServerFn(adminUpsertTask);
  const mut = useMutation({
    mutationFn: () => save({ data: {
      ...(initial.id ? { id: initial.id } : {}),
      title: form.title,
      description: form.description || null,
      task_type: form.task_type,
      target_value: Number(form.target_value),
      target_plan_id: form.task_type === "invest_plan" ? (form.target_plan_id || null) : null,
      reward: Number(form.reward),
      sort_order: Number(form.sort_order),
      is_active: !!form.is_active,
    } as any }),
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["admin-tasks"] }); setOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setForm(initial); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial.id ? "Edit task" : "New task"}</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-4">
          <Field label="Title"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Description"><Textarea rows={2} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <Field label="Type">
            <select className="w-full border border-input rounded-md h-9 px-2 bg-background" value={form.task_type} onChange={(e) => setForm({ ...form, task_type: e.target.value })}>
              <option value="refer_users">Refer N valid users</option>
              <option value="deposit_amount">Deposit ≥ ₦X (total)</option>
              <option value="invest_plan">Invest in a plan</option>
              <option value="manual_claim">Manual (admin approves)</option>
            </select>
          </Field>
          {form.task_type === "invest_plan" && (
            <Field label="Specific plan (optional)">
              <select className="w-full border border-input rounded-md h-9 px-2 bg-background" value={form.target_plan_id ?? ""} onChange={(e) => setForm({ ...form, target_plan_id: e.target.value || null })}>
                <option value="">Any plan</option>
                {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
          )}
          {form.task_type !== "manual_claim" && (
            <Field label="Target value (users, naira, or count)"><Input type="number" value={form.target_value} onChange={(e) => setForm({ ...form, target_value: e.target.value })} /></Field>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Reward (₦, added to wallet)"><Input type="number" value={form.reward} onChange={(e) => setForm({ ...form, reward: e.target.value })} /></Field>
            <Field label="Sort order (lower = earlier)"><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} /></Field>
          </div>
          <div className="flex items-center justify-between"><Label>Active</Label><Switch checked={!!form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /></div>
          <Button className="w-full" disabled={mut.isPending || !form.title} onClick={() => mut.mutate()}>{mut.isPending ? "Saving…" : "Save"}</Button>
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
  const del = useServerFn(adminDeleteTask);
  const mut = useMutation({
    mutationFn: () => del({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-tasks"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  return <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete task?")) mut.mutate(); }}><Trash2 className="size-4 text-destructive" /></Button>;
}

function ClaimRow({ c }: { c: any }) {
  const qc = useQueryClient();
  const act = useServerFn(adminApproveTaskClaim);
  const mut = useMutation({
    mutationFn: (approve: boolean) => act({ data: { id: c.id, approve } }),
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["admin-task-claims"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <div className="bg-card border border-border p-3 rounded-xl flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-bold truncate">{c.task?.title ?? "Task"}</p>
        <p className="text-[11px] text-muted-foreground truncate">{c.profile?.full_name ?? c.profile?.email}</p>
        {c.claim_note && <p className="text-[11px] text-muted-foreground mt-1">"{c.claim_note}"</p>}
        <p className="text-[10px] text-muted-foreground">{formatDateTime(c.created_at)}</p>
      </div>
      <div className="flex gap-1">
        <Button size="icon" variant="outline" onClick={() => mut.mutate(true)}><Check className="size-4 text-primary" /></Button>
        <Button size="icon" variant="ghost" onClick={() => mut.mutate(false)}><X className="size-4 text-destructive" /></Button>
      </div>
    </div>
  );
}

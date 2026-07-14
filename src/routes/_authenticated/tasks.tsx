import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { getMyTasks, claimTask, getTasksFeature } from "@/lib/tasks.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatNaira } from "@/lib/format";
import { toast } from "sonner";
import { useState } from "react";
import { ArrowLeft, Lock, CheckCircle2, Clock, ListChecks } from "lucide-react";

export const Route = createFileRoute("/_authenticated/tasks")({
  loader: async ({ context }) => {
    const f: any = await context.queryClient.ensureQueryData({ queryKey: ["tasks-feature"], queryFn: () => (getTasksFeature as any)() });
    if (!f?.enabled) throw redirect({ to: "/dashboard" });
    await context.queryClient.ensureQueryData({ queryKey: ["my-tasks"], queryFn: () => (getMyTasks as any)() });
  },
  component: TasksPage,
});

function TasksPage() {
  const fetch = useServerFn(getMyTasks);
  const { data } = useSuspenseQuery({ queryKey: ["my-tasks"], queryFn: () => fetch() });
  return (
    <div className="pb-20">
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border px-5 py-4 flex items-center gap-3">
        <Link to="/dashboard" className="text-muted-foreground"><ArrowLeft className="size-5" /></Link>
        <ListChecks className="size-4 text-primary" />
        <h1 className="text-base font-bold">Tasks</h1>
      </header>
      <div className="px-5 pt-5 space-y-3">
        <p className="text-[11px] text-muted-foreground">Complete tasks in order to unlock the next one and earn rewards.</p>
        {data.tasks.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No tasks yet — check back later.</p>}
        {data.tasks.map((t: any) => <TaskRow key={t.id} t={t} />)}
      </div>
    </div>
  );
}

function TaskRow({ t }: { t: any }) {
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const claim = useServerFn(claimTask);
  const mut = useMutation({
    mutationFn: () => claim({ data: { taskId: t.id, note: note || undefined } }),
    onSuccess: (r: any) => {
      if (r.status === "pending") toast.success("Submitted — awaiting admin approval");
      else toast.success(`+${formatNaira(r.reward ?? 0)} added to your wallet`);
      qc.invalidateQueries({ queryKey: ["my-tasks"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const locked = t.state === "locked";
  const completed = t.state === "completed";
  const pending = t.state === "pending";
  const available = t.state === "available";

  return (
    <div className={`bg-card border rounded-xl p-4 space-y-3 ${locked ? "opacity-60 border-border" : completed ? "border-primary/30" : "border-border"}`}>
      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold flex items-center gap-1.5">
            {locked && <Lock className="size-3.5 text-muted-foreground" />}
            {completed && <CheckCircle2 className="size-3.5 text-primary" />}
            {pending && <Clock className="size-3.5 text-muted-foreground" />}
            {t.title}
          </p>
          {t.description && <p className="text-[11px] text-muted-foreground mt-1">{t.description}</p>}
        </div>
        <span className="text-xs font-mono font-bold text-primary shrink-0">+{formatNaira(t.reward)}</span>
      </div>
      {available && t.task_type === "manual_claim" && (
        <Textarea rows={2} placeholder="Add a note or proof link" value={note} onChange={(e) => setNote(e.target.value)} />
      )}
      {available && (
        <Button className="w-full" size="sm" onClick={() => mut.mutate()} disabled={mut.isPending}>
          {mut.isPending ? "Verifying…" : t.task_type === "manual_claim" ? "Submit claim" : "Complete task"}
        </Button>
      )}
      {pending && <p className="text-[11px] text-center text-muted-foreground">Waiting for admin approval…</p>}
      {completed && <p className="text-[11px] text-center text-primary font-bold uppercase tracking-widest">Completed</p>}
      {locked && <p className="text-[11px] text-center text-muted-foreground">Complete previous tasks to unlock</p>}
    </div>
  );
}

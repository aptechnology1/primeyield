import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Public: is the task feature enabled?
export const getTasksFeature = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data } = await sb.from("settings").select("tasks_enabled").eq("id", 1).maybeSingle();
  return { enabled: !!(data as any)?.tasks_enabled };
});

// User: list tasks in order + per-user status
export const getMyTasks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: settings }, { data: tasks }, { data: userTasks }] = await Promise.all([
      supabaseAdmin.from("settings").select("tasks_enabled").eq("id", 1).maybeSingle(),
      supabaseAdmin.from("tasks").select("*").eq("is_active", true).order("sort_order").order("created_at"),
      supabaseAdmin.from("user_tasks").select("*").eq("user_id", context.userId),
    ]);
    if (!(settings as any)?.tasks_enabled) return { enabled: false, tasks: [] };
    const utMap = new Map((userTasks ?? []).map((u: any) => [u.task_id, u]));
    // sequentially unlock: current = first task where not completed
    let currentUnlocked = false;
    const result = (tasks ?? []).map((t: any) => {
      const ut: any = utMap.get(t.id);
      const completed = ut?.status === "completed";
      const pending = ut?.status === "pending";
      let state: "locked" | "available" | "pending" | "completed" = "locked";
      if (completed) state = "completed";
      else if (pending) state = "pending";
      else if (!currentUnlocked) { state = "available"; currentUnlocked = true; }
      return { ...t, state, user_task: ut ?? null };
    });
    return { enabled: true, tasks: result };
  });

// Verify + claim a task
export const claimTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { taskId: string; note?: string }) =>
    z.object({ taskId: z.string().uuid(), note: z.string().max(500).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { userId } = context;

    const { data: settings } = await supabaseAdmin.from("settings").select("tasks_enabled").eq("id", 1).maybeSingle();
    if (!(settings as any)?.tasks_enabled) throw new Error("Tasks disabled");

    const { data: task } = await supabaseAdmin.from("tasks").select("*").eq("id", data.taskId).eq("is_active", true).maybeSingle();
    if (!task) throw new Error("Task not found");

    // Enforce sequential unlock: this task must be the first non-completed
    const { data: allTasks } = await supabaseAdmin.from("tasks").select("id,sort_order,created_at").eq("is_active", true).order("sort_order").order("created_at");
    const { data: myTasks } = await supabaseAdmin.from("user_tasks").select("task_id,status").eq("user_id", userId);
    const doneSet = new Set((myTasks ?? []).filter((x: any) => x.status === "completed").map((x: any) => x.task_id));
    const firstNonDone = (allTasks ?? []).find((t: any) => !doneSet.has(t.id));
    if (!firstNonDone || firstNonDone.id !== task.id) throw new Error("This task is locked");

    // Prevent double-claim of pending
    const existing = (myTasks ?? []).find((x: any) => x.task_id === task.id);
    if (existing?.status === "completed") throw new Error("Already completed");
    if (existing?.status === "pending") throw new Error("Claim pending admin approval");

    // Verify based on task_type
    const target = Number(task.target_value);
    let verified = false;
    let manualPending = false;

    if (task.task_type === "refer_users") {
      // count L1 referrals that have deposited (valid = has any completed deposit)
      const { data: refs } = await supabaseAdmin.from("referrals").select("referred_id").eq("referrer_id", userId).eq("level", 1);
      const referredIds = (refs ?? []).map((r: any) => r.referred_id);
      let validCount = 0;
      if (referredIds.length) {
        const { data: deps } = await supabaseAdmin.from("deposits").select("user_id").in("user_id", referredIds).eq("status", "completed");
        const uniq = new Set((deps ?? []).map((d: any) => d.user_id));
        validCount = uniq.size;
      }
      verified = validCount >= target;
      if (!verified) throw new Error(`Requires ${target} valid referral${target > 1 ? "s" : ""} (have ${validCount})`);
    } else if (task.task_type === "deposit_amount") {
      const { data: deps } = await supabaseAdmin.from("deposits").select("amount").eq("user_id", userId).eq("status", "completed");
      const sum = (deps ?? []).reduce((a: number, d: any) => a + Number(d.amount), 0);
      verified = sum >= target;
      if (!verified) throw new Error(`Requires ₦${target} total deposits (have ₦${sum})`);
    } else if (task.task_type === "invest_plan") {
      let q = supabaseAdmin.from("investments").select("id", { count: "exact", head: true }).eq("user_id", userId);
      if (task.target_plan_id) q = q.eq("plan_id", task.target_plan_id);
      const { count } = await q;
      verified = (count ?? 0) >= Math.max(1, target || 1);
      if (!verified) throw new Error(task.target_plan_id ? "Purchase the required plan first" : "Purchase any plan first");
    } else if (task.task_type === "manual_claim") {
      manualPending = true;
    }

    if (manualPending) {
      await supabaseAdmin.from("user_tasks").upsert({
        user_id: userId, task_id: task.id, status: "pending", claim_note: data.note ?? null,
      }, { onConflict: "user_id,task_id" });
      return { status: "pending" };
    }

    // Auto-complete + credit
    const reward = Number(task.reward);
    if (reward > 0) {
      const { data: w } = await supabaseAdmin.from("wallets").select("balance").eq("user_id", userId).maybeSingle();
      await supabaseAdmin.from("wallets").update({
        balance: Number(w?.balance ?? 0) + reward, updated_at: new Date().toISOString(),
      }).eq("user_id", userId);
      await supabaseAdmin.from("transactions").insert({
        user_id: userId, type: "reward", amount: reward,
        description: `Task reward: ${task.title}`,
      });
    }
    await supabaseAdmin.from("user_tasks").upsert({
      user_id: userId, task_id: task.id, status: "completed", completed_at: new Date().toISOString(),
    }, { onConflict: "user_id,task_id" });

    return { status: "completed", reward };
  });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function requireAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Forbidden: admin only");
}

// ============================================================
// OVERVIEW
// ============================================================
export const adminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [users, plans, pendingDeposits, pendingWithdrawals, totalDeposits, totalInvested] = await Promise.all([
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("plans").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("deposits").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabaseAdmin.from("withdrawals").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabaseAdmin.from("transactions").select("amount").eq("type", "deposit").eq("status", "completed"),
      supabaseAdmin.from("transactions").select("amount").eq("type", "investment"),
    ]);
    const sum = (rows: any) => (rows ?? []).reduce((a: number, r: any) => a + Number(r.amount), 0);
    return {
      userCount: users.count ?? 0,
      planCount: plans.count ?? 0,
      pendingDeposits: pendingDeposits.count ?? 0,
      pendingWithdrawals: pendingWithdrawals.count ?? 0,
      totalDeposits: sum(totalDeposits.data),
      totalInvested: sum(totalInvested.data),
    };
  });

// ============================================================
// USERS
// ============================================================
export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profiles } = await supabaseAdmin
      .from("profiles").select("id,full_name,email,referral_code,created_at")
      .order("created_at", { ascending: false }).limit(200);
    const { data: wallets } = await supabaseAdmin.from("wallets").select("*");
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id,role");
    const wMap = new Map((wallets ?? []).map((w: any) => [w.user_id, w]));
    const rMap = new Map<string, string[]>();
    (roles ?? []).forEach((r: any) => {
      const arr = rMap.get(r.user_id) ?? [];
      arr.push(r.role); rMap.set(r.user_id, arr);
    });
    return (profiles ?? []).map((p: any) => ({
      ...p, wallet: wMap.get(p.id) ?? null, roles: rMap.get(p.id) ?? ["user"],
    }));
  });

export const adminSetRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; role: "admin" | "user"; grant: boolean }) =>
    z.object({ userId: z.string().uuid(), role: z.enum(["admin", "user"]), grant: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.grant) {
      await supabaseAdmin.from("user_roles").upsert({ user_id: data.userId, role: data.role });
    } else {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId).eq("role", data.role);
    }
    return { ok: true };
  });

export const adminAdjustWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; delta: number; note: string }) =>
    z.object({ userId: z.string().uuid(), delta: z.number(), note: z.string().max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: w } = await supabaseAdmin.from("wallets").select("balance").eq("user_id", data.userId).maybeSingle();
    if (!w) throw new Error("Wallet not found");
    await supabaseAdmin.from("wallets").update({
      balance: Number(w.balance) + data.delta, updated_at: new Date().toISOString(),
    }).eq("user_id", data.userId);
    await supabaseAdmin.from("transactions").insert({
      user_id: data.userId, type: data.delta >= 0 ? "deposit" : "withdrawal", amount: Math.abs(data.delta),
      status: "completed", description: `Admin adjustment: ${data.note}`,
    });
    return { ok: true };
  });

// ============================================================
// PLANS
// ============================================================
export const adminListPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { data } = await context.supabase.from("plans").select("*").order("sort_order");
    return data ?? [];
  });

const planSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  daily_roi_pct: z.number().positive(),
  duration_days: z.number().int().positive(),
  price: z.number().positive(),
  return_principal: z.boolean(),
  is_active: z.boolean(),
  sort_order: z.number().int(),
});

export const adminUpsertPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => planSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    // Mirror price into min/max for backward compat
    const row = { ...data, min_amount: data.price, max_amount: data.price };
    if (data.id) {
      const { error } = await context.supabase.from("plans").update(row).eq("id", data.id);
      if (error) throw error;
    } else {
      const { id, ...insert } = row;
      const { error } = await context.supabase.from("plans").insert(insert);
      if (error) throw error;
    }
    return { ok: true };
  });

export const adminDeletePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    await context.supabase.from("plans").delete().eq("id", data.id);
    return { ok: true };
  });

// ============================================================
// DEPOSITS
// ============================================================
export const adminListDeposits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: deps } = await supabaseAdmin
      .from("deposits").select("*").order("created_at", { ascending: false }).limit(200);
    const ids = [...new Set((deps ?? []).map((d: any) => d.user_id))];
    const { data: profs } = await supabaseAdmin.from("profiles").select("id,email,full_name").in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const pMap = new Map((profs ?? []).map((p: any) => [p.id, p]));
    return (deps ?? []).map((d: any) => ({ ...d, profile: pMap.get(d.user_id) }));
  });

export const adminApproveDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: dep } = await supabaseAdmin.from("deposits").select("*").eq("id", data.id).maybeSingle();
    if (!dep || dep.status !== "pending") throw new Error("Not pending");
    const amount = Number(dep.amount);
    const { data: w } = await supabaseAdmin.from("wallets").select("balance,total_deposited").eq("user_id", dep.user_id).maybeSingle();
    await supabaseAdmin.from("wallets").update({
      balance: Number(w?.balance ?? 0) + amount,
      total_deposited: Number(w?.total_deposited ?? 0) + amount,
      updated_at: new Date().toISOString(),
    }).eq("user_id", dep.user_id);
    await supabaseAdmin.from("deposits").update({ status: "completed", processed_at: new Date().toISOString() }).eq("id", dep.id);
    await supabaseAdmin.from("transactions").insert({
      user_id: dep.user_id, type: "deposit", amount, status: "completed",
      description: `Manual deposit approved`,
    });
    // referral commission if config'd for deposits
    const { data: settings } = await supabaseAdmin.from("settings").select("ref_source,ref_l1_pct,ref_l2_pct,ref_l3_pct").eq("id", 1).maybeSingle();
    if (settings?.ref_source === "deposit") {
      const pcts: Record<number, number> = { 1: Number(settings.ref_l1_pct), 2: Number(settings.ref_l2_pct), 3: Number(settings.ref_l3_pct) };
      const { data: chain } = await supabaseAdmin.from("referrals").select("referrer_id,level").eq("referred_id", dep.user_id);
      for (const r of chain ?? []) {
        const pct = pcts[r.level]; if (!pct) continue;
        const amt = amount * (pct / 100);
        const { data: rw } = await supabaseAdmin.from("wallets").select("balance,referral_earned").eq("user_id", r.referrer_id).maybeSingle();
        if (!rw) continue;
        await supabaseAdmin.from("wallets").update({
          balance: Number(rw.balance) + amt, referral_earned: Number(rw.referral_earned) + amt, updated_at: new Date().toISOString(),
        }).eq("user_id", r.referrer_id);
        await supabaseAdmin.from("referral_earnings").insert({
          user_id: r.referrer_id, from_user_id: dep.user_id, level: r.level,
          source_type: "deposit", source_amount: amount, amount: amt,
        });
        await supabaseAdmin.from("transactions").insert({
          user_id: r.referrer_id, type: "referral", amount: amt,
          description: `Level ${r.level} referral commission`,
        });
      }
    }
    return { ok: true };
  });

export const adminRejectDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; note: string }) =>
    z.object({ id: z.string().uuid(), note: z.string().max(300) }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("deposits").update({
      status: "rejected", admin_note: data.note, processed_at: new Date().toISOString(),
    }).eq("id", data.id).eq("status", "pending");
    return { ok: true };
  });

// ============================================================
// WITHDRAWALS
// ============================================================
export const adminListWithdrawals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: ws } = await supabaseAdmin.from("withdrawals").select("*").order("created_at", { ascending: false }).limit(200);
    const ids = [...new Set((ws ?? []).map((d: any) => d.user_id))];
    const { data: profs } = await supabaseAdmin.from("profiles").select("id,email,full_name").in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const pMap = new Map((profs ?? []).map((p: any) => [p.id, p]));
    return (ws ?? []).map((d: any) => ({ ...d, profile: pMap.get(d.user_id) }));
  });

export const adminMarkWithdrawalPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: w } = await supabaseAdmin.from("withdrawals").select("*").eq("id", data.id).maybeSingle();
    if (!w || w.status !== "pending") throw new Error("Not pending");
    await supabaseAdmin.from("withdrawals").update({
      status: "completed", processed_at: new Date().toISOString(),
    }).eq("id", w.id);
    const { data: wal } = await supabaseAdmin.from("wallets").select("total_withdrawn").eq("user_id", w.user_id).maybeSingle();
    await supabaseAdmin.from("wallets").update({
      total_withdrawn: Number(wal?.total_withdrawn ?? 0) + Number(w.amount),
      updated_at: new Date().toISOString(),
    }).eq("user_id", w.user_id);
    await supabaseAdmin.from("transactions").insert({
      user_id: w.user_id, type: "withdrawal", amount: w.amount, status: "completed",
      description: `Withdrawal paid (net ₦${Number(w.net_amount).toFixed(2)})`,
    });
    return { ok: true };
  });

export const adminRejectWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; note: string }) =>
    z.object({ id: z.string().uuid(), note: z.string().max(300) }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: w } = await supabaseAdmin.from("withdrawals").select("*").eq("id", data.id).maybeSingle();
    if (!w || w.status !== "pending") throw new Error("Not pending");
    // refund
    const { data: wal } = await supabaseAdmin.from("wallets").select("balance").eq("user_id", w.user_id).maybeSingle();
    await supabaseAdmin.from("wallets").update({
      balance: Number(wal?.balance ?? 0) + Number(w.amount), updated_at: new Date().toISOString(),
    }).eq("user_id", w.user_id);
    await supabaseAdmin.from("withdrawals").update({
      status: "rejected", admin_note: data.note, processed_at: new Date().toISOString(),
    }).eq("id", w.id);
    await supabaseAdmin.from("transactions").insert({
      user_id: w.user_id, type: "refund", amount: w.amount, status: "completed",
      description: `Withdrawal rejected — refunded: ${data.note}`,
    });
    return { ok: true };
  });

// ============================================================
// SETTINGS
// ============================================================
export const adminGetSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { data } = await context.supabase.from("settings").select("*").eq("id", 1).maybeSingle();
    return data;
  });

const settingsSchema = z.object({
  site_name: z.string().min(1).max(100),
  welcome_bonus_amount: z.number().min(0),
  welcome_bonus_withdrawable: z.boolean(),
  daily_checkin_amount: z.number().min(0),
  ref_l1_pct: z.number().min(0).max(100),
  ref_l2_pct: z.number().min(0).max(100),
  ref_l3_pct: z.number().min(0).max(100),
  ref_source: z.enum(["deposit", "investment", "roi"]),
  min_withdrawal: z.number().min(0),
  max_withdrawal: z.number().min(0),
  withdrawal_fee_pct: z.number().min(0).max(100),
  paystack_enabled: z.boolean(),
  manual_deposit_enabled: z.boolean(),
  manual_bank_name: z.string().max(200),
  manual_bank_account: z.string().max(100),
  manual_bank_account_name: z.string().max(200),
  dashboard_popup_enabled: z.boolean(),
  dashboard_popup_title: z.string().max(200),
  dashboard_popup_message: z.string().max(2000),
  dashboard_popup_buttons: z.array(z.object({
    title: z.string().min(1).max(80),
    link: z.string().min(1).max(500),
  })).max(8),
  support_title: z.string().max(100),
  support_agent_name: z.string().max(100),
  support_agent_details: z.string().max(2000),
  support_contact_link: z.string().max(500),
});

export const adminUpdateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => settingsSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("settings").update(data).eq("id", 1);
    if (error) throw error;
    return { ok: true };
  });

// Manual bank info for users (no admin guard)
export const getManualBankInfo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("settings")
      .select("manual_bank_name,manual_bank_account,manual_bank_account_name,manual_deposit_enabled,paystack_enabled")
      .eq("id", 1).maybeSingle();
    return data;
  });

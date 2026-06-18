import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ============================================================
// PUBLIC SETTINGS (site name + which deposit methods are on)
// ============================================================
export const getPublicSettings = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data } = await sb
    .from("settings")
    .select("site_name,paystack_enabled,manual_deposit_enabled,welcome_bonus_amount")
    .eq("id", 1)
    .maybeSingle();
  return data ?? {
    site_name: "Horizon",
    paystack_enabled: true,
    manual_deposit_enabled: true,
    welcome_bonus_amount: 0,
  };
});

// ============================================================
// ROI ACCRUAL HELPER (called inside auth-required server fns)
// ============================================================
async function accrueRoi(supabase: any, userId: string) {
  const { data: investments } = await supabase
    .from("investments")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active");

  if (!investments || investments.length === 0) return;

  for (const inv of investments) {
    const now = new Date();
    const last = new Date(inv.last_payout_at);
    const msPerDay = 86_400_000;
    const elapsedDays = Math.floor((now.getTime() - last.getTime()) / msPerDay);
    if (elapsedDays <= 0) continue;

    const remainingDays = inv.duration_days - inv.days_paid;
    const daysToPay = Math.min(elapsedDays, remainingDays);
    if (daysToPay <= 0) continue;

    const dailyAmount = Number(inv.amount) * (Number(inv.daily_roi_pct) / 100);
    const payout = dailyAmount * daysToPay;
    const newDaysPaid = inv.days_paid + daysToPay;
    const isComplete = newDaysPaid >= inv.duration_days;

    // credit ROI
    await supabase.rpc("noop_placeholder").catch(() => {});
    const { data: wallet } = await supabase
      .from("wallets").select("balance,total_earned").eq("user_id", userId).maybeSingle();
    if (!wallet) continue;

    let newBalance = Number(wallet.balance) + payout;
    let newEarned = Number(wallet.total_earned) + payout;

    // principal return on completion
    if (isComplete && inv.return_principal) {
      newBalance += Number(inv.amount);
    }

    await supabase.from("wallets").update({
      balance: newBalance, total_earned: newEarned, updated_at: new Date().toISOString(),
    }).eq("user_id", userId);

    await supabase.from("investments").update({
      days_paid: newDaysPaid,
      total_earned: Number(inv.total_earned) + payout,
      last_payout_at: new Date(last.getTime() + daysToPay * msPerDay).toISOString(),
      status: isComplete ? "completed" : "active",
    }).eq("id", inv.id);

    await supabase.from("transactions").insert({
      user_id: userId, type: "roi", amount: payout,
      description: `ROI from ${inv.plan_name} (${daysToPay} day${daysToPay > 1 ? "s" : ""})`,
      meta: { investment_id: inv.id, days: daysToPay },
    });

    if (isComplete && inv.return_principal) {
      await supabase.from("transactions").insert({
        user_id: userId, type: "refund", amount: Number(inv.amount),
        description: `Principal returned from ${inv.plan_name}`,
        meta: { investment_id: inv.id },
      });
    }
  }
}

// ============================================================
// DASHBOARD
// ============================================================
export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await accrueRoi(supabase, userId);

    const [profileQ, walletQ, invQ, txQ, checkinQ, settingsQ, refStatsQ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("wallets").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("investments").select("*").eq("user_id", userId).order("started_at", { ascending: false }).limit(10),
      supabase.from("transactions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(8),
      supabase.from("daily_checkins").select("id").eq("user_id", userId).eq("checkin_date", new Date().toISOString().slice(0, 10)).maybeSingle(),
      supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
      supabase.from("referrals").select("level").eq("referrer_id", userId),
    ]);

    const refCounts = { l1: 0, l2: 0, l3: 0 };
    (refStatsQ.data ?? []).forEach((r: any) => {
      if (r.level === 1) refCounts.l1++;
      else if (r.level === 2) refCounts.l2++;
      else if (r.level === 3) refCounts.l3++;
    });

    const isAdmin = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });

    return {
      profile: profileQ.data,
      wallet: walletQ.data,
      investments: invQ.data ?? [],
      transactions: txQ.data ?? [],
      checkedInToday: !!checkinQ.data,
      settings: settingsQ.data,
      referralCounts: refCounts,
      isAdmin: !!isAdmin.data,
    };
  });

// ============================================================
// DAILY CHECK-IN
// ============================================================
export const claimDailyCheckin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);

    const { data: settings } = await supabase.from("settings").select("daily_checkin_amount").eq("id", 1).maybeSingle();
    const amount = Number(settings?.daily_checkin_amount ?? 0);
    if (amount <= 0) throw new Error("Daily check-in is disabled");

    const { error } = await supabase.from("daily_checkins").insert({
      user_id: userId, checkin_date: today, amount,
    });
    if (error) {
      if (error.code === "23505") throw new Error("Already checked in today");
      throw error;
    }

    const { data: wallet } = await supabase.from("wallets").select("balance").eq("user_id", userId).maybeSingle();
    await supabase.from("wallets").update({
      balance: Number(wallet?.balance ?? 0) + amount, updated_at: new Date().toISOString(),
    }).eq("user_id", userId);

    await supabase.from("transactions").insert({
      user_id: userId, type: "daily_checkin", amount, description: "Daily check-in reward",
    });
    return { amount };
  });

// ============================================================
// LIST PLANS
// ============================================================
export const listPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("plans").select("*").eq("is_active", true).order("sort_order").order("min_amount");
    return data ?? [];
  });

// ============================================================
// REFERRAL HELPER (used by deposit + investment)
// ============================================================
async function payReferralCommissions(
  supabase: any, sourceUserId: string, sourceAmount: number, sourceType: "deposit" | "investment" | "roi"
) {
  const { data: settings } = await supabase.from("settings").select("ref_l1_pct,ref_l2_pct,ref_l3_pct,ref_source").eq("id", 1).maybeSingle();
  if (!settings || settings.ref_source !== sourceType) return;

  const pcts: Record<number, number> = {
    1: Number(settings.ref_l1_pct),
    2: Number(settings.ref_l2_pct),
    3: Number(settings.ref_l3_pct),
  };

  const { data: chain } = await supabase
    .from("referrals").select("referrer_id,level").eq("referred_id", sourceUserId);

  for (const r of chain ?? []) {
    const pct = pcts[r.level];
    if (!pct || pct <= 0) continue;
    const amt = sourceAmount * (pct / 100);
    if (amt <= 0) continue;
    const { data: w } = await supabase.from("wallets").select("balance,referral_earned").eq("user_id", r.referrer_id).maybeSingle();
    if (!w) continue;
    await supabase.from("wallets").update({
      balance: Number(w.balance) + amt,
      referral_earned: Number(w.referral_earned) + amt,
      updated_at: new Date().toISOString(),
    }).eq("user_id", r.referrer_id);
    await supabase.from("referral_earnings").insert({
      user_id: r.referrer_id, from_user_id: sourceUserId, level: r.level,
      source_type: sourceType, source_amount: sourceAmount, amount: amt,
    });
    await supabase.from("transactions").insert({
      user_id: r.referrer_id, type: "referral", amount: amt,
      description: `Level ${r.level} referral commission`,
      meta: { from: sourceUserId, source_type: sourceType, pct },
    });
  }
}

// ============================================================
// PURCHASE PLAN
// ============================================================
export const purchasePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { planId: string; amount: number }) =>
    z.object({ planId: z.string().uuid(), amount: z.number().positive() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await accrueRoi(supabase, userId);

    const { data: plan } = await supabase.from("plans").select("*").eq("id", data.planId).eq("is_active", true).maybeSingle();
    if (!plan) throw new Error("Plan not found");
    if (data.amount < Number(plan.min_amount)) throw new Error(`Minimum is ₦${plan.min_amount}`);
    if (data.amount > Number(plan.max_amount)) throw new Error(`Maximum is ₦${plan.max_amount}`);

    const { data: wallet } = await supabase.from("wallets").select("balance").eq("user_id", userId).maybeSingle();
    if (!wallet || Number(wallet.balance) < data.amount) throw new Error("Insufficient balance");

    await supabase.from("wallets").update({
      balance: Number(wallet.balance) - data.amount, updated_at: new Date().toISOString(),
    }).eq("user_id", userId);

    const startedAt = new Date();
    const endsAt = new Date(startedAt.getTime() + plan.duration_days * 86_400_000);
    const { data: inv, error: invErr } = await supabase.from("investments").insert({
      user_id: userId, plan_id: plan.id, plan_name: plan.name,
      amount: data.amount, daily_roi_pct: plan.daily_roi_pct,
      duration_days: plan.duration_days, return_principal: plan.return_principal,
      ends_at: endsAt.toISOString(),
    }).select().single();
    if (invErr) throw invErr;

    await supabase.from("transactions").insert({
      user_id: userId, type: "investment", amount: data.amount,
      description: `Purchased ${plan.name}`, meta: { investment_id: inv.id, plan_id: plan.id },
    });

    await payReferralCommissions(supabase, userId, data.amount, "investment");
    return { ok: true };
  });

// ============================================================
// PAYSTACK DEPOSIT
// ============================================================
export const initPaystackDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { amount: number; callbackUrl: string }) =>
    z.object({ amount: z.number().positive(), callbackUrl: z.string().url() }).parse(d))
  .handler(async ({ data, context }) => {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) throw new Error("Paystack not configured. Please contact admin.");

    const { data: profile } = await context.supabase.from("profiles").select("email").eq("id", context.userId).maybeSingle();
    const email = profile?.email;
    if (!email) throw new Error("Email missing on profile");

    const resp = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email, amount: Math.round(data.amount * 100), currency: "NGN",
        callback_url: data.callbackUrl,
        metadata: { user_id: context.userId },
      }),
    });
    const json: any = await resp.json();
    if (!json.status) throw new Error(json.message || "Paystack init failed");

    await context.supabase.from("deposits").insert({
      user_id: context.userId, amount: data.amount, method: "paystack",
      paystack_ref: json.data.reference, status: "pending",
    });
    return { authorization_url: json.data.authorization_url, reference: json.data.reference };
  });

export const verifyPaystackDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { reference: string }) => z.object({ reference: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) throw new Error("Paystack not configured");

    const { data: dep } = await context.supabase
      .from("deposits").select("*").eq("paystack_ref", data.reference).eq("user_id", context.userId).maybeSingle();
    if (!dep) throw new Error("Deposit not found");
    if (dep.status === "completed") return { status: "already_completed" };

    const resp = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(data.reference)}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const json: any = await resp.json();
    if (!json.status || json.data.status !== "success") {
      await context.supabase.from("deposits").update({ status: "failed", processed_at: new Date().toISOString() }).eq("id", dep.id);
      throw new Error("Payment not successful");
    }

    const amount = Number(dep.amount);
    const { data: wallet } = await context.supabase.from("wallets").select("balance,total_deposited").eq("user_id", context.userId).maybeSingle();
    await context.supabase.from("wallets").update({
      balance: Number(wallet?.balance ?? 0) + amount,
      total_deposited: Number(wallet?.total_deposited ?? 0) + amount,
      updated_at: new Date().toISOString(),
    }).eq("user_id", context.userId);

    await context.supabase.from("deposits").update({
      status: "completed", processed_at: new Date().toISOString(),
    }).eq("id", dep.id);

    await context.supabase.from("transactions").insert({
      user_id: context.userId, type: "deposit", amount, status: "completed",
      reference: data.reference, description: "Paystack deposit",
    });

    await payReferralCommissions(context.supabase, context.userId, amount, "deposit");
    return { status: "ok" };
  });

// ============================================================
// MANUAL DEPOSIT REQUEST
// ============================================================
export const submitManualDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { amount: number; note: string }) =>
    z.object({ amount: z.number().positive(), note: z.string().min(1).max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: settings } = await context.supabase.from("settings").select("manual_deposit_enabled").eq("id", 1).maybeSingle();
    if (!settings?.manual_deposit_enabled) throw new Error("Manual deposits are disabled");
    await context.supabase.from("deposits").insert({
      user_id: context.userId, amount: data.amount, method: "manual",
      proof_note: data.note, status: "pending",
    });
    return { ok: true };
  });

// ============================================================
// WITHDRAWAL REQUEST
// ============================================================
export const requestWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { amount: number }) => z.object({ amount: z.number().positive() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await accrueRoi(supabase, userId);

    const [{ data: settings }, { data: wallet }, { data: profile }] = await Promise.all([
      supabase.from("settings").select("min_withdrawal,max_withdrawal,withdrawal_fee_pct").eq("id", 1).maybeSingle(),
      supabase.from("wallets").select("balance,non_withdrawable").eq("user_id", userId).maybeSingle(),
      supabase.from("profiles").select("bank_name,bank_account_no,bank_account_name").eq("id", userId).maybeSingle(),
    ]);

    if (data.amount < Number(settings?.min_withdrawal ?? 0)) throw new Error(`Minimum withdrawal is ₦${settings?.min_withdrawal}`);
    if (data.amount > Number(settings?.max_withdrawal ?? Infinity)) throw new Error(`Maximum withdrawal is ₦${settings?.max_withdrawal}`);
    if (!profile?.bank_name || !profile.bank_account_no || !profile.bank_account_name) throw new Error("Please add bank details in your profile first");

    const withdrawable = Number(wallet?.balance ?? 0) - Number(wallet?.non_withdrawable ?? 0);
    if (withdrawable < data.amount) throw new Error("Insufficient withdrawable balance");

    const fee = data.amount * (Number(settings?.withdrawal_fee_pct ?? 0) / 100);
    const net = data.amount - fee;

    // lock funds: move from balance to locked
    await supabase.from("wallets").update({
      balance: Number(wallet!.balance) - data.amount,
      updated_at: new Date().toISOString(),
    }).eq("user_id", userId);

    await supabase.from("withdrawals").insert({
      user_id: userId, amount: data.amount, fee, net_amount: net,
      bank_name: profile.bank_name, bank_account_no: profile.bank_account_no,
      bank_account_name: profile.bank_account_name, status: "pending",
    });
    await supabase.from("transactions").insert({
      user_id: userId, type: "withdrawal", amount: data.amount, status: "pending",
      description: `Withdrawal requested (fee ₦${fee.toFixed(2)})`,
    });
    return { ok: true };
  });

// ============================================================
// PROFILE UPDATE
// ============================================================
export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { full_name?: string; bank_name?: string; bank_account_no?: string; bank_account_name?: string }) =>
    z.object({
      full_name: z.string().max(100).optional(),
      bank_name: z.string().max(100).optional(),
      bank_account_no: z.string().max(50).optional(),
      bank_account_name: z.string().max(100).optional(),
    }).parse(d))
  .handler(async ({ data, context }) => {
    const update: any = { updated_at: new Date().toISOString() };
    for (const k of ["full_name", "bank_name", "bank_account_no", "bank_account_name"] as const) {
      if (data[k] !== undefined) update[k] = data[k];
    }
    const { error } = await context.supabase.from("profiles").update(update).eq("id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

// ============================================================
// REFERRAL INFO
// ============================================================
export const getReferralInfo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: profile }, { data: chain }, { data: earnings }] = await Promise.all([
      supabase.from("profiles").select("referral_code").eq("id", userId).maybeSingle(),
      supabase.from("referrals").select("level,referred_id,created_at").eq("referrer_id", userId).order("created_at", { ascending: false }),
      supabase.from("referral_earnings").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
    ]);
    const counts = { l1: 0, l2: 0, l3: 0 };
    const totals = { l1: 0, l2: 0, l3: 0 };
    (chain ?? []).forEach((r: any) => {
      if (r.level === 1) counts.l1++; else if (r.level === 2) counts.l2++; else if (r.level === 3) counts.l3++;
    });
    (earnings ?? []).forEach((e: any) => {
      if (e.level === 1) totals.l1 += Number(e.amount);
      else if (e.level === 2) totals.l2 += Number(e.amount);
      else if (e.level === 3) totals.l3 += Number(e.amount);
    });
    return { referral_code: profile?.referral_code, counts, totals, earnings: earnings ?? [] };
  });

// ============================================================
// DEPOSIT / WITHDRAWAL HISTORY
// ============================================================
export const getDeposits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("deposits").select("*").eq("user_id", context.userId).order("created_at", { ascending: false }).limit(50);
    return data ?? [];
  });

export const getWithdrawals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("withdrawals").select("*").eq("user_id", context.userId).order("created_at", { ascending: false }).limit(50);
    return data ?? [];
  });

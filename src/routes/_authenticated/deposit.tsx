import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import {
  initPaystackDeposit, verifyPaystackDeposit, submitManualDeposit, getDeposits,
} from "@/lib/user.functions";
import { getManualBankInfo } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatNaira, formatDateTime } from "@/lib/format";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Copy, CreditCard, Building2 } from "lucide-react";
import { InstructionsBlock } from "@/components/InstructionsBlock";

export const Route = createFileRoute("/_authenticated/deposit")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData({ queryKey: ["bank-info"], queryFn: () => (getManualBankInfo as any)() }),
      context.queryClient.ensureQueryData({ queryKey: ["deposits"], queryFn: () => (getDeposits as any)() }),
    ]),
  component: DepositPage,
});

function DepositPage() {
  const fetchBank = useServerFn(getManualBankInfo);
  const fetchDeps = useServerFn(getDeposits);
  const { data: bank } = useSuspenseQuery({ queryKey: ["bank-info"], queryFn: () => fetchBank() });
  const { data: deposits } = useSuspenseQuery({ queryKey: ["deposits"], queryFn: () => fetchDeps() });
  const qc = useQueryClient();

  const initPay = useServerFn(initPaystackDeposit);
  const verifyPay = useServerFn(verifyPaystackDeposit);
  const submitManual = useServerFn(submitManualDeposit);

  // Auto-verify if returned from paystack
  useEffect(() => {
    const url = new URL(window.location.href);
    const ref = url.searchParams.get("reference") || url.searchParams.get("trxref");
    if (ref) {
      verifyPay({ data: { reference: ref } })
        .then(() => { toast.success("Deposit confirmed"); qc.invalidateQueries({ queryKey: ["dashboard"] }); qc.invalidateQueries({ queryKey: ["deposits"] }); })
        .catch((e: any) => toast.error(e.message))
        .finally(() => window.history.replaceState({}, "", "/deposit"));
    }
  }, []);

  const [psAmount, setPsAmount] = useState("");
  const [mAmount, setMAmount] = useState("");
  const [mNote, setMNote] = useState("");

  const psMut = useMutation({
    mutationFn: (a: number) => initPay({ data: { amount: a, callbackUrl: window.location.origin + "/deposit" } }),
    onSuccess: (r: any) => { window.location.href = r.authorization_url; },
    onError: (e: any) => toast.error(e.message),
  });
  const mMut = useMutation({
    mutationFn: ({ amount, note }: { amount: number; note: string }) =>
      submitManual({ data: { amount, note } }),
    onSuccess: () => {
      toast.success("Manual deposit submitted — awaiting admin approval");
      setMAmount(""); setMNote("");
      qc.invalidateQueries({ queryKey: ["deposits"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const depositsOn = bank?.deposit_enabled !== false && !bank?.maintenance_mode;
  const showPaystack = depositsOn && bank?.paystack_enabled;
  const showManual = depositsOn && bank?.manual_deposit_enabled;
  const defaultTab = showPaystack ? "paystack" : "manual";

  return (
    <div className="px-5 pt-6 pb-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Deposit</h1>
        <p className="text-sm text-muted-foreground">Fund your wallet to start investing.</p>
      </header>

      {!showPaystack && !showManual ? (
        <p className="text-sm text-muted-foreground bg-card border border-border p-6 rounded-xl text-center">
          {bank?.maintenance_mode ? (bank?.maintenance_message || "Site is under maintenance.") : "Deposits are temporarily disabled."}
        </p>
      ) : (
        <Tabs defaultValue={defaultTab}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="paystack" disabled={!showPaystack}><CreditCard className="size-4 mr-1" /> Automated</TabsTrigger>
            <TabsTrigger value="manual" disabled={!showManual}><Building2 className="size-4 mr-1" /> Bank transfer</TabsTrigger>
          </TabsList>

          <TabsContent value="paystack" className="space-y-4 mt-4">
            <p className="text-xs text-muted-foreground">Pay with card or bank account. Funds credit instantly.</p>
            <Input type="number" placeholder="Amount (₦)" min={bank?.min_deposit ?? 100} step={100} value={psAmount} onChange={(e) => setPsAmount(e.target.value)} />
            <Button className="w-full h-11" disabled={psMut.isPending || !psAmount} onClick={() => psMut.mutate(Number(psAmount))}>
              {psMut.isPending ? "Redirecting…" : "Continue to payment"}
            </Button>
          </TabsContent>

          <TabsContent value="manual" className="space-y-4 mt-4">
            <div className="bg-foreground text-background rounded-xl p-4 space-y-3">
              <p className="text-[10px] uppercase tracking-widest opacity-60">Transfer to</p>
              <div>
                <p className="text-sm font-bold">{bank?.manual_bank_account_name || "—"}</p>
                <p className="text-xs opacity-70">{bank?.manual_bank_name || "—"}</p>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded">
                <span className="font-mono text-base flex-1">{bank?.manual_bank_account || "—"}</span>
                <button onClick={() => { if (bank?.manual_bank_account) { navigator.clipboard.writeText(bank.manual_bank_account); toast.success("Copied"); } }}>
                  <Copy className="size-4" />
                </button>
              </div>
            </div>
            <Input type="number" placeholder="Amount you sent (₦)" min={100} step={100} value={mAmount} onChange={(e) => setMAmount(e.target.value)} />
            <Textarea placeholder="Reference / sender name / time of transfer" value={mNote} onChange={(e) => setMNote(e.target.value)} maxLength={500} rows={3} />
            <Button className="w-full h-11" disabled={mMut.isPending || !mAmount || !mNote} onClick={() => mMut.mutate({ amount: Number(mAmount), note: mNote })}>
              {mMut.isPending ? "Submitting…" : "Submit for review"}
            </Button>
          </TabsContent>
        </Tabs>
      )}

      <InstructionsBlock text={(bank as any)?.deposit_instructions ?? ""} />


      <section className="space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Recent deposits</h2>
          <Link to="/deposit-history" className="text-[11px] font-bold text-primary">View full history →</Link>
        </div>
        {deposits.length === 0 ? (
          <p className="text-xs text-muted-foreground">No deposits yet.</p>
        ) : (
          <div className="divide-y divide-border border-t border-b border-border">
            {deposits.slice(0, 2).map((d: any) => (
              <div key={d.id} className="py-3 flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold">{formatNaira(d.amount)} · {d.method}</p>
                  <p className="text-[10px] text-muted-foreground">{formatDateTime(d.created_at)}</p>
                </div>
                <StatusBadge status={d.status} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const style: Record<string, string> = {
    completed: "bg-primary-soft text-primary",
    pending: "bg-muted text-muted-foreground",
    rejected: "bg-destructive/10 text-destructive",
    failed: "bg-destructive/10 text-destructive",
  };
  return <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${style[status] ?? "bg-muted text-muted-foreground"}`}>{status}</span>;
}

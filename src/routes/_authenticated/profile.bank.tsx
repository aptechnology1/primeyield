import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { getDashboard, updateProfile } from "@/lib/user.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ArrowLeft, Pencil } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile/bank")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({ queryKey: ["dashboard"], queryFn: () => (getDashboard as any)() }),
  component: BankPage,
});

function BankPage() {
  const fetchDash = useServerFn(getDashboard);
  const { data } = useSuspenseQuery({ queryKey: ["dashboard"], queryFn: () => fetchDash() });
  const qc = useQueryClient();
  const update = useServerFn(updateProfile);

  const [bankName, setBankName] = useState(data.profile?.bank_name ?? "");
  const [bankNo, setBankNo] = useState(data.profile?.bank_account_no ?? "");
  const [bankHolder, setBankHolder] = useState(data.profile?.bank_account_name ?? "");
  const hasBank = !!(data.profile?.bank_name && data.profile?.bank_account_no && data.profile?.bank_account_name);
  const [edit, setEdit] = useState(!hasBank);

  useEffect(() => {
    setBankName(data.profile?.bank_name ?? "");
    setBankNo(data.profile?.bank_account_no ?? "");
    setBankHolder(data.profile?.bank_account_name ?? "");
    setEdit(!(data.profile?.bank_name && data.profile?.bank_account_no && data.profile?.bank_account_name));
  }, [data.profile]);

  const mut = useMutation({
    mutationFn: () => update({ data: { bank_name: bankName, bank_account_no: bankNo, bank_account_name: bankHolder } }),
    onSuccess: () => { toast.success("Bank details saved"); qc.invalidateQueries({ queryKey: ["dashboard"] }); setEdit(false); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="px-5 pt-6 pb-6 space-y-6">
      <header className="flex items-center gap-3">
        <Link to="/profile" className="size-10 rounded-lg bg-card border border-border flex items-center justify-center">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-xl font-bold">Bank Details</h1>
      </header>

      <p className="text-xs text-muted-foreground">Withdrawals are paid to this account. Make sure it is correct.</p>

      {hasBank && !edit ? (
        <>
          <div className="bg-card border border-border rounded-xl p-4 space-y-2 text-sm">
            <Row label="Bank" value={data.profile?.bank_name ?? ""} />
            <Row label="Account no." value={data.profile?.bank_account_no ?? ""} mono />
            <Row label="Holder" value={data.profile?.bank_account_name ?? ""} />
          </div>
          <Button variant="outline" className="w-full h-11" onClick={() => setEdit(true)}>
            <Pencil className="size-4 mr-2" /> Edit
          </Button>
        </>
      ) : (
        <>
          <div className="space-y-1.5">
            <Label>Bank name</Label>
            <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. GTBank" />
          </div>
          <div className="space-y-1.5">
            <Label>Account number</Label>
            <Input value={bankNo} onChange={(e) => setBankNo(e.target.value)} inputMode="numeric" maxLength={20} />
          </div>
          <div className="space-y-1.5">
            <Label>Account holder name</Label>
            <Input value={bankHolder} onChange={(e) => setBankHolder(e.target.value)} />
          </div>
          <Button className="w-full h-11" disabled={mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? "Saving…" : "Save bank details"}
          </Button>
        </>
      )}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-xs font-semibold truncate ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

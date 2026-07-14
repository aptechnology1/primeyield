import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { adminListUsers, adminSetRole, adminAdjustWallet, adminDeleteUser } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatNaira, formatDate } from "@/lib/format";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/users")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({ queryKey: ["admin-users"], queryFn: () => (adminListUsers as any)() }),
  component: UsersPage,
});

function UsersPage() {
  const fetch = useServerFn(adminListUsers);
  const { data: users } = useSuspenseQuery({ queryKey: ["admin-users"], queryFn: () => fetch() });
  const [search, setSearch] = useState("");
  const filtered = users.filter((u: any) =>
    !search || u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.referral_code?.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="space-y-4">
      <Input placeholder="Search email, name, code…" value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className="space-y-2">
        {filtered.map((u: any) => <UserCard key={u.id} u={u} />)}
        {filtered.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No users found.</p>}
      </div>
    </div>
  );
}

function UserCard({ u }: { u: any }) {
  const qc = useQueryClient();
  const setRole = useServerFn(adminSetRole);
  const adjust = useServerFn(adminAdjustWallet);
  const del = useServerFn(adminDeleteUser);
  const [delta, setDelta] = useState("");
  const [note, setNote] = useState("");
  const isAdmin = u.roles?.includes("admin");

  const roleMut = useMutation({
    mutationFn: (grant: boolean) => setRole({ data: { userId: u.id, role: "admin", grant } }),
    onSuccess: () => { toast.success("Role updated"); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const adjMut = useMutation({
    mutationFn: () => adjust({ data: { userId: u.id, delta: Number(delta), note } }),
    onSuccess: () => { toast.success("Wallet adjusted"); setDelta(""); setNote(""); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: () => del({ data: { userId: u.id } }),
    onSuccess: () => { toast.success("User deleted"); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="bg-card border border-border p-4 rounded-xl space-y-3">
      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold truncate">{u.full_name ?? "—"}</p>
          <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
          <p className="text-[10px] text-muted-foreground font-mono">Code: {u.referral_code} · {formatDate(u.created_at)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-mono font-bold">{formatNaira(u.wallet?.balance ?? 0)}</p>
          {isAdmin && <span className="text-[9px] font-bold text-primary uppercase">Admin</span>}
        </div>
      </div>
      <div className="flex gap-2 text-xs">
        <Button size="sm" variant={isAdmin ? "outline" : "default"} onClick={() => roleMut.mutate(!isAdmin)} disabled={roleMut.isPending}>
          {isAdmin ? "Revoke admin" : "Make admin"}
        </Button>
        <Dialog>
          <DialogTrigger asChild><Button size="sm" variant="outline">Adjust wallet</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Adjust wallet — {u.full_name ?? u.email}</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-4">
              <Input type="number" placeholder="Amount (negative to debit)" value={delta} onChange={(e) => setDelta(e.target.value)} />
              <Input placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)} />
              <Button disabled={!delta || !note || adjMut.isPending} onClick={() => adjMut.mutate()}>Apply</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { getDashboard, updateProfile } from "@/lib/user.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile/personal")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({ queryKey: ["dashboard"], queryFn: () => (getDashboard as any)() }),
  component: PersonalPage,
});

function PersonalPage() {
  const fetchDash = useServerFn(getDashboard);
  const { data } = useSuspenseQuery({ queryKey: ["dashboard"], queryFn: () => fetchDash() });
  const qc = useQueryClient();
  const update = useServerFn(updateProfile);
  const [name, setName] = useState(data.profile?.full_name ?? "");

  useEffect(() => { setName(data.profile?.full_name ?? ""); }, [data.profile]);

  const mut = useMutation({
    mutationFn: () => update({ data: { full_name: name } }),
    onSuccess: () => { toast.success("Profile updated"); qc.invalidateQueries({ queryKey: ["dashboard"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="px-5 pt-6 pb-6 space-y-6">
      <header className="flex items-center gap-3">
        <Link to="/profile" className="size-10 rounded-lg bg-card border border-border flex items-center justify-center">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-xl font-bold">Profile Information</h1>
      </header>

      <div className="space-y-1.5">
        <Label>Email</Label>
        <Input value={data.profile?.email ?? ""} disabled />
      </div>

      <div className="space-y-1.5">
        <Label>Full name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <Button className="w-full h-11" disabled={mut.isPending} onClick={() => mut.mutate()}>
        {mut.isPending ? "Saving…" : "Save changes"}
      </Button>
    </div>
  );
}

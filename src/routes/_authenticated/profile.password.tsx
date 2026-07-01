import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile/password")({
  component: PasswordPage,
});

function PasswordPage() {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");

  const mut = useMutation({
    mutationFn: async () => {
      if (pw.length < 6) throw new Error("Password must be at least 6 characters");
      if (pw !== pw2) throw new Error("Passwords do not match");
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Password updated"); setPw(""); setPw2(""); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="px-5 pt-6 pb-6 space-y-6">
      <header className="flex items-center gap-3">
        <Link to="/profile" className="size-10 rounded-lg bg-card border border-border flex items-center justify-center">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-xl font-bold">Change Password</h1>
      </header>

      <div className="space-y-1.5">
        <Label>New password</Label>
        <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="At least 6 characters" />
      </div>

      <div className="space-y-1.5">
        <Label>Confirm new password</Label>
        <Input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
      </div>

      <Button className="w-full h-11" disabled={mut.isPending || !pw || !pw2} onClick={() => mut.mutate()}>
        {mut.isPending ? "Updating…" : "Update password"}
      </Button>
    </div>
  );
}

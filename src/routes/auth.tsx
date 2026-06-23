import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { BrandMark } from "@/components/BrandMark";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const searchSchema = z.object({ ref: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — PrimeYield" },
      { name: "description", content: "Sign in or create your PrimeYield account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth" });
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [ref, setRef] = useState(search.ref ?? "");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
        navigate({ to: "/dashboard" });
      } else {
        if (password.length < 6) throw new Error("Password must be at least 6 characters");
        const { error: signUpErr } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: window.location.origin + "/dashboard",
            data: { full_name: fullName, referral_code: ref || undefined },
          },
        });
        if (signUpErr) throw signUpErr;
        // Auto sign-in (email confirmation is disabled)
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) throw signInErr;
        toast.success("Welcome to PrimeYield");
        navigate({ to: "/dashboard" });
      }
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-5 py-4 border-b border-border max-w-md w-full mx-auto">
        <BrandMark />
      </header>
      <main className="px-5 py-10 max-w-md w-full mx-auto flex-1">
        <h1 className="text-2xl font-bold mb-1">{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {mode === "signin" ? "Sign in to your PrimeYield account." : "Start earning daily returns in minutes."}
        </p>

        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required maxLength={100} />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete={mode === "signin" ? "current-password" : "new-password"} />
          </div>
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="ref">Referral code (optional)</Label>
              <Input id="ref" value={ref} onChange={(e) => setRef(e.target.value.toUpperCase())} maxLength={20} placeholder="ABC12345" />
            </div>
          )}
          <Button type="submit" disabled={loading} className="w-full h-11 font-semibold">
            {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          {mode === "signin" ? "New here? " : "Already have an account? "}
          <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="text-primary font-semibold">
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </main>
    </div>
  );
}

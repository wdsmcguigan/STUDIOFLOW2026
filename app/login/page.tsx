"use client";
import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = createClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (otpError) {
      setError(otpError.message);
      return;
    }
    setSent(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Brandmark */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="grid size-12 place-items-center rounded-xl font-display text-xl font-extrabold"
            style={{
              background: "linear-gradient(140deg, var(--brand), var(--brand-2))",
              color: "var(--brand-ink)",
              boxShadow: "0 5px 14px var(--brand-soft)",
            }}
            aria-hidden
          >
            SF
          </div>
          {/* Filament hairline under the mark */}
          <div
            className="h-px w-16"
            style={{
              background:
                "linear-gradient(90deg, transparent, var(--brand), transparent)",
              boxShadow: "0 0 8px var(--brand)",
            }}
            aria-hidden
          />
          <h1 className="font-display text-2xl font-extrabold tracking-[-0.3px] text-foreground">
            Sign in to StudioFlow
          </h1>
        </div>

        <Card>
          <CardHeader />
          <CardContent className="pt-0">
            {sent ? (
              <div className="space-y-1 py-4 text-center">
                <p className="text-sm font-medium text-foreground">
                  Check your email for a sign-in link.
                </p>
                <p className="text-xs text-[color:var(--tx-3)]">
                  Didn&apos;t get it? Check your spam folder.
                </p>
              </div>
            ) : (
              <form onSubmit={signIn} className="flex flex-col gap-4">
                {error && (
                  <div
                    role="alert"
                    className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm"
                    style={{
                      background: "color-mix(in srgb, var(--error) 12%, transparent)",
                      border: "1px solid color-mix(in srgb, var(--error) 30%, transparent)",
                      color: "var(--error)",
                    }}
                  >
                    <AlertCircle className="size-4 shrink-0" aria-hidden />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="login-email">Email address</Label>
                  <Input
                    id="login-email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    className="h-9"
                  />
                </div>

                <Button
                  type="submit"
                  variant="ember"
                  className="w-full h-9 font-bold"
                >
                  Send magic link
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

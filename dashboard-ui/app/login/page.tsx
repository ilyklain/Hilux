"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, Loader2, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/hilux/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("hilux_auth_token", data.token);
        router.push("/");
      } else {
        setError("Invalid password");
      }
    } catch (err) {
      setError("Connection error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-black p-4">
      <div className="w-full max-w-[350px] space-y-6">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Hilux
          </h1>
          <p className="text-sm text-neutral-500">
            Enter your password to access the dashboard
          </p>
        </div>

        <Card className="border-neutral-800 bg-[#0a0a0a] shadow-none">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg font-medium">Authentication</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                  <Input
                    type="password"
                    placeholder="Password"
                    className="h-10 border-neutral-800 bg-neutral-900 pl-10 text-white placeholder:text-neutral-600 focus-visible:ring-1 focus-visible:ring-neutral-700"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    autoFocus
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-md bg-red-950/20 p-3 text-xs text-red-500 border border-red-900/30">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-white text-black hover:bg-neutral-200"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Login"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="px-8 text-center text-xs text-neutral-600">
          Hilux &mdash; Advanced API Protection
        </p>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, ShieldAlert } from "lucide-react";

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
        setError("Invalid dashboard password or API key.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to connect to Hilux Backend (/hilux/auth).");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#09090b]">
      <div className="w-full max-w-md px-8">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-4 h-4 rounded-full bg-[#ff5f56]" />
            <div className="w-4 h-4 rounded-full bg-[#ffbd2e]" />
            <div className="w-4 h-4 rounded-full bg-[#27c93f]" />
          </div>
          <h1 className="text-2xl font-bold tracking-widest text-[#a1a1aa] uppercase">
            HILUX DASHBOARD
          </h1>
        </div>

        <Card className="border-white/5 bg-[#121212] shadow-2xl shadow-black">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Administrator Login</CardTitle>
            <CardDescription className="text-[#a1a1aa]">
              Enter the dashboard password configured in your Hilux initialization.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2 relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-[#a1a1aa]" />
                <Input
                  type="password"
                  placeholder="Password or API Key..."
                  className="pl-10 bg-[#18181b] border-white/5"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 p-3 rounded-md border border-red-500/20">
                  <ShieldAlert className="h-4 w-4" />
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-[#3b82f6] hover:bg-[#2563eb] text-white"
                disabled={isLoading}
              >
                {isLoading ? "Authenticating..." : "Access Dashboard"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

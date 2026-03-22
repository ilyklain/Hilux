"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Puzzle, ShieldCheck, Globe, CheckCircle2, Save, Ghost, Zap, Trash2, Plus, Crown } from "lucide-react";
import { useHiluxApi } from "@/hooks/useHiluxApi";
import Link from "next/link";

export default function ExtensionsPage() {
  const { fetchApi } = useHiluxApi();
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await fetchApi("/config");
      if (data) setConfig(data);
      setLoading(false);
    }
    load();
  }, [fetchApi]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetchApi("/config", {
        method: "POST",
        body: JSON.stringify(config)
      });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (e) {
      alert("Failed to save extensions");
    } finally {
      setSaving(false);
    }
  };

  const updateExt = (extName: string, updates: any) => {
    setConfig({
      ...config,
      extensions: {
        ...config.extensions,
        [extName]: {
          ...config.extensions[extName],
          ...updates
        }
      }
    });
  };

  if (loading || !config) return <div className="p-8 text-white/50 text-sm">Loading security hub...</div>;

  const loginProt = config.extensions?.loginProtector || {};
  const geoBlock = config.extensions?.geoBlocking || {};
  const honeypot = config.extensions?.honeypotDecoys || {};
  const virtPatch = config.extensions?.virtualPatching || {};

  const isPro = config.plan === "Pro" || config.plan === "Enterprise";
  const isEnt = config.plan === "Enterprise";

  const LockedOverlay = ({ tier }: { tier: string }) => (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm rounded-xl border border-white/5 p-6 text-center animate-in fade-in duration-500">
      <div className={`p-3 rounded-full mb-3 ${tier === "Pro" ? "bg-blue-500/20 text-blue-500" : "bg-yellow-500/20 text-yellow-500"}`}>
        {tier === "Pro" ? <Zap className="w-8 h-8" /> : <Crown className="w-8 h-8 text-yellow-500" />}
      </div>
      <h3 className="text-lg font-bold text-white mb-2">{tier} Feature</h3>
      <p className="text-xs text-[#a1a1aa] mb-6">Upgrade to {tier} to unlock this security module.</p>
      <Link href="/billing">
        <Button size="sm" className="bg-white text-black hover:bg-neutral-200 font-bold px-8">
          Get {tier} Plan
        </Button>
      </Link>
    </div>
  );

  return (
    <div className="flex flex-col gap-8 p-8 max-w-7xl mx-auto w-full relative">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Puzzle className="w-8 h-8 text-[#3b82f6]" />
            Security Extensions
          </h1>
          <p className="text-sm text-[#a1a1aa] mt-1">Enhance Hilux with specialized modular plugins.</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="h-9 border-white/10 bg-white/5 text-[#a1a1aa] items-center gap-2 px-3 font-mono text-[11px]">
            ACTIVE PLAN: <span className="text-white font-bold ml-1">{config.plan}</span>
          </Badge>
          <Button onClick={handleSave} disabled={saving} className="bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold gap-2">
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Extensions"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
        <Card className={`relative border-white/5 bg-[#121212] transition-all overflow-hidden ${loginProt.enabled ? "ring-1 ring-blue-500/50" : "opacity-60"}`}>
          {!isPro && <LockedOverlay tier="Pro" />}
          <CardHeader className="flex flex-row items-start justify-between">
            <div className="flex gap-4">
              <div className="mt-1 p-2 bg-blue-500/10 rounded-lg">
                <ShieldCheck className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Login Protector
                  <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 border-none text-[10px]">PRO</Badge>
                </CardTitle>
                <CardDescription className="text-[#a1a1aa] mt-1">Brute-force mitigation and hidden honeypots.</CardDescription>
              </div>
            </div>
            <Switch disabled={!isPro} checked={loginProt.enabled} onCheckedChange={(v: boolean) => updateExt("loginProtector", { enabled: v })} />
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#71717a] uppercase tracking-wider">Max Attempts</label>
                <Input readOnly={!isPro} type="number" value={loginProt.maxAttempts} onChange={e => updateExt("loginProtector", { maxAttempts: Number(e.target.value) })} className="h-8 bg-[#18181b] border-white/5 font-mono" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#71717a] uppercase tracking-wider">Window (Sec)</label>
                <Input readOnly={!isPro} type="number" value={loginProt.windowSeconds} onChange={e => updateExt("loginProtector", { windowSeconds: Number(e.target.value) })} className="h-8 bg-[#18181b] border-white/5 font-mono" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#71717a] uppercase tracking-wider">Honeypot Field</label>
              <Input readOnly={!isPro} value={loginProt.honeypotField} onChange={e => updateExt("loginProtector", { honeypotField: e.target.value })} className="h-8 bg-[#18181b] border-white/5 font-mono text-xs text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className={`relative border-white/5 bg-[#121212] transition-all overflow-hidden ${geoBlock.enabled ? "ring-1 ring-purple-500/50" : "opacity-60"}`}>
          {!isPro && <LockedOverlay tier="Pro" />}
          <CardHeader className="flex flex-row items-start justify-between">
            <div className="flex gap-4">
              <div className="mt-1 p-2 bg-purple-500/10 rounded-lg">
                <Globe className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Geo-Blocking Pro
                  <Badge variant="secondary" className="bg-purple-500/10 text-purple-500 border-none text-[10px]">PRO</Badge>
                </CardTitle>
                <CardDescription className="text-[#a1a1aa] mt-1">Restrict traffic by country code.</CardDescription>
              </div>
            </div>
            <Switch disabled={!isPro} checked={geoBlock.enabled} onCheckedChange={(v: boolean) => updateExt("geoBlocking", { enabled: v })} />
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#71717a] uppercase tracking-wider">Blocked Countries (ISO)</label>
              <Input
                readOnly={!isPro}
                value={geoBlock.blockedCountries?.join(", ") || ""}
                onChange={e => updateExt("geoBlocking", { blockedCountries: e.target.value.split(",").map(c => c.trim().toUpperCase()).filter(Boolean) })}
                className="h-8 bg-[#18181b] border-white/5 font-mono text-xs"
                placeholder="CN, RU, IR..."
              />
            </div>
          </CardContent>
        </Card>

        <Card className={`relative border-white/5 bg-[#121212] transition-all overflow-hidden ${honeypot.enabled ? "ring-1 ring-orange-500/50" : "opacity-60"}`}>
          {!isPro && <LockedOverlay tier="Pro" />}
          <CardHeader className="flex flex-row items-start justify-between">
            <div className="flex gap-4">
              <div className="mt-1 p-2 bg-orange-500/10 rounded-lg">
                <Ghost className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Honeypot Decoys
                  <Badge variant="secondary" className="bg-orange-500/10 text-orange-500 border-none text-[10px]">PRO</Badge>
                </CardTitle>
                <CardDescription className="text-[#a1a1aa] mt-1">Auto-ban IPs hitting trap endpoints.</CardDescription>
              </div>
            </div>
            <Switch disabled={!isPro} checked={honeypot.enabled} onCheckedChange={(v: boolean) => updateExt("honeypotDecoys", { enabled: v })} />
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#71717a] uppercase tracking-wider">Trap Paths</label>
              <Input
                readOnly={!isPro}
                value={honeypot.paths?.join(", ") || ""}
                onChange={e => updateExt("honeypotDecoys", { paths: e.target.value.split(",").map(p => p.trim()).filter(Boolean) })}
                className="h-8 bg-[#18181b] border-white/5 font-mono text-xs"
              />
            </div>
          </CardContent>
        </Card>

        <Card className={`relative border-white/5 bg-[#121212] transition-all overflow-hidden ${virtPatch.enabled ? "ring-1 ring-yellow-500/50" : "opacity-60"}`}>
          {!isEnt && <LockedOverlay tier="Enterprise" />}
          <CardHeader className="flex flex-row items-start justify-between">
            <div className="flex gap-4">
              <div className="mt-1 p-2 bg-yellow-500/10 rounded-lg">
                <Zap className="w-6 h-6 text-yellow-500" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Virtual Patching
                  <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500 border-none text-[10px]">ENTERPRISE</Badge>
                </CardTitle>
                <CardDescription className="text-[#a1a1aa] mt-1">Hardened protection for active exploits.</CardDescription>
              </div>
            </div>
            <Switch disabled={!isEnt} checked={virtPatch.enabled} onCheckedChange={(v: boolean) => updateExt("virtualPatching", { enabled: v })} />
          </CardHeader>
          <CardContent className="space-y-2 pt-4 flex flex-wrap gap-2 text-xs">
            {["log4shell", "springshell", "shellshock"].map(p => (
              <Badge
                key={p}
                variant={virtPatch.activePatches?.includes(p) ? "default" : "outline"}
                className={`cursor-pointer capitalize ${virtPatch.activePatches?.includes(p) ? "bg-yellow-600 hover:bg-yellow-700" : "text-[#71717a] border-white/5"}`}
                onClick={() => {
                  if (!isEnt) return;
                  const current = virtPatch.activePatches || [];
                  const next = current.includes(p) ? current.filter((x: string) => x !== p) : [...current, p];
                  updateExt("virtualPatching", { activePatches: next });
                }}
              >
                {p}
              </Badge>
            ))}
          </CardContent>
        </Card>
      </div>

      {showSuccess && (
        <div className="fixed bottom-8 right-8 z-50 animate-in slide-in-from-right-4 fade-in duration-300">
          <div className="flex items-center gap-3 bg-[#18181b] border border-green-500/20 shadow-xl rounded-lg p-4 text-green-500">
            <CheckCircle2 className="w-5 h-5" />
            <div className="text-sm font-bold tracking-wide">Shields Updated Successfully!</div>
          </div>
        </div>
      )}
    </div>
  );
}

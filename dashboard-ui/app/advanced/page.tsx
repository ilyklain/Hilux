"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles,
  ShieldOff,
  Zap,
  Fingerprint,
  Timer,
  Copy,
  CheckCircle2,
  Save,
  Loader2,
  AlertTriangle,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Code2,
} from "lucide-react";
import { useHiluxApi } from "@/hooks/useHiluxApi";

export default function AdvancedPage() {
  const { fetchApi } = useHiluxApi();
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [copiedSDK, setCopiedSDK] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

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
        body: JSON.stringify(config),
      });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (e) {
      alert("Failed to save advanced settings");
    } finally {
      setSaving(false);
    }
  };

  const updatePlugin = (updates: any) => {
    setConfig({
      ...config,
      plugin: {
        ...config.plugin,
        ...updates,
      },
    });
  };

  const updatePluginNested = (key: string, updates: any) => {
    setConfig({
      ...config,
      plugin: {
        ...config.plugin,
        [key]: {
          ...(config.plugin?.[key] || {}),
          ...updates,
        },
      },
    });
  };

  const updateBehavior = (updates: any) => {
    setConfig({
      ...config,
      behavior: {
        ...config.behavior,
        ...updates,
      },
    });
  };

  const generateSecret = () => {
    const chars = "abcdef0123456789";
    let secret = "";
    for (let i = 0; i < 64; i++) {
      secret += chars[Math.floor(Math.random() * chars.length)];
    }
    updatePluginNested("clientIntegrity", { secret });
  };

  const getSDKSnippet = () => {
    const headerName = config?.plugin?.clientIntegrity?.headerName || "x-hilux-integrity";
    return `<script src="/hilux-sdk.js" data-header="${headerName}"></script>`;
  };

  const copySDK = () => {
    navigator.clipboard.writeText(getSDKSnippet());
    setCopiedSDK(true);
    setTimeout(() => setCopiedSDK(false), 2000);
  };

  if (loading || !config) {
    return (
      <div className="flex items-center justify-center p-24 text-[#71717a]">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading Advanced Settings...
      </div>
    );
  }

  const cb = config.plugin?.circuitBreaker || {};
  const integrity = config.plugin?.clientIntegrity || {};
  const tarpit = config.plugin?.tarpit || {};
  const challenge = config.plugin?.challenge || {};
  const shadowMode = config.plugin?.shadowMode || false;
  const enumDetection = config.behavior?.enumerationDetection ?? true;

  return (
    <div className="flex flex-col gap-8 p-8 max-w-7xl mx-auto w-full relative">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-[#8b5cf6]" />
            Advanced Security
          </h1>
          <p className="text-sm text-[#a1a1aa] mt-1">
            Circuit Breaker, Shadow Mode, Client Integrity SDK, and more.
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Tabs defaultValue="circuit-breaker" className="w-full">
        <TabsList className="mb-4 bg-[#121212] border border-white/5 flex flex-wrap h-auto p-1">
          <TabsTrigger
            value="circuit-breaker"
            className="data-[state=active]:bg-[#18181b] data-[state=active]:text-white"
          >
            <Zap className="w-4 h-4 mr-2 text-red-500" />
            Circuit Breaker
          </TabsTrigger>
          <TabsTrigger
            value="shadow-mode"
            className="data-[state=active]:bg-[#18181b] data-[state=active]:text-white"
          >
            <Eye className="w-4 h-4 mr-2 text-purple-500" />
            Shadow Mode
          </TabsTrigger>
          <TabsTrigger
            value="client-integrity"
            className="data-[state=active]:bg-[#18181b] data-[state=active]:text-white"
          >
            <Fingerprint className="w-4 h-4 mr-2 text-cyan-500" />
            Client Integrity
          </TabsTrigger>
          <TabsTrigger
            value="rate-shaping"
            className="data-[state=active]:bg-[#18181b] data-[state=active]:text-white"
          >
            <Timer className="w-4 h-4 mr-2 text-amber-500" />
            Rate Shaping
          </TabsTrigger>
          <TabsTrigger
            value="enumeration"
            className="data-[state=active]:bg-[#18181b] data-[state=active]:text-white"
          >
            <Code2 className="w-4 h-4 mr-2 text-emerald-500" />
            Enumeration
          </TabsTrigger>
        </TabsList>

        <TabsContent value="circuit-breaker">
          <Card className="border-white/5 bg-[#121212]">
            <CardHeader className="flex flex-row items-start justify-between">
              <div className="flex gap-4">
                <div className="mt-1 p-3 bg-red-500/10 rounded-xl">
                  <Zap className="w-7 h-7 text-red-500" />
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    Circuit Breaker
                    <Badge
                      variant="secondary"
                      className={`text-[10px] border-none ${cb.enabled ? "bg-red-500/20 text-red-400" : "bg-white/5 text-[#71717a]"}`}
                    >
                      {cb.enabled ? "ARMED" : "DISABLED"}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-[#a1a1aa] mt-1 max-w-lg">
                    Automatic lockdown when attack volume exceeds threshold. Only whitelisted IPs pass during lockdown.
                  </CardDescription>
                </div>
              </div>
              <Switch
                checked={cb.enabled}
                onCheckedChange={(v: boolean) => updatePluginNested("circuitBreaker", { enabled: v })}
              />
            </CardHeader>
            <CardContent className="space-y-6 pt-2">
              {cb.enabled && (
                <div className="p-4 rounded-lg border border-red-500/20 bg-red-500/5 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                  <div className="text-sm text-red-400">
                    <span className="font-bold">Warning:</span> When the circuit opens, ALL non-whitelisted traffic
                    will be rejected with a 403 until the cooldown expires. Make sure your whitelisted IPs are correct
                    before enabling.
                  </div>
                </div>
              )}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
                    Block Threshold
                  </label>
                  <Input
                    type="number"
                    value={cb.blockThreshold || 50}
                    onChange={(e) =>
                      updatePluginNested("circuitBreaker", { blockThreshold: Number(e.target.value) })
                    }
                    className="bg-[#18181b] border-white/5 font-mono"
                  />
                  <p className="text-[10px] text-[#52525b]">Blocks within window to trigger lockdown</p>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
                    Window (Sec)
                  </label>
                  <Input
                    type="number"
                    value={cb.windowSeconds || 60}
                    onChange={(e) =>
                      updatePluginNested("circuitBreaker", { windowSeconds: Number(e.target.value) })
                    }
                    className="bg-[#18181b] border-white/5 font-mono"
                  />
                  <p className="text-[10px] text-[#52525b]">Sliding window for block counting</p>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
                    Cooldown (Sec)
                  </label>
                  <Input
                    type="number"
                    value={cb.cooldownSeconds || 300}
                    onChange={(e) =>
                      updatePluginNested("circuitBreaker", { cooldownSeconds: Number(e.target.value) })
                    }
                    className="bg-[#18181b] border-white/5 font-mono"
                  />
                  <p className="text-[10px] text-[#52525b]">Seconds before auto-recovery</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg border border-white/5 bg-[#18181b]">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Whitelist-Only During Lockdown</span>
                  <span className="text-[10px] text-[#a1a1aa]">
                    Only allow IPs in your whitelist when circuit is open
                  </span>
                </div>
                <Switch
                  checked={cb.allowWhitelistedOnly ?? true}
                  onCheckedChange={(v: boolean) =>
                    updatePluginNested("circuitBreaker", { allowWhitelistedOnly: v })
                  }
                />
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/5">
                <div className="text-center p-4 rounded-lg bg-[#18181b] border border-white/5">
                  <div className="text-2xl font-bold text-red-500 font-mono">{cb.blockThreshold || 50}</div>
                  <div className="text-[10px] text-[#71717a] mt-1 uppercase tracking-wider">Trigger Threshold</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-[#18181b] border border-white/5">
                  <div className="text-2xl font-bold text-amber-500 font-mono">{cb.windowSeconds || 60}s</div>
                  <div className="text-[10px] text-[#71717a] mt-1 uppercase tracking-wider">Detection Window</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-[#18181b] border border-white/5">
                  <div className="text-2xl font-bold text-emerald-500 font-mono">{cb.cooldownSeconds || 300}s</div>
                  <div className="text-[10px] text-[#71717a] mt-1 uppercase tracking-wider">Recovery Time</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shadow-mode">
          <Card className="border-white/5 bg-[#121212]">
            <CardHeader className="flex flex-row items-start justify-between">
              <div className="flex gap-4">
                <div className={`mt-1 p-3 rounded-xl ${shadowMode ? "bg-purple-500/20" : "bg-purple-500/10"}`}>
                  {shadowMode ? (
                    <EyeOff className="w-7 h-7 text-purple-400" />
                  ) : (
                    <Eye className="w-7 h-7 text-purple-500" />
                  )}
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    Shadow Mode
                    <Badge
                      variant="secondary"
                      className={`text-[10px] border-none ${shadowMode ? "bg-purple-500/20 text-purple-400" : "bg-white/5 text-[#71717a]"}`}
                    >
                      {shadowMode ? "OBSERVING" : "OFF"}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-[#a1a1aa] mt-1 max-w-lg">
                    Analyze all traffic without blocking anything. Perfect for onboarding — see what Hilux would do
                    before enforcing rules.
                  </CardDescription>
                </div>
              </div>
              <Switch
                checked={shadowMode}
                onCheckedChange={(v: boolean) => updatePlugin({ shadowMode: v })}
              />
            </CardHeader>
            <CardContent className="space-y-6 pt-2">
              {shadowMode && (
                <div className="p-4 rounded-lg border border-purple-500/20 bg-purple-500/5 flex items-start gap-3">
                  <Eye className="w-5 h-5 text-purple-400 mt-0.5 shrink-0" />
                  <div className="text-sm text-purple-300">
                    <span className="font-bold">Shadow Mode Active.</span> Hilux is analyzing all traffic but{" "}
                    <span className="underline">will not block </span>  any request. Blocked requests are downgraded to
                    &apos;suspicious&apos; in logs. Check your Traffic Logs to review what would have been blocked.
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 rounded-xl border border-white/5 bg-[#18181b] text-center">
                  <div className="p-3 rounded-full bg-purple-500/10 inline-flex mb-3">
                    <ShieldOff className="w-6 h-6 text-purple-500" />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1">Zero Risk Deployment</h3>
                  <p className="text-[11px] text-[#71717a]">
                    Enable Shadow Mode during initial setup. View all detections without impacting real traffic.
                  </p>
                </div>
                <div className="p-6 rounded-xl border border-white/5 bg-[#18181b] text-center">
                  <div className="p-3 rounded-full bg-blue-500/10 inline-flex mb-3">
                    <Lock className="w-6 h-6 text-blue-500" />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1">Full Logging Preserved</h3>
                  <p className="text-[11px] text-[#71717a]">
                    Every detection is still logged with the tag &quot;[Shadow Mode]&quot; so you can audit and tune
                    thresholds safely.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-[#18181b] border border-white/5">
                <h4 className="text-xs font-bold text-white mb-3 uppercase tracking-wider">How It Works</h4>
                <div className="space-y-3">
                  {[
                    { step: "1", text: 'Requests classified as "block" are downgraded to "suspicious"', color: "text-red-400" },
                    { step: "2", text: 'The reason array includes "[Shadow Mode: would have been block]"', color: "text-amber-400" },
                    { step: "3", text: "All forensic logs and reputation updates still execute normally", color: "text-emerald-400" },
                    { step: "4", text: "Webhooks still fire, so you get notified of detections", color: "text-blue-400" },
                  ].map((item) => (
                    <div key={item.step} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-bold text-[#71717a]">
                        {item.step}
                      </div>
                      <span className={`text-sm ${item.color}`}>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="client-integrity">
          <Card className="border-white/5 bg-[#121212]">
            <CardHeader className="flex flex-row items-start justify-between">
              <div className="flex gap-4">
                <div className="mt-1 p-3 bg-cyan-500/10 rounded-xl">
                  <Fingerprint className="w-7 h-7 text-cyan-500" />
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    Client Integrity SDK
                    <Badge
                      variant="secondary"
                      className={`text-[10px] border-none ${integrity.enabled ? "bg-cyan-500/20 text-cyan-400" : "bg-white/5 text-[#71717a]"}`}
                    >
                      {integrity.enabled ? "ACTIVE" : "DISABLED"}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-[#a1a1aa] mt-1 max-w-lg">
                    Browser fingerprinting SDK. Collects Canvas, WebGL, timezone, and screen signals. HMAC-signed
                    tokens are auto-injected into every request.
                  </CardDescription>
                </div>
              </div>
              <Switch
                checked={integrity.enabled}
                onCheckedChange={(v: boolean) => updatePluginNested("clientIntegrity", { enabled: v })}
              />
            </CardHeader>
            <CardContent className="space-y-6 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#71717a] uppercase tracking-wider">Header Name</label>
                  <Input
                    value={integrity.headerName || "x-hilux-integrity"}
                    onChange={(e) => updatePluginNested("clientIntegrity", { headerName: e.target.value })}
                    className="bg-[#18181b] border-white/5 font-mono text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#71717a] uppercase tracking-wider">Penalty Score</label>
                  <Input
                    type="number"
                    value={integrity.penaltyScore || 30}
                    onChange={(e) =>
                      updatePluginNested("clientIntegrity", { penaltyScore: Number(e.target.value) })
                    }
                    className="bg-[#18181b] border-white/5 font-mono"
                  />
                  <p className="text-[10px] text-[#52525b]">Score penalty for missing/invalid tokens</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
                    HMAC Secret Key
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type={showSecret ? "text" : "password"}
                      value={integrity.secret || ""}
                      onChange={(e) => updatePluginNested("clientIntegrity", { secret: e.target.value })}
                      className="bg-[#18181b] border-white/5 font-mono text-xs flex-1"
                      placeholder="Generate or enter a secret..."
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowSecret(!showSecret)}
                      className="bg-transparent border-white/10 hover:bg-white/5 shrink-0"
                    >
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#71717a] uppercase tracking-wider">Token TTL (Sec)</label>
                  <Input
                    type="number"
                    value={integrity.tokenTtlSeconds || 300}
                    onChange={(e) =>
                      updatePluginNested("clientIntegrity", { tokenTtlSeconds: Number(e.target.value) })
                    }
                    className="bg-[#18181b] border-white/5 font-mono"
                  />
                  <p className="text-[10px] text-[#52525b]">How long a signed token is valid</p>
                </div>
              </div>

              <Button
                onClick={generateSecret}
                variant="outline"
                className="bg-[#18181b] border-white/10 hover:bg-white/5 text-cyan-400 gap-2"
              >
                <Zap className="w-4 h-4" />
                Generate Random Secret
              </Button>

              <div className="pt-4 border-t border-white/5 space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Embed Snippet</h4>
                <p className="text-[11px] text-[#71717a]">
                  Add this script tag to your frontend HTML. The SDK auto-injects integrity headers into
                  all <code className="text-cyan-400">fetch()</code> and <code className="text-cyan-400">XMLHttpRequest</code> calls.
                </p>
                <div className="relative">
                  <pre className="p-4 rounded-lg bg-[#0a0a0a] border border-white/5 text-xs font-mono text-cyan-400 overflow-x-auto">
                    {getSDKSnippet()}
                  </pre>
                  <Button
                    onClick={copySDK}
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2 h-7 text-[10px] gap-1 text-[#71717a] hover:text-white"
                  >
                    {copiedSDK ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-green-500" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" /> Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Canvas FP", desc: "2D rendering fingerprint", color: "text-cyan-400" },
                  { label: "WebGL FP", desc: "GPU vendor & renderer", color: "text-blue-400" },
                  { label: "Timezone", desc: "UTC offset detection", color: "text-purple-400" },
                  { label: "Screen", desc: "Resolution & color depth", color: "text-emerald-400" },
                  { label: "Platform", desc: "OS & hardware concurrency", color: "text-amber-400" },
                  { label: "HMAC-SHA256", desc: "Tamper-proof signature", color: "text-red-400" },
                ].map((signal) => (
                  <div
                    key={signal.label}
                    className="p-3 rounded-lg border border-white/5 bg-[#18181b] flex flex-col"
                  >
                    <span className={`text-xs font-bold ${signal.color}`}>{signal.label}</span>
                    <span className="text-[10px] text-[#52525b] mt-0.5">{signal.desc}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rate-shaping">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-white/5 bg-[#121212]">
              <CardHeader className="flex flex-row items-start justify-between">
                <div className="flex gap-4">
                  <div className="mt-1 p-3 bg-amber-500/10 rounded-xl">
                    <Timer className="w-7 h-7 text-amber-500" />
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      Rate Shaping (Tarpit)
                      <Badge
                        variant="secondary"
                        className={`text-[10px] border-none ${tarpit.enabled ? "bg-amber-500/20 text-amber-400" : "bg-white/5 text-[#71717a]"}`}
                      >
                        {tarpit.enabled ? "ACTIVE" : "OFF"}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-[#a1a1aa] mt-1">
                      Add artificial delay proportional to risk score.
                    </CardDescription>
                  </div>
                </div>
                <Switch
                  checked={tarpit.enabled}
                  onCheckedChange={(v: boolean) => updatePluginNested("tarpit", { enabled: v })}
                />
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
                      Base Delay (ms)
                    </label>
                    <Input
                      type="number"
                      value={tarpit.baseDelayMs || 100}
                      onChange={(e) =>
                        updatePluginNested("tarpit", { baseDelayMs: Number(e.target.value) })
                      }
                      className="h-8 bg-[#18181b] border-white/5 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
                      Max Delay (ms)
                    </label>
                    <Input
                      type="number"
                      value={tarpit.maxDelayMs || 5000}
                      onChange={(e) =>
                        updatePluginNested("tarpit", { maxDelayMs: Number(e.target.value) })
                      }
                      className="h-8 bg-[#18181b] border-white/5 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
                      Score Threshold
                    </label>
                    <Input
                      type="number"
                      value={tarpit.scoreThreshold || 20}
                      onChange={(e) =>
                        updatePluginNested("tarpit", { scoreThreshold: Number(e.target.value) })
                      }
                      className="h-8 bg-[#18181b] border-white/5 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-white/5">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Delay Preview</h4>
                  <div className="space-y-2">
                    {[
                      { score: 0, label: "Clean Traffic" },
                      { score: 25, label: "Low Risk" },
                      { score: 40, label: "Suspicious" },
                      { score: 60, label: "High Risk" },
                      { score: 70, label: "Block Threshold" },
                    ].map((item) => {
                      const threshold = tarpit.scoreThreshold || 20;
                      const base = tarpit.baseDelayMs || 100;
                      const max = tarpit.maxDelayMs || 5000;
                      const blockT = config.thresholds?.block || 70;
                      const delay =
                        item.score < threshold
                          ? 0
                          : Math.round(base + (Math.min(item.score / blockT, 1)) * (max - base));
                      const pct = delay > 0 ? Math.min((delay / max) * 100, 100) : 0;

                      return (
                        <div key={item.score} className="flex items-center gap-3">
                          <div className="w-20 text-[10px] text-[#71717a] font-mono shrink-0">
                            Score {item.score}
                          </div>
                          <div className="flex-1 h-6 bg-[#18181b] rounded-full border border-white/5 relative overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${delay === 0
                                ? "bg-emerald-500/30"
                                : delay < 1000
                                  ? "bg-amber-500/40"
                                  : "bg-red-500/40"
                                }`}
                              style={{ width: `${pct}%` }}
                            />
                            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-white/60">
                              {delay}ms
                            </span>
                          </div>
                          <div className="w-20 text-[10px] text-[#52525b] shrink-0">{item.label}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/5 bg-[#121212]">
              <CardHeader className="flex flex-row items-start justify-between">
                <div className="flex gap-4">
                  <div className="mt-1 p-3 bg-emerald-500/10 rounded-xl">
                    <Lock className="w-7 h-7 text-emerald-500" />
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      Challenge Gateway
                      <Badge
                        variant="secondary"
                        className={`text-[10px] border-none ${challenge.enabled ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-[#71717a]"}`}
                      >
                        {challenge.enabled ? "ACTIVE" : "OFF"}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-[#a1a1aa] mt-1">
                      Serve CAPTCHA or PoW challenges to suspicious visitors.
                    </CardDescription>
                  </div>
                </div>
                <Switch
                  checked={challenge.enabled}
                  onCheckedChange={(v: boolean) => updatePluginNested("challenge", { enabled: v })}
                />
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#71717a] uppercase tracking-wider">Provider</label>
                  <div className="flex gap-2">
                    {(["pow", "turnstile", "hcaptcha"] as const).map((p) => (
                      <Button
                        key={p}
                        variant="outline"
                        size="sm"
                        onClick={() => updatePluginNested("challenge", { provider: p })}
                        className={`flex-1 capitalize ${challenge.provider === p
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : "bg-transparent border-white/10 text-[#71717a]"
                          }`}
                      >
                        {p === "pow" ? "Proof-of-Work" : p === "turnstile" ? "Turnstile" : "hCaptcha"}
                      </Button>
                    ))}
                  </div>
                </div>

                {challenge.provider !== "pow" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[#71717a] uppercase tracking-wider">Site Key</label>
                      <Input
                        value={challenge.siteKey || ""}
                        onChange={(e) => updatePluginNested("challenge", { siteKey: e.target.value })}
                        className="h-8 bg-[#18181b] border-white/5 font-mono text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
                        Secret Key
                      </label>
                      <Input
                        type="password"
                        value={challenge.secretKey || ""}
                        onChange={(e) => updatePluginNested("challenge", { secretKey: e.target.value })}
                        className="h-8 bg-[#18181b] border-white/5 font-mono text-xs"
                      />
                    </div>
                  </div>
                )}

                {challenge.provider === "pow" && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
                      PoW Difficulty (Leading Zeros)
                    </label>
                    <div className="flex gap-2">
                      {[3, 4, 5, 6].map((d) => (
                        <Button
                          key={d}
                          variant="outline"
                          size="sm"
                          onClick={() => updatePluginNested("challenge", { powDifficulty: d })}
                          className={`flex-1 font-mono ${challenge.powDifficulty === d
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : "bg-transparent border-white/10 text-[#71717a]"
                            }`}
                        >
                          {d}
                        </Button>
                      ))}
                    </div>
                    <p className="text-[10px] text-[#52525b]">
                      Higher = harder. 4 ≈ 1-3sec on modern hardware. 6 ≈ 15-60sec.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
                      Session TTL (Sec)
                    </label>
                    <Input
                      type="number"
                      value={challenge.sessionTtlSeconds || 3600}
                      onChange={(e) =>
                        updatePluginNested("challenge", { sessionTtlSeconds: Number(e.target.value) })
                      }
                      className="h-8 bg-[#18181b] border-white/5 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
                      Bypass Cookie
                    </label>
                    <Input
                      value={challenge.bypassCookieName || "hilux_verified"}
                      onChange={(e) =>
                        updatePluginNested("challenge", { bypassCookieName: e.target.value })
                      }
                      className="h-8 bg-[#18181b] border-white/5 font-mono text-xs text-emerald-400"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="enumeration">
          <Card className="border-white/5 bg-[#121212]">
            <CardHeader className="flex flex-row items-start justify-between">
              <div className="flex gap-4">
                <div className="mt-1 p-3 bg-emerald-500/10 rounded-xl">
                  <Code2 className="w-7 h-7 text-emerald-500" />
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    API Enumeration Detection
                    <Badge
                      variant="secondary"
                      className={`text-[10px] border-none ${enumDetection ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-[#71717a]"}`}
                    >
                      {enumDetection ? "ACTIVE" : "OFF"}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-[#a1a1aa] mt-1 max-w-lg">
                    Detect sequential resource scraping like /users/1, /users/2, /users/3... Catches data harvesting
                    that bypasses rate limits.
                  </CardDescription>
                </div>
              </div>
              <Switch
                checked={enumDetection}
                onCheckedChange={(v: boolean) => updateBehavior({ enumerationDetection: v })}
              />
            </CardHeader>
            <CardContent className="space-y-6 pt-2">
              <div className="p-4 rounded-lg bg-[#18181b] border border-white/5 space-y-4">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Detection Examples</h4>
                <div className="space-y-3">
                  {[
                    {
                      paths: ["/api/users/1", "/api/users/2", "/api/users/3", "/api/users/4", "/api/users/5"],
                      label: "Sequential User Scraping",
                      score: 20,
                    },
                    {
                      paths: ["/products?page=1", "/products?page=2", "...?page=15", "...?page=16", "...?page=17"],
                      label: "Paginated Data Harvesting",
                      score: 30,
                    },
                    {
                      paths: ["/api/order/1001", "/api/order/1002", "...1018", "...1019", "/api/order/1020"],
                      label: "Order ID Enumeration (IDOR)",
                      score: 40,
                    },
                  ].map((example) => (
                    <div key={example.label} className="p-3 rounded-lg border border-white/5 bg-[#0a0a0a]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-white">{example.label}</span>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] border-none font-mono ${example.score >= 30
                            ? "bg-red-500/20 text-red-400"
                            : "bg-amber-500/20 text-amber-400"
                            }`}
                        >
                          +{example.score} pts
                        </Badge>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {example.paths.map((p, i) => (
                          <code
                            key={i}
                            className="text-[10px] font-mono px-2 py-1 rounded bg-white/5 text-emerald-400"
                          >
                            {p}
                          </code>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-lg bg-[#18181b] border border-white/5">
                  <div className="text-2xl font-bold text-emerald-500 font-mono">5+</div>
                  <div className="text-[10px] text-[#71717a] mt-1 uppercase tracking-wider">Min Sequential IDs</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-[#18181b] border border-white/5">
                  <div className="text-2xl font-bold text-amber-500 font-mono">20-40</div>
                  <div className="text-[10px] text-[#71717a] mt-1 uppercase tracking-wider">Score Range</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-[#18181b] border border-white/5">
                  <div className="text-2xl font-bold text-blue-500 font-mono">{config.behavior?.windowSeconds || 300}s</div>
                  <div className="text-[10px] text-[#71717a] mt-1 uppercase tracking-wider">Detection Window</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {showSuccess && (
        <div className="fixed bottom-8 right-8 z-50 animate-in slide-in-from-right-4 fade-in duration-300">
          <div className="flex items-center gap-3 bg-[#18181b] border border-green-500/20 shadow-xl rounded-lg p-4 text-green-500">
            <CheckCircle2 className="w-5 h-5" />
            <div className="text-sm font-bold tracking-wide">Advanced Settings Saved!</div>
          </div>
        </div>
      )}
    </div>
  );
}

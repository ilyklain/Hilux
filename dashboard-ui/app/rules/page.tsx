"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Plus, TerminalSquare, Settings2, Trash2, Activity, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useHiluxApi } from "@/hooks/useHiluxApi";

export default function RulesPage() {
  const { fetchApi } = useHiluxApi();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [configForm, setConfigForm] = useState<any>(null);

  const [sandboxReq, setSandboxReq] = useState({ method: "GET", path: "/", ip: "192.168.1.100", headers: '{"user-agent": "curl/7.88.1"}' });
  const [sandboxRes, setSandboxRes] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    async function init() {
      const data = await fetchApi("/config");
      if (data) setConfigForm(data);
      setIsLoading(false);
    }
    init();
  }, [fetchApi]);

  const handleAddRule = () => {
    if (!configForm) return;
    const newRule = { id: Date.now().toString(), condition: "Request.IP", operator: "equals", value: "1.2.3.4", action: "BLOCK" };
    setConfigForm({ ...configForm, customRules: [...(configForm.customRules || []), newRule] });
  };

  const handleDeleteRule = (id: string) => {
    setConfigForm({ ...configForm, customRules: configForm.customRules.filter((r: any) => r.id !== id) });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await fetchApi("/config", {
        method: "POST",
        body: JSON.stringify(configForm)
      });
      setShowSaveModal(false);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    } catch (e) {
      console.error(e);
      alert("Failed to sync rules");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSimulate = async () => {
    setIsSimulating(true);
    setSandboxRes(null);
    try {
      let parsedHeaders = {};
      try {
        parsedHeaders = JSON.parse(sandboxReq.headers);
      } catch {
        alert("Invalid JSON headers");
        setIsSimulating(false);
        return;
      }

      const res = await fetchApi("/stats/simulate", {
        method: "POST",
        body: JSON.stringify({
          ip: sandboxReq.ip,
          path: sandboxReq.path,
          method: sandboxReq.method,
          headers: parsedHeaders
        })
      });
      setSandboxRes(res);
    } catch (e) {
      setSandboxRes({ error: "Simulation request failed" });
    } finally {
      setIsSimulating(false);
    }
  };

  if (isLoading || !configForm) {
    return <div className="p-8 text-white/50 text-sm">Loading security configuration...</div>;
  }

  return (
    <div className="flex flex-col gap-8 p-8 max-w-7xl mx-auto w-full relative">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rules & Firewall</h1>
          <p className="text-sm text-[#a1a1aa] mt-1">Adjust scoring parameters and threat thresholds.</p>
        </div>
        <Button onClick={() => setShowSaveModal(true)} className="bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold">
          Sync Threat Rules
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-white/5 bg-[#121212]">
          <CardHeader>
            <CardTitle>Action Thresholds</CardTitle>
            <CardDescription className="text-[#a1a1aa]">Determine when Hilux starts acting against traffic.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between py-2 border-b border-white/5 pb-4">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Suspicious Threshold</div>
                <div className="text-xs text-[#a1a1aa]">Trigger rate-limit escalation and logging.</div>
              </div>
              <Input
                value={configForm.thresholds?.suspicious || 0}
                onChange={(e) => setConfigForm({ ...configForm, thresholds: { ...configForm.thresholds, suspicious: Number(e.target.value) } })}
                className="w-20 text-center bg-[#18181b] border-white/5 font-mono"
              />
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <div className="text-sm font-medium text-red-500">Block Threshold</div>
                <div className="text-xs text-[#a1a1aa]">Immediately drop the request with 403.</div>
              </div>
              <Input
                value={configForm.thresholds?.block || 0}
                onChange={(e) => setConfigForm({ ...configForm, thresholds: { ...configForm.thresholds, block: Number(e.target.value) } })}
                className="w-20 text-center bg-[#18181b] border-white/5 font-mono"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-[#121212]">
          <CardHeader>
            <CardTitle>Rate Limiting Parameters</CardTitle>
            <CardDescription className="text-[#a1a1aa]">Global L7 DOS protection settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Window (Seconds)</label>
                <Input value={configForm.rateLimit?.defaultWindowSeconds || 0} onChange={(e) => setConfigForm({ ...configForm, rateLimit: { ...configForm.rateLimit, defaultWindowSeconds: Number(e.target.value) } })} className="bg-[#18181b] border-white/5 font-mono" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Max Requests</label>
                <Input value={configForm.rateLimit?.defaultMaxRequests || 0} onChange={(e) => setConfigForm({ ...configForm, rateLimit: { ...configForm.rateLimit, defaultMaxRequests: Number(e.target.value) } })} className="bg-[#18181b] border-white/5 font-mono" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/5 bg-[#121212]">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TerminalSquare className="w-5 h-5 text-[#3b82f6]" />
              Custom WAF Rules
            </CardTitle>
            <CardDescription className="text-[#a1a1aa] mt-1">
              Create specific regex and string matching rules for incoming traffic. Rules are evaluated chronologically.
            </CardDescription>
          </div>
          <Button onClick={handleAddRule} variant="outline" size="sm" className="bg-[#18181b] border-white/10 hover:bg-white/5">
            <Plus className="w-4 h-4 mr-2" /> Add Mock Rule
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-white/5 bg-[#09090b] overflow-hidden">
            <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/5 text-xs font-bold text-[#a1a1aa] uppercase tracking-wider bg-[#18181b]">
              <div className="col-span-4">Condition (Field)</div>
              <div className="col-span-3">Operator</div>
              <div className="col-span-3">Value</div>
              <div className="col-span-2 text-right">Action</div>
            </div>

            <div className="divide-y divide-white/5">
              {(configForm.customRules || []).map((rule: any) => (
                <div key={rule.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-white/5 transition-colors group">
                  <div className="col-span-4 font-mono text-sm text-[#e4e4e7] flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-[#a1a1aa]" />
                    <Input
                      value={rule.condition}
                      onChange={(e) => setConfigForm({ ...configForm, customRules: configForm.customRules.map((r: any) => r.id === rule.id ? { ...r, condition: e.target.value } : r) })}
                      className="h-7 text-xs bg-transparent border-white/10"
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      value={rule.operator}
                      onChange={(e) => setConfigForm({ ...configForm, customRules: configForm.customRules.map((r: any) => r.id === rule.id ? { ...r, operator: e.target.value } : r) })}
                      className="h-7 text-xs bg-transparent border-white/10 font-mono text-[#a1a1aa] w-32"
                    />
                  </div>
                  <div className="col-span-3 font-mono text-sm text-[#3b82f6]">
                    <Input
                      value={rule.value}
                      onChange={(e) => setConfigForm({ ...configForm, customRules: configForm.customRules.map((r: any) => r.id === rule.id ? { ...r, value: e.target.value } : r) })}
                      className="h-7 text-xs bg-transparent border-white/10 text-[#3b82f6]"
                    />
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-4">
                    <Badge variant={rule.action === "BLOCK" ? "destructive" : "default"} className="text-[10px] tracking-widest cursor-pointer" onClick={() => setConfigForm({ ...configForm, customRules: configForm.customRules.map((r: any) => r.id === rule.id ? { ...r, action: r.action === "BLOCK" ? "ALLOW" : "BLOCK" } : r) })}>
                      {rule.action}
                    </Badge>
                    <Button
                      onClick={() => handleDeleteRule(rule.id)}
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-[#a1a1aa] hover:text-red-500 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {(!configForm.customRules || configForm.customRules.length === 0) && (
                <div className="p-4 text-center text-sm text-[#a1a1aa]">No custom rules applied.</div>
              )}
            </div>

            <div className="p-4 bg-[#18181b]/50 border-t border-white/5 text-xs text-[#71717a] text-center italic">
              Custom rules execute before the internal scoring engine. Click Actions to toggle ALLOW/BLOCK.
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/5 bg-[#121212]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-500" />
            WAF Sandbox Simulator
          </CardTitle>
          <CardDescription className="text-[#a1a1aa]">
            Execute a dry-run analysis on a mocked request to see what Hilux would do, without polluting your traffic logs or enforcing blocks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-32">
                  <label className="text-xs font-bold text-[#a1a1aa] uppercase mb-1 block">Method</label>
                  <Input value={sandboxReq.method} onChange={e => setSandboxReq({ ...sandboxReq, method: e.target.value })} className="bg-[#18181b] border-white/10 font-mono text-sm" />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-bold text-[#a1a1aa] uppercase mb-1 block">Path</label>
                  <Input value={sandboxReq.path} onChange={e => setSandboxReq({ ...sandboxReq, path: e.target.value })} className="bg-[#18181b] border-white/10 font-mono text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-[#a1a1aa] uppercase mb-1 block">Source IP</label>
                <Input value={sandboxReq.ip} onChange={e => setSandboxReq({ ...sandboxReq, ip: e.target.value })} className="bg-[#18181b] border-white/10 font-mono text-sm" />
              </div>
              <div>
                <label className="text-xs font-bold text-[#a1a1aa] uppercase mb-1 block">JSON Headers</label>
                <textarea
                  value={sandboxReq.headers}
                  onChange={e => setSandboxReq({ ...sandboxReq, headers: e.target.value })}
                  className="w-full h-24 bg-[#18181b] border border-white/10 rounded-md p-3 font-mono text-sm text-[#e4e4e7] focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
              <Button onClick={handleSimulate} disabled={isSimulating} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold">
                <Play className="w-4 h-4 mr-2 fill-current" /> {isSimulating ? "Simulating..." : "Fire Simulation"}
              </Button>
            </div>

            <div className="bg-[#09090b] border border-white/10 rounded-xl overflow-hidden flex flex-col">
              <div className="bg-[#18181b] p-3 text-xs font-bold text-[#a1a1aa] uppercase tracking-wider border-b border-white/10">
                Evaluation Engine Output
              </div>
              <div className="p-4 flex-1 overflow-auto font-mono text-sm">
                {sandboxRes ? (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="flex flex-col">
                      <span className="text-xs text-[#71717a]">Final Status</span>
                      <span className={`text-xl font-bold ${sandboxRes.bot ? 'text-red-500' : 'text-green-500'}`}>
                        {sandboxRes.classification?.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-[#71717a]">Threat Score</span>
                      <span className="text-white">{sandboxRes.risk_score}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-[#71717a]">Triggered Reasons</span>
                      <ul className="list-disc list-inside text-red-400">
                        {sandboxRes.reasons?.map((r: string, i: number) => <li key={i}>{r}</li>)}
                        {(!sandboxRes.reasons || sandboxRes.reasons.length === 0) && <span className="text-green-500 w-full block">Traffic clean. No heuristics triggered.</span>}
                      </ul>
                    </div>
                    <div className="mt-4 pt-4 border-t border-white/5 whitespace-pre-wrap text-yellow-500 text-xs">
                      {JSON.stringify(sandboxRes.threat_breakdown, null, 2)}
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-[#71717a] italic text-center">
                    Awaiting payload injection.
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#18181b] border border-white/10 rounded-xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-bold text-white mb-2">Sync Security Rules?</h2>
            <p className="text-[#a1a1aa] text-sm mb-6">
              You are about to upload new threat thresholds globally. This will immediately affect how Hilux evaluates incoming traffic. Proceed?
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowSaveModal(false)} className="bg-transparent border-white/10 text-white hover:bg-white/5" disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleSave} className="bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold" disabled={isSaving}>
                {isSaving ? "Syncing..." : "Yes, Sync Now"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showSuccessToast && (
        <div className="fixed bottom-8 right-8 z-50 animate-in slide-in-from-right-4 fade-in duration-300">
          <div className="flex items-center gap-3 bg-[#18181b] border border-green-500/20 shadow-xl rounded-lg p-4 text-green-500">
            <CheckCircle2 className="w-5 h-5" />
            <div className="text-sm font-bold tracking-wide">Rules Synced Successfully!</div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, Database, Sliders, CheckCircle2, Cpu, BellRing, Loader2 } from "lucide-react";
import { useHiluxApi } from "@/hooks/useHiluxApi";

export default function SettingsPage() {
  const { fetchApi } = useHiluxApi();
  const [configForm, setConfigForm] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [modalAlert, setModalAlert] = useState<{ title: string, message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const [sqliEnabled, setSqliEnabled] = useState(true);
  const [xssEnabled, setXssEnabled] = useState(true);
  const [strictness, setStrictness] = useState<"Low" | "Medium" | "Paranoid">("Paranoid");

  const [isSendingAlert, setIsSendingAlert] = useState(false);
  const [testAlertSent, setTestAlertSent] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const c = await fetchApi("/config");
        if (c) setConfigForm(c);
      } catch (e) {
        console.error("Failed to fetch config:", e);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, [fetchApi]);

  const handleTestAlert = async () => {
    setIsSendingAlert(true);

    const url = configForm?.plugin?.webhookUrl;
    if (!url) {
      setModalAlert({ title: "Configuration Required", message: "Please enter a Webhook URL and save your configuration first." });
      setIsSendingAlert(false);
      return;
    }

    try {
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "Hilux WAF Test Alert\nThis is a simulated webhook dispatch from your Hilux Dashboard. The Webhook integration is successfully working."
        })
      });
      setTestAlertSent(true);
      setTimeout(() => setTestAlertSent(false), 3000);
    } catch (e) {
      setModalAlert({ title: "Webhook Failed", message: "Failed to send webhook. Check your URL or CORS policy." });
    } finally {
      setIsSendingAlert(false);
    }
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
      setModalAlert({ title: "Save Error", message: "Failed to apply configuration. Ensure the WAF is reachable." });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !configForm) {
    return (
      <div className="flex items-center justify-center p-24 text-[#71717a]">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading Configuration...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-8 max-w-7xl mx-auto w-full relative">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-[#a1a1aa] mt-1">Configure your Hilux instance and persistence datastores.</p>
        </div>
        <Button onClick={() => setShowSaveModal(true)} className="bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold">
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-4 bg-[#121212] border border-white/5 flex flex-wrap h-auto p-1">
          <TabsTrigger value="general" className="data-[state=active]:bg-[#18181b] data-[state=active]:text-white">
            <Sliders className="w-4 h-4 mr-2" />
            General Defaults
          </TabsTrigger>
          <TabsTrigger value="engines" className="data-[state=active]:bg-[#18181b] data-[state=active]:text-white">
            <Cpu className="w-4 h-4 mr-2 text-[#3b82f6]" />
            Detection Engines
          </TabsTrigger>
          <TabsTrigger value="persistence" className="data-[state=active]:bg-[#18181b] data-[state=active]:text-white">
            <Database className="w-4 h-4 mr-2" />
            Data Persistence
          </TabsTrigger>
          <TabsTrigger value="reputation" className="data-[state=active]:bg-[#18181b] data-[state=active]:text-white">
            <ShieldCheck className="w-4 h-4 mr-2" />
            IP Reputation System
          </TabsTrigger>
          <TabsTrigger value="alerts" className="data-[state=active]:bg-[#18181b] data-[state=active]:text-white">
            <BellRing className="w-4 h-4 mr-2" />
            Alerts & Webhooks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card className="border-white/5 bg-[#121212]">
            <CardHeader>
              <CardTitle>Plugin Configuration</CardTitle>
              <CardDescription className="text-[#a1a1aa]">Base behavior for Express and Fastify deployments.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Dashboard Route Prefix</label>
                  <Input
                    value={configForm.plugin.prefix}
                    onChange={(e) => setConfigForm({ ...configForm, plugin: { ...configForm.plugin, prefix: e.target.value } })}
                    className="bg-[#18181b] border-white/5 font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Block Status Code</label>
                  <Input
                    value={configForm.plugin.blockStatusCode}
                    onChange={(e) => setConfigForm({ ...configForm, plugin: { ...configForm.plugin, blockStatusCode: Number(e.target.value) } })}
                    type="number"
                    className="bg-[#18181b] border-white/5 font-mono"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Block Action Message</label>
                <Input
                  value={configForm.plugin.blockMessage}
                  onChange={(e) => setConfigForm({ ...configForm, plugin: { ...configForm.plugin, blockMessage: e.target.value } })}
                  className="bg-[#18181b] border-white/5"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="persistence">
          <div className="grid grid-cols-2 gap-6">
            <Card className="border-white/5 bg-[#121212]">
              <CardHeader>
                <CardTitle>Redis Cache</CardTitle>
                <CardDescription className="text-[#a1a1aa]">Used for high-speed rate limiting and state.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Host</label>
                  <Input
                    value={configForm.redis.host}
                    onChange={(e) => setConfigForm({ ...configForm, redis: { ...configForm.redis, host: e.target.value } })}
                    className="bg-[#18181b] border-white/5 font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Port</label>
                  <Input
                    value={configForm.redis.port}
                    onChange={(e) => setConfigForm({ ...configForm, redis: { ...configForm.redis, port: Number(e.target.value) } })}
                    className="bg-[#18181b] border-white/5 font-mono"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/5 bg-[#121212]">
              <CardHeader>
                <CardTitle>PostgreSQL Storage</CardTitle>
                <CardDescription className="text-[#a1a1aa]">Long-term logging and threat intelligence archiving.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Host</label>
                  <Input
                    value={configForm.postgres.host}
                    onChange={(e) => setConfigForm({ ...configForm, postgres: { ...configForm.postgres, host: e.target.value } })}
                    className="bg-[#18181b] border-white/5 font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Database</label>
                    <Input
                      value={configForm.postgres.database}
                      onChange={(e) => setConfigForm({ ...configForm, postgres: { ...configForm.postgres, database: e.target.value } })}
                      className="bg-[#18181b] border-white/5 font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Port</label>
                    <Input
                      value={configForm.postgres.port}
                      onChange={(e) => setConfigForm({ ...configForm, postgres: { ...configForm.postgres, port: Number(e.target.value) } })}
                      className="bg-[#18181b] border-white/5 font-mono"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reputation">
          <Card className="border-white/5 bg-[#121212]">
            <CardHeader>
              <CardTitle>Reputation Decay</CardTitle>
              <CardDescription className="text-[#a1a1aa]">How quickly an IP address regenerates trust over time.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Decay Interval (Seconds)</label>
                  <Input
                    value={configForm.reputation.decayIntervalSeconds}
                    onChange={(e) => setConfigForm({ ...configForm, reputation: { ...configForm.reputation, decayIntervalSeconds: Number(e.target.value) } })}
                    className="bg-[#18181b] border-white/5 font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Decay Amount</label>
                  <Input
                    value={configForm.reputation.decayAmount}
                    onChange={(e) => setConfigForm({ ...configForm, reputation: { ...configForm.reputation, decayAmount: Number(e.target.value) } })}
                    className="bg-[#18181b] border-white/5 font-mono"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engines">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-white/5 bg-[#121212]">
              <CardHeader>
                <CardTitle>Threat Signatures Engine</CardTitle>
                <CardDescription className="text-[#a1a1aa]">Heuristic detection for known payload injections.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-[#18181b]">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">SQL Injection (SQLi)</span>
                    <span className="text-xs text-[#a1a1aa]">Identify common database attack vectors</span>
                  </div>
                  <div
                    onClick={() => {
                      setSqliEnabled(!sqliEnabled);
                      setConfigForm({ ...configForm, enabledDetectors: { ...configForm.enabledDetectors, payload: !sqliEnabled } });
                    }}
                    className={`w-10 h-6 rounded-full flex items-center p-1 cursor-pointer transition-colors ${configForm.enabledDetectors.payload ? 'bg-[#3b82f6] justify-end' : 'bg-[#27272a] justify-start'}`}
                  >
                    <div className="w-4 h-4 bg-white rounded-full"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-[#18181b]">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">Cross-Site Scripting (XSS)</span>
                    <span className="text-xs text-[#a1a1aa]">Block malicious script payloads</span>
                  </div>
                  <div
                    onClick={() => {
                      setXssEnabled(!xssEnabled);
                      setConfigForm({ ...configForm, enabledDetectors: { ...configForm.enabledDetectors, behavior: !xssEnabled } });
                    }}
                    className={`w-10 h-6 rounded-full flex items-center p-1 cursor-pointer transition-colors ${configForm.enabledDetectors.behavior ? 'bg-[#3b82f6] justify-end' : 'bg-[#27272a] justify-start'}`}
                  >
                    <div className="w-4 h-4 bg-white rounded-full"></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/5 bg-[#121212]">
              <CardHeader>
                <CardTitle>Behavioral Anomaly Engine</CardTitle>
                <CardDescription className="text-[#a1a1aa]">Score IPs based on suspicious browsing patterns.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center justify-between">
                    Strictness Mode
                    <span className="text-xs text-[#3b82f6] font-mono">{strictness.toUpperCase()}</span>
                  </label>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setStrictness("Low");
                        setConfigForm({ ...configForm, thresholds: { ...configForm.thresholds, block: 90 } });
                      }}
                      variant="outline"
                      className={`flex-1 ${strictness === "Low" ? "bg-[#3b82f6] text-white border-transparent" : "bg-transparent border-white/10 text-[#a1a1aa]"}`}
                    >
                      Low
                    </Button>
                    <Button
                      onClick={() => {
                        setStrictness("Medium");
                        setConfigForm({ ...configForm, thresholds: { ...configForm.thresholds, block: 70 } });
                      }}
                      variant="outline"
                      className={`flex-1 ${strictness === "Medium" ? "bg-[#3b82f6] text-white border-transparent" : "bg-transparent border-white/10 text-[#a1a1aa]"}`}
                    >
                      Medium
                    </Button>
                    <Button
                      onClick={() => {
                        setStrictness("Paranoid");
                        setConfigForm({ ...configForm, thresholds: { ...configForm.thresholds, block: 50 } });
                      }}
                      variant="outline"
                      className={`flex-1 ${strictness === "Paranoid" ? "bg-[#ef4444] text-white border-transparent" : "bg-transparent border-white/10 text-[#a1a1aa]"}`}
                    >
                      Paranoid
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts">
          <Card className="border-white/5 bg-[#121212] mb-6">
            <CardHeader>
              <CardTitle>Discord / Slack Webhooks</CardTitle>
              <CardDescription className="text-[#a1a1aa]">Receive instant notifications when Hilux mitigates a high-volume attack.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Webhook URL</label>
                <Input
                  value={configForm?.plugin?.webhookUrl || ""}
                  onChange={(e) => setConfigForm({ ...configForm, plugin: { ...configForm.plugin, webhookUrl: e.target.value } })}
                  type="password"
                  className="bg-[#18181b] border-white/5 font-mono text-xs"
                />
              </div>
              <div className="space-y-4 pt-4 border-t border-white/5">
                <h3 className="text-sm font-bold text-white">Webhook Events</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-[#18181b]">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-white">IP Ban</span>
                      <span className="text-[10px] text-[#a1a1aa]">Trigger when an IP is blacklisted</span>
                    </div>
                    <div
                      onClick={() => setConfigForm({ ...configForm, plugin: { ...configForm.plugin, webhookEvents: { ...(configForm.plugin.webhookEvents || {}), onBan: !(configForm.plugin.webhookEvents?.onBan) } } })}
                      className={`w-10 h-6 rounded-full flex items-center p-1 cursor-pointer transition-colors ${configForm.plugin.webhookEvents?.onBan ? 'bg-[#3b82f6] justify-end' : 'bg-[#27272a] justify-start'}`}
                    >
                      <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-[#18181b]">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-white">High Risk Request</span>
                      <span className="text-[10px] text-[#a1a1aa]">Trigger when a request is blocked</span>
                    </div>
                    <div
                      onClick={() => setConfigForm({ ...configForm, plugin: { ...configForm.plugin, webhookEvents: { ...(configForm.plugin.webhookEvents || {}), onBlock: !(configForm.plugin.webhookEvents?.onBlock) } } })}
                      className={`w-10 h-6 rounded-full flex items-center p-1 cursor-pointer transition-colors ${configForm.plugin.webhookEvents?.onBlock ? 'bg-[#3b82f6] justify-end' : 'bg-[#27272a] justify-start'}`}
                    >
                      <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-[#18181b]">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-white">Suspicious Activity</span>
                      <span className="text-[10px] text-[#a1a1aa]">Trigger on anomalous requests</span>
                    </div>
                    <div
                      onClick={() => setConfigForm({ ...configForm, plugin: { ...configForm.plugin, webhookEvents: { ...(configForm.plugin.webhookEvents || {}), onSuspicious: !(configForm.plugin.webhookEvents?.onSuspicious) } } })}
                      className={`w-10 h-6 rounded-full flex items-center p-1 cursor-pointer transition-colors ${configForm.plugin.webhookEvents?.onSuspicious ? 'bg-[#3b82f6] justify-end' : 'bg-[#27272a] justify-start'}`}
                    >
                      <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-[#18181b]">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-white">System Events</span>
                      <span className="text-[10px] text-[#a1a1aa]">Internal WAF errors or state changes</span>
                    </div>
                    <div
                      onClick={() => setConfigForm({ ...configForm, plugin: { ...configForm.plugin, webhookEvents: { ...(configForm.plugin.webhookEvents || {}), onSystem: !(configForm.plugin.webhookEvents?.onSystem) } } })}
                      className={`w-10 h-6 rounded-full flex items-center p-1 cursor-pointer transition-colors ${configForm.plugin.webhookEvents?.onSystem ? 'bg-[#3b82f6] justify-end' : 'bg-[#27272a] justify-start'}`}
                    >
                      <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                    </div>
                  </div>
                </div>
              </div>
              <Button
                onClick={handleTestAlert}
                variant="outline"
                className="w-full bg-[#18181b] border-white/10 hover:bg-white/5"
                disabled={isSendingAlert}
              >
                {isSendingAlert ? "Sending..." : "Send Test Alert"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#18181b] border border-white/10 rounded-xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-bold text-white mb-2">Apply Configuration?</h2>
            <p className="text-[#a1a1aa] text-sm mb-6">
              You are about to save core WAF settings. Applying these changes may temporarily restart the Hilux protection engines. Do you wish to continue?
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowSaveModal(false)} className="bg-transparent border-white/10 text-white hover:bg-white/5" disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleSave} className="bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold" disabled={isSaving}>
                {isSaving ? "Applying..." : "Yes, Apply"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {modalAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#18181b] border border-white/10 rounded-xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#ef4444]" />
              {modalAlert.title}
            </h2>
            <p className="text-[#a1a1aa] text-sm mb-6 mt-2">
              {modalAlert.message}
            </p>
            <div className="flex justify-end gap-3">
              <Button onClick={() => setModalAlert(null)} className="bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold w-full">
                Understood
              </Button>
            </div>
          </div>
        </div>
      )}

      {showSuccessToast && (
        <div className="fixed bottom-8 right-8 z-50 animate-in slide-in-from-right-4 fade-in duration-300">
          <div className="flex items-center gap-3 bg-[#18181b] border border-green-500/20 shadow-xl rounded-lg p-4 text-green-500">
            <CheckCircle2 className="w-5 h-5" />
            <div className="text-sm font-bold tracking-wide">Configuration Saved Successfully!</div>
          </div>
        </div>
      )}

      {testAlertSent && (
        <div className="fixed bottom-8 right-8 z-50 animate-in slide-in-from-right-4 fade-in duration-300">
          <div className="flex items-center gap-3 bg-[#18181b] border border-[#3b82f6]/20 shadow-xl rounded-lg p-4 text-[#3b82f6]">
            <BellRing className="w-5 h-5" />
            <div className="text-sm font-bold tracking-wide">Test Payload sent to Webhook.</div>
          </div>
        </div>
      )}
    </div>
  );
}

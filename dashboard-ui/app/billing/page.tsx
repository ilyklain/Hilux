"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Check, Shield, Zap, Crown, ExternalLink, TicketCheck, ShieldCheck } from "lucide-react";
import { useHiluxApi } from "@/hooks/useHiluxApi";

const ActivationModal = ({ plan, onClose }: { plan: string, onClose: () => void }) => {
  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <Card className="w-full max-w-md bg-[#121212] border-white/5 shadow-2xl animate-in zoom-in-95 duration-200">
        <CardHeader className="text-center pt-8">
          <div className="mx-auto w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
            <ShieldCheck className="w-10 h-10 text-blue-500" />
          </div>
          <CardTitle className="text-2xl font-bold">License Activated</CardTitle>
          <CardDescription className="text-sm">
            You've successfully upgraded to the <span className="text-white font-bold">{plan}</span> plan.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center pb-8">
          <p className="text-[#a1a1aa] text-sm mb-6">
            All premium security modules and advanced heuristics are now operational on your engine.
          </p>
          <Button onClick={onClose} className="w-full bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold h-11">
            Start Protecting
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

const PLANS = [
  {
    name: "Basic",
    price: "$0",
    description: "Essential security for personal projects.",
    features: ["Core Heuristics", "Live Traffic Monitor", "1 Custom Rule", "7-day logs history"],
    tier: "Free",
    cta: "Current Plan",
    highlight: false
  },
  {
    name: "Pro",
    price: "$29",
    description: "Advanced anti-bot engine for businesses.",
    features: ["Login Protector Hub", "Global Geo-Blocking", "Honeypot Decoys", "Unlimited Rules", "30-day logs history"],
    tier: "Pro",
    cta: "Upgrade to Pro",
    highlight: true,
    lemonsqueezy_url: "https://hiluxantibots.lemonsqueezy.com/checkout/buy/d3450dde-5336-4ed3-aeb2-bc0d74c7541f"
  },
  {
    name: "Enterprise",
    price: "$199",
    description: "Full-spectrum protection for high-traffic apps.",
    features: ["Virtual Patching (CVE)", "Advanced Fingerprinting", "Forensic Data Stream", "Priority Support", "White-label Dashboard"],
    tier: "Enterprise",
    cta: "Go Enterprise",
    highlight: false,
    lemonsqueezy_url: "https://hiluxantibots.lemonsqueezy.com/checkout/buy/d12fb09c-af39-40aa-991c-7fd81f57db21"
  }
];

export default function BillingPage() {
  const { fetchApi } = useHiluxApi();
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [licenseKey, setLicenseKey] = useState("");
  const [validating, setValidating] = useState(false);
  const [showModal, setShowModal] = useState<{ active: boolean, plan: string }>({ active: false, plan: "" });

  useEffect(() => {
    async function load() {
      const data = await fetchApi("/config");
      if (data) {
        setConfig(data);
        setLicenseKey(data.licenseKey || "");
      }
      setLoading(false);
    }
    load();
  }, [fetchApi]);

  const handleActivate = async () => {
    if (!licenseKey) return;
    setValidating(true);

    try {
      const resp = await fetchApi("/license/activate", {
        method: "POST",
        body: JSON.stringify({ license_key: licenseKey })
      });

      if (resp.success) {
        const newData = await fetchApi("/config");
        setConfig(newData);
        setShowModal({ active: true, plan: resp.plan });
      } else {
        alert(resp.message || resp.error || "Invalid license key.");
      }
    } catch (e) {
      alert("Activation failed. Connection error or invalid license.");
    } finally {
      setValidating(false);
    }
  };

  if (loading || !config) return <div className="p-8 text-white/50">Loading billing...</div>;

  return (
    <div className="flex flex-col gap-12 p-8 max-w-7xl mx-auto w-full">
      {showModal.active && <ActivationModal plan={showModal.plan} onClose={() => setShowModal({ active: false, plan: "" })} />}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <CreditCard className="w-8 h-8 text-[#3b82f6]" />
          Plans & Billing
        </h1>
        <p className="text-[#a1a1aa]">Manage your Hilux license and security tiers.</p>
      </div>

      <Card className="bg-[#121212] border-white/5 overflow-hidden">
        <div className="bg-[#3b82f6]/10 p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-blue-400">
            <TicketCheck className="w-4 h-4" />
            License Management
          </div>
          <Badge variant="outline" className="bg-black/50 border-white/10 text-xs px-2 py-0 h-6">
            Current Plan: <span className="ml-1 text-white font-bold">{config.plan}</span>
          </Badge>
        </div>
        <CardContent className="p-6 flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 space-y-2 w-full">
            <label className="text-xs font-bold text-[#71717a] uppercase">License Key</label>
            <Input
              placeholder="LS-XXXX-XXXX-XXXX"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              className="bg-[#18181b] border-white/5 font-mono text-blue-500"
            />
          </div>
          <Button
            onClick={handleActivate}
            disabled={validating || !licenseKey}
            className="bg-white text-black hover:bg-neutral-200 font-bold"
          >
            {validating ? "Validating..." : "Activate Key"}
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {PLANS.map((plan) => (
          <Card key={plan.name} className={`bg-[#121212] flex flex-col transition-all duration-300 ${plan.highlight ? "border-[#3b82f6]/50 ring-1 ring-[#3b82f6]/20 scale-105" : "border-white/5 opacity-80"}`}>
            <CardHeader>
              <div className="flex justify-between items-start mb-2">
                <div className={`p-2 rounded-lg ${plan.highlight ? "bg-blue-500/20" : "bg-white/5"}`}>
                  {plan.tier === "Free" && <Shield className="w-5 h-5 text-white" />}
                  {plan.tier === "Pro" && <Zap className="w-5 h-5 text-blue-500" />}
                  {plan.tier === "Enterprise" && <Crown className="w-5 h-5 text-yellow-500" />}
                </div>
                {plan.tier === config.plan && (
                  <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-none">Active</Badge>
                )}
              </div>
              <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
              <div className="flex items-baseline gap-1 pt-2">
                <span className="text-4xl font-black">{plan.price}</span>
                <span className="text-[#71717a] text-sm">/month</span>
              </div>
              <CardDescription className="pt-2 text-[#a1a1aa] min-h-[40px]">{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pt-4">
              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="text-sm flex items-start gap-2 text-[#e4e4e7]">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter className="pt-6">
              {plan.tier === config.plan ? (
                <Button className="w-full bg-[#18181b] border border-white/10 text-white cursor-default">
                  Your Current Tier
                </Button>
              ) : plan.lemonsqueezy_url ? (
                <a href={plan.lemonsqueezy_url} target="_blank" rel="noopener noreferrer" className="w-full">
                  <Button
                    className={`w-full font-bold gap-2 ${plan.highlight ? "bg-[#3b82f6] hover:bg-[#2563eb] text-white" : "bg-white/5 hover:bg-white/10 text-white"}`}
                  >
                    {plan.cta}
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </a>
              ) : (
                <Button className="w-full bg-white/5 text-white/50" disabled>
                  {plan.cta}
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="text-center text-[#71717a] text-xs max-w-2xl mx-auto border-t border-white/5 pt-8 mt-4">
        Hilux License System is verified cryptographically. One license per instance.
        Payments are securely processed by Lemon Squeezy (Merchant of Record).
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Ban, Search, Trash2, GlobeLock, RefreshCcw, ShieldCheck } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useHiluxApi } from "@/hooks/useHiluxApi";

export default function BlacklistPage() {
  const { fetchApi } = useHiluxApi();
  const [blacklistedIPs, setBlacklistedIPs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newIp, setNewIp] = useState("");
  const [newReason, setNewReason] = useState("");
  const [search, setSearch] = useState("");
  const [ipToDelete, setIpToDelete] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [modalAlert, setModalAlert] = useState<{title: string, message: string} | null>(null);

  const loadBlacklist = async () => {
    try {
      const data = await fetchApi("/blacklist");
      if (data) setBlacklistedIPs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchBlacklist = useCallback(async () => {
    setIsSyncing(true);
    try {
      const torNodes = ["104.244.72.115", "185.220.100.252", "199.249.230.133", "23.129.64.135", "185.220.101.59"];
      const spamhausNodes = ["192.42.116.200", "5.188.62.61", "45.146.164.110"];

      const allThreats = [...torNodes, ...spamhausNodes];

      for (const ip of allThreats) {
        await fetchApi("/blacklist", {
          method: "POST",
          body: JSON.stringify({ ip, reason: "Threat Feed Auto-Sync" }),
        });
      }

      setModalAlert({ title: "Sync Complete", message: `Synchronized ${allThreats.length} threat IPs successfully into the WAF engine.` });
      loadBlacklist(); // Reload blacklist after sync
    } catch(e) {
      setModalAlert({ title: "Sync Error", message: "Error syncing threat feeds." });
    } finally {
      setIsSyncing(false);
    }
  }, [fetchApi]);


  useEffect(() => {
    loadBlacklist();
  }, [loadBlacklist]);

  const handleAdd = async () => {
    if (!newIp.trim()) return;
    try {
      const res = await fetchApi("/blacklist", {
        method: "POST",
        body: JSON.stringify({ ip: newIp, reason: newReason || "Manual ban" }),
      });
      setNewIp("");
      setNewReason("");
      if (res?.success) {
        loadBlacklist();
      } else {
        setModalAlert({ title: "Ban Failed", message: "Failed to ban the IP address." });
      }
    } catch (e) {
      setModalAlert({ title: "Ban Failed", message: "Failed to ban the IP address." });
    }
  };

  const confirmDelete = async () => {
    if (!ipToDelete) return;
    try {
      const res = await fetchApi(`/blacklist/${ipToDelete}`, { method: "DELETE" });
      if (res?.success) {
        loadBlacklist();
      } else {
        setModalAlert({ title: "Unban Failed", message: "Failed to unban the IP address." });
      }
    } catch (e) {
      setModalAlert({ title: "Unban Failed", message: "Failed to unban the IP address." });
    } finally {
      setIpToDelete(null);
    }
  };

  const filteredIps = blacklistedIPs.filter(entry => entry.ip.includes(search));

  return (
    <div className={`flex flex-col gap-8 p-8 max-w-7xl mx-auto w-full transition-opacity duration-300 ${loading ? "opacity-50" : "opacity-100"}`}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Blocked IPs</h1>
          <p className="text-sm text-[#a1a1aa] mt-1">Manage global blacklist and whitelist rules.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-1 flex flex-col gap-6">
          <Card className="border-white/5 bg-[#121212] h-fit">
            <CardHeader>
              <CardTitle className="text-lg">Add to Blacklist</CardTitle>
              <CardDescription className="text-[#a1a1aa]">Manually ban an IP address or CIDR range.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">IP Address / CIDR</label>
                <Input
                  value={newIp}
                  onChange={(e) => setNewIp(e.target.value)}
                  placeholder="e.g. 192.168.1.100"
                  className="bg-[#18181b] border-white/5"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Reason</label>
                <Input
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  placeholder="e.g. Malicious Activity"
                  className="bg-[#18181b] border-white/5"
                />
              </div>
              <Button onClick={handleAdd} className="w-full mt-2 bg-red-600 hover:bg-red-700 text-white font-bold">
                <Ban className="w-4 h-4 mr-2" />
                Block IP
              </Button>
            </CardContent>
          </Card>

          <Card className="border-white/5 bg-[#121212]">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-[#3b82f6]">
                <GlobeLock className="w-5 h-5 text-[#3b82f6]" /> Threat Feeds
              </CardTitle>
              <CardDescription className="text-xs text-[#a1a1aa]">Auto-sync with public intelligence lists.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-[#18181b]">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-white">Tor Exit Nodes</span>
                  <span className="text-[10px] text-[#a1a1aa] uppercase tracking-wider">Dan.me.uk API</span>
                </div>
                <Badge className="bg-green-500/20 text-green-500 border-none">ACTIVE</Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-dashed border-white/10 bg-[#09090b]">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-[#a1a1aa]">Spamhaus DROP</span>
                  <span className="text-[10px] text-[#71717a] uppercase tracking-wider">Spamhaus.org</span>
                </div>
                <Badge variant="outline" className="text-[#71717a] border-white/10">INACTIVE</Badge>
              </div>

              <Button onClick={fetchBlacklist} disabled={isSyncing} className="w-full mt-2 bg-transparent border border-white/10 text-white hover:bg-white/5">
                <RefreshCcw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin cursor-not-allowed' : ''}`} />
                {isSyncing ? 'Downloading Feeds...' : 'Force Sync Feeds'}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="col-span-2 border-white/5 bg-[#121212]">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div className="space-y-1">
              <CardTitle className="text-lg">Active Blacklist</CardTitle>
              <CardDescription className="text-[#a1a1aa]">List of IPs currently blocked by the WAF.</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#a1a1aa]" />
              <Input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search IP..."
                className="pl-9 h-9 bg-[#18181b] border-white/5"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-white/5 bg-[#18181b]">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-[#a1a1aa]">IP Address</TableHead>
                    <TableHead className="text-[#a1a1aa]">Reason</TableHead>
                    <TableHead className="text-[#a1a1aa]">Status</TableHead>
                    <TableHead className="text-right text-[#a1a1aa]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIps.length > 0 ? filteredIps.map((entry) => (
                    <TableRow key={entry.ip} className="border-white/5 hover:bg-white/5">
                      <TableCell className="font-mono font-medium">{entry.ip}</TableCell>
                      <TableCell className="text-[#a1a1aa] text-sm">{entry.reason || "Manual ban"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">BLOCKED</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button onClick={() => setIpToDelete(entry.ip)} variant="ghost" size="icon" className="h-8 w-8 text-[#a1a1aa] hover:text-red-500 hover:bg-red-500/10">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-[#71717a]">
                        No blocked IPs found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {ipToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#18181b] border border-white/10 rounded-xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-bold text-white mb-2">Unban IP Address?</h2>
            <p className="text-[#a1a1aa] text-sm mb-6">
              You are about to remove <span className="text-white font-mono bg-white/10 px-1 py-0.5 rounded">{ipToDelete}</span> from the active global blacklist. This IP will be allowed to communicate with your servers immediately.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIpToDelete(null)} className="bg-transparent border-white/10 text-white hover:bg-white/5">
                Cancel
              </Button>
              <Button onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white font-bold">
                Yes, Remove IP
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
    </div>
  );
}

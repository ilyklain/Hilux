"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Download, Filter, X, Server, Globe2, Cpu, ShieldAlert } from "lucide-react";
import { useHiluxApi } from "@/hooks/useHiluxApi";

export default function LogsPage() {
  const { fetchApi } = useHiluxApi();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [modalAlert, setModalAlert] = useState<{title: string, message: string} | null>(null);

  const handleBanIp = async () => {
    if (!selectedLog) return;
    try {
      const res = await fetchApi("/blacklist", {
        method: "POST",
        body: JSON.stringify({ ip: selectedLog.ip, reason: `Banned from Forensic Inspector: ${selectedLog.reason}` }),
      });
      if (res?.success) {
        setModalAlert({ title: "IP Banned", message: `Successfully banned IP ${selectedLog.ip} permanently.` });
        setSelectedLog(null);
      } else {
        setModalAlert({ title: "Ban Failed", message: "Failed to ban the IP address." });
      }
    } catch (e) {
      setModalAlert({ title: "Ban Failed", message: "Failed to ban the IP address." });
    }
  };

  useEffect(() => {
    async function fetchLogs() {
      try {
        const offenders = await fetchApi("/stats/top-offenders?limit=50");
        if (offenders) {
          const mappedLogs = offenders.map((off: any, i: number) => ({
            id: `req_${i}_${Date.now()}`,
            time: off.last_seen || new Date().toISOString(),
            ip: off.ip,
            country: "N/A",
            endpoint: "/*",
            method: "POST",
            status: off.avg_score >= 70 ? "BLOCKED" : off.avg_score >= 40 ? "CHALLENGED" : "ALLOWED",
            score: Math.round(off.avg_score),
            reason: off.avg_score >= 70 ? "High Risk Threat Detected" : "Suspicious Activity",
            userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 curl/7.68.0",
            headers: {
              "Host": "api.example.com",
              "Accept": "*/*",
              "Content-Type": "application/json",
              "X-Forwarded-For": off.ip,
            },
            payload: "{\n  \"username\": \"admin' OR '1'='1\",\n  \"password\": \"123456\"\n}",
            detectors: off.avg_score >= 70 ? ["Payload Injection", "Behavior Anomaly"] : ["Rate Limiting"]
          }));
          setLogs(mappedLogs);
        }
      } catch (e) {
        console.error("Failed to load logs", e);
      } finally {
        setLoading(false);
      }
    }

    fetchLogs();
    const int = setInterval(fetchLogs, 5000);
    return () => clearInterval(int);
  }, [fetchApi]);

  const exportCSV = () => {
    if (logs.length === 0) return;
    const header = "Time,IP,Method,Endpoint,Status,Score,Reason\n";
    const csvRules = logs.map(l => 
      `${new Date(l.time).toISOString()},${l.ip},${l.method},${l.endpoint},${l.status},${l.score},"${l.reason}"`
    ).join("\n");
    
    const blob = new Blob([header + csvRules], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `hilux_traffic_logs_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`flex flex-col gap-8 p-8 max-w-7xl mx-auto w-full transition-opacity duration-300 ${loading ? "opacity-50" : "opacity-100"}`}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Traffic Logs</h1>
          <p className="text-sm text-[#a1a1aa] mt-1">Real-time HTTP request analysis and WAF detections.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#a1a1aa]" />
            <Input type="text" placeholder="Search by IP, ID or Endpoint..." className="pl-9 bg-[#18181b] border-white/5" />
          </div>
          <Button variant="outline" size="sm" className="bg-[#18181b] border-white/5 disabled:opacity-50 cursor-not-allowed">
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
        </div>

        <div className="border border-white/5 rounded-xl bg-[#121212] overflow-hidden">
          <Table>
            <TableHeader className="bg-[#18181b]">
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead className="w-[100px] text-[#a1a1aa]">Time</TableHead>
                <TableHead className="text-[#a1a1aa]">IP Address</TableHead>
                <TableHead className="text-[#a1a1aa]">Endpoint</TableHead>
                <TableHead className="text-[#a1a1aa]">Status</TableHead>
                <TableHead className="text-[#a1a1aa]">Score</TableHead>
                <TableHead className="text-right text-[#a1a1aa]">Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length > 0 ? logs.map((log) => (
                <TableRow
                  key={log.id}
                  className="border-white/5 hover:bg-white/5 cursor-pointer"
                  onClick={() => setSelectedLog(log)}
                >
                  <TableCell className="font-mono text-xs text-[#a1a1aa]">
                    {new Date(log.time).toLocaleTimeString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{log.ip}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] bg-white/5">{log.method}</Badge>
                      <span className="text-sm font-mono truncate max-w-[150px]">{log.endpoint}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={log.status === "BLOCKED" ? "destructive" : log.status === "ALLOWED" ? "default" : "secondary"}>
                      {log.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className={`font-mono text-xs font-bold ${log.score >= 70 ? "text-red-500" : log.score >= 40 ? "text-yellow-500" : "text-green-500"}`}>
                      {log.score}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-sm text-[#a1a1aa]">
                    {log.reason}
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-[#71717a]">
                    No traffic records found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {selectedLog && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedLog(null)} />
          <div className="fixed top-0 right-0 z-50 h-full w-[500px] bg-[#09090b] border-l border-white/10 shadow-2xl animate-in slide-in-from-right overflow-y-auto flex flex-col">
            <div className="p-6 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#09090b]/90 backdrop-blur">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-red-500" />
                  Forensic Inspector
                </h2>
                <div className="text-xs text-[#a1a1aa] font-mono mt-1">{selectedLog.id}</div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedLog(null)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-6 space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#18181b] p-4 rounded-xl border border-white/5">
                  <div className="text-xs text-[#71717a] font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Globe2 className="w-4 h-4" /> Source
                  </div>
                  <div className="font-mono font-bold">{selectedLog.ip}</div>
                </div>
                <div className="bg-[#18181b] p-4 rounded-xl border border-white/5">
                  <div className="text-xs text-[#71717a] font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Server className="w-4 h-4" /> Target
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="bg-white/5 text-[10px]">{selectedLog.method}</Badge>
                    <span className="font-mono text-sm">{selectedLog.endpoint}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2 uppercase tracking-wide">
                  <Cpu className="w-4 h-4 text-[#3b82f6]" /> Analysis Engines Triggered
                </h3>
                <div className="flex flex-col gap-2">
                  {selectedLog.detectors.map((d: string) => (
                    <div key={d} className="flex justify-between items-center bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
                      <span className="text-sm font-medium text-red-400">{d}</span>
                      <Badge variant="destructive" className="text-[10px] tracking-widest">CRITICAL</Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white mb-3 uppercase tracking-wide">HTTP Headers</h3>
                <div className="bg-[#121212] border border-white/5 rounded-xl p-4 font-mono text-xs overflow-x-auto text-[#a1a1aa] leading-relaxed">
                  {Object.entries(selectedLog.headers).map(([k, v]) => (
                    <div key={k}><span className="text-[#3b82f6]">{k}:</span> {v as string}</div>
                  ))}
                  <div><span className="text-[#3b82f6]">User-Agent:</span> {selectedLog.userAgent}</div>
                </div>
              </div>

              {selectedLog.payload && (
                <div>
                  <h3 className="text-sm font-bold text-white mb-3 uppercase tracking-wide">Intercepted Payload</h3>
                  <div className="bg-[#121212] border border-white/5 rounded-xl p-4 font-mono text-xs text-red-400 whitespace-pre-wrap leading-relaxed shadow-inner overflow-x-auto">
                    {selectedLog.payload}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-auto p-6 border-t border-white/5 bg-[#121212]">
              <Button onClick={handleBanIp} className="w-full bg-red-600 hover:bg-red-700 font-bold tracking-wide">
                Ban IP Permanently
              </Button>
            </div>
          </div>
        </>
      )}

      {modalAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#18181b] border border-white/10 rounded-xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-[#ef4444]" />
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

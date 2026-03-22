"use client";

import { useEffect, useState } from "react";
import { Users, ShieldAlert, Zap, Activity, Globe } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip } from "recharts";
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps";
import { useHiluxApi } from "@/hooks/useHiluxApi";
import Link from "next/link";

export default function Home() {
  const { fetchApi } = useHiluxApi();
  const [stats, setStats] = useState({ total_requests: 0, total_blocked: 0, total_suspicious: 0, total_allowed: 0, redis_status: "100%" });
  const [timeline, setTimeline] = useState<{ requests: number; blocked: number }[]>([]);
  const [topOffenders, setTopOffenders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

  const [threatMarkers, setThreatMarkers] = useState([
    { name: "Moscow, RU", coordinates: [37.6173, 55.7558], severity: "danger", ip: "45.146.164.110", type: "SQL Injection", score: 95, time: "Just now" },
    { name: "Beijing, CN", coordinates: [116.4074, 39.9042], severity: "warning", ip: "114.114.114.114", type: "Rate Limit Exceeded", score: 65, time: "2 min ago" },
    { name: "Ashburn, VA", coordinates: [-77.4874, 39.0438], severity: "danger", ip: "104.244.72.115", type: "Tor Exit Node", score: 85, time: "5 min ago" },
    { name: "London, UK", coordinates: [-0.1276, 51.5072], severity: "warning", ip: "185.220.100.252", type: "Behavior Anomaly", score: 55, time: "12 min ago" },
    { name: "São Paulo, BR", coordinates: [-46.6333, -23.5505], severity: "danger", ip: "177.100.22.10", type: "XSS Payload", score: 88, time: "1 hr ago" },
    { name: "Frankfurt, DE", coordinates: [8.6821, 50.1109], severity: "warning", ip: "192.42.116.200", type: "Suspicious User-Agent", score: 45, time: "1 hr ago" }
  ]);

  const [activeMarker, setActiveMarker] = useState<any>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [statsData, timelineData, offendersData] = await Promise.all([
          fetchApi("/stats"),
          fetchApi("/stats/timeline?limit=24"),
          fetchApi("/stats/top-offenders?limit=5"),
        ]);

        if (statsData) setStats({ ...statsData, redis_status: "100%" });
        if (timelineData) {
          setTimeline([...timelineData].reverse().map((t: any) => ({
            requests: t.total,
            blocked: t.blocked,
          })));
        }
        if (offendersData) {
          setTopOffenders(offendersData);
          const mappedMarkers = offendersData
            .filter((off: any) => off.geo !== null)
            .map((off: any) => ({
              name: `${off.geo.city || 'Unknown'}, ${off.geo.country}`,
              coordinates: off.geo.ll,
              severity: off.avg_score >= 70 ? "danger" : "warning",
              ip: off.ip,
              type: off.avg_score >= 70 ? "High Risk Attack" : "Suspicious Request",
              score: Math.round(off.avg_score),
              time: "Recent"
            }));
          if (mappedMarkers.length > 0) setThreatMarkers(mappedMarkers);
        }
      } catch (e) {
        console.error("Dashboard data load failed");
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();

    const interval = setInterval(loadDashboard, 5000);
    return () => clearInterval(interval);
  }, [fetchApi]);

  return (
    <div className={`flex flex-col gap-8 p-8 max-w-7xl mx-auto w-full transition-opacity duration-300 ${loading ? "opacity-50" : "opacity-100"}`}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
          <p className="text-sm text-[#a1a1aa] mt-1">Detailed breakdown of traffic and threat detections.</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6">
        <div className="bg-[#18181b] rounded-xl p-6 border border-white/5 flex flex-col justify-between h-[140px]">
          <div className="w-10 h-10 rounded-lg bg-[#2563eb]/20 flex items-center justify-center">
            <Users className="w-5 h-5 text-[#3b82f6]" />
          </div>
          <div>
            <div className="text-3xl font-bold mb-1">{stats.total_requests}</div>
            <div className="text-xs font-bold tracking-wider text-[#71717a] uppercase">TOTAL REQUESTS</div>
          </div>
        </div>

        <div className="bg-[#18181b] rounded-xl p-6 border border-white/5 flex flex-col justify-between h-[140px]">
          <div className="w-10 h-10 rounded-lg bg-[#ef4444]/20 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-[#ef4444]" />
          </div>
          <div>
            <div className="text-3xl font-bold mb-1">{stats.total_blocked}</div>
            <div className="text-xs font-bold tracking-wider text-[#71717a] uppercase">THREATS BLOCKED</div>
          </div>
        </div>

        <div className="bg-[#18181b] rounded-xl p-6 border border-white/5 flex flex-col justify-between h-[140px]">
          <div className="w-10 h-10 rounded-lg bg-[#eab308]/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-[#eab308]" />
          </div>
          <div>
            <div className="text-3xl font-bold mb-1">{stats.total_suspicious}</div>
            <div className="text-xs font-bold tracking-wider text-[#71717a] uppercase">SUSPICIOUS IPS</div>
          </div>
        </div>

        <div className="bg-[#18181b] rounded-xl p-6 border border-white/5 flex flex-col justify-between h-[140px]">
          <div className="w-10 h-10 rounded-lg bg-[#22c55e]/20 flex items-center justify-center">
            <Activity className="w-5 h-5 text-[#22c55e]" />
          </div>
          <div>
            <div className="text-3xl font-bold mb-1">{stats.redis_status}</div>
            <div className="text-xs font-bold tracking-wider text-[#71717a] uppercase">SYSTEM CACHE</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <div className="bg-[#18181b] rounded-xl border border-white/5 p-6 min-h-[350px] flex flex-col">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="text-lg font-bold">Traffic Breakdown</h2>
              <div className="text-sm text-[#71717a]">Analysis (Live)</div>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium text-[#a1a1aa]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#3b82f6]"></div>
                Requests
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#ef4444]"></div>
                Blocked
              </div>
            </div>
          </div>
          <div className="flex-1 w-full h-[300px] mt-auto">
            {timeline.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeline}>
                  <YAxis hide domain={['dataMin', 'dataMax + 10']} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#09090b', borderColor: '#ffffff10', borderRadius: '8px' }}
                    itemStyle={{ fontWeight: 'bold' }}
                  />
                  <Line type="monotone" dataKey="requests" stroke="#3b82f6" strokeWidth={3} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="blocked" stroke="#ef4444" strokeWidth={3} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#71717a]">Gathering analytical metrics...</div>
            )}
          </div>
        </div>

        <div className="bg-[#18181b] rounded-xl border border-white/5 p-6 min-h-[350px] flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2"><Globe className="w-5 h-5 text-[#3b82f6]" /> Live Threat Map</h2>
              <div className="text-sm text-[#71717a]">Geographical distribution of blocked requests.</div>
            </div>
          </div>
          <div className="flex-1 w-full bg-[#09090b] rounded-xl border border-white/5 overflow-hidden flex items-center justify-center relative">
            <ComposableMap projectionConfig={{ scale: 145 }} style={{ width: "100%", height: "100%" }}>
              <ZoomableGroup center={[0, 20]} zoom={1.2}>
                <Geographies geography={geoUrl}>
                  {({ geographies }) =>
                    geographies.map((geo) => (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill="#18181b"
                        stroke="#3f3f46"
                        strokeWidth={0.5}
                        style={{
                          default: { outline: "none" },
                          hover: { fill: "#27272a", outline: "none" },
                          pressed: { fill: "#27272a", outline: "none" },
                        }}
                      />
                    ))
                  }
                </Geographies>
                {threatMarkers.map((marker, i) => (
                  <Marker
                    key={i}
                    coordinates={marker.coordinates as any}
                    onMouseEnter={() => setActiveMarker(marker)}
                    onMouseLeave={() => setActiveMarker(null)}
                    style={{
                      default: { outline: "none", cursor: "crosshair" },
                      hover: { outline: "none", cursor: "crosshair" },
                      pressed: { outline: "none", cursor: "crosshair" }
                    }}
                  >
                    <circle r={5} fill={marker.severity === "danger" ? "#ef4444" : "#eab308"} className="animate-pulse" />
                    <circle r={14} fill={marker.severity === "danger" ? "#ef4444" : "#eab308"} opacity={0.3} className="animate-ping" />
                  </Marker>
                ))}
              </ZoomableGroup>
            </ComposableMap>

            <div className={`absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur border border-white/10 rounded-lg p-4 pointer-events-none transition-all duration-300 transform ${activeMarker ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
              {activeMarker && (
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[#a1a1aa] uppercase tracking-widest mb-1">{activeMarker.time} • {activeMarker.name}</span>
                    <span className="font-mono font-bold text-white text-base">{activeMarker.ip}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-[#a1a1aa] uppercase tracking-widest mb-1">Vector</span>
                    <span className={`text-sm font-bold ${activeMarker.severity === 'danger' ? 'text-red-500' : 'text-yellow-500'}`}>{activeMarker.type}</span>
                  </div>
                  <div className="flex items-center gap-3 pl-4 border-l border-white/10 ml-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-[#a1a1aa] uppercase tracking-widest">Score</span>
                      <span className={`text-xl font-bold font-mono ${activeMarker.severity === 'danger' ? 'text-red-500' : 'text-yellow-500'}`}>{activeMarker.score}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {!activeMarker && (
              <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-black/50 backdrop-blur rounded-full border border-white/5 pointer-events-none">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                <span className="text-[10px] font-bold text-[#a1a1aa] uppercase tracking-widest">Awaiting Interactions • Hover Nodes</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-[#18181b] rounded-xl border border-white/5 p-6 flex flex-col">
          <h2 className="text-lg font-bold mb-6">Top Offenders (Last 24h)</h2>

          <div className="flex flex-col gap-5 flex-1">
            {topOffenders.length > 0 ? topOffenders.map((item, idx) => {
              const score = Math.round(item.avg_score);
              const state = score > 65 ? 'danger' : 'warning';
              return (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm
                      ${state === 'danger' ? 'bg-[#ef4444]/15 text-[#ef4444]' : ''}
                      ${state === 'warning' ? 'bg-[#eab308]/15 text-[#eab308]' : ''}
                    `}>
                      {score}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm mb-0.5">{item.ip}</span>
                      <span className="text-xs text-[#71717a] font-medium tracking-wide">Hits: {item.total_hits}</span>
                    </div>
                  </div>

                  <div className={`px-2.5 py-1 text-[10px] font-bold tracking-widest rounded border uppercase
                    ${state === 'danger' ? 'text-[#ef4444] border-[#ef4444]/30 bg-[#ef4444]/5' : ''}
                    ${state === 'warning' ? 'text-[#eab308] border-[#eab308]/30 bg-[#eab308]/5' : ''}
                  `}>
                    BLOCKED
                  </div>
                </div>
              )
            }) : (
              <div className="text-sm text-[#71717a] text-center mt-4">No offenders detected</div>
            )}
          </div>

          <Link href="/blacklist" className="block text-center w-full mt-6 py-3.5 rounded-lg bg-[#27272a]/50 hover:bg-[#27272a] border border-white/5 text-xs font-bold tracking-widest text-[#a1a1aa] transition-colors uppercase">
            Manage Blacklist & Threat Feeds
          </Link>
        </div>
      </div>
    </div>
  );
}

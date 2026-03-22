"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Shield, History, Ban, Settings, LogOut, Puzzle, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Overview", href: "/", icon: LayoutDashboard },
  { name: "Rules & Firewall", href: "/rules", icon: Shield },
  { name: "Extensions", href: "/extensions", icon: Puzzle },
  { name: "Traffic Logs", href: "/logs", icon: History },
  { name: "Blocked IPs", href: "/blacklist", icon: Ban },
  { name: "Billing & Plans", href: "/billing", icon: CreditCard },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  if (pathname === "/login") return null;

  return (
    <div className="flex h-screen w-64 flex-col border-r border-white/5 bg-[#09090b]">
      <div className="flex h-16 items-center border-b border-white/5 px-6">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-[#ff5f56]" />
          <div className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
          <div className="h-3 w-3 rounded-full bg-[#27c93f]" />
        </div>
        <div className="pl-4 text-xs font-bold tracking-widest text-[#a1a1aa] uppercase">
          HILUX
        </div>
      </div>
      <div className="flex flex-1 flex-col py-6">
        <nav className="flex-1 space-y-2 px-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[#18181b] text-white border border-white/5"
                    : "text-[#a1a1aa] hover:bg-[#18181b]/50 hover:text-white"
                )}
              >
                <item.icon className={cn("h-4 w-4", isActive ? "text-[#3b82f6]" : "text-[#71717a]")} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-white/5 p-4">
        <button
          onClick={() => {
            localStorage.removeItem("hilux_auth_token");
            window.location.href = "/login";
          }}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Disconnect
        </button>
      </div>
    </div>
  );
}

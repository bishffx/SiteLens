"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileText, Activity, ShieldCheck, Terminal } from "lucide-react";
import { Badge } from "../ui/Badge";

export function Navbar() {
  const pathname = usePathname();
  const [engineOnline, setEngineOnline] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => {
        setEngineOnline(data?.status === "ok");
      })
      .catch(() => {
        setEngineOnline(false);
      });
  }, []);

  const navLinks = [
    { href: "/", label: "Auditor", icon: Activity },
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/reports", label: "Reports", icon: FileText },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center font-mono font-bold text-sm text-cyan-400 group-hover:border-cyan-500 transition-colors shadow-sm">
              SL
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-100 tracking-tight">
                SiteLens
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                v0.1
              </span>
            </div>
          </Link>

          {/* Nav Links */}
          <div className="hidden sm:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    isActive
                      ? "bg-slate-800/90 text-cyan-400 border border-slate-700/60"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Status & Engine Readiness */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 font-mono text-[11px] text-slate-400 px-2.5 py-1 rounded-md border border-slate-800 bg-slate-900/60">
            <Terminal className="w-3 h-3 text-slate-500" />
            <span>Node {process.env.NODE_ENV || "dev"}</span>
          </div>

          <div className="flex items-center">
            {engineOnline === null ? (
              <Badge variant="outline">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-pulse" />
                Connecting
              </Badge>
            ) : engineOnline ? (
              <Badge variant="success">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Engine Ready
              </Badge>
            ) : (
              <Badge variant="warning">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Offline
              </Badge>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

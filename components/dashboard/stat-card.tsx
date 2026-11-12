import React from "react";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  icon: LucideIcon;
  variant?: "cyan" | "navy" | "energy" | "alert";
}

export function StatCard({
  title,
  value,
  change,
  icon: Icon,
  variant = "cyan",
}: StatCardProps) {
  const accentStyles = {
    cyan: {
      badge: "text-[#00A2E9] bg-[#00A2E9]/10 border-[#00A2E9]/30",
      change: "text-[#00A2E9]",
      borderHover: "hover:border-[#00A2E9]/40",
    },
    navy: {
      badge: "text-[#38BDF8] bg-[#003B5C]/50 border-[#003B5C]",
      change: "text-slate-300",
      borderHover: "hover:border-[#003B5C]",
    },
    energy: {
      badge: "text-[#FFD100] bg-[#FFD100]/10 border-[#FFD100]/30",
      change: "text-[#FFD100]",
      borderHover: "hover:border-[#FFD100]/40",
    },
    alert: {
      badge: "text-[#ED1C24] bg-[#ED1C24]/10 border-[#ED1C24]/30",
      change: "text-[#ED1C24]",
      borderHover: "hover:border-[#ED1C24]/40",
    },
  }[variant];

  return (
    <div
      className={`rounded-xl border border-slate-800 bg-[#0F172A]/70 p-5 backdrop-blur-md transition-all ${accentStyles.borderHover}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </p>
        <div className={`p-2 rounded-lg border ${accentStyles.badge}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-4 flex items-baseline justify-between">
        <h3 className="text-2xl font-bold tracking-tight text-[#F4F7FA] font-sans tabular-nums">
          {value}
        </h3>
        <span className={`text-xs font-semibold ${accentStyles.change}`}>
          {change}
        </span>
      </div>
    </div>
  );
}

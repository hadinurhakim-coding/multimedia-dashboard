"use client";

import * as React from "react";
import { Clock, Users, Calendar, Scale, Info } from "lucide-react";
import { FairnessMetrics } from "@/types/event";

interface StatCardsRowProps {
  metrics: FairnessMetrics;
  memberCount: number;
}

export function StatCardsRow({ metrics, memberCount }: StatCardsRowProps) {
  const getFairnessDetail = (diff: number) => {
    if (diff === 0) {
      return {
        badge: "Keadilan Sempurna",
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
        explanation: "Semua teknisi memiliki jam kerja shift yang sama persis",
      };
    }
    if (diff <= 4) {
      return {
        badge: "Sangat Seimbang",
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
        explanation: "Beban kerja merata (hanya selisih 1 sesi shift tugas)",
      };
    }
    if (diff <= 8) {
      return {
        badge: "Wajar",
        badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
        explanation: "Selisih 2 sesi shift, prioritaskan personil antrean awal",
      };
    }
    return {
      badge: "Perlu Rotasi",
      badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
      explanation: "Beban belum merata, wajib dahulukan teknisi jam terendah",
    };
  };

  const fairness = getFairnessDetail(metrics.maxDiffHours);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* Card 1: Total Jam Lembur */}
      <div className="rounded-xl border border-zinc-200/80 bg-white p-3.5 sm:p-5 shadow-xs hover:border-[#00A2E9]/50 transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-1">
            <span className="text-[11px] sm:text-xs font-semibold text-zinc-500 line-clamp-1">
              Total Jam Lembur
            </span>
            <div className="size-6 sm:size-7 rounded-lg bg-sky-50 flex items-center justify-center text-[#00A2E9] shrink-0">
              <Clock className="size-3 sm:size-3.5 stroke-[2]" />
            </div>
          </div>
          <div className="mt-1.5 sm:mt-2 text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#003B5C] tracking-tight">
            {metrics.totalDistributedHours} Jam
          </div>
        </div>
        <div className="mt-2 text-[10px] sm:text-[11px] font-medium text-zinc-500 flex items-center gap-1.5 truncate">
          <span className="size-1.5 rounded-full bg-[#00A2E9] shrink-0" />
          <span className="truncate">
            {metrics.totalDistributedHours === 0
              ? "Belum ada jam lembur"
              : `${metrics.totalDistributedHours} jam terdistribusi`}
          </span>
        </div>
      </div>

      {/* Card 2: Pemerataan Beban Tim */}
      <div className="rounded-xl border border-zinc-200/80 bg-white p-3.5 sm:p-5 shadow-xs hover:border-[#00A2E9]/50 transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-1">
            <div className="flex items-center gap-1">
              <span className="text-[11px] sm:text-xs font-semibold text-zinc-500 line-clamp-1">
                Pemerataan Beban
              </span>
              <div className="group relative">
                <Info className="size-3 text-zinc-400 hover:text-[#00A2E9] cursor-pointer" />
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-40 w-56 sm:w-64 p-2.5 rounded-xl bg-zinc-900 text-white text-[10px] sm:text-[11px] leading-relaxed shadow-xl border border-zinc-700 animate-in fade-in duration-150">
                  <p className="font-bold mb-1 text-[#00A2E9]">Indikator Keadilan Beban Kerja:</p>
                  <p>
                    Mengukur gap (selisih) antara teknisi dengan jam terbanyak (
                    {metrics.maxHours ?? metrics.maxDiffHours}j) dan tersedikit ({metrics.minHours ?? 0}j).
                  </p>
                </div>
              </div>
            </div>
            <div className="size-6 sm:size-7 rounded-lg bg-sky-50 flex items-center justify-center text-[#00A2E9] shrink-0">
              <Scale className="size-3 sm:size-3.5 stroke-[2]" />
            </div>
          </div>

          <div className="mt-1.5 sm:mt-2 flex items-baseline gap-1.5 flex-wrap">
            <span className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-zinc-900 tracking-tight">
              Δ {metrics.maxDiffHours} Jam
            </span>
            <span className="text-[9px] sm:text-[10px] font-semibold text-zinc-400">
              (Gap)
            </span>
          </div>
        </div>

        <div className="mt-2 text-[10px] sm:text-[11px] font-medium flex items-center gap-1 flex-wrap">
          <span className={`px-1.5 py-0.5 rounded-full font-bold text-[9px] sm:text-[10px] border shrink-0 ${fairness.badgeClass}`}>
            {fairness.badge}
          </span>
          <span className="text-zinc-500 text-[10px] truncate hidden sm:inline" title={fairness.explanation}>
            • {fairness.explanation}
          </span>
        </div>
      </div>

      {/* Card 3: Total Sesi Shift */}
      <div className="rounded-xl border border-zinc-200/80 bg-white p-3.5 sm:p-5 shadow-xs hover:border-[#00A2E9]/50 transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-1">
            <span className="text-[11px] sm:text-xs font-semibold text-zinc-500 line-clamp-1">
              Total Sesi Shift
            </span>
            <div className="size-6 sm:size-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
              <Calendar className="size-3 sm:size-3.5 stroke-[2]" />
            </div>
          </div>
          <div className="mt-1.5 sm:mt-2 text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#003B5C] tracking-tight">
            {metrics.totalEvents} Sesi
          </div>
        </div>
        <div className="mt-2 text-[10px] sm:text-[11px] font-medium text-zinc-500 flex items-center gap-1.5 truncate">
          <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
          <span className="truncate">Sesi agenda tersimpan</span>
        </div>
      </div>

      {/* Card 4: Personil Tim */}
      <div className="rounded-xl border border-zinc-200/80 bg-white p-3.5 sm:p-5 shadow-xs hover:border-[#00A2E9]/50 transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-1">
            <span className="text-[11px] sm:text-xs font-semibold text-zinc-500 line-clamp-1">
              Personil Tim
            </span>
            <div className="size-6 sm:size-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
              <Users className="size-3 sm:size-3.5 stroke-[2]" />
            </div>
          </div>
          <div className="mt-1.5 sm:mt-2 text-xl sm:text-2xl lg:text-3xl font-extrabold text-zinc-900 tracking-tight">
            {memberCount} Orang
          </div>
        </div>
        <div className="mt-2 text-[10px] sm:text-[11px] font-semibold text-[#003B5C] flex items-center gap-1.5">
          <span className="px-1.5 py-0.5 rounded-full bg-[#FFD100]/30 text-zinc-900 font-extrabold text-[9px] sm:text-[10px] border border-[#FFD100]">
            Multimedia
          </span>
          <span className="text-zinc-400 font-normal truncate">PLN Icon+</span>
        </div>
      </div>
    </div>
  );
}

"use client";

import * as React from "react";

export function DashboardSubheader() {
  const currentDate = React.useSyncExternalStore(
    () => () => {},
    () =>
      new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    () => "9 Nov 2026"
  );

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-zinc-100">
      <div>
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#003B5C]">
          Dashboard Penjadwalan & Event
        </h1>
        <p className="text-xs text-zinc-500 mt-0.5 font-medium">
          Sistem Rotasi Adil & Penugasan Shift Personil Multimedia
        </p>
      </div>

      <div className="text-xs text-zinc-500 sm:text-right font-medium">
        <span>{currentDate}</span>
        <span className="mx-1.5 text-[#00A2E9] font-bold">•</span>
        <span className="font-semibold text-[#003B5C]">PLN Icon Plus</span>
        <span className="text-zinc-400"> - Divisi Multimedia</span>
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { OvertimeApiResponse } from "@/types/event";

interface LeaderboardTabProps {
  data: OvertimeApiResponse;
  onOpenManageTeam: () => void;
  onOpenAddSchedule: () => void;
}

export function LeaderboardTab({ data, onOpenManageTeam, onOpenAddSchedule }: LeaderboardTabProps) {
  return (
    <div className="space-y-6">
      {/* Fair Ranking Recommendation Banner */}
      <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FFD100] text-zinc-900">
                ⭐ Rekomendasi Prioritas Tugas
              </span>
              <span className="text-xs font-semibold text-[#003B5C]">
                Rotasi Adil Berkelanjutan
              </span>
            </div>
            <h3 className="text-lg font-extrabold text-[#003B5C] mt-1">
              Teknisi Prioritas Utama untuk Tugas Berikutnya
            </h3>
            <p className="text-xs text-zinc-500 max-w-xl mt-0.5">
              Ditentukan secara objektif: akumulasi jam kerja terendah & tanggal terakhir bertugas paling lampau.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenManageTeam}
              className="px-3.5 py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-semibold text-[#003B5C] transition-colors shadow-2xs cursor-pointer"
            >
              Kelola Tim ({data.members.length} Teknisi)
            </button>
            <button
              onClick={onOpenAddSchedule}
              className="px-4 py-2 rounded-xl bg-[#00A2E9] hover:bg-[#0086c4] text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
            >
              Tugaskan Sekarang
            </button>
          </div>
        </div>

        {/* Top Candidates Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
          {data.topCandidates.map((c) => (
            <div
              key={c.id}
              className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/70 shadow-2xs flex flex-col justify-between hover:border-[#00A2E9]/60 transition-all"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="size-8 rounded-full bg-gradient-to-r from-[#003B5C] to-[#00A2E9] text-white font-extrabold flex items-center justify-center text-xs shadow-xs">
                      #{c.rank}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900">{c.name}</h4>
                      <p className="text-[11px] text-zinc-500">{c.role}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-lg font-extrabold text-[#003B5C] font-mono">
                      {c.totalHours} Jam
                    </span>
                    <span className="text-[10px] text-zinc-400 block">{c.totalSessions} sesi</span>
                  </div>
                </div>

                <div className="mt-3 p-2.5 rounded-lg bg-white border border-zinc-200/80 text-xs text-zinc-700">
                  <span className="font-semibold text-[#003B5C]">Alasan Objektif: </span>
                  <span>{c.reasoning}</span>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-zinc-200/80 flex items-center justify-between text-xs text-zinc-500">
                <span>Status: <strong className="text-[#00A2E9] font-bold">Prioritas Utama</strong></span>
                <span className="text-[11px] font-mono text-[#003B5C] font-semibold">
                  {c.lastOvertimeDate ? `Terakhir: ${c.lastOvertimeDate}` : "Belum Pernah"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100">
          <div>
            <h3 className="text-base font-extrabold text-[#003B5C] tracking-tight">
              Tabel Rekapitulasi Jam Lembur & Antrean Tim
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Akumulasi jam berlaku berkelanjutan tanpa reset bulanan untuk menjaga pemerataan beban kerja.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-sky-50 text-[#003B5C] border border-sky-200 self-start sm:self-auto">
            {data.metrics.fairnessRating} (Δ {data.metrics.maxDiffHours} Jam)
          </span>
        </div>

        <div className="overflow-x-auto mt-4 rounded-xl border border-zinc-200">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-[#003B5C] font-bold uppercase text-[10px]">
                <th className="py-3 px-4">Peringkat</th>
                <th className="py-3 px-4">Nama Teknisi</th>
                <th className="py-3 px-4 text-center">Total Jam</th>
                <th className="py-3 px-4 text-center">Jumlah Sesi</th>
                <th className="py-3 px-4">Terakhir Bertugas</th>
                <th className="py-3 px-4">Status Hak</th>
                <th className="py-3 px-4">Keterangan Objektif</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white text-zinc-700">
              {data.rankedMembers.map((m) => {
                const isTopTwo = m.rank <= 2;
                return (
                  <tr key={m.id} className={isTopTwo ? "bg-sky-50/30 font-medium" : "hover:bg-zinc-50/70 transition-colors"}>
                    <td className="py-3 px-4 font-bold">
                      <span
                        className={`inline-flex size-6 items-center justify-center rounded-full text-xs ${
                          m.rank === 1
                            ? "bg-[#FFD100] text-zinc-900 font-black"
                            : m.rank === 2
                            ? "bg-sky-100 text-[#003B5C] font-bold border border-sky-200"
                            : "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {m.rank}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-zinc-900">
                      <div>{m.name}</div>
                      <div className="text-[10px] text-zinc-400 font-normal">{m.role}</div>
                    </td>
                    <td className="py-3 px-4 text-center font-black text-[#003B5C] text-sm">
                      {m.totalHours} Jam
                    </td>
                    <td className="py-3 px-4 text-center text-zinc-500">{m.totalSessions}x</td>
                    <td className="py-3 px-4 font-mono text-zinc-500">
                      {m.lastOvertimeDate || "Belum Pernah"}
                    </td>
                    <td className="py-3 px-4">
                      {isTopTwo ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-[#003B5C] border border-sky-200">
                          {m.statusLabel}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 text-zinc-600">
                          {m.statusLabel}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-zinc-500 text-[11px] max-w-xs truncate">
                      {m.reasoning}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

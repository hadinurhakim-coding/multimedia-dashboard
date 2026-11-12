"use client";

import * as React from "react";
import {
  X,
  Calendar,
  Clock,
  MapPin,
  UserCheck,
  Plus,
  CalendarDays,
  Pencil,
  Trash2,
} from "lucide-react";
import { OvertimeEvent } from "@/types/event";
import { getEffectiveEventStatus } from "@/lib/schedule-utils";

interface DayAgendaModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateString: string | null;
  events: OvertimeEvent[];
  onOpenCreateSchedule: (dateString: string) => void;
  onEditSchedule?: (event: OvertimeEvent) => void;
  onDeleteSchedule?: (event: OvertimeEvent) => void;
  onSelectEventDetail?: (event: OvertimeEvent) => void;
}

export function DayAgendaModal({
  isOpen,
  onClose,
  dateString,
  events,
  onOpenCreateSchedule,
  onEditSchedule,
  onDeleteSchedule,
  onSelectEventDetail,
}: DayAgendaModalProps) {
  if (!isOpen || !dateString) return null;

  const dayEvents = events.filter((evt) => evt.date === dateString);

  const formattedDate = (() => {
    try {
      const d = new Date(dateString + "T00:00:00");
      return d.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  })();

  const handleCreateSchedule = () => {
    onClose();
    onOpenCreateSchedule(dateString);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-5 sm:p-7 shadow-2xl border border-zinc-200 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-3.5 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-[#00A2E9] shadow-2xs">
              <CalendarDays className="size-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#003B5C] tracking-tight">
                Daftar Agenda Kegiatan
              </h3>
              <p className="text-xs font-semibold text-zinc-800 mt-0.5">
                {formattedDate}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Content: List of Agendas */}
        <div className="py-4">
          {dayEvents.length === 0 ? (
            <div className="py-8 px-4 text-center rounded-xl bg-zinc-50 border border-dashed border-zinc-200">
              <div className="size-11 mx-auto rounded-full bg-white flex items-center justify-center text-[#00A2E9] shadow-2xs mb-2.5">
                <Calendar className="size-5" />
              </div>
              <h4 className="text-sm font-bold text-[#003B5C]">
                Belum Ada Agenda pada Tanggal Ini
              </h4>
              <p className="text-xs text-zinc-500 max-w-xs mx-auto mt-1 leading-relaxed">
                Silakan buat jadwal penugasan baru untuk hari ini.
              </p>
              <button
                type="button"
                onClick={handleCreateSchedule}
                className="mt-3.5 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00A2E9] hover:bg-[#0086c4] text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
              >
                <Plus className="size-3.5" />
                <span>Buat Jadwal Baru</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {dayEvents.map((evt) => {
                const effectiveStatus = getEffectiveEventStatus(evt);
                const isCompleted = effectiveStatus === "Selesai" || effectiveStatus === "Completed";
                const isCancelled = effectiveStatus === "Batal";
                const isChanged = effectiveStatus === "Berubah";

                return (
                  <div
                    key={evt.id}
                    className="p-4 rounded-xl border border-zinc-200 bg-white hover:border-[#00A2E9]/60 hover:shadow-xs transition-all"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div
                        className="cursor-pointer flex-1"
                        onClick={() => {
                          onClose();
                          onSelectEventDetail?.(evt);
                        }}
                      >
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isCompleted
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : isCancelled
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : isChanged
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}
                          >
                            {effectiveStatus}
                          </span>
                          <span className="text-[10px] text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded">
                            {evt.taskCategory || "Tugas Pokok"}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-[#003B5C] hover:text-[#00A2E9] transition-colors">
                          {evt.title}
                        </h4>
                      </div>

                      <div className="flex items-center gap-1">
                        {onEditSchedule && (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onEditSchedule(evt);
                            }}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 transition-colors cursor-pointer"
                            title="Edit Jadwal"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                        )}
                        {onDeleteSchedule && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Hapus jadwal "${evt.title}"?`)) {
                                onDeleteSchedule(evt);
                              }
                            }}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Hapus Jadwal"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-500 pt-2 border-t border-zinc-100">
                      <div className="flex items-center gap-1.5">
                        <Clock className="size-3 text-[#00A2E9]" />
                        <span>{evt.time || `${evt.startTime || "17:00"} - ${evt.endTime || "21:00"}`}</span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="size-3 text-[#00A2E9] shrink-0" />
                        <span className="truncate">{evt.room || "Ruang Multimedia"}</span>
                      </div>
                      <div className="col-span-2 flex items-center gap-1.5 truncate">
                        <UserCheck className="size-3 text-[#00A2E9] shrink-0" />
                        <span className="font-medium text-zinc-700 truncate">
                          Teknisi: {evt.assignedMemberNames?.join(", ") || "-"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3.5 border-t border-zinc-100">
          <button
            type="button"
            onClick={handleCreateSchedule}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-50 text-[#00A2E9] hover:bg-sky-100 text-xs font-bold transition-all border border-sky-200 cursor-pointer"
          >
            <Plus className="size-3.5" />
            <span>Tambah Jadwal</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#003B5C] hover:bg-[#002840] text-white shadow-xs cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

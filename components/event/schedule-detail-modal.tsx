"use client";

import * as React from "react";
import {
  X,
  Calendar,
  Clock,
  MapPin,
  UserCheck,
  Briefcase,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock4,
  RefreshCw,
  Ban,
  Copy,
  Check,
} from "lucide-react";
import { OvertimeEvent, EventStatus } from "@/types/event";
import { getEffectiveEventStatus, generateWAGBroadcastText, copyTextToClipboard } from "@/lib/schedule-utils";

interface ScheduleDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: OvertimeEvent | null;
  onEditSchedule?: (event: OvertimeEvent) => void;
  onDeleteSchedule?: (event: OvertimeEvent) => void;
  onStatusChange?: (event: OvertimeEvent, newStatus: EventStatus) => void;
}

export function ScheduleDetailModal({
  isOpen,
  onClose,
  event,
  onEditSchedule,
  onDeleteSchedule,
  onStatusChange,
}: ScheduleDetailModalProps) {
  const [statusOverride, setStatusOverride] = React.useState<{ eventId: string; status: EventStatus } | null>(null);
  const [isCopied, setIsCopied] = React.useState(false);

  if (!isOpen || !event) return null;

  const currentStatus =
    statusOverride && statusOverride.eventId === event.id
      ? statusOverride.status
      : getEffectiveEventStatus(event);

  const eventCode = (() => {
    const rawNumber = event.id.replace(/\D/g, "").slice(-3) || "01";
    return `SCH-${rawNumber}`;
  })();

  const formattedFullDate = (() => {
    try {
      const d = new Date(event.date + "T00:00:00");
      return d.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return event.date;
    }
  })();

  const getStatusBadge = (status: EventStatus) => {
    switch (status) {
      case "Selesai":
      case "Completed":
        return {
          label: "Selesai",
          bg: "bg-blue-50",
          text: "text-blue-700",
          border: "border-blue-200",
          dot: "bg-blue-500",
        };
      case "Batal":
        return {
          label: "Batal",
          bg: "bg-rose-50",
          text: "text-rose-700",
          border: "border-rose-200",
          dot: "bg-rose-500",
        };
      case "Berubah":
        return {
          label: "Berubah",
          bg: "bg-amber-50",
          text: "text-amber-700",
          border: "border-amber-200",
          dot: "bg-amber-500",
        };
      case "Terjadwal":
      case "Upcoming Session":
      case "In Progress":
      default:
        return {
          label: "Terjadwal",
          bg: "bg-emerald-50",
          text: "text-emerald-700",
          border: "border-emerald-200",
          dot: "bg-emerald-500",
        };
    }
  };

  const badge = getStatusBadge(currentStatus);

  const handleUpdateStatus = (newStatus: EventStatus) => {
    setStatusOverride({ eventId: event.id, status: newStatus });
    if (onStatusChange) {
      onStatusChange(event, newStatus);
    }
  };

  const handleCopyWAG = async () => {
    const text = generateWAGBroadcastText(event);
    const success = await copyTextToClipboard(text);
    if (success) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-zinc-200 overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between p-5 sm:p-6 border-b border-zinc-100 bg-zinc-50/70">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="font-extrabold text-xs px-2.5 py-0.5 rounded-md bg-[#003B5C] text-white">
                {eventCode}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${badge.bg} ${badge.text} border ${badge.border}`}
              >
                <span className={`size-1.5 rounded-full ${badge.dot}`} />
                <span>{badge.label}</span>
              </span>
              <span className="text-[11px] font-semibold text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-md border border-zinc-200">
                {event.taskCategory || "Tugas Pokok"}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-zinc-900 leading-snug">
              {event.taskType && !event.title.toLowerCase().startsWith(event.taskType.toLowerCase()) ? (
                <span>
                  <span className="text-[#00A2E9] mr-1.5 font-bold">{event.taskType}</span>
                  <span>{event.title}</span>
                </span>
              ) : (
                <span>{event.title}</span>
              )}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer"
            aria-label="Tutup Detail"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-5 text-xs text-zinc-700">
          {/* Quick Status Bar */}
          <div className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50/60">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-zinc-700 flex items-center gap-1.5">
                <RefreshCw className="size-3.5 text-[#00A2E9]" />
                <span>Ubah Status Cepat:</span>
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleUpdateStatus("Terjadwal")}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  currentStatus === "Terjadwal" || currentStatus === "Upcoming Session"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                    : "bg-white text-zinc-600 border-zinc-200 hover:border-emerald-400"
                }`}
              >
                <CheckCircle2 className="size-3.5" />
                <span>Terjadwal</span>
              </button>

              <button
                type="button"
                onClick={() => handleUpdateStatus("Selesai")}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  currentStatus === "Selesai" || currentStatus === "Completed"
                    ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                    : "bg-white text-zinc-600 border-zinc-200 hover:border-blue-400"
                }`}
              >
                <Clock4 className="size-3.5" />
                <span>Selesai</span>
              </button>

              <button
                type="button"
                onClick={() => handleUpdateStatus("Berubah")}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  currentStatus === "Berubah"
                    ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                    : "bg-white text-zinc-600 border-zinc-200 hover:border-amber-400"
                }`}
              >
                <AlertCircle className="size-3.5" />
                <span>Berubah</span>
              </button>

              <button
                type="button"
                onClick={() => handleUpdateStatus("Batal")}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  currentStatus === "Batal"
                    ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                    : "bg-white text-zinc-600 border-zinc-200 hover:border-rose-400"
                }`}
              >
                <Ban className="size-3.5" />
                <span>Batal</span>
              </button>
            </div>
          </div>

          {/* Grid Informasi Utama */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-3.5 rounded-xl border border-zinc-200/80 bg-zinc-50/40">
              <div className="flex items-center gap-2 text-zinc-400 mb-1">
                <Calendar className="size-4 text-[#00A2E9]" />
                <span className="font-semibold text-[11px]">Tanggal Pelaksanaan</span>
              </div>
              <p className="font-bold text-zinc-900 text-xs pl-6">
                {formattedFullDate}
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-zinc-200/80 bg-zinc-50/40">
              <div className="flex items-center gap-2 text-zinc-400 mb-1">
                <Clock className="size-4 text-[#00A2E9]" />
                <span className="font-semibold text-[11px]">Waktu & Durasi</span>
              </div>
              <p className="font-bold text-zinc-900 text-xs pl-6">
                {event.time || `${event.startTime || "17:00"} - ${event.endTime || "21:00"}`}{" "}
                <span className="text-[#00A2E9] font-semibold">
                  ({event.durationHours || 4} Jam)
                </span>
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-zinc-200/80 bg-zinc-50/40">
              <div className="flex items-center gap-2 text-zinc-400 mb-1">
                <MapPin className="size-4 text-[#00A2E9]" />
                <span className="font-semibold text-[11px]">Ruangan / Lokasi Kegiatan</span>
              </div>
              <p className="font-bold text-zinc-900 text-xs pl-6">
                {event.room ? (
                  <span className="text-[#003B5C]">{event.room}</span>
                ) : (
                  <span className="text-zinc-400 italic">Belum ditentukan</span>
                )}
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-zinc-200/80 bg-zinc-50/40">
              <div className="flex items-center gap-2 text-zinc-400 mb-1">
                <Briefcase className="size-4 text-[#00A2E9]" />
                <span className="font-semibold text-[11px]">Jenis Tugas / Kategori</span>
              </div>
              <p className="font-bold text-zinc-900 text-xs pl-6">
                {event.taskType || event.title}
              </p>
            </div>
          </div>

          {/* Teknisi Ditugaskan */}
          <div>
            <h4 className="font-bold text-zinc-900 mb-2 flex items-center gap-2">
              <UserCheck className="size-4 text-[#00A2E9]" />
              <span>Teknisi yang Ditugaskan ({event.assignedMemberNames?.length || 0} Personil)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {event.assignedMemberNames && event.assignedMemberNames.length > 0 ? (
                event.assignedMemberNames.map((name, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-xl border border-zinc-200 bg-white flex items-center gap-2.5 shadow-2xs"
                  >
                    <div className="size-7 rounded-lg bg-sky-50 text-[#003B5C] flex items-center justify-center font-bold text-xs">
                      {name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-zinc-900 leading-tight">
                        {name}
                      </p>
                      <p className="text-[10px] text-zinc-400">
                        Engineer Multimedia PLN Icon Plus
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 p-3 rounded-xl border border-dashed border-zinc-200 text-center text-zinc-400 italic">
                  Belum ada teknisi yang ditugaskan pada agenda ini.
                </div>
              )}
            </div>
          </div>

          {/* Pembagian Peran Teknisi Multimedia */}
          {event.technicianRoles && Object.values(event.technicianRoles).some(Boolean) && (
            <div>
              <h4 className="font-bold text-zinc-900 mb-2 flex items-center gap-2">
                <span>Pembagian Peran Teknisi Multimedia</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {event.technicianRoles.vjUtama && (
                  <div className="p-2.5 rounded-xl border border-sky-100 bg-sky-50/40 flex items-center justify-between">
                    <span className="font-semibold text-xs text-zinc-600">🎧 VJ Utama:</span>
                    <span className="font-bold text-xs text-[#003B5C]">{event.technicianRoles.vjUtama}</span>
                  </div>
                )}
                {event.technicianRoles.coVjZoom && (
                  <div className="p-2.5 rounded-xl border border-sky-100 bg-sky-50/40 flex items-center justify-between">
                    <span className="font-semibold text-xs text-zinc-600">💻 Co-VJ / Zoom:</span>
                    <span className="font-bold text-xs text-[#003B5C]">{event.technicianRoles.coVjZoom}</span>
                  </div>
                )}
                {event.technicianRoles.kameramen && (
                  <div className="p-2.5 rounded-xl border border-sky-100 bg-sky-50/40 flex items-center justify-between">
                    <span className="font-semibold text-xs text-zinc-600">🎥 Kameramen:</span>
                    <span className="font-bold text-xs text-[#003B5C]">{event.technicianRoles.kameramen}</span>
                  </div>
                )}
                {event.technicianRoles.switcherPtz && (
                  <div className="p-2.5 rounded-xl border border-sky-100 bg-sky-50/40 flex items-center justify-between">
                    <span className="font-semibold text-xs text-zinc-600">🎛️ Switcher / PTZ:</span>
                    <span className="font-bold text-xs text-[#003B5C]">{event.technicianRoles.switcherPtz}</span>
                  </div>
                )}
                {event.technicianRoles.operatorPresentasi && (
                  <div className="p-2.5 rounded-xl border border-sky-100 bg-sky-50/40 flex items-center justify-between">
                    <span className="font-semibold text-xs text-zinc-600">📊 Operator Presentasi:</span>
                    <span className="font-bold text-xs text-[#003B5C]">{event.technicianRoles.operatorPresentasi}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Catatan / Agenda Uraian */}
          {(event.agenda || event.notes) && (
            <div className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50/60">
              <span className="font-bold text-zinc-700 block mb-1">Agenda & Catatan:</span>
              <p className="text-zinc-600 leading-relaxed whitespace-pre-wrap">
                {event.agenda || event.notes}
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-zinc-100 bg-zinc-50/70 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCopyWAG}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
              isCopied
                ? "bg-emerald-600 text-white"
                : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
            }`}
          >
            {isCopied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            <span>{isCopied ? "Format WAG Tersalin!" : "Salin Format WAG"}</span>
          </button>

          <div className="flex items-center gap-2">
            {onEditSchedule && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditSchedule(event);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 shadow-2xs cursor-pointer"
              >
                <Pencil className="size-3.5 text-zinc-500" />
                <span>Edit Jadwal</span>
              </button>
            )}

            {onDeleteSchedule && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Hapus jadwal "${event.title}"?`)) {
                    onClose();
                    onDeleteSchedule(event);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 shadow-2xs cursor-pointer"
              >
                <Trash2 className="size-3.5" />
                <span>Hapus</span>
              </button>
            )}

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
    </div>
  );
}

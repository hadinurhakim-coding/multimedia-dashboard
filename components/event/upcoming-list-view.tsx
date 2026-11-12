"use client";

import * as React from "react";
import {
  Search,
  ChevronDown,
  SlidersHorizontal,
  Download,
  Plus,
  Pencil,
  Trash2,
  Calendar,
  Clock,
  MapPin,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle2,
  Copy,
  Check,
  Eye,
} from "lucide-react";
import { OvertimeEvent, EventStatus } from "@/types/event";
import { getEffectiveEventStatus, generateWAGBroadcastText, copyTextToClipboard } from "@/lib/schedule-utils";
import { ScheduleDetailModal } from "@/components/event/schedule-detail-modal";

interface UpcomingListViewProps {
  events: OvertimeEvent[];
  onOpenAddSchedule: () => void;
  onEditSchedule?: (event: OvertimeEvent) => void;
  onDeleteSchedule?: (event: OvertimeEvent) => void;
  onStatusChange?: (event: OvertimeEvent, newStatus: EventStatus) => void;
  onExportCSV: () => void;
}

export function UpcomingListView({
  events,
  onOpenAddSchedule,
  onEditSchedule,
  onDeleteSchedule,
  onStatusChange,
  onExportCSV,
}: UpcomingListViewProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterCategory, setFilterCategory] = React.useState<
    "ALL" | "Terjadwal" | "Selesai" | "Batal" | "Berubah" | "Tugas Pokok" | "Tugas Support"
  >("ALL");
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc");
  const [isCompact, setIsCompact] = React.useState(false);

  // Pagination States
  const [rowsPerPage] = React.useState<number>(8);
  const [currentPage, setCurrentPage] = React.useState<number>(1);

  // Detail Modal State
  const [selectedDetailEvent, setSelectedDetailEvent] = React.useState<OvertimeEvent | null>(null);
  const [copiedEventId, setCopiedEventId] = React.useState<string | null>(null);

  const filterRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCopyWAGFormat = async (evt: OvertimeEvent) => {
    const text = generateWAGBroadcastText(evt);
    const success = await copyTextToClipboard(text);
    if (success) {
      setCopiedEventId(evt.id);
      setTimeout(() => setCopiedEventId(null), 1800);
    }
  };

  const renderStatusBadge = (evt: OvertimeEvent) => {
    const effectiveStatus = getEffectiveEventStatus(evt);
    if (effectiveStatus === "Batal") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <span className="size-1.5 rounded-full bg-rose-500" />
          <span>Batal</span>
        </span>
      );
    }
    if (effectiveStatus === "Berubah") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="size-1.5 rounded-full bg-amber-500" />
          <span>Berubah</span>
        </span>
      );
    }
    if (effectiveStatus === "Completed" || effectiveStatus === "Selesai") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
          <span className="size-1.5 rounded-full bg-blue-500" />
          <span>Selesai</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="size-1.5 rounded-full bg-emerald-500" />
        <span>Terjadwal</span>
      </span>
    );
  };

  const filteredEvents = React.useMemo(() => {
    return events
      .filter((evt) => {
        const effectiveStatus = getEffectiveEventStatus(evt);

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = evt.title?.toLowerCase().includes(q);
          const matchAgenda = evt.agenda?.toLowerCase().includes(q);
          const matchMember = evt.assignedMemberNames?.some((n) => n.toLowerCase().includes(q));
          const matchCategory = evt.taskCategory?.toLowerCase().includes(q);
          const matchTaskType = evt.taskType?.toLowerCase().includes(q);
          const matchRoom = evt.room?.toLowerCase().includes(q);
          if (!matchTitle && !matchAgenda && !matchMember && !matchCategory && !matchTaskType && !matchRoom) {
            return false;
          }
        }

        if (filterCategory === "Terjadwal") {
          return effectiveStatus === "Terjadwal" || effectiveStatus === "Upcoming Session" || effectiveStatus === "In Progress";
        }
        if (filterCategory === "Selesai") {
          return effectiveStatus === "Completed" || effectiveStatus === "Selesai";
        }
        if (filterCategory === "Batal") {
          return effectiveStatus === "Batal";
        }
        if (filterCategory === "Berubah") {
          return effectiveStatus === "Berubah";
        }
        if (filterCategory === "Tugas Pokok") {
          return !evt.taskCategory || evt.taskCategory === "Tugas Pokok";
        }
        if (filterCategory === "Tugas Support") {
          return evt.taskCategory === "Tugas Support";
        }

        return true;
      })
      .sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
      });
  }, [events, searchQuery, filterCategory, sortOrder]);

  const totalItems = filteredEvents.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage) || 1;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalItems);
  const currentEvents = filteredEvents.slice(startIndex, endIndex);

  const getEventCode = (evt: OvertimeEvent, index: number) => {
    const rawNumber = evt.id.replace(/\D/g, "").slice(-3) || (index + 1).toString().padStart(2, "0");
    return `SCH-${rawNumber}`;
  };

  const formatEventDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr + "T00:00:00");
      return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 sm:p-6 shadow-xs">
      {/* Top Header & Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4">
        {/* Search Bar */}
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari jadwal kegiatan, agenda, atau teknisi..."
            className="w-full pl-9 pr-8 py-2 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white text-xs text-zinc-900 placeholder-zinc-400 focus:outline-hidden focus:border-[#00A2E9] focus:ring-1 focus:ring-[#00A2E9] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-zinc-200 text-zinc-400 cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Right Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter Dropdown */}
          <div className="relative" ref={filterRef}>
            <button
              type="button"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors shadow-2xs cursor-pointer"
            >
              <span>
                {filterCategory === "ALL" && "Semua Status"}
                {filterCategory === "Terjadwal" && "Terjadwal (Active)"}
                {filterCategory === "Selesai" && "Selesai"}
                {filterCategory === "Batal" && "Batal"}
                {filterCategory === "Berubah" && "Berubah"}
                {filterCategory === "Tugas Pokok" && "Tugas Pokok"}
                {filterCategory === "Tugas Support" && "Tugas Support"}
              </span>
              <ChevronDown className={`size-3.5 text-zinc-400 transition-transform ${isFilterOpen ? "rotate-180" : ""}`} />
            </button>

            {isFilterOpen && (
              <div className="absolute right-0 top-full mt-1.5 z-40 w-52 rounded-xl bg-white border border-zinc-200 shadow-xl py-1 text-xs animate-in fade-in zoom-in-95 duration-100">
                {(
                  [
                    { key: "ALL", label: "Semua Status" },
                    { key: "Terjadwal", label: "Terjadwal (Active)" },
                    { key: "Selesai", label: "Selesai" },
                    { key: "Berubah", label: "Berubah" },
                    { key: "Batal", label: "Batal" },
                    { key: "Tugas Pokok", label: "Tugas Pokok" },
                    { key: "Tugas Support", label: "Tugas Support" },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setFilterCategory(item.key);
                      setIsFilterOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 font-medium hover:bg-zinc-50 transition-colors cursor-pointer flex items-center justify-between ${
                      filterCategory === item.key ? "text-[#00A2E9] font-bold bg-sky-50" : "text-zinc-700"
                    }`}
                  >
                    <span>{item.label}</span>
                    {filterCategory === item.key && <CheckCircle2 className="size-3.5 text-[#00A2E9]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* View Density Toggle */}
          <button
            type="button"
            onClick={() => setIsCompact(!isCompact)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors shadow-2xs cursor-pointer ${
              isCompact
                ? "bg-sky-50 border-sky-300 text-[#003B5C]"
                : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            <SlidersHorizontal className="size-3.5" />
            <span>Kerapatan</span>
          </button>

          {/* Ekspor CSV */}
          <button
            type="button"
            onClick={onExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-semibold text-[#003B5C] hover:bg-zinc-50 transition-colors shadow-2xs cursor-pointer"
          >
            <Download className="size-3.5 text-[#00A2E9]" />
            <span className="hidden sm:inline">Ekspor CSV</span>
          </button>

          {/* Tambah Jadwal Button */}
          <button
            type="button"
            onClick={onOpenAddSchedule}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#00A2E9] hover:bg-[#0086c4] text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <Plus className="size-3.5" />
            <span>Tambah Jadwal</span>
          </button>
        </div>
      </div>

      {/* Table Data */}
      <div className="overflow-x-auto rounded-xl border border-zinc-200">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-[#003B5C] font-bold uppercase text-[10px]">
              <th className="py-3 px-3.5">Kode</th>
              <th className="py-3 px-3.5">Nama Acara / Tugas</th>
              <th className="py-3 px-3.5">
                <button
                  type="button"
                  onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                  className="flex items-center gap-1 cursor-pointer hover:text-[#00A2E9]"
                >
                  <span>Tanggal & Jam</span>
                  <span className="text-zinc-400">{sortOrder === "asc" ? "↑" : "↓"}</span>
                </button>
              </th>
              <th className="py-3 px-3.5">Lokasi / Ruangan</th>
              <th className="py-3 px-3.5">Teknisi Bertugas</th>
              <th className="py-3 px-3.5">Kategori</th>
              <th className="py-3 px-3.5 text-center">Status</th>
              <th className="py-3 px-3.5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white text-zinc-700">
            {currentEvents.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-zinc-400">
                  <Calendar className="size-8 mx-auto text-zinc-300 mb-2" />
                  <p className="font-semibold text-zinc-600">Tidak ada jadwal yang sesuai filter</p>
                  <p className="text-[11px] mt-0.5">Coba ubah kata kunci pencarian atau kategori filter.</p>
                </td>
              </tr>
            ) : (
              currentEvents.map((evt, idx) => {
                const code = getEventCode(evt, startIndex + idx);
                const isCopied = copiedEventId === evt.id;

                return (
                  <tr
                    key={evt.id}
                    className={`hover:bg-zinc-50/80 transition-colors ${
                      isCompact ? "py-1.5" : ""
                    }`}
                  >
                    <td className="py-3 px-3.5 font-mono font-bold text-zinc-800">
                      {code}
                    </td>

                    <td className="py-3 px-3.5 font-semibold text-zinc-900 max-w-[220px]">
                      <div className="truncate font-bold text-zinc-900">{evt.title}</div>
                      {evt.taskType && (
                        <div className="text-[10px] text-[#00A2E9] truncate font-normal">
                          {evt.taskType}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-3.5">
                      <div className="font-semibold text-zinc-800">{formatEventDate(evt.date)}</div>
                      <div className="text-[10px] text-zinc-500 flex items-center gap-1 mt-0.5">
                        <Clock className="size-3 text-[#00A2E9]" />
                        <span>{evt.time || `${evt.startTime || "17:00"} - ${evt.endTime || "21:00"}`}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3.5 text-zinc-600 max-w-[150px] truncate">
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="size-3 text-[#00A2E9] shrink-0" />
                        <span className="truncate">{evt.room || "Ruang Multimedia"}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3.5 max-w-[180px]">
                      <div className="flex items-center gap-1.5 truncate">
                        <UserCheck className="size-3 text-[#00A2E9] shrink-0" />
                        <span className="truncate font-medium text-zinc-800">
                          {evt.assignedMemberNames?.join(", ") || "-"}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-3.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          evt.taskCategory === "Tugas Support"
                            ? "bg-sky-50 text-[#00A2E9] border border-sky-200"
                            : "bg-blue-50 text-[#003B5C] border border-blue-200"
                        }`}
                      >
                        {evt.taskCategory || "Tugas Pokok"}
                      </span>
                    </td>

                    <td className="py-3 px-3.5 text-center">
                      {renderStatusBadge(evt)}
                    </td>

                    <td className="py-3 px-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleCopyWAGFormat(evt)}
                          title="Salin Format Broadcast WhatsApp"
                          className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                            isCopied
                              ? "bg-emerald-600 text-white border-emerald-600"
                              : "border-zinc-200 text-zinc-500 hover:text-emerald-600 hover:border-emerald-200 bg-white"
                          }`}
                        >
                          {isCopied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedDetailEvent(evt)}
                          title="Lihat Detail Lengkap"
                          className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:text-[#00A2E9] hover:border-sky-200 bg-white cursor-pointer"
                        >
                          <Eye className="size-3.5" />
                        </button>

                        {onEditSchedule && (
                          <button
                            type="button"
                            onClick={() => onEditSchedule(evt)}
                            title="Edit Jadwal"
                            className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:text-zinc-900 bg-white cursor-pointer"
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
                            title="Hapus Jadwal"
                            className="p-1.5 rounded-lg border border-zinc-200 text-zinc-400 hover:text-rose-600 hover:border-rose-200 bg-white cursor-pointer"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-zinc-100 text-xs text-zinc-500">
        <div>
          Menampilkan <strong className="text-zinc-800">{totalItems > 0 ? startIndex + 1 : 0}</strong> -{" "}
          <strong className="text-zinc-800">{endIndex}</strong> dari{" "}
          <strong className="text-zinc-800">{totalItems}</strong> jadwal kegiatan
        </div>

        <div className="flex items-center gap-1.5 self-center sm:self-auto">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(currentPage - 1)}
            className="p-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronLeft className="size-4" />
          </button>

          <span className="px-3 py-1 text-xs font-semibold text-zinc-700">
            Halaman {currentPage} dari {totalPages}
          </span>

          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
            className="p-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedDetailEvent && (
        <ScheduleDetailModal
          isOpen={Boolean(selectedDetailEvent)}
          onClose={() => setSelectedDetailEvent(null)}
          event={selectedDetailEvent}
          onEditSchedule={onEditSchedule}
          onDeleteSchedule={onDeleteSchedule}
          onStatusChange={onStatusChange}
        />
      )}
    </div>
  );
}

"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  UserCheck,
  X,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DayAgendaModal } from "@/components/event/day-agenda-modal";
import { OvertimeEvent } from "@/types/event";

interface MonthlyCalendarViewProps {
  events: OvertimeEvent[];
  onOpenAddModal: (preselectedDate?: string) => void;
  onEditSchedule?: (event: OvertimeEvent) => void;
  onDeleteSchedule?: (event: OvertimeEvent) => void;
  onSelectEventDetail?: (event: OvertimeEvent) => void;
  onExportCSV: () => void;
}

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const DAYS_OF_WEEK = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export function MonthlyCalendarView({
  events,
  onOpenAddModal,
  onEditSchedule,
  onDeleteSchedule,
  onSelectEventDetail,
  onExportCSV,
}: MonthlyCalendarViewProps) {
  const [currentDate, setCurrentDate] = React.useState<Date>(() => new Date(2026, 10, 1));
  const [activePopoverEvent, setActivePopoverEvent] = React.useState<OvertimeEvent | null>(null);
  const [selectedAgendaDate, setSelectedAgendaDate] = React.useState<string | null>(null);
  const [selectedMobileDate, setSelectedMobileDate] = React.useState<string | null>(null);

  const todayDateString = React.useSyncExternalStore(
    () => () => {},
    () => {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      const d = String(now.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    },
    () => "2026-11-12"
  );

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const calendarCells: {
    dayNumber: number;
    isCurrentMonth: boolean;
    dateString: string;
  }[] = [];

  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const prevDate = new Date(year, month - 1, d);
    calendarCells.push({
      dayNumber: d,
      isCurrentMonth: false,
      dateString: prevDate.toISOString().split("T")[0],
    });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateString = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    calendarCells.push({
      dayNumber: d,
      isCurrentMonth: true,
      dateString,
    });
  }

  const totalCells = calendarCells.length <= 35 ? 35 : 42;
  const nextMonthCount = totalCells - calendarCells.length;
  for (let d = 1; d <= nextMonthCount; d++) {
    const nextDate = new Date(year, month + 1, d);
    calendarCells.push({
      dayNumber: d,
      isCurrentMonth: false,
      dateString: nextDate.toISOString().split("T")[0],
    });
  }

  const eventsByDate = React.useMemo(() => {
    const map: Record<string, OvertimeEvent[]> = {};
    events.forEach((evt) => {
      if (!map[evt.date]) {
        map[evt.date] = [];
      }
      map[evt.date].push(evt);
    });
    return map;
  }, [events]);

  return (
    <div className="relative rounded-2xl border border-zinc-200/90 bg-white p-3.5 sm:p-6 shadow-xs">
      {/* Container Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
        <div>
          <h2 className="text-sm sm:text-base font-extrabold text-[#003B5C] tracking-tight">
            Kalender Penjadwalan Shift & Lembur
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Jadwal kegiatan operasional multimedia, gladi resik, dan live streaming.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onExportCSV}
          className="h-8 rounded-lg px-3 text-xs font-semibold text-[#003B5C] gap-1.5 border-zinc-200 hover:bg-zinc-50 shadow-2xs self-start sm:self-auto cursor-pointer"
        >
          <Download className="size-3.5 text-[#00A2E9]" />
          <span>Ekspor CSV</span>
        </Button>
      </div>

      {/* Subheader Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 py-3">
        {/* Left: Badge Kalender */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center justify-center size-10 rounded-lg border border-sky-200 bg-white overflow-hidden shadow-2xs">
            <div className="w-full bg-gradient-to-r from-[#003B5C] to-[#00A2E9] py-0.5 flex justify-center gap-0.5">
              <span className="size-1 rounded-full bg-[#FFD100] inline-block"></span>
              <span className="size-1 rounded-full bg-[#FFD100] inline-block"></span>
              <span className="size-1 rounded-full bg-[#FFD100] inline-block"></span>
            </div>
            <span className="text-sm font-black text-[#003B5C] leading-none pt-1">
              {todayDateString ? parseInt(todayDateString.split("-")[2], 10) : 12}
            </span>
          </div>

          <div>
            <h3 className="text-base font-extrabold text-[#003B5C] tracking-tight leading-none">
              {MONTH_NAMES[month]} {year}
            </h3>
            <p className="text-[11px] text-zinc-500 font-medium mt-1">
              1 {MONTH_NAMES[month]} {year} - {daysInMonth} {MONTH_NAMES[month]} {year}
            </p>
          </div>
        </div>

        {/* Right: Month Selector & Tambah Jadwal */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center rounded-full border border-zinc-200 bg-white p-0.5 shadow-2xs">
            <button
              onClick={handlePrevMonth}
              className="size-7 rounded-full text-zinc-500 hover:text-[#003B5C] hover:bg-zinc-100 flex items-center justify-center cursor-pointer transition-colors"
              title="Bulan Sebelumnya"
            >
              <ChevronLeft className="size-3.5 stroke-[2]" />
            </button>

            <select
              value={month}
              onChange={(e) => setCurrentDate(new Date(year, parseInt(e.target.value, 10), 1))}
              className="h-7 px-2 text-xs font-bold text-[#003B5C] bg-transparent cursor-pointer focus:outline-hidden"
            >
              {MONTH_NAMES.map((m, idx) => (
                <option key={m} value={idx}>
                  {m}
                </option>
              ))}
            </select>

            <button
              onClick={handleNextMonth}
              className="size-7 rounded-full text-zinc-500 hover:text-[#003B5C] hover:bg-zinc-100 flex items-center justify-center cursor-pointer transition-colors"
              title="Bulan Berikutnya"
            >
              <ChevronRight className="size-3.5 stroke-[2]" />
            </button>
          </div>

          <select
            value={year}
            onChange={(e) => setCurrentDate(new Date(parseInt(e.target.value, 10), month, 1))}
            className="h-8 rounded-full px-3 text-xs font-bold text-[#003B5C] border border-zinc-200 bg-white cursor-pointer focus:outline-hidden"
          >
            {[2024, 2025, 2026, 2027, 2028].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <Button
            size="sm"
            onClick={() => onOpenAddModal()}
            className="h-8 rounded-lg px-3.5 text-xs font-bold gap-1.5 bg-[#00A2E9] hover:bg-[#0086c4] text-white shadow-2xs ml-auto sm:ml-1 cursor-pointer transition-all active:scale-95"
          >
            <Plus className="size-3.5 stroke-[2.5]" />
            <span>Tambah Jadwal</span>
          </Button>
        </div>
      </div>

      {/* Calendar Grid Header */}
      <div className="grid grid-cols-7 border-t border-b border-zinc-200 bg-zinc-50 text-center py-2 text-xs font-bold text-[#003B5C] mt-2">
        {DAYS_OF_WEEK.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      {/* Calendar 7x5 Matrix */}
      <div className="grid grid-cols-7 border-b border-l border-zinc-200">
        {calendarCells.map((cell, index) => {
          const dayEvents = eventsByDate[cell.dateString] || [];
          const isHighlightedDay = cell.isCurrentMonth && cell.dateString === todayDateString;
          const isSelectedMobile = (selectedMobileDate || todayDateString) === cell.dateString;

          return (
            <div
              key={index}
              onClick={() => {
                setSelectedMobileDate(cell.dateString);
                if (typeof window !== "undefined" && window.innerWidth >= 640) {
                  setSelectedAgendaDate(cell.dateString);
                }
              }}
              className={`min-h-[50px] sm:min-h-[125px] p-1 sm:p-2 border-r border-b border-zinc-200 relative flex flex-col justify-between transition-all cursor-pointer ${
                isSelectedMobile
                  ? "bg-sky-50 ring-2 ring-[#00A2E9] ring-inset"
                  : isHighlightedDay
                  ? "bg-sky-50/50 hover:bg-sky-100/50"
                  : cell.isCurrentMonth
                  ? "bg-white hover:bg-zinc-50"
                  : "bg-zinc-50 text-zinc-300"
              }`}
            >
              {/* Day Number */}
              <div className="flex items-center justify-center sm:justify-start">
                {isHighlightedDay ? (
                  <span className="size-5 rounded-full bg-gradient-to-r from-[#003B5C] to-[#00A2E9] text-white text-[10px] sm:text-[11px] font-bold flex items-center justify-center shadow-xs">
                    {cell.dayNumber}
                  </span>
                ) : (
                  <span
                    className={`text-[11px] sm:text-xs font-semibold ${
                      cell.isCurrentMonth ? "text-zinc-800" : "text-zinc-300"
                    }`}
                  >
                    {cell.dayNumber}
                  </span>
                )}
              </div>

              {/* Mobile Event Dots */}
              <div className="sm:hidden flex items-center justify-center gap-0.5 my-0.5 min-h-[6px]">
                {dayEvents.slice(0, 3).map((evt, idx) => (
                  <span
                    key={idx}
                    className={`size-1.5 rounded-full ${
                      evt.taskCategory === "Tugas Support" ? "bg-[#00A2E9]" : "bg-[#003B5C]"
                    }`}
                  />
                ))}
                {dayEvents.length > 3 && (
                  <span className="text-[7px] font-black text-[#003B5C] leading-none">+</span>
                )}
              </div>

              {/* Desktop Event Pills */}
              <div className="hidden sm:block mt-1 flex-1">
                {dayEvents.length <= 3 ? (
                  <div className="space-y-1">
                    {dayEvents.map((evt) => (
                      <div
                        key={evt.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAgendaDate(cell.dateString);
                        }}
                        className="border-l-[3.5px] border-[#00A2E9] bg-sky-50/70 hover:bg-sky-100 text-left px-2 py-1 rounded-r transition-all cursor-pointer shadow-2xs"
                      >
                        <div className="text-[11px] font-bold text-zinc-900 leading-tight truncate">
                          {evt.title}
                        </div>
                        <div className="text-[10px] text-[#003B5C] font-semibold leading-tight truncate mt-0.5">
                          {evt.time || "17:00 - 21:00"}
                        </div>
                        {evt.assignedMemberNames && evt.assignedMemberNames.length > 0 && (
                          <div className="text-[9.5px] text-zinc-500 font-medium truncate mt-0.5">
                            👤 {evt.assignedMemberNames.join(", ")}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col justify-between h-full pt-0.5">
                    <div className="flex flex-wrap items-center gap-1.5 p-1">
                      {dayEvents.map((evt, idx) => (
                        <button
                          key={evt.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActivePopoverEvent(evt);
                          }}
                          className={`size-6 rounded-full flex items-center justify-center font-extrabold text-[11px] text-white shadow-2xs hover:scale-110 transition-transform ${
                            evt.taskCategory === "Tugas Support" ? "bg-[#00A2E9]" : "bg-[#003B5C]"
                          }`}
                        >
                          {idx + 1}
                        </button>
                      ))}
                    </div>
                    <div className="mt-1 pt-1 border-t border-zinc-100 text-[10px] text-[#003B5C] font-bold flex items-center justify-between px-1">
                      <span>{dayEvents.length} Agenda</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Popover for Single Event Preview */}
      {activePopoverEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs">
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-zinc-200">
            <div className="flex items-start justify-between pb-2 border-b border-zinc-100">
              <h4 className="text-sm font-bold text-[#003B5C]">
                {activePopoverEvent.title}
              </h4>
              <button
                onClick={() => setActivePopoverEvent(null)}
                className="text-zinc-400 hover:text-zinc-700"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="py-3 space-y-2 text-xs text-zinc-600">
              <div className="flex items-center gap-2">
                <Clock className="size-3.5 text-[#00A2E9]" />
                <span>{activePopoverEvent.time || "17:00 - 21:00"}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="size-3.5 text-[#00A2E9]" />
                <span>{activePopoverEvent.room || "Ruang Multimedia"}</span>
              </div>
              <div className="flex items-center gap-2">
                <UserCheck className="size-3.5 text-[#00A2E9]" />
                <span>Teknisi: {activePopoverEvent.assignedMemberNames?.join(", ") || "-"}</span>
              </div>
            </div>
            <div className="pt-2 border-t border-zinc-100 flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const ev = activePopoverEvent;
                  setActivePopoverEvent(null);
                  onSelectEventDetail?.(ev);
                }}
              >
                Lihat Detail
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Day Agenda Modal */}
      <DayAgendaModal
        isOpen={Boolean(selectedAgendaDate)}
        onClose={() => setSelectedAgendaDate(null)}
        dateString={selectedAgendaDate}
        events={events}
        onOpenCreateSchedule={(dateStr) => {
          setSelectedAgendaDate(null);
          onOpenAddModal(dateStr);
        }}
        onEditSchedule={onEditSchedule}
        onDeleteSchedule={onDeleteSchedule}
        onSelectEventDetail={onSelectEventDetail}
      />
    </div>
  );
}

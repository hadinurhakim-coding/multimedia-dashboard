"use client";

import * as React from "react";
import { Calendar as CalendarIcon, X } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { id as idLocale } from "react-day-picker/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  draftDateFilterToRange,
  formatDraftDateFilterLabel,
  parseCalendarIsoDate,
  parseDraftDateFilter,
  resolveInitialCalendarMonth,
  serializeDraftDateRange,
} from "@/lib/lpp/date-range";
import { cn } from "@/lib/utils";

function subscribeCompactCalendar(callback: () => void) {
  const media = window.matchMedia("(max-width: 680px)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

function getCompactCalendarSnapshot() {
  return window.matchMedia("(max-width: 680px)").matches;
}

/** Shadcn UI Calendar button with a 2-month Date Range selection Dialog matching LPP draft dates. */
export function DraftDateRangePicker({
  value,
  draftDates,
  filteredCount,
  totalCount,
  disabled,
  onChange,
}: {
  value: string;
  draftDates: readonly string[];
  filteredCount: number;
  totalCount: number;
  disabled?: boolean;
  onChange: (nextValue: string) => void;
}) {
  const parsedFilter = React.useMemo(() => parseDraftDateFilter(value), [value]);
  const committedRange = React.useMemo(() => draftDateFilterToRange(parsedFilter), [parsedFilter]);

  const [open, setOpen] = React.useState(false);
  const [draftRange, setDraftRange] = React.useState<DateRange | undefined>(committedRange);
  const [displayMonth, setDisplayMonth] = React.useState<Date>(() =>
    resolveInitialCalendarMonth(draftDates, committedRange, 2)
  );

  const isCompact = React.useSyncExternalStore(
    subscribeCompactCalendar,
    getCompactCalendarSnapshot,
    () => false
  );
  const numberOfMonths = isCompact ? 1 : 2;

  const draftDateObjects = React.useMemo(
    () =>
      [...new Set(draftDates)]
        .filter((iso) => /^\d{4}-\d{2}-\d{2}$/.test(iso))
        .map((iso) => parseCalendarIsoDate(iso)),
    [draftDates]
  );

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setDraftRange(committedRange);
      setDisplayMonth(resolveInitialCalendarMonth(draftDates, committedRange, numberOfMonths));
    }
    setOpen(nextOpen);
  }

  function handleRangeSelect(nextRange: DateRange | undefined) {
    setDraftRange(nextRange);
    onChange(serializeDraftDateRange(nextRange));
  }

  function handleReset() {
    setDraftRange(undefined);
    onChange("all");
  }

  const isFiltered = parsedFilter !== null;
  const triggerLabel = formatDraftDateFilterLabel(parsedFilter);
  const activeSelectionText = draftRange?.from
    ? formatDraftDateFilterLabel(parseDraftDateFilter(serializeDraftDateRange(draftRange)))
    : "Belum ada rentang tanggal dipilih";

  return (
    <div
      data-slot="draft-date-range-bar"
      className="flex flex-wrap items-center justify-between gap-2.5 border-b px-5 py-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-zinc-500">Tanggal:</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          aria-label={isFiltered ? `Rentang tanggal: ${triggerLabel}` : "Pilih rentang tanggal"}
          className={cn(
            "h-9 justify-start gap-2 border-zinc-200 bg-white px-3 text-xs sm:text-sm hover:bg-zinc-50",
            isFiltered ? "border-pln-navy/40 font-medium text-pln-navy" : "font-normal text-zinc-600"
          )}
          onClick={() => handleOpenChange(true)}
        >
          <CalendarIcon className="size-4 shrink-0 text-zinc-500" aria-hidden="true" />
          <span>{triggerLabel}</span>
        </Button>

        {isFiltered && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            aria-label="Reset filter tanggal"
            className="h-9 gap-1 text-xs text-zinc-600 hover:text-pln-navy"
            onClick={handleReset}
          >
            <X className="size-3.5" aria-hidden="true" />
            <span>Reset</span>
          </Button>
        )}
      </div>

      <span className="text-xs text-zinc-500">
        {isFiltered
          ? `Menampilkan ${filteredCount} dari ${totalCount} file`
          : `${totalCount} file tersedia`}
      </span>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="w-fit max-w-[calc(100vw-2rem)] gap-0 overflow-hidden p-0 sm:max-w-fit">
          <DialogHeader className="border-b px-5 py-3.5 pr-12">
            <DialogTitle className="text-base font-semibold text-pln-navy">
              Pilih Rentang Tanggal
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Pilih tanggal awal lalu tanggal akhir untuk menyaring laporan LPP tersimpan.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-center p-3 sm:p-4">
            <Calendar
              mode="range"
              locale={idLocale}
              numberOfMonths={numberOfMonths}
              month={displayMonth}
              onMonthChange={setDisplayMonth}
              selected={draftRange}
              onSelect={handleRangeSelect}
              resetOnSelect
              showOutsideDays
              modifiers={{ hasDraft: draftDateObjects }}
            />
          </div>

          <DialogFooter className="mx-0 mb-0 flex-row items-center justify-between gap-2 rounded-b-xl border-t bg-zinc-50/70 px-5 py-3">
            <span className="text-xs font-medium text-pln-charcoal">
              {activeSelectionText}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={!draftRange?.from}
                onClick={handleReset}
              >
                Reset
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-pln-navy text-white hover:bg-pln-navy/90"
                onClick={() => setOpen(false)}
              >
                Terapkan
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

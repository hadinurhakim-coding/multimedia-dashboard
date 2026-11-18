"use client";

import { Fragment, useState } from "react";
import { CalendarDays } from "lucide-react";
import { Input } from "@/components/ui/input";
import { readCell, readFormField, type LppForm } from "@/lib/lpp/form";
import { formatReportDate, validateReportDate } from "@/lib/lpp/report-date";
import type { CellEdit, LppWorkbook } from "@/types/lpp";

export function ReportHeader({ form, workbook, edits, templateId, reportDate, busy, onDateChange }: {
  form: LppForm; workbook: LppWorkbook; edits: Record<string, CellEdit>; templateId: string;
  reportDate: string; busy: boolean; onDateChange: (value: string) => void;
}) {
  const [logoFailed, setLogoFailed] = useState(false);
  const header = form.reportHeader;
  if (!header) return null;
  let dateError = "", formatted = "";
  try { formatted = formatReportDate(validateReportDate(reportDate)); }
  catch (error) { dateError = (error as Error).message; }
  return <section aria-label="Header laporan pekerjaan" className="overflow-hidden rounded-xl border bg-white">
    <div className="grid items-center gap-5 px-5 py-6 sm:grid-cols-[160px_minmax(0,1fr)_160px]">
      <div className="flex h-14 items-center">
        {logoFailed ? <span className="text-lg font-semibold text-pln-navy">PLN Icon Plus</span> : <>
          {/* Private template assets bypass the public image optimizer. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/lpp/templates/${templateId}/logo`} alt="Logo PLN Icon Plus" width={160} height={56} className="max-h-14 w-40 object-contain object-left" onError={() => setLogoFailed(true)} />
        </>}
      </div>
      <h2 className="text-lg font-semibold leading-snug text-pln-charcoal sm:text-center lg:text-xl">{String(readCell(workbook, edits, header.title) ?? "")}</h2>
    </div>
    <div className="border-y bg-pln-ice px-5 py-2.5 text-sm font-semibold text-pln-navy">{String(readCell(workbook, edits, header.projectId) ?? "Project ID")}</div>
    <div className="space-y-4 p-5">
      <dl className="grid gap-x-5 gap-y-2 text-sm sm:grid-cols-[140px_minmax(0,1fr)]">
        {header.fields.map((field) => <Fragment key={field.id}><dt className="text-zinc-500">{field.label}</dt><dd className="break-words font-medium">{readFormField(field, workbook, edits) || "—"}</dd></Fragment>)}
      </dl>
      <div className="grid items-start gap-x-5 gap-y-2 border-t pt-4 sm:grid-cols-[140px_minmax(0,1fr)]">
        <label htmlFor="lpp-report-date" className="flex items-center gap-2 pt-2 text-sm font-medium"><CalendarDays className="size-4 text-pln-navy" />Tanggal laporan</label>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3"><Input id="lpp-report-date" type="date" required disabled={busy} value={reportDate} onChange={(event) => onDateChange(event.target.value)} aria-invalid={Boolean(dateError)} aria-describedby="lpp-report-date-help lpp-report-date-status" className="h-10 w-48" />{formatted && <span className="text-sm font-medium text-pln-navy">{formatted}</span>}</div>
          <p id="lpp-report-date-help" className="text-xs leading-relaxed text-zinc-500">Terisi dari tanggal pembuatan draf (WIB) dan dapat diubah. Digunakan pada laporan, dokumentasi, dan tanggal pengesahan di Excel.</p>
          <p id="lpp-report-date-status" role={dateError ? "alert" : undefined} className="text-xs text-red-700">{dateError}</p>
        </div>
      </div>
    </div>
  </section>;
}

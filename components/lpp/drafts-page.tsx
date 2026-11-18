"use client";

import { ArrowLeft, Download, FileSpreadsheet, FolderOpen, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatReportDate, resolveReportDate } from "@/lib/lpp/report-date";
import { templateDisplayName } from "@/lib/lpp/naming";
import type { LppDraft, LppTemplate } from "@/types/lpp";

type DraftSummary = Omit<LppDraft, "edits">;

export function DraftsPage({ drafts, templates, busy, onBack, onOpen, onExport, onDelete }: {
  drafts: DraftSummary[]; templates: LppTemplate[]; busy: boolean;
  onBack: () => void; onOpen: (draft: DraftSummary) => void; onExport: (draft: DraftSummary) => void; onDelete: (draft: DraftSummary) => void;
}) {
  return <div className="space-y-5">
    <Button variant="outline" disabled={busy} onClick={onBack}><ArrowLeft className="size-4" />Kembali ke LPP</Button>
    <section aria-label="Draf tersimpan" className="overflow-hidden rounded-xl border bg-white">
      <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
        <h2 className="font-semibold text-pln-navy">Draf tersimpan</h2>
        <span className="text-sm text-zinc-500">{drafts.length} draf</span>
      </div>
      {!drafts.length ? <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
        <FolderOpen className="size-8 text-zinc-400" />
        <p className="font-medium">Belum ada draf tersimpan</p>
        <p className="text-sm text-zinc-500">Pilih template di halaman LPP, isi laporan, lalu simpan draf.</p>
      </div> : <Table aria-label="Daftar draf LPP">
        <TableHeader><TableRow><TableHead className="pl-5">Judul laporan</TableHead><TableHead>Template</TableHead><TableHead>Tanggal laporan</TableHead><TableHead className="pr-5 text-right">Aksi</TableHead></TableRow></TableHeader>
        <TableBody>{drafts.map((draft) => {
          const templateName = templates.find((template) => template.id === draft.templateId)?.name;
          const title = templateName && templateDisplayName(draft.title) === templateDisplayName(templateName) ? templateDisplayName(templateName) : draft.title;
          const date = resolveReportDate(draft);
          return <TableRow key={draft.id}>
            <TableCell className="pl-5"><button disabled={busy} onClick={() => onOpen(draft)} className="flex max-w-sm items-center gap-2 rounded-sm text-left font-medium text-pln-navy hover:underline focus-visible:outline-2 focus-visible:outline-pln-cyan disabled:opacity-50"><FileSpreadsheet className="size-4 shrink-0" /><span className="truncate">{title}</span></button></TableCell>
            <TableCell className="text-zinc-500">{templateName ? templateDisplayName(templateName) : "Template tidak tersedia"}</TableCell>
            <TableCell><time dateTime={date}>{formatReportDate(date)}</time></TableCell>
            <TableCell className="pr-5"><div className="flex items-center justify-end gap-2"><Button variant="outline" size="sm" disabled={busy} aria-label={`Buka ${title}, ${formatReportDate(date)}`} onClick={() => onOpen(draft)}>Buka</Button><Button variant="outline" size="sm" className="text-pln-navy" disabled={busy || !templateName} aria-label={`Ekspor Excel ${title}, ${formatReportDate(date)}`} onClick={() => onExport(draft)}><Download className="size-3.5" />Ekspor Excel</Button><Button variant="ghost" size="icon" disabled={busy} aria-label={`Hapus ${title}, ${formatReportDate(date)}`} onClick={() => onDelete(draft)}><Trash2 className="size-4" /></Button></div></TableCell>
          </TableRow>;
        })}</TableBody>
      </Table>}
    </section>
  </div>;
}

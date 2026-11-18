"use client";

import * as React from "react";
import {
  ArrowLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Folder,
  FolderOpen,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  buildDraftFolders,
  draftDisplayTitle,
  draftExportLabel,
  filterFolderDrafts,
  type DraftFolder,
  type DraftSummary,
} from "@/lib/lpp/draft-folders";
import { formatReportDate, resolveReportDate } from "@/lib/lpp/report-date";
import { cn } from "@/lib/utils";
import type { LppTemplate } from "@/types/lpp";

export function DraftsPage({
  drafts,
  templates,
  busy,
  onBack,
  onOpen,
  onExport,
  onDelete,
}: {
  drafts: DraftSummary[];
  templates: LppTemplate[];
  busy: boolean;
  onBack: () => void;
  onOpen: (draft: DraftSummary) => void;
  onExport: (draft: DraftSummary) => void;
  onDelete: (draft: DraftSummary) => void;
}) {
  const [selectedFolderId, setSelectedFolderId] = React.useState<string | null>(null);
  const [monthFilter, setMonthFilter] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState("");

  const folders = React.useMemo(
    () => buildDraftFolders(drafts, templates),
    [drafts, templates]
  );

  const activeFolder = React.useMemo(
    () => folders.find((folder) => folder.id === selectedFolderId) ?? null,
    [folders, selectedFolderId]
  );

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const visibleFolders = React.useMemo(
    () =>
      !normalizedQuery
        ? folders
        : folders.filter(
            (folder) =>
              folder.name.toLowerCase().includes(normalizedQuery) ||
              folder.months.some((month) => month.label.toLowerCase().includes(normalizedQuery)) ||
              filterFolderDrafts(folder.drafts, folder.available ? folder.name : undefined, {
                query: normalizedQuery,
              }).length > 0
          ),
    [folders, normalizedQuery]
  );

  const visibleFolderDrafts = React.useMemo(() => {
    if (!activeFolder) return [];
    return filterFolderDrafts(
      activeFolder.drafts,
      activeFolder.available ? activeFolder.name : undefined,
      { monthKey: monthFilter, query: searchQuery }
    );
  }, [activeFolder, monthFilter, searchQuery]);

  function openFolder(folder: DraftFolder) {
    setSelectedFolderId(folder.id);
    setMonthFilter("all");
    setSearchQuery("");
  }

  function returnToFolders() {
    setSelectedFolderId(null);
    setMonthFilter("all");
    setSearchQuery("");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" disabled={busy} onClick={onBack}>
            <ArrowLeft className="size-4" />
            Kembali ke LPP
          </Button>
          {selectedFolderId !== null && (
            <Button variant="ghost" disabled={busy} onClick={returnToFolders}>
              <Folder className="size-4 text-pln-navy" />
              Semua folder
            </Button>
          )}
        </div>
        {drafts.length > 0 && (
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
            <Input
              type="search"
              aria-label={activeFolder ? `Cari file di folder ${activeFolder.name}` : "Cari folder atau draf LPP"}
              placeholder={activeFolder ? "Cari laporan atau bulan…" : "Cari folder atau laporan…"}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white"
            />
          </div>
        )}
      </div>

      <section aria-label="Draf tersimpan" className="overflow-hidden rounded-xl border bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-pln-ice/40 px-5 py-3.5">
          <nav aria-label="Lokasi folder draf" className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm">
            <button
              type="button"
              onClick={returnToFolders}
              aria-current={!activeFolder ? "page" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-pln-cyan",
                !activeFolder
                  ? "text-pln-navy"
                  : "text-zinc-600 hover:bg-white hover:text-pln-navy"
              )}
            >
              <FolderOpen className="size-4 text-pln-cyan" />
              <span>Draf tersimpan</span>
            </button>
            {activeFolder && (
              <>
                <ChevronRight className="size-4 shrink-0 text-zinc-400" />
                <span
                  aria-current="page"
                  className="inline-flex items-center gap-1.5 truncate rounded-md bg-white px-2.5 py-1 font-semibold text-pln-navy shadow-xs ring-1 ring-zinc-200/80"
                >
                  <Folder className="size-4 shrink-0 text-pln-cyan" />
                  <span className="truncate">{activeFolder.name}</span>
                </span>
              </>
            )}
          </nav>

          <span className="text-sm text-zinc-500">
            {activeFolder
              ? `${visibleFolderDrafts.length} file`
              : `${folders.length} folder · ${drafts.length} draf`}
          </span>
        </div>

        {!drafts.length ? (
          <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
            <FolderOpen className="size-8 text-zinc-400" />
            <p className="font-medium text-pln-charcoal">Belum ada draf tersimpan</p>
            <p className="max-w-md text-sm text-zinc-500">
              Pilih template di halaman LPP, isi laporan, lalu klik Simpan. Folder sesuai jenis LPP akan otomatis dibuat di sini.
            </p>
          </div>
        ) : !activeFolder ? (
          selectedFolderId !== null ? (
            <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
              <FolderOpen className="size-8 text-zinc-400" />
              <p className="font-medium text-pln-charcoal">Folder ini sudah kosong</p>
              <Button variant="outline" onClick={returnToFolders}>
                Kembali ke semua folder
              </Button>
            </div>
          ) : !visibleFolders.length ? (
            <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
              <Search className="size-7 text-zinc-400" />
              <p className="font-medium text-pln-charcoal">Folder atau laporan tidak ditemukan</p>
              <p className="text-sm text-zinc-500">Coba kata kunci lain atau bersihkan pencarian.</p>
            </div>
          ) : (
            <div className="space-y-4 p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Folder Template
                </h2>
                <span className="text-xs text-zinc-400">Klik folder untuk membuka file di dalamnya</span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {visibleFolders.map((folder) => (
                  <button
                    key={folder.id}
                    type="button"
                    disabled={busy}
                    onClick={() => openFolder(folder)}
                    className="group flex items-start gap-3.5 rounded-xl border border-zinc-200 bg-white p-4 text-left transition hover:border-pln-cyan hover:bg-pln-ice/50 focus-visible:outline-2 focus-visible:outline-pln-cyan disabled:opacity-50"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-pln-cyan/10 text-pln-navy transition-colors group-hover:bg-pln-cyan/20">
                      <Folder className="size-5 fill-pln-cyan/25 text-pln-navy" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-semibold text-pln-navy group-hover:underline">
                          {folder.name}
                        </p>
                        <ChevronRight className="size-4 shrink-0 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-pln-navy" />
                      </div>
                      <p className="text-xs text-zinc-500">
                        {folder.drafts.length} file · Terbaru {formatReportDate(folder.latestReportDate)}
                      </p>
                      {folder.months.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {folder.months.slice(0, 3).map((month) => (
                            <span
                              key={month.key}
                              className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600"
                            >
                              {month.label}
                            </span>
                          ))}
                          {folder.months.length > 3 && (
                            <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-500">
                              +{folder.months.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )
        ) : (
          <div>
            {activeFolder.months.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 border-b px-5 py-3">
                <span className="text-xs font-medium text-zinc-500">Bulan:</span>
                <button
                  type="button"
                  onClick={() => setMonthFilter("all")}
                  aria-pressed={monthFilter === "all"}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    monthFilter === "all"
                      ? "bg-pln-navy text-white"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200/80"
                  )}
                >
                  Semua ({activeFolder.drafts.length})
                </button>
                {activeFolder.months.map((month) => {
                  const count = activeFolder.drafts.filter(
                    (item) => resolveReportDate(item).slice(0, 7) === month.key
                  ).length;
                  const active = monthFilter === month.key;
                  return (
                    <button
                      key={month.key}
                      type="button"
                      onClick={() => setMonthFilter(month.key)}
                      aria-pressed={active}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                        active
                          ? "bg-pln-navy text-white"
                          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200/80"
                      )}
                    >
                      {month.label} ({count})
                    </button>
                  );
                })}
              </div>
            )}

            {!visibleFolderDrafts.length ? (
              <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
                <FileSpreadsheet className="size-7 text-zinc-400" />
                <p className="font-medium text-pln-charcoal">Tidak ada file yang cocok</p>
                <p className="text-sm text-zinc-500">Ubah filter bulan atau kata kunci pencarian.</p>
              </div>
            ) : (
              <Table aria-label={`Daftar file di folder ${activeFolder.name}`}>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-5">Nama file</TableHead>
                    <TableHead>Tanggal laporan</TableHead>
                    <TableHead>Ringkasan</TableHead>
                    <TableHead className="pr-5 text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleFolderDrafts.map((draft) => {
                    const templateName = activeFolder.available ? activeFolder.name : undefined;
                    const title = draftDisplayTitle(draft, templateName);
                    const exportName = draftExportLabel(draft, templateName);
                    const date = resolveReportDate(draft);
                    return (
                      <TableRow key={draft.id}>
                        <TableCell className="pl-5">
                          <button
                            disabled={busy}
                            onClick={() => onOpen(draft)}
                            className="flex w-full max-w-md flex-col items-start gap-0.5 rounded-sm text-left focus-visible:outline-2 focus-visible:outline-pln-cyan disabled:opacity-50"
                          >
                            <span className="flex w-full min-w-0 items-center gap-2 font-medium text-pln-navy hover:underline">
                              <FileSpreadsheet className="size-4 shrink-0 text-pln-cyan" />
                              <span className="truncate">{title}</span>
                            </span>
                            <span className="w-full truncate pl-6 text-xs text-zinc-500">
                              {exportName}
                            </span>
                          </button>
                        </TableCell>
                        <TableCell>
                          <time dateTime={date}>{formatReportDate(date)}</time>
                        </TableCell>
                        <TableCell className="text-xs text-zinc-500">
                          {draft.changes ?? 0} sel · {draft.photoCount ?? Object.keys(draft.photos ?? {}).length} foto
                        </TableCell>
                        <TableCell className="pr-5">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={busy}
                              aria-label={`Buka ${title}, ${formatReportDate(date)}`}
                              onClick={() => onOpen(draft)}
                            >
                              Buka
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-pln-navy"
                              disabled={busy || !activeFolder.available}
                              aria-label={`Ekspor Excel ${title}, ${formatReportDate(date)}`}
                              onClick={() => onExport(draft)}
                            >
                              <Download className="size-3.5" />
                              Ekspor Excel
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={busy}
                              aria-label={`Hapus ${title}, ${formatReportDate(date)}`}
                              onClick={() => onDelete(draft)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

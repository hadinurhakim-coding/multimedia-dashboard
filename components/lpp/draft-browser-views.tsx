"use client";

import * as React from "react";
import { ChevronRight, Download, FileSpreadsheet, Folder, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TablePagination } from "@/components/ui/table-pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DEFAULT_PAGE_SIZE, paginateRows } from "@/lib/pagination";
import {
  draftDisplayTitle,
  draftExportLabel,
  formatDraftUpdatedAt,
  type DraftFolder,
  type DraftSummary,
  type DraftViewMode,
} from "@/lib/lpp/draft-folders";
import { formatReportDate, resolveReportDate } from "@/lib/lpp/report-date";
import { cn } from "@/lib/utils";

const ICON_FOLDER_GRID: Record<"extra-large" | "large" | "medium", { grid: string; box: string; icon: string }> = {
  "extra-large": { grid: "grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3", box: "size-16 rounded-2xl", icon: "size-8" },
  large: { grid: "grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4", box: "size-12 rounded-xl", icon: "size-6" },
  medium: { grid: "grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5", box: "size-10 rounded-lg", icon: "size-5" },
};

const ICON_FILE_GRID: Record<"extra-large" | "large" | "medium" | "small" | "tiles", { grid: string; box: string; icon: string }> = {
  "extra-large": { grid: "grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3", box: "size-12 rounded-xl", icon: "size-6" },
  large: { grid: "grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3", box: "size-10 rounded-lg", icon: "size-5" },
  medium: { grid: "grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4", box: "size-9 rounded-lg", icon: "size-4" },
  small: { grid: "grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4", box: "size-7 rounded-md", icon: "size-3.5" },
  tiles: { grid: "grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3", box: "size-10 rounded-lg", icon: "size-5" },
};

function MonthBadges({ folder, limit }: { folder: DraftFolder; limit?: number }) {
  if (!folder.months.length) return null;
  const shown = limit ? folder.months.slice(0, limit) : folder.months;
  const hiddenCount = folder.months.length - shown.length;
  return (
    <div className="flex flex-wrap gap-1 pt-1">
      {shown.map((month) => (
        <span
          key={month.key}
          className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600"
        >
          {month.label}
        </span>
      ))}
      {hiddenCount > 0 && (
        <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-500">
          +{hiddenCount}
        </span>
      )}
    </div>
  );
}

/** Renders the folder catalog across all 8 Explorer-style view modes. */
export function FolderCollectionView({
  folders,
  viewMode,
  busy,
  onOpenFolder,
}: {
  folders: DraftFolder[];
  viewMode: DraftViewMode;
  busy: boolean;
  onOpenFolder: (folder: DraftFolder) => void;
}) {
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(DEFAULT_PAGE_SIZE);

  if (viewMode === "details") {
    const paged = paginateRows(folders, page, pageSize);
    return (
      <div>
        <Table aria-label="Detail folder draf LPP">
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Nama folder</TableHead>
              <TableHead>Jumlah file</TableHead>
              <TableHead>Perubahan total</TableHead>
              <TableHead>Laporan terbaru</TableHead>
              <TableHead>Terakhir disimpan</TableHead>
              <TableHead className="pr-5">Bulan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.items.map((folder) => (
              <TableRow
                key={folder.id}
                onClick={() => !busy && onOpenFolder(folder)}
                className="cursor-pointer hover:bg-pln-ice/40"
              >
                <TableCell className="pl-5">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenFolder(folder);
                    }}
                    className="flex items-center gap-2.5 rounded-sm text-left font-medium text-pln-navy hover:underline focus-visible:outline-2 focus-visible:outline-pln-cyan disabled:opacity-50"
                  >
                    <Folder className="size-4 shrink-0 fill-pln-cyan/25 text-pln-navy" />
                    <span className="max-w-72 truncate">{folder.name}</span>
                    {!folder.available && (
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] font-normal text-zinc-500">
                        Arsip
                      </span>
                    )}
                  </button>
                </TableCell>
                <TableCell className="text-sm text-pln-charcoal">{folder.drafts.length} file</TableCell>
                <TableCell className="text-xs text-zinc-600">
                  {folder.totalChanges} sel · {folder.totalPhotos} foto
                </TableCell>
                <TableCell className="text-sm text-pln-charcoal">
                  {formatReportDate(folder.latestReportDate)}
                </TableCell>
                <TableCell className="text-xs text-zinc-500">
                  {formatDraftUpdatedAt(folder.latestUpdatedAt)}
                </TableCell>
                <TableCell className="pr-5">
                  <MonthBadges folder={folder} limit={2} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="border-t px-5 py-3">
          <TablePagination
            page={paged.page}
            totalPages={paged.totalPages}
            pageSize={pageSize}
            disabled={busy}
            onPageChange={setPage}
            onPageSizeChange={(nextSize) => { setPageSize(nextSize); setPage(1); }}
          />
        </div>
      </div>
    );
  }

  if (viewMode === "content") {
    return (
      <div className="divide-y rounded-xl border bg-white">
        {folders.map((folder) => (
          <button
            key={folder.id}
            type="button"
            disabled={busy}
            onClick={() => onOpenFolder(folder)}
            className="group flex w-full flex-col gap-3 px-4 py-3.5 text-left transition hover:bg-pln-ice/40 focus-visible:outline-2 focus-visible:outline-pln-cyan disabled:opacity-50 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-start gap-3.5">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-pln-cyan/10 text-pln-navy group-hover:bg-pln-cyan/20">
                <Folder className="size-5 fill-pln-cyan/25 text-pln-navy" />
              </div>
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold text-pln-navy group-hover:underline">{folder.name}</p>
                  {!folder.available && (
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-zinc-600">
                      Template tidak tersedia
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500">
                  {folder.drafts.length} file · {folder.totalChanges} sel · {folder.totalPhotos} foto
                </p>
                <MonthBadges folder={folder} />
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-4 pl-14 sm:pl-0">
              <div className="space-y-0.5 text-left sm:text-right">
                <p className="text-xs font-medium text-pln-charcoal">
                  Terbaru {formatReportDate(folder.latestReportDate)}
                </p>
                <p className="text-[11px] text-zinc-500">
                  Disimpan {formatDraftUpdatedAt(folder.latestUpdatedAt)}
                </p>
              </div>
              <ChevronRight className="size-4 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-pln-navy" />
            </div>
          </button>
        ))}
      </div>
    );
  }

  if (viewMode === "list") {
    return (
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {folders.map((folder) => (
          <button
            key={folder.id}
            type="button"
            disabled={busy}
            onClick={() => onOpenFolder(folder)}
            className="group flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-left transition hover:border-pln-cyan hover:bg-pln-ice/50 focus-visible:outline-2 focus-visible:outline-pln-cyan disabled:opacity-50"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <Folder className="size-4 shrink-0 fill-pln-cyan/25 text-pln-navy" />
              <span className="truncate text-sm font-medium text-pln-navy group-hover:underline">
                {folder.name}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2 text-xs text-zinc-500">
              <span>{folder.drafts.length} file</span>
              <ChevronRight className="size-3.5 text-zinc-400 group-hover:text-pln-navy" />
            </div>
          </button>
        ))}
      </div>
    );
  }

  if (viewMode === "small") {
    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {folders.map((folder) => (
          <button
            key={folder.id}
            type="button"
            disabled={busy}
            onClick={() => onOpenFolder(folder)}
            className="group flex items-center gap-2.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-left transition hover:border-pln-cyan hover:bg-pln-ice/50 focus-visible:outline-2 focus-visible:outline-pln-cyan disabled:opacity-50"
          >
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-pln-cyan/10 text-pln-navy">
              <Folder className="size-4 fill-pln-cyan/25 text-pln-navy" />
            </div>
            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-pln-navy group-hover:underline">
              {folder.name}
            </span>
            <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-zinc-600">
              {folder.drafts.length}
            </span>
          </button>
        ))}
      </div>
    );
  }

  if (viewMode === "extra-large" || viewMode === "large" || viewMode === "medium") {
    const spec = ICON_FOLDER_GRID[viewMode];
    return (
      <div className={cn("grid", spec.grid)}>
        {folders.map((folder) => (
          <button
            key={folder.id}
            type="button"
            disabled={busy}
            onClick={() => onOpenFolder(folder)}
            className="group flex flex-col items-center gap-2.5 rounded-xl border border-zinc-200 bg-white p-4 text-center transition hover:border-pln-cyan hover:bg-pln-ice/50 focus-visible:outline-2 focus-visible:outline-pln-cyan disabled:opacity-50"
          >
            <div
              className={cn(
                "flex shrink-0 items-center justify-center bg-pln-cyan/10 text-pln-navy transition-colors group-hover:bg-pln-cyan/20",
                spec.box
              )}
            >
              <Folder className={cn("fill-pln-cyan/25 text-pln-navy", spec.icon)} />
            </div>
            <div className="w-full min-w-0 space-y-1">
              <p
                className={cn(
                  "font-semibold text-pln-navy group-hover:underline",
                  viewMode === "extra-large" ? "line-clamp-2 text-sm" : "line-clamp-2 text-xs sm:text-sm"
                )}
              >
                {folder.name}
              </p>
              <p className="text-xs text-zinc-500">
                {folder.drafts.length} file
                {viewMode !== "medium" ? ` · Terbaru ${formatReportDate(folder.latestReportDate)}` : ""}
              </p>
              {viewMode === "extra-large" && (
                <>
                  <p className="text-[11px] text-zinc-500">
                    {folder.totalChanges} sel · {folder.totalPhotos} foto · {formatDraftUpdatedAt(folder.latestUpdatedAt)}
                  </p>
                  <div className="flex justify-center">
                    <MonthBadges folder={folder} limit={3} />
                  </div>
                </>
              )}
            </div>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {folders.map((folder) => (
        <button
          key={folder.id}
          type="button"
          disabled={busy}
          onClick={() => onOpenFolder(folder)}
          className="group flex items-start gap-3.5 rounded-xl border border-zinc-200 bg-white p-4 text-left transition hover:border-pln-cyan hover:bg-pln-ice/50 focus-visible:outline-2 focus-visible:outline-pln-cyan disabled:opacity-50"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-pln-cyan/10 text-pln-navy transition-colors group-hover:bg-pln-cyan/20">
            <Folder className="size-5 fill-pln-cyan/25 text-pln-navy" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate font-semibold text-pln-navy group-hover:underline">{folder.name}</p>
              <ChevronRight className="size-4 shrink-0 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-pln-navy" />
            </div>
            <p className="text-xs text-zinc-500">
              {folder.drafts.length} file · Terbaru {formatReportDate(folder.latestReportDate)}
            </p>
            <MonthBadges folder={folder} limit={3} />
          </div>
        </button>
      ))}
    </div>
  );
}

/** Renders files inside an opened folder across all 8 Explorer-style view modes. */
export function FolderFilesView({
  folder,
  drafts,
  viewMode,
  busy,
  onOpen,
  onExport,
  onDelete,
}: {
  folder: DraftFolder;
  drafts: DraftSummary[];
  viewMode: DraftViewMode;
  busy: boolean;
  onOpen: (draft: DraftSummary) => void;
  onExport: (draft: DraftSummary) => void;
  onDelete: (draft: DraftSummary) => void;
}) {
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(DEFAULT_PAGE_SIZE);
  const templateName = folder.available ? folder.name : undefined;

  if (viewMode === "details") {
    const paged = paginateRows(drafts, page, pageSize);
    return (
      <div>
        <Table aria-label={`Daftar file di folder ${folder.name}`}>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Nama file</TableHead>
              <TableHead>Tanggal laporan</TableHead>
              <TableHead>Ringkasan</TableHead>
              <TableHead>Diperbarui</TableHead>
              <TableHead className="pr-5 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.items.map((draft) => {
              const title = draftDisplayTitle(draft, templateName);
              const exportName = draftExportLabel(draft, templateName);
              const date = resolveReportDate(draft);
              const photoCount = draft.photoCount ?? Object.keys(draft.photos ?? {}).length;
              return (
                <TableRow key={draft.id}>
                  <TableCell className="pl-5">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onOpen(draft)}
                      className="flex w-full max-w-md flex-col items-start gap-0.5 rounded-sm text-left focus-visible:outline-2 focus-visible:outline-pln-cyan disabled:opacity-50"
                    >
                      <span className="flex w-full min-w-0 items-center gap-2 font-medium text-pln-navy hover:underline">
                        <FileSpreadsheet className="size-4 shrink-0 text-pln-cyan" />
                        <span className="truncate">{title}</span>
                      </span>
                      <span className="w-full truncate pl-6 text-xs text-zinc-500">{exportName}</span>
                    </button>
                  </TableCell>
                  <TableCell>
                    <time dateTime={date}>{formatReportDate(date)}</time>
                  </TableCell>
                  <TableCell className="text-xs text-zinc-500">
                    {draft.changes ?? 0} sel · {photoCount} foto
                  </TableCell>
                  <TableCell className="text-xs text-zinc-500">
                    {formatDraftUpdatedAt(draft.updatedAt)}
                  </TableCell>
                  <TableCell className="pr-5">
                    <DraftFileActions
                      title={title}
                      date={date}
                      busy={busy}
                      available={folder.available}
                      onOpen={() => onOpen(draft)}
                      onExport={() => onExport(draft)}
                      onDelete={() => onDelete(draft)}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <div className="border-t px-5 py-3">
          <TablePagination
            page={paged.page}
            totalPages={paged.totalPages}
            pageSize={pageSize}
            disabled={busy}
            onPageChange={setPage}
            onPageSizeChange={(nextSize) => { setPageSize(nextSize); setPage(1); }}
          />
        </div>
      </div>
    );
  }

  if (viewMode === "content" || viewMode === "list") {
    return (
      <div className="divide-y">
        {drafts.map((draft) => {
          const title = draftDisplayTitle(draft, templateName);
          const exportName = draftExportLabel(draft, templateName);
          const date = resolveReportDate(draft);
          const photoCount = draft.photoCount ?? Object.keys(draft.photos ?? {}).length;
          return (
            <div
              key={draft.id}
              className={cn(
                "flex flex-wrap items-center justify-between gap-3 px-5",
                viewMode === "list" ? "py-2.5" : "py-3.5"
              )}
            >
              <button
                type="button"
                disabled={busy}
                onClick={() => onOpen(draft)}
                className="flex min-w-0 flex-1 items-start gap-3 rounded-sm text-left focus-visible:outline-2 focus-visible:outline-pln-cyan disabled:opacity-50"
              >
                <FileSpreadsheet className="mt-0.5 size-4 shrink-0 text-pln-cyan" />
                <div className="min-w-0 space-y-0.5">
                  <p className="truncate text-sm font-medium text-pln-navy hover:underline">{title}</p>
                  {viewMode === "content" ? (
                    <>
                      <p className="truncate text-xs text-zinc-500">{exportName}</p>
                      <p className="text-xs text-zinc-500">
                        <time dateTime={date}>{formatReportDate(date)}</time> · {draft.changes ?? 0} sel · {photoCount} foto · Disimpan {formatDraftUpdatedAt(draft.updatedAt)}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-zinc-500">
                      <time dateTime={date}>{formatReportDate(date)}</time> · {draft.changes ?? 0} sel · {photoCount} foto
                    </p>
                  )}
                </div>
              </button>
              <DraftFileActions
                title={title}
                date={date}
                busy={busy}
                available={folder.available}
                compact={viewMode === "list"}
                onOpen={() => onOpen(draft)}
                onExport={() => onExport(draft)}
                onDelete={() => onDelete(draft)}
              />
            </div>
          );
        })}
      </div>
    );
  }

  const spec = ICON_FILE_GRID[viewMode];
  return (
    <div className={cn("grid p-5", spec.grid)}>
      {drafts.map((draft) => {
        const title = draftDisplayTitle(draft, templateName);
        const exportName = draftExportLabel(draft, templateName);
        const date = resolveReportDate(draft);
        const photoCount = draft.photoCount ?? Object.keys(draft.photos ?? {}).length;
        return (
          <div
            key={draft.id}
            className="flex flex-col justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-3.5 transition hover:border-pln-cyan/70"
          >
            <button
              type="button"
              disabled={busy}
              onClick={() => onOpen(draft)}
              className="flex items-start gap-3 rounded-sm text-left focus-visible:outline-2 focus-visible:outline-pln-cyan disabled:opacity-50"
            >
              <div className={cn("flex shrink-0 items-center justify-center bg-pln-cyan/10 text-pln-navy", spec.box)}>
                <FileSpreadsheet className={cn("text-pln-navy", spec.icon)} />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="line-clamp-2 text-sm font-semibold text-pln-navy hover:underline">{title}</p>
                <p className="text-xs text-zinc-500">
                  <time dateTime={date}>{formatReportDate(date)}</time>
                </p>
                {viewMode !== "small" && (
                  <p className="text-xs text-zinc-500">
                    {draft.changes ?? 0} sel · {photoCount} foto
                  </p>
                )}
                {viewMode === "extra-large" && (
                  <>
                    <p className="truncate text-[11px] text-zinc-500">{exportName}</p>
                    <p className="text-[11px] text-zinc-400">
                      Disimpan {formatDraftUpdatedAt(draft.updatedAt)}
                    </p>
                  </>
                )}
              </div>
            </button>
            <DraftFileActions
              title={title}
              date={date}
              busy={busy}
              available={folder.available}
              compact
              onOpen={() => onOpen(draft)}
              onExport={() => onExport(draft)}
              onDelete={() => onDelete(draft)}
            />
          </div>
        );
      })}
    </div>
  );
}

function DraftFileActions({
  title,
  date,
  busy,
  available,
  compact = false,
  onOpen,
  onExport,
  onDelete,
}: {
  title: string;
  date: string;
  busy: boolean;
  available: boolean;
  compact?: boolean;
  onOpen: () => void;
  onExport: () => void;
  onDelete: () => void;
}) {
  const formatted = formatReportDate(date);
  return (
    <div className="flex items-center justify-end gap-1.5">
      <Button
        variant="outline"
        size="sm"
        disabled={busy}
        aria-label={`Buka ${title}, ${formatted}`}
        onClick={onOpen}
      >
        Buka
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="text-pln-navy"
        disabled={busy || !available}
        aria-label={`Ekspor Excel ${title}, ${formatted}`}
        onClick={onExport}
      >
        <Download className="size-3.5" />
        {compact ? "Ekspor" : "Ekspor Excel"}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        disabled={busy}
        aria-label={`Hapus ${title}, ${formatted}`}
        onClick={onDelete}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}

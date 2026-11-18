"use client";

import * as React from "react";
import { ArrowUpDown, FileSpreadsheet, FolderOpen, Loader2, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TablePagination } from "@/components/ui/table-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DEFAULT_PAGE_SIZE, paginateRows } from "@/lib/pagination";
import type { DraftSummary } from "@/lib/lpp/draft-folders";
import {
  buildTemplateCatalogRows,
  filterTemplateCatalogRows,
  type TemplateFormatKind,
  type TemplateSortOrder,
} from "@/lib/lpp/template-catalog";
import type { LppTemplate } from "@/types/lpp";

const NEXT_SORT: Record<TemplateSortOrder, TemplateSortOrder> = {
  default: "asc",
  asc: "desc",
  desc: "default",
};

/** shadcn UI Data Table for browsing, searching, and opening LPP report templates. */
export function TemplateCatalogTable({
  templates,
  drafts,
  busy,
  openingTemplateId,
  onSelect,
  onOpenDrafts,
}: {
  templates: LppTemplate[];
  drafts: Pick<DraftSummary, "templateId">[];
  busy: boolean;
  openingTemplateId: string | null;
  onSelect: (templateId: string) => void;
  onOpenDrafts: (folderId?: string) => void;
}) {
  const [query, setQuery] = React.useState("");
  const [formatFilter, setFormatFilter] = React.useState<"all" | TemplateFormatKind>("all");
  const [sortOrder, setSortOrder] = React.useState<TemplateSortOrder>("default");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(DEFAULT_PAGE_SIZE);

  const rows = buildTemplateCatalogRows(templates, drafts);
  const visible = filterTemplateCatalogRows(rows, {
    query,
    format: formatFilter,
    sort: sortOrder,
  });
  const paged = paginateRows(visible, page, pageSize);

  const hasFilters = Boolean(query.trim()) || formatFilter !== "all" || sortOrder !== "default";
  const formatOptions: { value: "all" | TemplateFormatKind; label: string }[] = [
    { value: "all", label: "Semua jenis" },
    ...(rows.some((r) => r.formatKind === "documentation-table")
      ? [{ value: "documentation-table" as const, label: "Tabel dokumentasi" }]
      : []),
    ...(rows.some((r) => r.formatKind === "installation-form")
      ? [{ value: "installation-form" as const, label: "Form input" }]
      : []),
    ...(rows.some((r) => r.formatKind === "spreadsheet")
      ? [{ value: "spreadsheet" as const, label: "Spreadsheet" }]
      : []),
  ];

  function resetFilters() {
    setQuery("");
    setFormatFilter("all");
    setSortOrder("default");
    setPage(1);
  }

  return (
    <section
      aria-label="Daftar template LPP"
      className="space-y-4 rounded-xl border bg-white p-4 md:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-pln-navy">Daftar template LPP</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Cari dan pilih template untuk mulai mengisi laporan serta mengekspor Excel.
          </p>
        </div>
        <Badge variant="outline" className="h-6 border-zinc-200 bg-pln-ice/50 px-2.5 text-pln-navy">
          {templates.length} template tersedia
        </Badge>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="relative min-w-56 flex-1 sm:max-w-sm">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400"
            aria-hidden="true"
          />
          <Input
            type="search"
            aria-label="Cari template LPP"
            placeholder="Cari nama template atau jenis…"
            className="h-9 bg-white pl-9"
            value={query}
            onChange={(event) => { setQuery(event.target.value); setPage(1); }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {formatOptions.length > 2 && (
            <select
              aria-label="Filter jenis template"
              className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm text-pln-charcoal outline-hidden focus-visible:ring-2 focus-visible:ring-pln-cyan"
              value={formatFilter}
              onChange={(event) => { setFormatFilter(event.target.value as "all" | TemplateFormatKind); setPage(1); }}
            >
              {formatOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
          {hasFilters && (
            <Button variant="ghost" size="sm" className="h-9 text-zinc-600" onClick={resetFilters}>
              <X className="size-3.5" />
              Reset
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-md border">
        <Table aria-label="Tabel daftar template LPP">
          <TableHeader className="bg-zinc-50/80">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12 pl-4 text-zinc-500">No</TableHead>
              <TableHead>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="-ml-2 h-8 px-2 font-medium text-pln-charcoal hover:text-pln-navy"
                  onClick={() => { setSortOrder((current) => NEXT_SORT[current]); setPage(1); }}
                >
                  <span>Nama template</span>
                  <ArrowUpDown className="size-3.5 text-zinc-400" aria-hidden="true" />
                </Button>
              </TableHead>
              <TableHead>Jenis</TableHead>
              <TableHead>Draf</TableHead>
              <TableHead className="pr-4 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.items.map((row) => {
              const isOpening = busy && openingTemplateId === row.id;
              return (
                <TableRow key={row.id} className="hover:bg-pln-ice/40">
                  <TableCell className="pl-4 text-xs font-medium text-zinc-500 tabular-nums">
                    {String(row.index).padStart(2, "0")}
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onSelect(row.id)}
                      className="flex min-w-52 items-center gap-2.5 rounded-sm text-left font-medium text-pln-navy hover:underline focus-visible:outline-2 focus-visible:outline-pln-cyan disabled:opacity-50"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-pln-cyan/10 text-pln-navy">
                        <FileSpreadsheet className="size-4" aria-hidden="true" />
                      </span>
                      <span className="whitespace-normal leading-snug">{row.name}</span>
                    </button>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={row.formatKind === "documentation-table" ? "secondary" : "outline"}
                      className={
                        row.formatKind === "documentation-table"
                          ? "bg-pln-ice text-pln-navy"
                          : "border-zinc-200 text-zinc-600"
                      }
                    >
                      {row.formatLabel}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-zinc-500">
                    {row.draftCount > 0 ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onOpenDrafts(row.id)}
                        className="inline-flex items-center gap-1 rounded-sm font-medium text-pln-navy hover:underline focus-visible:outline-2 focus-visible:outline-pln-cyan disabled:opacity-50"
                      >
                        <FolderOpen className="size-3.5 text-pln-cyan" aria-hidden="true" />
                        <span>{row.draftCount} draf</span>
                      </button>
                    ) : (
                      <span>Belum ada draf</span>
                    )}
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      aria-label={`Buka template ${row.name}`}
                      className="border-zinc-200 text-pln-navy hover:border-pln-cyan hover:bg-pln-ice/60"
                      onClick={() => onSelect(row.id)}
                    >
                      {isOpening && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
                      {isOpening ? "Memuat…" : "Buka template"}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {!visible.length && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center">
                  <p className="text-sm font-medium text-pln-charcoal">
                    {templates.length ? "Template LPP tidak ditemukan" : "Template belum tersedia"}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {templates.length
                      ? "Ubah kata kunci pencarian atau filter jenis template."
                      : "Hubungi administrator untuk menambahkan template."}
                  </p>
                  {hasFilters && (
                    <Button variant="outline" size="sm" className="mt-3" onClick={resetFilters}>
                      Tampilkan semua template
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
        <span>
          Menampilkan {paged.totalItems ? paged.startIndex + 1 : 0}–{paged.endIndex} dari {rows.length} template
        </span>
        <span>Klik nama template atau &ldquo;Buka template&rdquo; untuk mulai menyusun laporan.</span>
      </div>
      <TablePagination
        page={paged.page}
        totalPages={paged.totalPages}
        pageSize={pageSize}
        disabled={busy}
        onPageChange={setPage}
        onPageSizeChange={(nextSize) => { setPageSize(nextSize); setPage(1); }}
      />
    </section>
  );
}

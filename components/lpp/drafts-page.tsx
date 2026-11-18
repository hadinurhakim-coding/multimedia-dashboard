"use client";

import * as React from "react";
import {
  ArrowLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Folder,
  FolderOpen,
  Loader2,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { DraftViewMenu } from "@/components/lpp/draft-view-menu";
import { FolderCollectionView, FolderFilesView } from "@/components/lpp/draft-browser-views";
import { summarizeSelection, toggleSelectionSet } from "@/lib/lpp/bulk-export";
import {
  buildDraftFolders,
  DEFAULT_FILE_VIEW_MODE,
  DEFAULT_FOLDER_VIEW_MODE,
  filterFolderDrafts,
  isDraftViewMode,
  type DraftFolder,
  type DraftSummary,
  type DraftViewMode,
} from "@/lib/lpp/draft-folders";
import { resolveReportDate } from "@/lib/lpp/report-date";
import { cn } from "@/lib/utils";
import type { LppTemplate } from "@/types/lpp";

const FOLDER_VIEW_KEY = "lpp-drafts-folder-view";
const FILE_VIEW_KEY = "lpp-drafts-file-view";

function useStoredViewMode(
  key: string,
  fallback: DraftViewMode
): [DraftViewMode, (next: DraftViewMode) => void] {
  const [memoryMode, setMemoryMode] = React.useState<DraftViewMode | null>(null);
  const subscribe = React.useCallback(
    (listener: () => void) => {
      const onStorage = (event: StorageEvent) => {
        if (event.key === key) listener();
      };
      const eventName = `lpp-view:${key}`;
      window.addEventListener("storage", onStorage);
      window.addEventListener(eventName, listener);
      return () => {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener(eventName, listener);
      };
    },
    [key]
  );
  const storedMode = React.useSyncExternalStore(
    subscribe,
    () => {
      try {
        const value = window.localStorage.getItem(key);
        return isDraftViewMode(value) ? value : fallback;
      } catch {
        return fallback;
      }
    },
    () => fallback
  );
  const setMode = (next: DraftViewMode) => {
    setMemoryMode(next);
    try {
      window.localStorage.setItem(key, next);
      window.dispatchEvent(new Event(`lpp-view:${key}`));
    } catch {
      // Fall back to in-memory state when localStorage is blocked.
    }
  };
  return [memoryMode ?? storedMode, setMode];
}

export function DraftsPage({
  drafts,
  templates,
  busy,
  exportingBulk = false,
  folderId,
  onFolderChange,
  monthFilter: controlledMonthFilter,
  onMonthFilterChange,
  onBack,
  onOpen,
  onExport,
  onBulkExport,
  onDelete,
}: {
  drafts: DraftSummary[];
  templates: LppTemplate[];
  busy: boolean;
  exportingBulk?: boolean;
  folderId?: string | null;
  onFolderChange?: (folderId: string | null) => void;
  monthFilter?: string;
  onMonthFilterChange?: (monthKey: string) => void;
  onBack: () => void;
  onOpen: (draft: DraftSummary) => void;
  onExport: (draft: DraftSummary) => void;
  onBulkExport: (drafts: DraftSummary[], folderName?: string | null) => void;
  onDelete: (draft: DraftSummary) => void;
}) {
  const [internalFolderId, setInternalFolderId] = React.useState<string | null>(null);
  const [internalMonthFilter, setInternalMonthFilter] = React.useState<string>("all");
  const [selectedFolderIdsRaw, setSelectedFolderIdsRaw] = React.useState<ReadonlySet<string>>(() => new Set());
  const [selectedDraftIdsRaw, setSelectedDraftIdsRaw] = React.useState<ReadonlySet<string>>(() => new Set());
  const selectedFolderId = folderId !== undefined ? folderId : internalFolderId;
  const setSelectedFolderId = (next: string | null) => {
    if (onFolderChange) onFolderChange(next);
    else setInternalFolderId(next);
  };
  const monthFilter = controlledMonthFilter !== undefined ? controlledMonthFilter : internalMonthFilter;
  const setMonthFilter = (next: string) => {
    if (onMonthFilterChange) onMonthFilterChange(next);
    else setInternalMonthFilter(next);
  };
  const [searchQuery, setSearchQuery] = React.useState("");
  const [folderView, setFolderView] = useStoredViewMode(FOLDER_VIEW_KEY, DEFAULT_FOLDER_VIEW_MODE);
  const [fileView, setFileView] = useStoredViewMode(FILE_VIEW_KEY, DEFAULT_FILE_VIEW_MODE);

  const folders = React.useMemo(
    () => buildDraftFolders(drafts, templates),
    [drafts, templates]
  );

  const activeFolder = React.useMemo(
    () => folders.find((folder) => folder.id === selectedFolderId) ?? null,
    [folders, selectedFolderId]
  );

  function updateViewMode(nextMode: DraftViewMode) {
    if (activeFolder) setFileView(nextMode);
    else setFolderView(nextMode);
  }

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

  const exportableFolders = React.useMemo(
    () => folders.filter((folder) => folder.available && folder.drafts.length > 0),
    [folders]
  );
  const visibleExportableFolderIds = React.useMemo(
    () => visibleFolders.filter((folder) => folder.available && folder.drafts.length > 0).map((folder) => folder.id),
    [visibleFolders]
  );
  const selectedFolderIds = React.useMemo(() => {
    const validIds = new Set(exportableFolders.map((folder) => folder.id));
    return new Set([...selectedFolderIdsRaw].filter((id) => validIds.has(id)));
  }, [exportableFolders, selectedFolderIdsRaw]);
  const selectedFolderDrafts = React.useMemo(
    () => exportableFolders.filter((folder) => selectedFolderIds.has(folder.id)).flatMap((folder) => folder.drafts),
    [exportableFolders, selectedFolderIds]
  );
  const folderSelection = summarizeSelection(selectedFolderIds, visibleExportableFolderIds);

  const selectedDraftIds = React.useMemo(() => {
    if (!activeFolder || !activeFolder.available) return new Set<string>();
    const validIds = new Set(activeFolder.drafts.map((item) => item.id));
    return new Set([...selectedDraftIdsRaw].filter((id) => validIds.has(id)));
  }, [activeFolder, selectedDraftIdsRaw]);
  const selectedFileDrafts = React.useMemo(() => {
    if (!activeFolder || !activeFolder.available) return [];
    return activeFolder.drafts.filter((item) => selectedDraftIds.has(item.id));
  }, [activeFolder, selectedDraftIds]);
  const visibleExportableDraftIds = React.useMemo(
    () => (activeFolder?.available ? visibleFolderDrafts.map((item) => item.id) : []),
    [activeFolder, visibleFolderDrafts]
  );
  const fileSelection = summarizeSelection(selectedDraftIds, visibleExportableDraftIds);

  function openFolder(folder: DraftFolder) {
    setSelectedFolderId(folder.id);
    setSelectedFolderIdsRaw(new Set());
    setSelectedDraftIdsRaw(new Set());
    setMonthFilter("all");
    setSearchQuery("");
  }

  function returnToFolders() {
    setSelectedFolderId(null);
    setSelectedDraftIdsRaw(new Set());
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

          <div className="flex flex-wrap items-center justify-end gap-2.5">
            <DraftViewMenu
              value={activeFolder ? fileView : folderView}
              disabled={busy}
              onChange={updateViewMode}
            />
            <span className="hidden h-4 w-px bg-zinc-200 sm:inline-block" aria-hidden="true" />
            <span className="text-sm text-zinc-500">
              {activeFolder
                ? `${visibleFolderDrafts.length} file`
                : `${folders.length} folder · ${drafts.length} draf`}
            </span>
          </div>
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
            <div>
              <BulkExportBar
                selectAllLabel={`Pilih semua folder (${visibleExportableFolderIds.length})`}
                allSelected={folderSelection.allVisibleSelected}
                someSelected={folderSelection.someVisibleSelected}
                selectedCount={selectedFolderDrafts.length}
                selectionText={
                  selectedFolderIds.size > 0
                    ? `${selectedFolderIds.size} folder (${selectedFolderDrafts.length} file) dipilih`
                    : ""
                }
                disabled={busy || !visibleExportableFolderIds.length}
                exportDisabled={busy || !selectedFolderDrafts.length}
                exporting={exportingBulk}
                hint={!exportableFolders.length ? "Template folder belum tersedia untuk ekspor." : undefined}
                onToggleAll={(checked) =>
                  setSelectedFolderIdsRaw((current) =>
                    toggleSelectionSet(current, visibleExportableFolderIds, checked)
                  )
                }
                onClear={() => setSelectedFolderIdsRaw(new Set())}
                onExport={() =>
                  onBulkExport(
                    selectedFolderDrafts,
                    selectedFolderIds.size === 1
                      ? exportableFolders.find((folder) => selectedFolderIds.has(folder.id))?.name ?? null
                      : null
                  )
                }
              />
              {folderView === "details" ? (
                <FolderCollectionView
                  folders={visibleFolders}
                  viewMode={folderView}
                  busy={busy}
                  selectedFolderIds={selectedFolderIds}
                  onToggleFolder={(id, checked) =>
                    setSelectedFolderIdsRaw((current) => toggleSelectionSet(current, [id], checked))
                  }
                  onToggleFolders={(ids, checked) =>
                    setSelectedFolderIdsRaw((current) => toggleSelectionSet(current, ids, checked))
                  }
                  onOpenFolder={openFolder}
                />
              ) : (
                <div className="space-y-4 p-5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Folder Template
                    </h2>
                    <span className="text-xs text-zinc-400">Klik folder untuk membuka file di dalamnya</span>
                  </div>
                  <FolderCollectionView
                    folders={visibleFolders}
                    viewMode={folderView}
                    busy={busy}
                    selectedFolderIds={selectedFolderIds}
                    onToggleFolder={(id, checked) =>
                      setSelectedFolderIdsRaw((current) => toggleSelectionSet(current, [id], checked))
                    }
                    onToggleFolders={(ids, checked) =>
                      setSelectedFolderIdsRaw((current) => toggleSelectionSet(current, ids, checked))
                    }
                    onOpenFolder={openFolder}
                  />
                </div>
              )}
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
              <div>
                <BulkExportBar
                  selectAllLabel={`Pilih semua (${visibleExportableDraftIds.length})`}
                  allSelected={fileSelection.allVisibleSelected}
                  someSelected={fileSelection.someVisibleSelected}
                  selectedCount={selectedFileDrafts.length}
                  selectionText={
                    selectedFileDrafts.length > 0 ? `${selectedFileDrafts.length} file dipilih` : ""
                  }
                  disabled={busy || !visibleExportableDraftIds.length}
                  exportDisabled={busy || !activeFolder.available || !selectedFileDrafts.length}
                  exporting={exportingBulk}
                  hint={!activeFolder.available ? "Template folder tidak tersedia — ekspor dinonaktifkan." : undefined}
                  onToggleAll={(checked) =>
                    setSelectedDraftIdsRaw((current) =>
                      toggleSelectionSet(current, visibleExportableDraftIds, checked)
                    )
                  }
                  onClear={() => setSelectedDraftIdsRaw(new Set())}
                  onExport={() => onBulkExport(selectedFileDrafts, activeFolder.name)}
                />
                <FolderFilesView
                  folder={activeFolder}
                  drafts={visibleFolderDrafts}
                  viewMode={fileView}
                  busy={busy}
                  selectedDraftIds={selectedDraftIds}
                  onToggleDraft={(id, checked) =>
                    setSelectedDraftIdsRaw((current) => toggleSelectionSet(current, [id], checked))
                  }
                  onToggleDrafts={(ids, checked) =>
                    setSelectedDraftIdsRaw((current) => toggleSelectionSet(current, ids, checked))
                  }
                  onOpen={onOpen}
                  onExport={onExport}
                  onDelete={onDelete}
                />
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function BulkExportBar({
  selectAllLabel,
  allSelected,
  someSelected,
  selectedCount,
  selectionText,
  disabled,
  exportDisabled,
  exporting,
  hint,
  onToggleAll,
  onClear,
  onExport,
}: {
  selectAllLabel: string;
  allSelected: boolean;
  someSelected: boolean;
  selectedCount: number;
  selectionText: string;
  disabled: boolean;
  exportDisabled: boolean;
  exporting: boolean;
  hint?: string;
  onToggleAll: (checked: boolean) => void;
  onClear: () => void;
  onExport: () => void;
}) {
  const selectAllId = React.useId();
  return (
    <div
      data-slot="bulk-export-bar"
      className="flex flex-wrap items-center justify-between gap-3 border-b bg-zinc-50/80 px-5 py-2.5"
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id={selectAllId}
            checked={allSelected}
            indeterminate={someSelected}
            disabled={disabled}
            onCheckedChange={onToggleAll}
          />
          <label
            htmlFor={selectAllId}
            className="cursor-pointer select-none text-xs font-medium text-pln-charcoal"
          >
            {selectAllLabel}
          </label>
        </div>
        {selectionText && (
          <div className="flex items-center gap-1.5">
            <span className="rounded-full bg-pln-cyan/15 px-2.5 py-0.5 text-xs font-semibold text-pln-navy">
              {selectionText}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              disabled={disabled}
              onClick={onClear}
            >
              Bersihkan
            </Button>
          </div>
        )}
        {hint && <span className="text-xs text-zinc-500">{hint}</span>}
      </div>

      <Button
        type="button"
        size="sm"
        variant={selectedCount > 0 ? "default" : "outline"}
        disabled={exportDisabled}
        aria-busy={exporting}
        title={
          selectedCount > 1
            ? `Unduh ${selectedCount} file Excel terpilih dalam satu arsip ZIP`
            : selectedCount === 1
              ? "Unduh 1 file Excel terpilih"
              : "Pilih minimal 1 item untuk ekspor Excel"
        }
        className={selectedCount > 0 ? "bg-pln-navy text-white hover:bg-pln-navy/90" : "text-pln-navy"}
        onClick={onExport}
      >
        {exporting ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <Download className="size-3.5" aria-hidden="true" />
        )}
        {exporting
          ? "Mengekspor…"
          : selectedCount > 0
            ? `Ekspor Excel (${selectedCount})`
            : "Ekspor Excel masal"}
      </Button>
    </div>
  );
}

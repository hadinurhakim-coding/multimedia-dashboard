"use client";

import * as React from "react";
import {
  ArrowLeft,
  ChevronRight,
  FileSpreadsheet,
  Folder,
  FolderOpen,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DraftViewMenu } from "@/components/lpp/draft-view-menu";
import { FolderCollectionView, FolderFilesView } from "@/components/lpp/draft-browser-views";
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
          ) : folderView === "details" ? (
            <FolderCollectionView
              folders={visibleFolders}
              viewMode={folderView}
              busy={busy}
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
                onOpenFolder={openFolder}
              />
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
              <FolderFilesView
                folder={activeFolder}
                drafts={visibleFolderDrafts}
                viewMode={fileView}
                busy={busy}
                onOpen={onOpen}
                onExport={onExport}
                onDelete={onDelete}
              />
            )}
          </div>
        )}
      </section>
    </div>
  );
}

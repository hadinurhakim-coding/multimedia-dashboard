"use client";

import { useId, useState, type ReactNode } from "react";
import { Eye, FileSpreadsheet, ImageIcon, Pencil, RotateCcw, Search, Upload } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { TablePagination } from "@/components/ui/table-pagination";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DEFAULT_PAGE_SIZE, paginateRows } from "@/lib/pagination";
import { PhotoPreview } from "./photo-form";
import { formPhotoSlots, readFormField, type LppForm } from "@/lib/lpp/form";
import { MAX_PHOTO_BYTES, PHOTO_TYPES } from "@/lib/lpp/photo-policy";
import { lppPhotoWatermark } from "@/lib/lpp/naming";
import type { CellEdit, LppPhotos, LppWorkbook } from "@/types/lpp";

// Adapts the Base UI table-16 thumbnail/description/checkbox/action layout:
// https://shadcnstudio.com/docs/components/table?base=base
export function DocumentationTable({ form, workbook, edits, templateId, templateName, reportDate, photos, busy, onUpload, onReset, showEditor, onToggleEditor, editorControls, editor }: {
  form: LppForm; workbook: LppWorkbook; edits: Record<string, CellEdit>; templateId: string;
  templateName: string; reportDate: string;
  photos: LppPhotos; busy: boolean; onUpload: (slotId: string, file: File) => Promise<void>; onReset: (slotId: string) => void;
  showEditor: boolean; onToggleEditor: () => void; editorControls: ReactNode; editor: ReactNode;
}) {
  const contentId = useId();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const slots = formPhotoSlots(form);
  const itemSlots = (id: string) => slots.filter((slot) => slot.itemId === id);
  const itemName = (item: LppForm["items"][number]) => readFormField(item.fields[0], workbook, edits);
  const location = (item: LppForm["items"][number]) => readFormField(item.fields[1], workbook, edits);
  let watermark = "";
  try { if (form.reportHeader) watermark = lppPhotoWatermark(templateName, reportDate); } catch { /* The date field may be temporarily empty while editing. */ }
  const hasSlotPhoto = (slotId: string) => {
    const slot = slots.find((entry) => entry.id === slotId);
    return Boolean(photos[slotId]) || slot?.hasTemplatePhoto !== false;
  };
  const source = (slotId: string, thumbnail = false) => {
    if (watermark && !thumbnail) {
      const params = new URLSearchParams({ watermark: "1", reportDate, ...(photos[slotId] ? { photo: photos[slotId] } : {}) });
      return `/api/lpp/templates/${templateId}/photos/${slotId}?${params}`;
    }
    return (photos[slotId] ? `/api/lpp/photos/${photos[slotId]}` : `/api/lpp/templates/${templateId}/photos/${slotId}`) + (thumbnail ? "?thumbnail=1" : "");
  };
  const visible = form.items.filter((item) => `${item.number} ${itemName(item)} ${location(item)}`.toLowerCase().includes(search.trim().toLowerCase()) && (filter !== "updated" || itemSlots(item.id).some((slot) => photos[slot.id])));
  const paged = paginateRows(visible, page, pageSize);
  const allSelected = visible.length > 0 && visible.every((item) => selected.includes(item.id));
  const someSelected = visible.some((item) => selected.includes(item.id));
  const selectedChanges = slots.filter((slot) => selected.includes(slot.itemId) && photos[slot.id]);
  const activeItem = form.items.find((item) => item.id === active);
  function open(id: string, edit: boolean) { setActive(id); setEditing(edit); setError(""); setMessage(""); }
  async function upload(slotId: string, file?: File) {
    if (!file) return;
    setError(""); setMessage("");
    if (!PHOTO_TYPES.includes(file.type) || !file.size || file.size > MAX_PHOTO_BYTES) { setError("Pilih foto JPG, PNG, atau WebP maksimal 4 MB."); return; }
    try { await onUpload(slotId, file); setMessage("Foto terbaru siap. Simpan draf atau ekspor Excel untuk menyimpan perubahan laporan."); }
    catch (error) { setError(error instanceof Error ? error.message : "Unggah foto gagal. Coba lagi."); }
  }
  function reset(ids: string[]) {
    ids.forEach(onReset); setError(""); setMessage("Foto template dipulihkan. Simpan draf untuk menyimpan perubahan laporan.");
  }
  return <div className="space-y-4 rounded-xl border bg-white p-4 md:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-base font-semibold text-pln-navy">{showEditor ? "Data laporan" : "Dokumentasi foto"}</h2><p className="mt-1 text-sm text-zinc-500">{showEditor ? "Pilih sheet untuk mengubah data laporan. Tutup editor untuk kembali ke foto dokumentasi." : "Klik thumbnail untuk melihat foto, atau ikon pensil untuk mengunggah foto terbaru."}</p></div>
      <span className="text-xs text-zinc-500">{showEditor ? `${workbook.sheets.length} sheet` : `${form.items.length} material · ${slots.length} foto`}</span>
    </div>
    {!showEditor && form.reportHeader && <p className="text-xs text-zinc-500">{watermark ? <>Watermark pada setiap foto ekspor: <span className="font-medium text-pln-navy">{watermark}</span></> : "Isi tanggal laporan untuk menampilkan watermark foto."}</p>}
    <div className="flex flex-wrap items-center gap-2">
      {!showEditor && <><div className="relative min-w-48 flex-1 sm:max-w-sm"><Search className="absolute left-3 top-2.5 size-4 text-zinc-400" /><Input aria-label="Cari material atau lokasi" placeholder="Cari material atau lokasi…" className="h-9 pl-9" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></div>
      <select aria-label="Filter foto dokumentasi" className="h-9 rounded-md border bg-white px-3 text-sm" value={filter} onChange={(event) => { setFilter(event.target.value); setPage(1); }}><option value="all">Semua foto</option><option value="updated">Foto diperbarui</option></select>
      {selected.length > 0 && <><span className="text-xs text-zinc-500">{selected.length} material dipilih</span><Button variant="outline" disabled={busy || !selectedChanges.length} onClick={() => reset(selectedChanges.map((slot) => slot.id))}><RotateCcw className="size-4" />Pulihkan pilihan</Button></>}
      </>}
      <Button variant="outline" className="h-9" disabled={busy} aria-expanded={showEditor} aria-controls={contentId} onClick={onToggleEditor}><FileSpreadsheet className="size-4" />{showEditor ? "Tutup editor data laporan" : "Edit data laporan"}</Button>
      {showEditor && editorControls}
    </div>
    <div id={contentId} className="space-y-4">{showEditor ? editor : <>
    <div className="overflow-hidden rounded-md border"><Table aria-label="Tabel dokumentasi foto">
      <TableHeader><TableRow className="hover:bg-transparent">
        <TableHead className="w-10 pl-3"><Checkbox aria-label="Pilih semua material yang terlihat" disabled={busy || !visible.length} checked={allSelected} indeterminate={!allSelected && someSelected} onCheckedChange={(checked) => setSelected((current) => checked ? [...new Set([...current, ...visible.map((item) => item.id)])] : current.filter((id) => !visible.some((item) => item.id === id)))} /></TableHead>
        <TableHead>Material</TableHead><TableHead>Lokasi pemasangan</TableHead><TableHead>Foto terbaru</TableHead><TableHead className="pr-3 text-right">Aksi</TableHead>
      </TableRow></TableHeader>
      <TableBody>{paged.items.map((item) => {
        const images = itemSlots(item.id), changed = images.filter((slot) => photos[slot.id]).length;
        const allBlank = images.every((slot) => slot.hasTemplatePhoto === false);
        const statusLabel = changed ? `${changed}/${images.length} diperbarui` : allBlank ? "Belum ada foto" : "Foto template";
        return <TableRow key={item.id} data-state={selected.includes(item.id) ? "selected" : undefined}>
          <TableCell className="pl-3"><Checkbox aria-label={`Pilih material ${item.number}`} checked={selected.includes(item.id)} disabled={busy} onCheckedChange={(checked) => setSelected((current) => checked ? [...new Set([...current, item.id])] : current.filter((id) => id !== item.id))} /></TableCell>
          <TableCell><div className="flex min-w-60 items-center gap-3">
            <button type="button" className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-pln-cyan" aria-label={`Lihat foto material ${item.number}`} onClick={() => open(item.id, false)} disabled={busy}>
              <Avatar className="size-10 overflow-hidden rounded-sm after:rounded-[inherit]">{hasSlotPhoto(images[0].id) && <AvatarImage src={source(images[0].id, true)} alt={`Thumbnail material ${item.number}`} className="rounded-none! object-contain" />}<AvatarFallback className="rounded-sm"><ImageIcon className="size-4" /></AvatarFallback></Avatar>
            </button>
            <div><p className="max-w-80 whitespace-normal font-medium">{itemName(item) || "Material belum diisi"}</p><span className="mt-0.5 block text-xs text-zinc-500">Dokumentasi {String(item.number).padStart(2, "0")} · {images.length} foto</span></div>
          </div></TableCell>
          <TableCell className="max-w-56 whitespace-normal text-zinc-600">{location(item) || "—"}</TableCell>
          <TableCell><span className={`inline-flex items-center gap-1.5 text-xs ${changed ? "text-emerald-700" : "text-zinc-500"}`}><span className={`size-1.5 rounded-full ${changed ? "bg-emerald-500" : "bg-zinc-300"}`} />{statusLabel}</span></TableCell>
          <TableCell className="pr-3"><div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" className="rounded-full" title="Ubah foto" aria-label={`Ubah foto material ${item.number}`} disabled={busy} onClick={() => open(item.id, true)}><Pencil /></Button>
            <Button variant="ghost" size="icon" className="rounded-full" title="Pratinjau foto" aria-label={`Pratinjau material ${item.number}`} disabled={busy} onClick={() => open(item.id, false)}><Eye /></Button>
            <Button variant="ghost" size="icon" className="rounded-full" title="Gunakan foto template" aria-label={`Pulihkan foto material ${item.number}`} disabled={busy || !changed} onClick={() => reset(images.filter((slot) => photos[slot.id]).map((slot) => slot.id))}><RotateCcw /></Button>
          </div></TableCell>
        </TableRow>;
      })}{!visible.length && <TableRow><TableCell colSpan={5} className="py-10 text-center text-zinc-500">Tidak ada material yang sesuai pencarian atau filter.</TableCell></TableRow>}</TableBody>
    </Table></div>
    <div className="flex flex-wrap justify-between gap-2 text-xs text-zinc-500"><span>Menampilkan {paged.totalItems ? paged.startIndex + 1 : 0}–{paged.endIndex} dari {form.items.length} material</span><span>{slots.filter((slot) => photos[slot.id]).length} foto diperbarui · Foto dan ekspor hanya untuk pengguna yang diizinkan.</span></div>
    <TablePagination
      page={paged.page}
      totalPages={paged.totalPages}
      pageSize={pageSize}
      disabled={busy}
      onPageChange={setPage}
      onPageSizeChange={(nextSize) => { setPageSize(nextSize); setPage(1); }}
    />
    {!activeItem && message && <p role="status" className="text-sm text-pln-navy">{message}</p>}
    </>}</div>
    <Dialog open={Boolean(activeItem)} onOpenChange={(open) => { if (!open && !busy) setActive(null); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader><DialogTitle>{editing ? "Ubah foto dokumentasi" : "Pratinjau dokumentasi"}</DialogTitle><DialogDescription>{activeItem ? `${itemName(activeItem) || "Material belum diisi"} · ${location(activeItem) || "Lokasi belum diisi"}` : ""}</DialogDescription></DialogHeader>
        {watermark && <p className="text-xs text-zinc-500">Watermark mengikuti tanggal header laporan dan tercetak pada setiap foto di Excel.</p>}
        {activeItem && <div className={`grid gap-5 ${itemSlots(activeItem.id).length > 1 ? "sm:grid-cols-2" : ""}`}>
          {itemSlots(activeItem.id).map((slot, index) => <div key={slot.id} className="min-w-0 space-y-3">
            <div className="flex justify-between text-sm"><span className="font-medium">Foto {index + 1}</span><span className="text-xs text-zinc-500">{photos[slot.id] ? "Foto unggahan" : slot.hasTemplatePhoto === false ? "Belum ada foto" : "Foto template"}</span></div>
            {hasSlotPhoto(slot.id) ? <PhotoPreview key={source(slot.id)} src={source(slot.id)} alt={`Foto ${index + 1} material ${activeItem.number}`} /> : <div className="flex aspect-[4/3] flex-col items-center justify-center rounded-lg border border-dashed bg-zinc-50 px-4 text-center text-sm text-zinc-500"><ImageIcon className="mb-2 size-6 text-zinc-400" />Belum ada foto untuk baris ini.</div>}
            {editing && <>
              <label htmlFor={`upload-${slot.id}`} className="flex items-center gap-2 text-sm font-medium"><Upload className="size-4" />Unggah foto {index + 1}</label>
              <Input id={`upload-${slot.id}`} aria-label={`Unggah foto ${index + 1} material ${activeItem.number}`} type="file" accept="image/jpeg,image/png,image/webp" className="h-auto py-2" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; void upload(slot.id, file); }} />
              {photos[slot.id] && <Button variant="outline" disabled={busy} onClick={() => reset([slot.id])}><RotateCcw className="size-4" />{slot.hasTemplatePhoto === false ? `Hapus foto ${index + 1}` : `Gunakan foto template ${index + 1}`}</Button>}
            </>}
          </div>)}
        </div>}
        {editing && <p className="text-xs text-zinc-500">JPG, PNG, atau WebP · maksimal 4 MB per foto. Foto memenuhi bingkai Excel tanpa ruang kosong; tepi yang berlebih dipotong dari tengah.</p>}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <p role="status" aria-live="polite" className="text-sm text-pln-navy">{busy ? "Mengunggah foto…" : message}</p>
        <DialogFooter>{!editing && <Button variant="outline" onClick={() => setEditing(true)}><Pencil className="size-4" />Ubah foto</Button>}<Button disabled={busy} onClick={() => setActive(null)} className="bg-pln-navy text-white">Selesai</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}

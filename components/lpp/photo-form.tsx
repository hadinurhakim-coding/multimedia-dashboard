"use client";

import { useState } from "react";
import { ImageIcon, RotateCcw, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { readFormField, type LppForm } from "@/lib/lpp/form";
import { prepareValidatedPhotoUpload } from "@/lib/lpp/photo-client";
import type { CellEdit, LppPhotos, LppWorkbook } from "@/types/lpp";

export function PhotoPreview({ src, alt }: { src: string; alt: string }) {
  const [status, setStatus] = useState("loading");
  return <div className={`relative flex items-center justify-center overflow-hidden rounded-lg border bg-zinc-50 ${status === "ready" ? "" : "aspect-[4/3]"}`}>
    {status !== "ready" && <div role="status" className="absolute px-4 text-center text-sm text-zinc-500"><ImageIcon className="mx-auto mb-2 size-6" />{status === "loading" ? "Memuat pratinjau…" : "Pratinjau belum dapat dimuat. Coba pilih perangkat lagi."}</div>}
    {/* Private images must bypass Next's public image optimizer/cache. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={src} alt={alt} className={`block h-auto w-full ${status === "ready" ? "" : "invisible"}`} onLoad={() => setStatus("ready")} onError={() => setStatus("error")} />
  </div>;
}

export function PhotoForm({ form, workbook, edits, templateId, photos, busy, onUpload, onReset }: {
  form: LppForm; workbook: LppWorkbook; edits: Record<string, CellEdit>; templateId: string;
  photos: LppPhotos; busy: boolean; onUpload: (itemId: string, file: File) => Promise<void>; onReset: (itemId: string) => void;
}) {
  const [selectedId, setSelectedId] = useState(form.items[0].id);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const selected = form.items.find((item) => item.id === selectedId)!;
  const name = readFormField(selected.fields[0], workbook, edits);
  const location = readFormField(selected.fields[3], workbook, edits);
  const photoId = photos[selectedId];
  const src = photoId ? `/api/lpp/photos/${photoId}` : `/api/lpp/templates/${templateId}/photos/${selectedId}`;
  async function choose(file?: File) {
    if (!file) return;
    setError(""); setStatus("");
    const prepared = await prepareValidatedPhotoUpload(file);
    if (!prepared.ok) { setError(prepared.error); return; }
    try { await onUpload(selectedId, prepared.file); setStatus("Foto siap digunakan. Simpan draf atau ekspor Excel untuk menyimpan perubahan laporan."); }
    catch (error) { setError(error instanceof Error ? error.message : "Foto belum berhasil diunggah. Coba lagi."); }
  }
  return <Card className="shadow-none">
    <CardHeader><CardTitle className="text-base text-pln-navy">3. Foto dokumentasi</CardTitle><CardDescription>Pilih perangkat, lalu unggah satu foto dokumentasi untuk menggantikan foto pada Excel.</CardDescription></CardHeader>
    <CardContent className="space-y-5">
      <div className="space-y-2"><label htmlFor="lpp-photo-device" className="text-sm font-medium">Perangkat yang didokumentasikan</label>
        <select id="lpp-photo-device" className="h-10 w-full min-w-0 rounded-md border bg-white px-3 text-sm" value={selectedId} disabled={busy} onChange={(event) => { setSelectedId(event.target.value); setError(""); setStatus(""); }}>
          {form.items.map((item) => <option key={item.id} value={item.id}>{item.number}. {readFormField(item.fields[0], workbook, edits) || "Perangkat belum diberi nama"}{photos[item.id] ? " — Foto unggahan" : ""}</option>)}
        </select>
      </div>
      <div className="grid gap-5 md:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <div className="space-y-2"><PhotoPreview key={src} src={src} alt={`Dokumentasi perangkat ${selected.number}: ${name}`} /><p className="text-xs text-zinc-500">{photoId ? "Foto unggahan Anda" : "Foto dari template asli"}</p></div>
        <div className="min-w-0 space-y-4">
          <div><p className="text-sm font-medium">{name}</p><p className="mt-1 text-sm text-zinc-500">{location}</p></div>
          <div className="space-y-2"><label htmlFor="lpp-photo-file" className="flex items-center gap-2 text-sm font-medium"><Upload className="size-4" />Unggah foto dokumentasi</label>
            <Input id="lpp-photo-file" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} aria-describedby="lpp-photo-help" className="h-auto py-2" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; void choose(file); }} />
            <p id="lpp-photo-help" className="text-xs leading-relaxed text-zinc-500">JPG, PNG, atau WebP · maksimal 4 MB. Foto memenuhi bingkai Excel tanpa ruang kosong; tepi yang berlebih dipotong dari tengah. Foto tersimpan privat di akun Anda.</p>
          </div>
          <Button type="button" variant="outline" disabled={busy || !photoId} onClick={() => { onReset(selectedId); setError(""); setStatus("Foto template dipulihkan. Simpan draf untuk menyimpan perubahan laporan."); }}><RotateCcw className="size-4" />Gunakan foto template</Button>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <p role="status" aria-live="polite" className="text-sm text-pln-navy">{busy ? "Memproses…" : status}</p>
        </div>
      </div>
      <p className="text-xs text-zinc-500">{Object.keys(photos).length} dari {form.items.length} perangkat memakai foto unggahan. Perangkat lainnya tetap memakai foto template.</p>
    </CardContent>
  </Card>;
}

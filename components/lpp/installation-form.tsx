"use client";

import { useState } from "react";
import { Pencil, Search, Check } from "lucide-react";
import { PhotoForm } from "./photo-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { editKey, fieldEdits, formErrors, readFormField, type LppForm, type LppFormField } from "@/lib/lpp/form";
import type { CellEdit, LppPhotos, LppWorkbook } from "@/types/lpp";

function FormControl({ field, value, error, disabled, onChange }: {
  field: LppFormField; value: string; error?: string; disabled: boolean; onChange: (value: string) => void;
}) {
  const [touched, setTouched] = useState(false);
  const id = `lpp-${field.id}`;
  const validation = error ?? (touched && field.required && !value.trim() ? `${field.label} wajib diisi.` : undefined);
  const props = { id, value, disabled, required: field.required, maxLength: 4000, "aria-invalid": Boolean(validation), "aria-describedby": validation ? `${id}-error` : undefined, onBlur: () => setTouched(true), onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value) };
  return <div className={`space-y-2 ${field.kind === "textarea" ? "md:col-span-2" : ""}`}>
    <label htmlFor={id} className="text-sm font-medium">{field.label}{field.required ? <span aria-hidden="true" className="ml-1 text-red-600">*</span> : <span className="ml-1 font-normal text-zinc-500">(opsional)</span>}</label>
    {field.kind === "textarea" ? <Textarea {...props} rows={3} /> : <Input {...props} type={field.kind === "date" ? "date" : "text"} className="h-10" />}
    {validation && <p id={`${id}-error`} className="text-xs text-red-700">{validation}</p>}
  </div>;
}

export function InstallationForm({ form, workbook, edits, busy, showErrors, onChange, templateId, photos, onUploadPhoto, onResetPhoto }: {
  form: LppForm; workbook: LppWorkbook; edits: Record<string, CellEdit>; busy: boolean;
  showErrors: boolean; onChange: (changes: CellEdit[]) => void;
  templateId: string; photos: LppPhotos; onUploadPhoto: (itemId: string, file: File) => Promise<void>; onResetPhoto: (itemId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<LppForm["items"][number] | null>(null);
  const [pending, setPending] = useState<Record<string, string>>({});
  const [dialogErrors, setDialogErrors] = useState<Record<string, string>>({});
  const errors = formErrors(form, workbook, edits);
  const value = (field: LppFormField) => readFormField(field, workbook, edits);
  const field = (item: LppFormField) => <FormControl key={item.id} field={item} value={value(item)} disabled={busy} error={showErrors ? errors[item.id] : undefined} onChange={(next) => onChange(fieldEdits(item, next))} />;
  const filtered = form.items.filter((item) => item.fields.some((f) => value(f).toLowerCase().includes(search.toLowerCase())));
  const completed = form.items.filter((item) => !item.fields.some((f) => errors[f.id])).length;
  function openItem(item: LppForm["items"][number]) {
    setPending(Object.fromEntries(item.fields.map((f) => [f.id, value(f)]))); setDialogErrors({}); setEditing(item);
  }
  function applyItem(event: React.FormEvent) {
    event.preventDefault(); if (!editing) return;
    const changes = editing.fields.flatMap((f) => fieldEdits(f, pending[f.id] ?? ""));
    const updated = { ...edits, ...Object.fromEntries(changes.map((change) => [editKey(change.sheet, change.address), change])) };
    const allErrors = formErrors(form, workbook, updated);
    const itemErrors = Object.fromEntries(editing.fields.filter((f) => allErrors[f.id]).map((f) => [f.id, allErrors[f.id]]));
    if (Object.keys(itemErrors).length) { setDialogErrors(itemErrors); return; }
    // Only changed fields are emitted: untouched prefixes and date text stay byte-identical.
    onChange(editing.fields.filter((f) => pending[f.id] !== value(f)).flatMap((f) => fieldEdits(f, pending[f.id] ?? "")));
    setEditing(null);
  }
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <p className="text-zinc-500">Lengkapi informasi laporan, periksa perangkat, lalu ekspor Excel. <span className="text-red-600">*</span> wajib diisi.</p>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800"><Check className="size-3.5" />{completed}/{form.items.length} perangkat lengkap</span>
    </div>
    {showErrors && Object.keys(errors).length > 0 && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">Ada {Object.keys(errors).length} field yang perlu diperbaiki. Draf tetap dapat disimpan.</div>}
    <Card className="shadow-none">
      <CardHeader><CardTitle className="text-base text-pln-navy">1. Informasi laporan</CardTitle><CardDescription>Informasi ini otomatis digunakan pada laporan pekerjaan dan dokumentasi.</CardDescription></CardHeader>
      <CardContent><div className="grid gap-x-6 gap-y-5 md:grid-cols-2">{form.information.map(field)}</div></CardContent>
    </Card>
    <Card className="shadow-none">
      <CardHeader><CardTitle className="text-base text-pln-navy">2. Rincian perangkat</CardTitle><CardDescription>Periksa perangkat yang tercantum. Gunakan Edit untuk mengubah deskripsi, nomor seri, status, dan lokasi pemasangan.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="relative max-w-sm"><Search className="absolute left-3 top-3 size-4 text-zinc-400" /><Input className="h-10 pl-9" aria-label="Cari perangkat" placeholder="Cari nama, nomor seri, atau lokasi…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <div className="overflow-hidden rounded-lg border"><Table><TableHeader><TableRow><TableHead className="w-12">No.</TableHead><TableHead>Perangkat</TableHead><TableHead>Nomor seri</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader><TableBody>
          {filtered.map((item) => <TableRow key={item.id}>
            <TableCell className="align-top text-zinc-500">{item.number}</TableCell>
            <TableCell className="min-w-52 max-w-md whitespace-normal"><p className="font-medium">{value(item.fields[0]) || "Nama perangkat belum diisi"}</p><p className="mt-1 text-xs text-zinc-500">{value(item.fields[3]) || "Lokasi belum diisi"}</p>{showErrors && item.fields.some((f) => errors[f.id]) && <p className="mt-1 text-xs text-red-700">Lengkapi data perangkat ini.</p>}</TableCell>
            <TableCell className="max-w-40 whitespace-normal break-all text-zinc-600">{value(item.fields[1]) || "—"}</TableCell>
            <TableCell className="max-w-40 whitespace-normal text-zinc-600">{value(item.fields[2]) || "—"}</TableCell>
            <TableCell className="text-right"><Button variant="outline" size="sm" disabled={busy} aria-label={`Edit perangkat ${item.number}`} onClick={() => openItem(item)}><Pencil className="size-3.5" />Edit</Button></TableCell>
          </TableRow>)}
          {!filtered.length && <TableRow><TableCell colSpan={5} className="py-8 text-center text-zinc-500">Tidak ada perangkat yang cocok.</TableCell></TableRow>}
        </TableBody></Table></div>
        <p className="text-xs leading-relaxed text-zinc-500">Jumlah dan urutan perangkat mengikuti template. Foto setiap perangkat dapat diganti pada bagian dokumentasi di bawah.</p>
      </CardContent>
    </Card>
    <PhotoForm form={form} workbook={workbook} edits={edits} templateId={templateId} photos={photos} busy={busy} onUpload={onUploadPhoto} onReset={onResetPhoto} />
    <Card className="shadow-none">
      <CardHeader><CardTitle className="text-base text-pln-navy">4. Pengesahan</CardTitle><CardDescription>Isi pihak pelaksana dan penerima yang akan tercantum pada laporan.</CardDescription></CardHeader>
      <CardContent className="space-y-6">
        <div className="max-w-lg">{field(form.signatures[0])}</div>
        <div className="grid gap-6 md:grid-cols-2">{[1, 4].map((start, index) => <fieldset key={start} className="space-y-4 rounded-lg border p-4"><legend className="px-2 text-sm font-semibold text-pln-navy">{index === 0 ? "Pelaksana pekerjaan" : "Penerima pekerjaan"}</legend>{form.signatures.slice(start, start + 3).map(field)}</fieldset>)}</div>
      </CardContent>
    </Card>
    <Dialog open={Boolean(editing)} onOpenChange={(open) => { if (!open) setEditing(null); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>Edit perangkat {editing?.number}</DialogTitle><DialogDescription>Nama perangkat akan diperbarui juga pada sheet dokumentasi.</DialogDescription></DialogHeader>
        <form className="space-y-5" onSubmit={applyItem} noValidate>
          <div className="grid gap-4 md:grid-cols-2">{editing?.fields.map((f) => <FormControl key={f.id} field={f} value={pending[f.id] ?? ""} disabled={busy} error={dialogErrors[f.id]} onChange={(next) => setPending((current) => ({ ...current, [f.id]: next }))} />)}</div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setEditing(null)}>Batal</Button><Button type="submit" disabled={busy} className="bg-pln-navy text-white">Terapkan perubahan</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>;
}

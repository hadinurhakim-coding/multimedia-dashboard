"use client";
import { useCallback, useEffect, useState } from "react";
import { FileSpreadsheet, Download, Save, FolderOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { appFetch } from "@/lib/auth/fetch";
import { InstallationForm } from "./installation-form";
import { DocumentationTable } from "./documentation-table";
import { ReportHeader } from "./report-header";
import { DraftsPage } from "./drafts-page";
import { formErrors, type LppForm } from "@/lib/lpp/form";
import { applyReportDate, resolveReportDate, validateReportDate } from "@/lib/lpp/report-date";
import { templateDisplayName } from "@/lib/lpp/naming";
import type { CellEdit, CellValue, LppDraft, LppPhotos, LppTemplate, LppWorkbook } from "@/types/lpp";

type Catalog = { templates: LppTemplate[]; drafts: Omit<LppDraft, "edits">[]; email: string };
type Document = LppWorkbook & LppTemplate & { form: LppForm | null; defaultReportDate: string };
const col = (n: number): string => n > 26 ? col(Math.floor((n - 1) / 26)) + col((n - 1) % 26 + 1) : String.fromCharCode(64 + n);
const point = (a: string) => ({ row: Number(a.match(/\d+/)![0]), column: [...a.match(/[A-Z]+/)![0]].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) });
const key = (sheet: string, address: string) => JSON.stringify([sheet, address]);

export function LppView({ onDirtyChange }: { onDirtyChange: (dirty: boolean) => void }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [document, setDocument] = useState<Document | null>(null);
  const [draft, setDraft] = useState<LppDraft | null>(null);
  const [edits, setEdits] = useState<Record<string, CellEdit>>({});
  const [photos, setPhotos] = useState<LppPhotos>({});
  const [reportDate, setReportDate] = useState("");
  const [title, setTitle] = useState("");
  const [sheetIndex, setSheetIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [showFormErrors, setShowFormErrors] = useState(false);
  const [showSheetEditor, setShowSheetEditor] = useState(false);
  const [screen, setScreen] = useState<"editor" | "drafts">("editor");
  useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);
  const clear = useCallback(() => { setCatalog(null); setDocument(null); setDraft(null); setEdits({}); setPhotos({}); setReportDate(""); setDirty(false); setTitle(""); setScreen("editor"); }, []);
  const api = useCallback(async (url: string, options?: RequestInit) => {
    const response = await appFetch(url, { ...options, headers: { "Content-Type": "application/json", ...options?.headers } });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) clear();
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error ?? "Permintaan gagal. Coba lagi.");
    }
    return response;
  }, [clear]);
  const refresh = useCallback(async () => {
    const data = await (await api("/api/lpp")).json() as Catalog;
    setCatalog(data);
  }, [api]);
  useEffect(() => {
    let live = true;
    const controller = new AbortController();
    appFetch("/api/lpp", { signal: controller.signal }).then(async (response) => {
      const data = await response.json(); if (!live) return;
      if (response.ok) setCatalog(data);
      else setMessage(data.error);
    }).catch((error) => { if (live && error.name !== "AbortError") setMessage("Layanan LPP belum tersedia."); });
    return () => { live = false; controller.abort(); };
  }, []);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setMessage("");
    try { await fn(); } catch (error) { setMessage(error instanceof Error ? error.message : "Terjadi kesalahan."); } finally { setBusy(false); }
  };
  async function open(templateId: string, existing?: LppDraft) {
    if (dirty && !window.confirm("Perubahan belum disimpan. Buka dokumen lain?")) return;
    const data = await (await api(`/api/lpp/templates/${templateId}`)).json() as Document;
    if (existing && existing.templateHash !== data.hash) throw new Error("Template berubah sejak draf disimpan. Hubungi administrator untuk memulihkan versi template.");
    const date = data.form?.reportHeader ? resolveReportDate(existing, data.defaultReportDate) : "";
    const changes = date ? applyReportDate(data.form, existing?.edits ?? [], date) : existing?.edits ?? [];
    const existingTitle = existing?.title;
    setDocument(data); setDraft(existing ?? null); setTitle(existingTitle && templateDisplayName(existingTitle) !== data.name ? existingTitle : data.name);
    setReportDate(date); setEdits(Object.fromEntries(changes.map((e) => [key(e.sheet, e.address), e])));
    setPhotos(existing?.photos ?? {});
    setSheetIndex(0); setSelected(null); setDirty(!existing); setShowFormErrors(false); setShowSheetEditor(false);
    setScreen("editor"); window.scrollTo({ top: 0 });
  }
  async function save() {
    if (!document) throw new Error("Pilih template dahulu.");
    if (document.form?.reportHeader) validateReportDate(reportDate);
    const saved = await (await api("/api/lpp", { method: "POST", body: JSON.stringify({ id: draft?.id, revision: draft?.revision, title, templateId: document.id, templateHash: document.hash, edits: Object.values(edits), photos, ...(document.form?.reportHeader ? { reportDate } : {}) }) })).json() as LppDraft;
    setDraft(saved); setEdits(Object.fromEntries(saved.edits.map((e) => [key(e.sheet, e.address), e]))); setDirty(false); await refresh(); return saved;
  }
  async function downloadDraft(id: string) {
    const response = await api("/api/lpp/export", { method: "POST", body: JSON.stringify({ id }) });
    // The server names the file using the date and template of the saved draft.
    const filename = decodeURIComponent(response.headers.get("Content-Disposition")?.match(/filename\*=UTF-8''([^;]+)/i)?.[1] ?? "LPP.xlsx");
    const url = URL.createObjectURL(await response.blob()), link = window.document.createElement("a");
    link.href = url; link.download = filename; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage(`Excel berhasil diekspor: ${filename}`);
  }
  const sheet = document?.sheets[sheetIndex];
  async function uploadPhoto(itemId: string, file: File) {
    setBusy(true); setMessage("");
    try {
      const result = await (await api("/api/lpp/photos", { method: "POST", headers: { "Content-Type": file.type }, body: file })).json() as { id: string };
      setPhotos((current) => ({ ...current, [itemId]: result.id })); setDirty(true);
    } finally { setBusy(false); }
  }
  function resetPhoto(itemId: string) {
    setPhotos((current) => { const next = { ...current }; delete next[itemId]; return next; }); setDirty(true);
  }
  function updateReportDate(value: string) {
    setReportDate(value); setDirty(true);
    try { validateReportDate(value); } catch { return; }
    setEdits((current) => Object.fromEntries(applyReportDate(document?.form ?? null, Object.values(current), value).map((edit) => [key(edit.sheet, edit.address), edit])));
  }
  const dateManaged = (address: string) => Boolean(document?.form?.reportHeader?.dateTargets.some((target) => target.sheet === sheet?.name && target.address === address));
  function updateMany(changes: CellEdit[]) {
    if (!document || !changes.length) return;
    setEdits((current) => {
      const result = { ...current };
      for (const change of changes) {
        const id = key(change.sheet, change.address);
        const original = document.sheets.find((s) => s.name === change.sheet)?.cells.find((c) => c.address === change.address)?.value ?? null;
        if (original === change.value) delete result[id]; else result[id] = change;
      }
      return result;
    });
    setDirty(true);
  }
  function update(address: string, value: CellValue) {
    if (!sheet || dateManaged(address)) return;
    setEdits((current) => {
      const result = { ...current }, id = key(sheet.name, address);
      const original = sheet.cells.find((c) => c.address === address)?.value ?? null;
      if (original === value) delete result[id]; else result[id] = { sheet: sheet.name, address, value };
      return result;
    }); setDirty(true);
  }
  const valueAt = (address: string) => sheet ? (edits[key(sheet.name, address)] ? edits[key(sheet.name, address)].value : sheet.cells.find((c) => c.address === address)?.value ?? null) : null;

  const sheetNavigation = document && <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Sheet laporan">{document.sheets.map((item, index) => <Button key={item.name} variant="outline" disabled={busy} aria-pressed={index === sheetIndex} className={index === sheetIndex ? "border-pln-navy bg-pln-navy text-white hover:bg-pln-navy/90 hover:text-white" : "bg-white"} onClick={() => { setSheetIndex(index); setSelected(null); }}><FileSpreadsheet className="size-4" />{item.name}</Button>)}</div>;
  const sheetEditor = sheet && (!document?.form || showSheetEditor) && <div className="space-y-3" role="region" aria-label={`Editor sheet ${sheet.name}`}>
    <p className="text-xs text-zinc-500">Edit isi sel di bawah. Gambar dan layout cetak asli tetap disertakan dalam Excel. Baris dan kolom mengikuti template.</p>
    {selected && <div className="flex flex-wrap items-center gap-3 text-xs"><span>Sel {selected}</span><label>Jenis nilai <select className="ml-2 rounded border p-1" disabled={busy || dateManaged(selected) || sheet.cells.find((c) => c.address === selected)?.formula} value={typeof valueAt(selected) === "number" ? "number" : typeof valueAt(selected) === "boolean" ? "boolean" : "string"} onChange={(e) => { const value = valueAt(selected); if (e.target.value === "number") { const number = Number(value); if (!Number.isFinite(number)) { setMessage("Isi sel harus berupa angka."); return; } update(selected, number); } else update(selected, e.target.value === "boolean" ? value === true || value === "true" : String(value ?? "")); }}><option value="string">Teks</option><option value="number">Angka</option><option value="boolean">Boolean</option></select></label><Button size="sm" variant="ghost" disabled={busy || dateManaged(selected)} onClick={() => update(selected, sheet.cells.find((c) => c.address === selected)?.value ?? null)}>Pulihkan sel</Button></div>}
    <div key={sheet.name} className="max-h-[65vh] overflow-auto rounded-lg border"><table aria-label={`Data sheet ${sheet.name}`} className="w-full border-collapse text-sm"><thead className="sticky top-0 z-10 bg-zinc-100"><tr><th className="border p-2">#</th>{Array.from({ length: sheet.columns }, (_, i) => <th className="min-w-28 border p-2" key={i}>{col(i + 1)}</th>)}</tr></thead><tbody>{Array.from({ length: sheet.rows }, (_, r) => <tr key={r}><th className="border bg-zinc-50 px-2 text-xs font-normal text-zinc-500">{r + 1}</th>{Array.from({ length: sheet.columns }, (_, c) => {
      const address = `${col(c + 1)}${r + 1}`; let rowSpan = 1, colSpan = 1;
      for (const range of sheet.merges) { const [a, b = a] = range.split(":"); const start = point(a), end = point(b); if (r + 1 >= start.row && r + 1 <= end.row && c + 1 >= start.column && c + 1 <= end.column) { if (address !== a) return null; rowSpan = end.row - start.row + 1; colSpan = end.column - start.column + 1; } }
      const value = valueAt(address), formula = sheet.cells.find((v) => v.address === address)?.formula;
      return <td key={address} rowSpan={rowSpan} colSpan={colSpan} className={`border p-0 align-top ${edits[key(sheet.name, address)] ? "bg-blue-50" : "bg-white"}`}><textarea aria-label={`${sheet.name} ${address}`} className="block min-h-10 w-full resize-y bg-transparent px-2 py-1.5 outline-none focus:ring-2 focus:ring-inset focus:ring-pln-cyan disabled:text-zinc-500" rows={Math.min(5, Math.max(1, String(value ?? "").split("\n").length))} disabled={busy || formula || dateManaged(address)} title={dateManaged(address) ? "Atur tanggal melalui header laporan." : undefined} value={String(value ?? "")} onFocus={() => setSelected(address)} onChange={(e) => { const raw = e.target.value; update(address, raw === "" ? null : typeof value === "number" && Number.isFinite(Number(raw)) ? Number(raw) : raw); }} /></td>;
    })}</tr>)}</tbody></table></div>
  </div>;

  return <section className="space-y-5 text-pln-charcoal">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="text-2xl font-semibold text-pln-navy">{screen === "drafts" ? "Draf LPP" : "LPP"}</h1><p className="mt-1 text-sm text-zinc-500">{screen === "drafts" ? "Buka laporan tersimpan. Tanggal mengikuti header laporan yang disimpan." : "Kelola laporan dan ekspor Excel sesuai template."}</p></div>
    </div>
    <p role="status" aria-live="polite" className="text-sm text-pln-navy">{busy ? "Memproses…" : message}</p>
    {!catalog ? <div className="rounded-xl border bg-white p-6"><p className="text-sm text-zinc-500">{message ? "Daftar laporan belum dapat dimuat." : "Memuat laporan…"}</p>{message && <Button variant="outline" className="mt-3" disabled={busy} onClick={() => void run(refresh)}>Coba lagi</Button>}</div> : screen === "drafts" ? <DraftsPage drafts={catalog.drafts} templates={catalog.templates} busy={busy}
      onBack={() => { setScreen("editor"); setMessage(""); window.scrollTo({ top: 0 }); }}
      onOpen={(item) => void run(async () => { const detail = await (await api(`/api/lpp/drafts/${item.id}`)).json() as LppDraft; await open(detail.templateId, detail); })}
      onExport={(item) => void run(() => downloadDraft(item.id))}
      onDelete={(item) => {
        if (!window.confirm("Hapus draf ini?")) return;
        void run(async () => {
          await api(`/api/lpp/drafts/${item.id}`, { method: "DELETE" });
          if (draft?.id === item.id) { setDraft(null); if (!dirty) { setDocument(null); setTitle(""); setReportDate(""); } }
          await refresh(); setMessage("Draf dihapus.");
        });
      }}
    /> : <>
      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-white p-4">
        <label className="min-w-0 flex-1 space-y-1 text-sm"><span>Template laporan</span><select aria-label="Template laporan" className="h-10 w-full rounded-md border bg-white px-3" value={document?.id ?? ""} disabled={busy} onChange={(e) => { if (e.target.value) void run(() => open(e.target.value)); }}><option value="">Pilih template…</option>{catalog.templates.map((t) => <option key={t.id} value={t.id}>{t.name}{t.documentationTableAvailable ? " — Tabel dokumentasi" : t.formAvailable ? " — Form input" : ""}</option>)}</select></label>
        <Button variant="outline" className="h-10" disabled={busy} onClick={() => void run(async () => { await refresh(); setScreen("drafts"); window.scrollTo({ top: 0 }); })}><FolderOpen className="size-4" />Draf</Button>
        {!catalog.templates.length && <p className="w-full text-sm">Template belum tersedia. Hubungi administrator.</p>}
      </div>
      {document && sheet && <div className="space-y-3">
        <div className="flex flex-wrap items-end gap-2 rounded-xl border bg-white p-3 shadow-sm">
          <label className="min-w-60 flex-1 space-y-1 text-sm">Judul laporan<Input maxLength={150} disabled={busy} value={title} onChange={(e) => { setTitle(e.target.value); setDirty(true); }} /></label>
          <Button variant="outline" disabled={busy} onClick={() => void run(() => open(document.id))}><Plus className="size-4" /> Draf baru</Button>
          <Button variant="outline" disabled={busy || !title.trim()} onClick={() => void run(async () => { await save(); setMessage("Draf tersimpan."); })}><Save className="size-4" /> Simpan{dirty ? " *" : ""}</Button>
          <Button className="bg-pln-navy text-white" disabled={busy || !title.trim()} onClick={() => void run(async () => {
            setShowFormErrors(true);
            if (document.form && Object.keys(formErrors(document.form, document, edits)).length) throw new Error("Lengkapi field wajib pada form sebelum mengekspor. Anda tetap dapat menyimpan draf.");
            const saved = await save(); await downloadDraft(saved.id);
          })}><Download className="size-4" /> Ekspor Excel</Button>
        </div>
        {document.form?.kind === "installation-v1" ? <InstallationForm key={`${document.id}:${draft?.id ?? "new"}`} form={document.form} workbook={document} edits={edits} busy={busy} showErrors={showFormErrors} onChange={updateMany} templateId={document.id} photos={photos} onUploadPhoto={uploadPhoto} onResetPhoto={resetPhoto} /> : <>
        {document.form?.kind === "documentation-table-v1" && <>
          <ReportHeader key={`header:${document.id}`} form={document.form} workbook={document} edits={edits} templateId={document.id} reportDate={reportDate} busy={busy} onDateChange={updateReportDate} />
          <DocumentationTable key={`photos:${document.id}`} form={document.form} workbook={document} edits={edits} templateId={document.id} templateName={document.name} reportDate={reportDate} photos={photos} busy={busy} onUpload={uploadPhoto} onReset={resetPhoto} showEditor={showSheetEditor} onToggleEditor={() => setShowSheetEditor((current) => !current)} editorControls={sheetNavigation} editor={sheetEditor} />
        </>}
        {!document.form && <>{sheetNavigation}{sheetEditor}</>}
        </>}
      </div>}
    </>}
  </section>;
}

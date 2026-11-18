import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import JSZip from "jszip";
import sharp from "sharp";
import { buildAuditoriumDocumentationForm } from "../lib/lpp/auditorium-form";
import { formPhotoSlots, fieldEdits, formErrors, readFormField } from "../lib/lpp/form";
import { applyReportDate } from "../lib/lpp/report-date";
import { lppPhotoWatermark, lppExportFilename } from "../lib/lpp/naming";
import { exportWorkbook, inspectWorkbook } from "../lib/lpp/workbook";
import { exportPhotos, templateHeaderLogo, watermarkedPhotoPreview } from "../lib/lpp/photos";
import type { LppWorkbook } from "../types/lpp";

function fixture(): LppWorkbook {
  const cells = (values: Record<string, string | number>) => Object.entries(values).map(([address, value]) => ({ address, value, formula: false }));
  const information = { B1: "LAPORAN PELAKSANAAN PEKERJAAN", A4: "Project ID", A6: "Project : Proyek uji", A7: "Address : Kota", A8: "Contact Person : Tim", A9: "Job Description : Pemeliharaan", A10: "Date : 30 September 2024" };
  const rows = (length: number) => Object.fromEntries(Array.from({ length }, (_, index) => [[`A${index + 14}`, index + 1], [`B${index + 14}`, `Perangkat ${index + 1}`], [`C${index + 14}`, "Lokasi uji"]]).flat());
  return { hash: "fixture", sheets: [
    { name: "Laporan", rows: 80, columns: 6, merges: [], cells: cells({ ...information, ...rows(51), B13: "ITEM DESCRIPTION", C6: "TAHAP 2", C68: "Kota, 01 Oktober 2024" }) },
    { name: "Dokumentasi", rows: 62, columns: 4, merges: [], cells: cells({ ...information, ...rows(49), B13: "NAME", C13: "LOKASI PEMASANGAN", D5: "TAHAP 2" }) },
  ] };
}

test("Auditorium phase 2 maps all 49 photos, phase and report dates without conflating overlapping anchors", () => {
  const workbook = fixture(), form = buildAuditoriumDocumentationForm(workbook)!;
  assert.ok(form); assert.equal(form.items.length, 49);
  assert.deepEqual(formErrors(form, workbook, {}), {});
  const slots = formPhotoSlots(form);
  assert.equal(slots.length, 49); assert.equal(new Set(slots.map(slot => slot.id)).size, 49);
  assert.deepEqual(slots.slice(35, 37).map(slot => [slot.row, slot.column, slot.anchorId]), [[48, 3, "79"], [48, 3, "80"]]);
  assert.equal(slots[48].row, 61);
  assert.equal(readFormField(form.reportHeader!.fields.at(-1)!, workbook, {}), "TAHAP 2");
  assert.deepEqual(fieldEdits(form.items[0].fields[0], "Nama terbaru").map(edit => edit.sheet), ["Dokumentasi", "Laporan"]);
  assert.deepEqual(applyReportDate(form, [], "2026-03-01").map(edit => [edit.sheet, edit.address, edit.value]), [
    ["Laporan", "A10", "Date : 1 Maret 2026"], ["Dokumentasi", "A10", "Date : 1 Maret 2026"], ["Laporan", "C68", "Kota, 1 Maret 2026"],
  ]);
  assert.equal(buildAuditoriumDocumentationForm({ ...workbook, sheets: [workbook.sheets[0]] }), null);
  const broken = structuredClone(workbook); broken.sheets[1].cells.find(cell => cell.address === "A50")!.value = 999;
  assert.equal(buildAuditoriumDocumentationForm(broken), null);
});

test("Private auditorium export retains layout, logos and originals while stamping all 49 slots", async (t) => {
  const directory = process.env.LPP_TEST_TEMPLATE_DIR ?? "private/data-lpp";
  const files = await readdir(directory).catch(() => []);
  let matched = 0;
  for (const filename of files.filter(file => file.endsWith(".xlsx"))) {
    const original = await readFile(`${directory}/${filename}`), workbook = await inspectWorkbook(original), form = buildAuditoriumDocumentationForm(workbook);
    if (!form) continue;
    matched++;
    assert.deepEqual(formErrors(form, workbook, {}), {});
    const slots = formPhotoSlots(form), before = await JSZip.loadAsync(original);
    const uploaded = await sharp({ create: { width: 80, height: 120, channels: 3, background: "#00a2e9" } }).png().toBuffer();
    const drawing = await before.file("xl/drawings/drawing2.xml")!.async("string");
    const anchors = [...drawing.matchAll(/<xdr:twoCellAnchor\b[^>]*>[\s\S]*?<\/xdr:twoCellAnchor>/g)].map(([anchor]) => anchor);
    for (const index of [35, 36]) {
      const single = await JSZip.loadAsync(await exportPhotos(original, form, [{ itemId: slots[index].id, buffer: uploaded }]));
      const nextDrawing = await single.file("xl/drawings/drawing2.xml")!.async("string");
      const affected = anchors.filter(anchor => !nextDrawing.includes(anchor));
      assert.equal(affected.length, 1);
      assert.match(affected[0], new RegExp(`<xdr:cNvPr id="${slots[index].anchorId}"`));
    }
    const date = "2026-03-01", name = filename.slice(0, -5), edits = applyReportDate(form, [], date);
    const watermark = lppPhotoWatermark(name, date);
    const bytes = await exportPhotos(await exportWorkbook(original, edits), form, [{ itemId: slots[36].id, buffer: uploaded }], watermark);
    const after = await JSZip.loadAsync(bytes);
    assert.ok(bytes.length < 30 * 1024 * 1024, "49 watermarked photos stay within the workbook size limit");
    assert.equal(Object.keys(after.files).filter(path => /^xl\/media\/lpp-photo-\d+\.jpg$/.test(path)).length, 49);
    for (const index of [0, 35, 36, 48]) assert.deepEqual(await after.file(`xl/media/lpp-photo-${index + 1}.jpg`)!.async("nodebuffer"), await watermarkedPhotoPreview(original, form, slots[index].id, watermark, index === 36 ? uploaded : undefined));
    assert.deepEqual(await templateHeaderLogo(bytes), await templateHeaderLogo(original));
    const originalTypes = await before.file("[Content_Types].xml")!.async("string");
    assert.equal(await after.file("[Content_Types].xml")!.async("string"), originalTypes.replace("</Types>", '<Default Extension="jpg" ContentType="image/jpeg"/></Types>'));
    for (const path of Object.keys(before.files).filter(path => !before.files[path].dir && !["[Content_Types].xml", "xl/worksheets/sheet1.xml", "xl/worksheets/sheet2.xml", "xl/drawings/drawing2.xml", "xl/drawings/_rels/drawing2.xml.rels"].includes(path))) assert.deepEqual(await after.file(path)!.async("nodebuffer"), await before.file(path)!.async("nodebuffer"));
    const strip = (value: string) => value.replace(/r:embed="[^"]*"/g, 'r:embed="IMAGE"').replace(/<a:srcRect\b[^>]*\/>/g, "<a:srcRect/>");
    assert.equal(strip(await after.file("xl/drawings/drawing2.xml")!.async("string")), strip(drawing));
    const reopened = await inspectWorkbook(bytes);
    assert.deepEqual(reopened.sheets, (await inspectWorkbook(await exportWorkbook(original, edits))).sheets);
    assert.ok(lppExportFilename(name, { reportDate: date, updatedAt: "2026-11-18T00:00:00Z" }).startsWith("2026-03-01 LPP "));
    assert.deepEqual(await readFile(`${directory}/${filename}`), original);
  }
  if (!matched) t.skip("Private auditorium template intentionally absent on CI.");
  else assert.equal(matched, 1);
});

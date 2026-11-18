import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import JSZip from "jszip";
import sharp from "sharp";
import { buildAuditoriumDocumentationForm } from "../lib/lpp/auditorium-form";
import { fieldEdits, formErrors, formPhotoSlots, readFormField } from "../lib/lpp/form";
import { applyReportDate } from "../lib/lpp/report-date";
import { lppExportFilename, lppPhotoWatermark } from "../lib/lpp/naming";
import { exportPhotos, templateHeaderLogo, watermarkedPhotoPreview } from "../lib/lpp/photos";
import { exportWorkbook, inspectWorkbook } from "../lib/lpp/workbook";
import type { LppWorkbook } from "../types/lpp";

test("Auditorium phase 1 maps 14 devices and dates independently from phase 2", () => {
  const information = { B1: "LAPORAN PEKERJAAN", A4: "Project ID", A6: "Project : Proyek uji", A7: "Address : Kota", A8: "Contact Person : Tim", A9: "Job Description : Pemeliharaan", A10: "Date : 30 September 2024" };
  const devices = Object.fromEntries(Array.from({ length: 14 }, (_, index) => [[`A${index + 14}`, index + 1], [`B${index + 14}`, `Perangkat ${index + 1}`], [`C${index + 14}`, "Lokasi uji"]]).flat());
  const cells = (values: Record<string, string | number>) => Object.entries(values).map(([address, value]) => ({ address, value, formula: false }));
  const workbook: LppWorkbook = { hash: "fixture", sheets: [
    { name: "Laporan", rows: 40, columns: 6, merges: [], cells: cells({ ...information, ...devices, B13: "ITEM DESCRIPTION", C6: "TAHAP 1", C30: "Kota, 01 Oktober 2024" }) },
    { name: "Dokumentasi", rows: 27, columns: 4, merges: [], cells: cells({ ...information, ...devices, B13: "NAME", C13: "LOKASI PEMASANGAN", D5: "TAHAP 1" }) },
  ] };
  const form = buildAuditoriumDocumentationForm(workbook, 1)!;
  assert.ok(form); assert.equal(form.items.length, 14); assert.equal(form.photoFormat, "jpeg");
  assert.deepEqual(formErrors(form, workbook, {}), {});
  assert.equal(readFormField(form.reportHeader!.fields.at(-1)!, workbook, {}), "TAHAP 1");
  const slots = formPhotoSlots(form);
  assert.equal(slots.length, 14); assert.equal(new Set(slots.map(slot => slot.id)).size, 14);
  assert.deepEqual(slots.map(slot => [slot.row, slot.column, slot.anchorId]), Array.from({ length: 14 }, (_, index) => [index + 13, 3, undefined]));
  assert.deepEqual(fieldEdits(form.items[13].fields[0], "Perangkat baru"), [
    { sheet: "Dokumentasi", address: "B27", value: "Perangkat baru" }, { sheet: "Laporan", address: "B27", value: "Perangkat baru" },
  ]);
  assert.deepEqual(applyReportDate(form, [], "2026-03-01").map(edit => [edit.sheet, edit.address, edit.value]), [
    ["Laporan", "A10", "Date : 1 Maret 2026"], ["Dokumentasi", "A10", "Date : 1 Maret 2026"], ["Laporan", "C30", "Kota, 1 Maret 2026"],
  ]);
  assert.equal(buildAuditoriumDocumentationForm(workbook, 2), null);
  assert.equal(buildAuditoriumDocumentationForm({ ...workbook, sheets: [workbook.sheets[0]] }, 1), null);
  const broken = structuredClone(workbook); broken.sheets[1].cells.find(cell => cell.address === "A27")!.value = 99;
  assert.equal(buildAuditoriumDocumentationForm(broken, 1), null);
});

test("Private phase 1 export preserves layout and dates while watermarking all 14 photos", async t => {
  const directory = process.env.LPP_TEST_TEMPLATE_DIR ?? "private/data-lpp";
  let matched = 0;
  for (const filename of (await readdir(directory).catch(() => [])).filter(file => file.endsWith(".xlsx"))) {
    const original = await readFile(`${directory}/${filename}`), workbook = await inspectWorkbook(original);
    const form = buildAuditoriumDocumentationForm(workbook, 1);
    if (!form) continue;
    matched++;
    assert.deepEqual(formErrors(form, workbook, {}), {});
    const slots = formPhotoSlots(form), before = await JSZip.loadAsync(original);
    const uploaded = await sharp({ create: { width: 80, height: 120, channels: 3, background: "#00a2e9" } }).png().toBuffer();
    const drawing = await before.file("xl/drawings/drawing2.xml")!.async("string");
    const anchors = [...drawing.matchAll(/<xdr:twoCellAnchor\b[^>]*>[\s\S]*?<\/xdr:twoCellAnchor>/g)].map(([anchor]) => anchor);
    for (const index of [0, 13]) {
      const single = await JSZip.loadAsync(await exportPhotos(original, form, [{ itemId: slots[index].id, buffer: uploaded }]));
      const nextDrawing = await single.file("xl/drawings/drawing2.xml")!.async("string");
      const changed = anchors.filter(anchor => !nextDrawing.includes(anchor));
      assert.equal(changed.length, 1);
      assert.match(changed[0], new RegExp(`<xdr:row>${index + 13}</xdr:row>`));
    }
    const date = "2026-03-01", name = filename.slice(0, -5), edits = applyReportDate(form, [], date);
    const watermark = lppPhotoWatermark(name, date), edited = await exportWorkbook(original, edits);
    const bytes = await exportPhotos(edited, form, [{ itemId: slots[13].id, buffer: uploaded }], watermark), after = await JSZip.loadAsync(bytes);
    assert.ok(bytes.length < 30 * 1024 * 1024);
    assert.equal(Object.keys(after.files).filter(path => /^xl\/media\/lpp-photo-\d+\.jpg$/.test(path)).length, 14);
    for (const index of [0, 6, 13]) assert.deepEqual(await after.file(`xl/media/lpp-photo-${index + 1}.jpg`)!.async("nodebuffer"), await watermarkedPhotoPreview(original, form, slots[index].id, watermark, index === 13 ? uploaded : undefined));
    assert.deepEqual(await templateHeaderLogo(bytes), await templateHeaderLogo(original));
    const originalTypes = await before.file("[Content_Types].xml")!.async("string");
    assert.equal(await after.file("[Content_Types].xml")!.async("string"), /<Default\b[^>]*Extension="jpg"/.test(originalTypes) ? originalTypes : originalTypes.replace("</Types>", '<Default Extension="jpg" ContentType="image/jpeg"/></Types>'));
    const changedParts = ["[Content_Types].xml", "xl/worksheets/sheet1.xml", "xl/worksheets/sheet2.xml", "xl/drawings/drawing2.xml", "xl/drawings/_rels/drawing2.xml.rels"];
    for (const path of Object.keys(before.files).filter(path => !before.files[path].dir && !changedParts.includes(path))) assert.deepEqual(await after.file(path)!.async("nodebuffer"), await before.file(path)!.async("nodebuffer"));
    const strip = (value: string) => value.replace(/r:embed="[^"]*"/g, 'r:embed="IMAGE"').replace(/<a:srcRect\b[^>]*\/>/g, "<a:srcRect/>");
    assert.equal(strip(await after.file("xl/drawings/drawing2.xml")!.async("string")), strip(drawing));
    assert.deepEqual((await inspectWorkbook(bytes)).sheets, (await inspectWorkbook(edited)).sheets);
    assert.ok(lppExportFilename(name, { reportDate: date, updatedAt: "2026-11-18T00:00:00Z" }).startsWith("2026-03-01 LPP "));
    assert.deepEqual(await readFile(`${directory}/${filename}`), original);
  }
  if (!matched) t.skip("Private phase 1 template intentionally absent on CI.");
  else assert.equal(matched, 1);
});

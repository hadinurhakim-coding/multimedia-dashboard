import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import JSZip from "jszip";
import sharp from "sharp";
import { buildCollaborationDocumentationForm } from "../lib/lpp/collaboration-form";
import { fieldEdits, formErrors, formPhotoSlots } from "../lib/lpp/form";
import { applyReportDate } from "../lib/lpp/report-date";
import { lppExportFilename, lppPhotoWatermark } from "../lib/lpp/naming";
import { exportPhotos, templateHeaderLogo, watermarkedPhotoPreview } from "../lib/lpp/photos";
import { exportWorkbook, inspectWorkbook } from "../lib/lpp/workbook";
import type { LppWorkbook } from "../types/lpp";

test("Collaboration layout maps 10 materials to 14 independent photos and one report date", () => {
  const information = { B1: "LAPORAN PEKERJAAN", A4: "Project ID", A6: "Project : Proyek uji", A7: "Address : Kota", A8: "Contact Person : Tim", A9: "Job Description : Pemeliharaan", A10: "Date : 30 September 2024" };
  const devices = Object.fromEntries(Array.from({ length: 10 }, (_, index) => [[`A${index + 14}`, index + 1], [`B${index + 14}`, `Material ${index + 1}`], [`C${index + 14}`, "Lokasi uji"]]).flat());
  const cells = (values: Record<string, string | number>) => Object.entries(values).map(([address, value]) => ({ address, value, formula: false }));
  const workbook: LppWorkbook = { hash: "fixture", sheets: [
    { name: "Laporan", rows: 36, columns: 6, merges: [], cells: cells({ ...information, ...devices, B13: "ITEM DESCRIPTION", C25: "Kota, 01 Oktober 2024" }) },
    { name: "Dokumentasi", rows: 23, columns: 8, merges: [], cells: cells({ ...information, ...devices, B13: "MATERIAL", C13: "LOKASI PEMASANGAN" }) },
  ] };
  const form = buildCollaborationDocumentationForm(workbook)!;
  assert.ok(form); assert.equal(form.items.length, 10); assert.equal(form.photoFormat, "jpeg");
  assert.deepEqual(formErrors(form, workbook, {}), {});
  assert.equal(form.reportHeader!.fields.length, 4);
  const slots = formPhotoSlots(form);
  assert.equal(slots.length, 14); assert.equal(new Set(slots.map(slot => slot.id)).size, 14);
  assert.deepEqual(form.items.map(item => slots.filter(slot => slot.itemId === item.id).length), [1, 1, 1, 1, 1, 1, 4, 1, 1, 2]);
  assert.deepEqual(slots.filter(slot => slot.itemId === "doc-7").map(slot => [slot.row, slot.column, slot.anchorId]), [[19, 3, "51"], [19, 3, "52"], [19, 3, "53"], [19, 3, "54"]]);
  assert.deepEqual(slots.filter(slot => slot.itemId === "doc-10").map(slot => [slot.row, slot.column, slot.anchorId]), [[22, 3, "57"], [22, 3, "61"]]);
  assert.deepEqual(fieldEdits(form.items[9].fields[0], "Material baru"), [
    { sheet: "Dokumentasi", address: "B23", value: "Material baru" }, { sheet: "Laporan", address: "B23", value: "Material baru" },
  ]);
  assert.deepEqual(applyReportDate(form, [], "2026-03-01").map(edit => [edit.sheet, edit.address, edit.value]), [
    ["Laporan", "A10", "Date : 1 Maret 2026"], ["Dokumentasi", "A10", "Date : 1 Maret 2026"], ["Laporan", "C25", "Kota, 1 Maret 2026"],
  ]);
  assert.equal(buildCollaborationDocumentationForm({ ...workbook, sheets: [workbook.sheets[0]] }), null);
  const broken = structuredClone(workbook); broken.sheets[1].cells.find(cell => cell.address === "A23")!.value = 99;
  assert.equal(buildCollaborationDocumentationForm(broken), null);
  const wrongLayout = structuredClone(workbook); wrongLayout.sheets[0].rows = 40;
  assert.equal(buildCollaborationDocumentationForm(wrongLayout), null);
});

test("Private collaboration export preserves Excel parts and isolates all photos sharing a cell", async t => {
  const directory = process.env.LPP_TEST_TEMPLATE_DIR ?? "private/data-lpp";
  let matched = 0;
  for (const filename of (await readdir(directory).catch(() => [])).filter(file => file.endsWith(".xlsx"))) {
    const original = await readFile(`${directory}/${filename}`), workbook = await inspectWorkbook(original);
    const form = buildCollaborationDocumentationForm(workbook);
    if (!form) continue;
    matched++;
    assert.deepEqual(formErrors(form, workbook, {}), {});
    const slots = formPhotoSlots(form), before = await JSZip.loadAsync(original);
    const uploaded = await sharp({ create: { width: 80, height: 120, channels: 3, background: "#00a2e9" } }).png().toBuffer();
    const drawing = await before.file("xl/drawings/drawing2.xml")!.async("string");
    const anchors = [...drawing.matchAll(/<xdr:twoCellAnchor\b[^>]*>[\s\S]*?<\/xdr:twoCellAnchor>/g)].map(([anchor]) => anchor);
    for (const index of [6, 7, 8, 9, 12, 13]) {
      const single = await JSZip.loadAsync(await exportPhotos(original, form, [{ itemId: slots[index].id, buffer: uploaded }]));
      const nextDrawing = await single.file("xl/drawings/drawing2.xml")!.async("string");
      const changed = anchors.filter(anchor => !nextDrawing.includes(anchor));
      assert.equal(changed.length, 1);
      assert.match(changed[0], new RegExp(`<xdr:cNvPr id="${slots[index].anchorId}"`));
    }
    const date = "2026-03-01", name = filename.slice(0, -5);
    const edits = applyReportDate(form, [{ sheet: workbook.sheets[0].name, address: "C14", value: "0000123\n0000456" }], date);
    const watermark = lppPhotoWatermark(name, date), edited = await exportWorkbook(original, edits);
    const bytes = await exportPhotos(edited, form, [{ itemId: slots[8].id, buffer: uploaded }], watermark), after = await JSZip.loadAsync(bytes);
    assert.ok(bytes.length < 30 * 1024 * 1024);
    assert.equal(Object.keys(after.files).filter(path => /^xl\/media\/lpp-photo-\d+\.jpg$/.test(path)).length, 14);
    for (const index of [0, 6, 8, 9, 12, 13]) assert.deepEqual(await after.file(`xl/media/lpp-photo-${index + 1}.jpg`)!.async("nodebuffer"), await watermarkedPhotoPreview(original, form, slots[index].id, watermark, index === 8 ? uploaded : undefined));
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
  if (!matched) t.skip("Private collaboration template intentionally absent on CI.");
  else assert.equal(matched, 1);
});

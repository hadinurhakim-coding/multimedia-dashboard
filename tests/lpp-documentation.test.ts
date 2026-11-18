import { test } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import JSZip from "jszip";
import sharp from "sharp";
import { buildDocumentationForm } from "../lib/lpp/documentation-form";
import { fieldEdits, formPhotoSlots } from "../lib/lpp/form";
import { validatePhotoReferences } from "../lib/lpp/photo-policy";
import { exportPhotos, templatePhoto, templateHeaderLogo, watermarkedPhotoPreview } from "../lib/lpp/photos";
import { lppPhotoWatermark } from "../lib/lpp/naming";
import { exportWorkbook, inspectWorkbook } from "../lib/lpp/workbook";
import type { LppWorkbook } from "../types/lpp";

function fixture(): LppWorkbook {
  const cell = (address: string, value: string) => ({ address, value, formula: false });
  return { hash: "example", sheets: [
    { name: "Laporan", rows: 155, columns: 5, merges: [], cells: [cell("B12", "Item Description")] },
    { name: "Dokumentasi", rows: 56, columns: 6, merges: [], cells: [cell("B12", "Material"), cell("C12", "Lokasi Pemasangan"), ...Array.from({ length: 7 }, (_, index) => [cell(`A${index + 13}`, String(index + 1)), cell(`B${index + 13}`, `Material ${index + 1}`), cell(`C${index + 13}`, "Lokasi contoh")]).flat()] },
  ] };
}
test("Documentation rows map independently from report devices and retain all ten photo slots", () => {
  const form = buildDocumentationForm(fixture())!;
  assert.equal(form.items.length, 7);
  const slots = formPhotoSlots(form);
  assert.deepEqual(form.items.map((item) => slots.filter((slot) => slot.itemId === item.id).length), [1, 1, 1, 2, 2, 1, 2]);
  assert.deepEqual(slots.filter((slot) => slot.itemId === "doc-4").map(({ row, column }) => [row, column]), [[15, 4], [15, 5]]);
  assert.deepEqual(fieldEdits(form.items[3].fields[0], "Nama baru"), [{ sheet: "Dokumentasi", address: "B16", value: "Nama baru" }]);
  const references = Object.fromEntries(slots.map((slot) => [slot.id, "a".repeat(64)]));
  assert.equal(Object.keys(validatePhotoReferences(references, form)).length, 10);
  assert.throws(() => validatePhotoReferences({ "doc-4-photo-3": "b".repeat(64) }, form));
  assert.throws(() => validatePhotoReferences({ "item-1": "b".repeat(64) }, form));
  assert.equal(buildDocumentationForm({ ...fixture(), sheets: [] }), null);
});
test("Private documentation exports replace all ten pictures without changing original rows, frames or media", async (t) => {
  const directory = process.env.LPP_TEST_TEMPLATE_DIR ?? "private/data-lpp";
  const files = await readdir(directory).catch(() => []);
  let matched = 0;
  for (const filename of files.filter((file) => file.endsWith(".xlsx"))) {
    const original = await readFile(`${directory}/${filename}`), workbook = await inspectWorkbook(original), form = buildDocumentationForm(workbook);
    if (!form) continue;
    matched++;
    const slots = formPhotoSlots(form);
    const sample = await sharp({ create: { width: 160, height: 90, channels: 3, background: "#003b5c" } }).jpeg().toBuffer();
    for (const slot of slots) {
      const preview = await templatePhoto(original, form, slot.id, true), dimensions = await sharp(preview).metadata();
      assert.ok(dimensions.width! <= 120 && dimensions.height! <= 120);
    }
    const secondOnly = await exportPhotos(original, form, [{ itemId: "doc-4-photo-2", buffer: sample }]);
    const before = await JSZip.loadAsync(original), single = await JSZip.loadAsync(secondOnly);
    const originalDrawing = await before.file("xl/drawings/drawing2.xml")!.async("string");
    const originalAnchors = [...originalDrawing.matchAll(/<xdr:twoCellAnchor\b[^>]*>[\s\S]*?<\/xdr:twoCellAnchor>/g)].map(([anchor]) => anchor);
    const singleDrawing = await single.file("xl/drawings/drawing2.xml")!.async("string");
    const changedAnchors = originalAnchors.filter((anchor) => !singleDrawing.includes(anchor));
    assert.equal(changedAnchors.length, 1);
    assert.match(changedAnchors[0], /<xdr:col>5<\/xdr:col>[\s\S]*?<xdr:row>15<\/xdr:row>/);
    const output = await exportPhotos(original, form, slots.map((slot) => ({ itemId: slot.id, buffer: sample })));
    const after = await JSZip.loadAsync(output);
    assert.equal(Object.keys(after.files).filter((path) => /^xl\/media\/lpp-photo-\d+\.png$/.test(path)).length, 10);
    for (const path of Object.keys(before.files).filter((path) => !before.files[path].dir && !["xl/drawings/drawing2.xml", "xl/drawings/_rels/drawing2.xml.rels"].includes(path))) assert.deepEqual(await after.file(path)!.async("nodebuffer"), await before.file(path)!.async("nodebuffer"));
    const stripReferences = (xml: string) => xml.replace(/r:embed="[^"]*"/g, 'r:embed="IMAGE"').replace(/<a:srcRect\b[^>]*\/>/g, "<a:srcRect/>");
    assert.equal(stripReferences(await after.file("xl/drawings/drawing2.xml")!.async("string")), stripReferences(originalDrawing));
    assert.deepEqual((await inspectWorkbook(output)).sheets, workbook.sheets);
    const cells = fieldEdits(form.items[0].fields[1], "Lokasi terbaru");
    const combined = await exportPhotos(await exportWorkbook(original, cells), form, [{ itemId: slots[0].id, buffer: sample }]);
    assert.deepEqual((await inspectWorkbook(combined)).sheets[0], workbook.sheets[0]);
    assert.deepEqual(await exportPhotos(original, form, []), original);
    const watermark = lppPhotoWatermark("LPP Videowall P2IS", "2026-03-01");
    const markedBuffer = await exportPhotos(original, form, [{ itemId: slots[0].id, buffer: sample }], watermark);
    const marked = await JSZip.loadAsync(markedBuffer);
    assert.equal(Object.keys(marked.files).filter((path) => /^xl\/media\/lpp-photo-\d+\.png$/.test(path)).length, 10);
    for (const [index, slot] of slots.entries()) {
      assert.deepEqual(await marked.file(`xl/media/lpp-photo-${index + 1}.png`)!.async("nodebuffer"), await watermarkedPhotoPreview(original, form, slot.id, watermark, index === 0 ? sample : undefined));
    }
    assert.deepEqual(await templateHeaderLogo(markedBuffer), await templateHeaderLogo(original), "Company logo is not watermarked");
    for (const path of Object.keys(before.files).filter((path) => !before.files[path].dir && !["xl/drawings/drawing2.xml", "xl/drawings/_rels/drawing2.xml.rels"].includes(path))) assert.deepEqual(await marked.file(path)!.async("nodebuffer"), await before.file(path)!.async("nodebuffer"));
    assert.equal(stripReferences(await marked.file("xl/drawings/drawing2.xml")!.async("string")), stripReferences(originalDrawing));
  }
  if (!matched) t.skip("Private documentation template is not installed in this environment.");
  else assert.equal(matched, 1);
});

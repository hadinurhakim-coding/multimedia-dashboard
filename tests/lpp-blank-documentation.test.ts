import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { XMLValidator } from "fast-xml-parser";
import JSZip from "jszip";
import sharp from "sharp";
import {
  BLANK_DOCUMENTATION_LAYOUTS,
  buildBlankDocumentationForm,
  buildCommandCenterDocumentationForm,
  buildHcOperationDocumentationForm,
  buildTaskForceDocumentationForm,
} from "../lib/lpp/blank-documentation-form";
import { fieldEdits, formErrors, formPhotoSlots, type LppForm } from "../lib/lpp/form";
import { validatePhotoReferences } from "../lib/lpp/photo-policy";
import { applyReportDate } from "../lib/lpp/report-date";
import { lppExportFilename, lppPhotoWatermark } from "../lib/lpp/naming";
import { exportPhotos, templateHeaderLogo, templatePhoto, watermarkedPhotoPreview } from "../lib/lpp/photos";
import { exportWorkbook, inspectWorkbook } from "../lib/lpp/workbook";
import type { LppWorkbook } from "../types/lpp";

const LOGO_ANCHOR = '<xdr:twoCellAnchor editAs="oneCell"><xdr:from><xdr:col>0</xdr:col><xdr:colOff>106680</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>99060</xdr:rowOff></xdr:from><xdr:to><xdr:col>1</xdr:col><xdr:colOff>1010580</xdr:colOff><xdr:row>2</xdr:row><xdr:rowOff>99060</xdr:rowOff></xdr:to><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="10" name="Logo"/><xdr:cNvPicPr/></xdr:nvPicPr><xdr:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="rId1"/><a:srcRect/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="1200000" cy="400000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:twoCellAnchor>';
const SHAPE_ANCHOR = '<xdr:oneCellAnchor><xdr:from><xdr:col>3</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>13</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:ext cx="100" cy="100"/><xdr:sp><xdr:nvSpPr><xdr:cNvPr id="60" name="TextBox 59"/><xdr:cNvSpPr txBox="1"/></xdr:nvSpPr><xdr:spPr/></xdr:sp><xdr:clientData/></xdr:oneCellAnchor>';

function blankWorkbookFixture(reportRows: number, signDate: string, signValue = "Jakarta, "): LppWorkbook {
  const information = {
    B1: "LAPORAN PELAKSANAAN PEKERJAAN",
    A4: "Project ID",
    A6: "Project : Proyek uji",
    A7: "Address : Jakarta",
    A8: "Contact Person : Tim",
    A9: "Job Description : Pemeliharaan",
    A10: "Date : 31 Maret 2026",
  };
  const docRows = Object.fromEntries(Array.from({ length: 15 }, (_, index) => [`A${index + 14}`, index + 1]));
  const toCells = (values: Record<string, string | number>) =>
    Object.entries(values).map(([address, value]) => ({ address, value, formula: false }));
  return {
    hash: "blank-fixture",
    sheets: [
      {
        name: "Sheet1",
        rows: reportRows,
        columns: 6,
        merges: [],
        cells: toCells({ ...information, B13: "ITEM DESCRIPTION", A14: 1, B14: "Item laporan", [signDate]: signValue }),
      },
      {
        name: "Dokumentasi",
        rows: 28,
        columns: 4,
        merges: [],
        cells: toCells({ ...information, ...docRows, B13: "MATERIAL", C13: "LOKASI PEMASANGAN" }),
      },
    ],
  };
}

async function blankZipFixture() {
  const logo = await sharp({ create: { width: 120, height: 40, channels: 3, background: "#003b5c" } }).png().toBuffer();
  const zip = new JSZip();
  zip.file("[Content_Types].xml", '<Types><Default Extension="png" ContentType="image/png"/></Types>');
  zip.file("xl/workbook.xml", '<workbook><sheets><sheet name="Sheet1" r:id="rIdS1"/><sheet name="Dokumentasi" r:id="rIdS2"/></sheets></workbook>');
  zip.file("xl/_rels/workbook.xml.rels", '<Relationships><Relationship Id="rIdS1" Target="worksheets/sheet1.xml"/><Relationship Id="rIdS2" Target="worksheets/sheet2.xml"/></Relationships>');
  zip.file("xl/worksheets/sheet1.xml", '<worksheet><drawing r:id="rIdD1"/></worksheet>');
  zip.file("xl/worksheets/_rels/sheet1.xml.rels", '<Relationships><Relationship Id="rIdD1" Target="../drawings/drawing2.xml"/></Relationships>');
  zip.file(
    "xl/worksheets/sheet2.xml",
    '<worksheet><cols><col min="4" max="4" width="37" customWidth="1"/></cols><sheetData><row r="14" ht="130" customHeight="1"/><row r="28" ht="101.4" customHeight="1"/></sheetData><drawing r:id="rIdD2"/></worksheet>'
  );
  zip.file("xl/worksheets/_rels/sheet2.xml.rels", '<Relationships><Relationship Id="rIdD2" Target="../drawings/drawing2.xml"/></Relationships>');
  zip.file(
    "xl/drawings/drawing2.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">${LOGO_ANCHOR}${SHAPE_ANCHOR}</xdr:wsDr>`
  );
  zip.file("xl/drawings/_rels/drawing2.xml.rels", '<Relationships><Relationship Id="rId1" Target="../media/image1.png"/></Relationships>');
  zip.file("xl/media/image1.png", logo);
  return zip.generateAsync({ type: "nodebuffer" });
}

test("Remaining 3 blank-documentation layouts map 15 optional rows and preserve comma-only sign prefix", () => {
  const variants = [
    ["Command Center", buildCommandCenterDocumentationForm, BLANK_DOCUMENTATION_LAYOUTS.commandCenter],
    ["Task Force", buildTaskForceDocumentationForm, BLANK_DOCUMENTATION_LAYOUTS.taskForce],
    ["HC Operation", buildHcOperationDocumentationForm, BLANK_DOCUMENTATION_LAYOUTS.hcOperation],
  ] as const;
  for (const [label, builder, layout] of variants) {
    const workbook = blankWorkbookFixture(layout.reportRows, layout.signDate, "Jakarta, ");
    const form = builder(workbook)!;
    assert.ok(form, `${label} form should match`);
    assert.equal(form.items.length, 15);
    assert.equal(form.photoFormat, "jpeg");
    assert.deepEqual(formErrors(form, workbook, {}), {});
    const slots = formPhotoSlots(form);
    assert.equal(slots.length, 15);
    assert.equal(new Set(slots.map((slot) => slot.id)).size, 15);
    assert.ok(slots.every((slot) => slot.hasTemplatePhoto === false && slot.column === 3));
    assert.deepEqual(fieldEdits(form.items[0].fields[0], "Material baru"), [{ sheet: "Dokumentasi", address: "B14", value: "Material baru" }]);
    assert.deepEqual(fieldEdits(form.items[14].fields[1], "Lokasi baru"), [{ sheet: "Dokumentasi", address: "C28", value: "Lokasi baru" }]);
    assert.deepEqual(
      applyReportDate(form, [], "2026-03-01").map((edit) => [edit.sheet, edit.address, edit.value]),
      [
        ["Sheet1", "A10", "Date : 1 Maret 2026"],
        ["Dokumentasi", "A10", "Date : 1 Maret 2026"],
        ["Sheet1", layout.signDate, "Jakarta, 1 Maret 2026"],
      ]
    );
    assert.deepEqual(validatePhotoReferences({ "doc-1-photo-1": "a".repeat(64) }, form), { "doc-1-photo-1": "a".repeat(64) });
    assert.throws(() => validatePhotoReferences({ "doc-16-photo-1": "a".repeat(64) }, form));
    const wrongRows = structuredClone(workbook);
    wrongRows.sheets[0].rows += 1;
    assert.equal(builder(wrongRows), null);
    const brokenNum = structuredClone(workbook);
    brokenNum.sheets[1].cells.find((cell) => cell.address === "A28")!.value = 99;
    assert.equal(builder(brokenNum), null);
  }
  const untrimmed = blankWorkbookFixture(141, "C126", "Jakarta,");
  assert.equal(applyReportDate(buildCommandCenterDocumentationForm(untrimmed), [], "2026-03-01")[2]?.value, "Jakarta, 1 Maret 2026");
});

test("Blank photo slots stay safe when empty and insert valid cell-fitted watermarked anchors when uploaded", async () => {
  const original = await blankZipFixture();
  const workbook = blankWorkbookFixture(141, "C126");
  const form = buildBlankDocumentationForm(workbook, BLANK_DOCUMENTATION_LAYOUTS.commandCenter)!;
  const label = lppPhotoWatermark("LPP Command Center", "2026-03-01");
  const sample = await sharp({ create: { width: 320, height: 240, channels: 3, background: "#005587" } }).jpeg().toBuffer();

  await assert.rejects(templatePhoto(original, form, "doc-1-photo-1"));
  await assert.rejects(watermarkedPhotoPreview(original, form, "doc-1-photo-1", label));
  assert.deepEqual(await exportPhotos(original, form, [], label), original);

  const strictForm: LppForm = { ...form, photoSlots: [{ id: "doc-1-photo-1", itemId: "doc-1", sheet: "Dokumentasi", row: 13, column: 3 }] };
  await assert.rejects(exportPhotos(original, strictForm, [{ itemId: "doc-1-photo-1", buffer: sample }], label), /Posisi foto perangkat/);

  const exported = await exportPhotos(
    original,
    form,
    [{ itemId: "doc-1-photo-1", buffer: sample }, { itemId: "doc-15-photo-1", buffer: sample }],
    label
  );
  const after = await JSZip.loadAsync(exported);
  const drawing = await after.file("xl/drawings/drawing2.xml")!.async("string");
  assert.equal(XMLValidator.validate(drawing), true);
  assert.ok(drawing.includes(SHAPE_ANCHOR));
  assert.ok(drawing.includes('<xdr:cNvPr id="61"'));
  assert.ok(drawing.includes('<xdr:cNvPr id="62"'));
  assert.equal([...drawing.matchAll(/<xdr:pic>/g)].length, 3);
  assert.deepEqual(await after.file("xl/media/lpp-photo-1.jpg")!.async("nodebuffer"), await watermarkedPhotoPreview(original, form, "doc-1-photo-1", label, sample));
  assert.deepEqual(await after.file("xl/media/lpp-photo-2.jpg")!.async("nodebuffer"), await watermarkedPhotoPreview(original, form, "doc-15-photo-1", label, sample));
  assert.match(await after.file("[Content_Types].xml")!.async("string"), /Extension="jpg" ContentType="image\/jpeg"/);
  assert.deepEqual(await templateHeaderLogo(exported), await templateHeaderLogo(original));
});

test("Private remaining 3 templates export safely empty and with uploaded watermarked photos", async (t) => {
  const directory = process.env.LPP_TEST_TEMPLATE_DIR ?? "private/data-lpp";
  const builders = [buildCommandCenterDocumentationForm, buildTaskForceDocumentationForm, buildHcOperationDocumentationForm];
  let matched = 0;
  for (const filename of (await readdir(directory).catch(() => [])).filter((file) => file.endsWith(".xlsx"))) {
    const original = await readFile(`${directory}/${filename}`);
    const workbook = await inspectWorkbook(original);
    const form = builders.map((build) => build(workbook)).find(Boolean);
    if (!form) continue;
    matched++;
    assert.deepEqual(formErrors(form, workbook, {}), {});
    const slots = formPhotoSlots(form);
    assert.equal(slots.length, 15);
    assert.equal(lppExportFilename("LPP", { reportDate: "2026-03-01", createdAt: "2026-03-01T00:00:00.000Z", updatedAt: "2026-03-01T00:00:00.000Z" }), "2026-03-01 LPP.xlsx");

    const dateEdits = applyReportDate(form, [], "2026-03-01");
    assert.match(String(dateEdits[2]?.value), /^Jakarta, 1 Maret 2026$/);
    const updatedBook = await exportWorkbook(original, [...dateEdits, ...fieldEdits(form.items[0].fields[0], "Material Dokumentasi 1")]);
    assert.deepEqual(await exportPhotos(updatedBook, form, [], "LPP Uji · 1 Maret 2026"), updatedBook);

    const sample = await sharp({ create: { width: 400, height: 300, channels: 3, background: "#003b5c" } }).jpeg().toBuffer();
    const watermark = "LPP Uji · 1 Maret 2026";
    const markedBuffer = await exportPhotos(
      updatedBook,
      form,
      [{ itemId: slots[0].id, buffer: sample }, { itemId: slots[14].id, buffer: sample }],
      watermark
    );
    assert.ok(markedBuffer.length < 30 * 1024 * 1024);
    const before = await JSZip.loadAsync(updatedBook);
    const after = await JSZip.loadAsync(markedBuffer);
    const drawing = await after.file("xl/drawings/drawing2.xml")!.async("string");
    assert.equal(XMLValidator.validate(drawing), true);
    assert.equal([...drawing.matchAll(/<xdr:pic>/g)].length, 3);
    assert.equal([...drawing.matchAll(/<xdr:oneCellAnchor\b/g)].length, 12);
    const ids = [...drawing.matchAll(/<xdr:cNvPr\b[^>]*\bid="(\d+)"/g)].map((m) => m[1]);
    assert.equal(new Set(ids).size, ids.length);
    assert.deepEqual(await after.file("xl/media/lpp-photo-1.jpg")!.async("nodebuffer"), await watermarkedPhotoPreview(original, form, slots[0].id, watermark, sample));
    assert.deepEqual(await after.file("xl/media/lpp-photo-2.jpg")!.async("nodebuffer"), await watermarkedPhotoPreview(original, form, slots[14].id, watermark, sample));
    assert.deepEqual(await templateHeaderLogo(markedBuffer), await templateHeaderLogo(original));
    for (const path of Object.keys(before.files).filter((p) => !before.files[p].dir && !["xl/drawings/drawing2.xml", "xl/drawings/_rels/drawing2.xml.rels", "[Content_Types].xml"].includes(p))) {
      assert.deepEqual(await after.file(path)!.async("nodebuffer"), await before.file(path)!.async("nodebuffer"));
    }
    const reinspected = await inspectWorkbook(markedBuffer);
    assert.equal(reinspected.sheets[1].cells.find((c) => c.address === "B14")?.value, "Material Dokumentasi 1");
    assert.equal(reinspected.sheets[0].cells.find((c) => c.address === dateEdits[2].address)?.value, "Jakarta, 1 Maret 2026");
  }
  if (!matched) t.skip("Private remaining blank-documentation templates are not installed in this environment.");
  else assert.equal(matched, 3);
});

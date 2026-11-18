import { test } from "node:test";
import assert from "node:assert/strict";
import { mapWithConcurrency } from "../lib/async";
import { privateHeaders, privateImageHeaders } from "../lib/security/http";
import { computeConstrainedDimensions } from "../lib/lpp/photo-client";
import { exportWorkbook, inspectWorkbook } from "../lib/lpp/workbook";
import { BLANK_DOCUMENTATION_LAYOUTS, buildBlankDocumentationForm } from "../lib/lpp/blank-documentation-form";
import { exportPhotos, templateHeaderLogo } from "../lib/lpp/photos";
import JSZip from "jszip";
import sharp from "sharp";

test("mapWithConcurrency limits parallel workers and preserves exact item ordering", async () => {
  let active = 0;
  let peak = 0;
  const inputs = [1, 2, 3, 4, 5, 6, 7];
  const outputs = await mapWithConcurrency(inputs, 3, async (item) => {
    active++;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, (8 - item) * 2));
    active--;
    return item * 10;
  });

  assert.deepEqual(outputs, [10, 20, 30, 40, 50, 60, 70]);
  assert.ok(peak <= 3 && peak >= 2);
  assert.deepEqual(await mapWithConcurrency([], 4, async () => 1), []);
});

test("Security headers separate private JSON no-store from private browser-cacheable images", () => {
  assert.equal(privateHeaders["Cache-Control"], "private, no-store, max-age=0");
  assert.equal(privateImageHeaders["Cache-Control"], "private, max-age=3600, stale-while-revalidate=86400");
  assert.equal(privateImageHeaders.Vary, "Cookie");
  assert.equal(privateImageHeaders["X-Content-Type-Options"], "nosniff");
});

test("Client resize dimension calculator preserves aspect ratio within 1600px", () => {
  assert.deepEqual(computeConstrainedDimensions(4000, 3000, 1600), { width: 1600, height: 1200 });
  assert.deepEqual(computeConstrainedDimensions(2000, 4000, 1600), { width: 800, height: 1600 });
  assert.deepEqual(computeConstrainedDimensions(800, 600, 1600), { width: 800, height: 600 });
});

test("Workbook cache and concurrent photo export preserve exact determinism", async () => {
  const logo = await sharp({ create: { width: 120, height: 40, channels: 3, background: "#003b5c" } }).png().toBuffer();
  const sample = await sharp({ create: { width: 300, height: 200, channels: 3, background: "#00a2e9" } }).jpeg().toBuffer();
  const zip = new JSZip();
  zip.file("[Content_Types].xml", '<Types><Default Extension="png" ContentType="image/png"/></Types>');
  zip.file("xl/workbook.xml", '<workbook><sheets><sheet name="Sheet1" r:id="rIdS1"/><sheet name="Dokumentasi" r:id="rIdS2"/></sheets></workbook>');
  zip.file("xl/_rels/workbook.xml.rels", '<Relationships><Relationship Id="rIdS1" Target="worksheets/sheet1.xml"/><Relationship Id="rIdS2" Target="worksheets/sheet2.xml"/></Relationships>');
  zip.file("xl/worksheets/sheet1.xml", '<worksheet><sheetData><row r="10"><c r="A10" t="inlineStr"><is><t>Date : 31 Maret 2026</t></is></c></row></sheetData><drawing r:id="rIdD1"/></worksheet>');
  zip.file("xl/worksheets/_rels/sheet1.xml.rels", '<Relationships><Relationship Id="rIdD1" Target="../drawings/drawing2.xml"/></Relationships>');
  zip.file(
    "xl/worksheets/sheet2.xml",
    '<worksheet><cols><col min="4" max="4" width="37" customWidth="1"/></cols><sheetData><row r="14" ht="130" customHeight="1"/><row r="28" ht="101.4" customHeight="1"/></sheetData><drawing r:id="rIdD2"/></worksheet>'
  );
  zip.file("xl/worksheets/_rels/sheet2.xml.rels", '<Relationships><Relationship Id="rIdD2" Target="../drawings/drawing2.xml"/></Relationships>');
  zip.file(
    "xl/drawings/drawing2.xml",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><xdr:twoCellAnchor editAs="oneCell"><xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>1</xdr:col><xdr:colOff>100</xdr:colOff><xdr:row>2</xdr:row><xdr:rowOff>100</xdr:rowOff></xdr:to><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="1" name="Logo"/><xdr:cNvPicPr/></xdr:nvPicPr><xdr:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="rId1"/><a:srcRect/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="1200000" cy="400000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:twoCellAnchor></xdr:wsDr>'
  );
  zip.file("xl/drawings/_rels/drawing2.xml.rels", '<Relationships><Relationship Id="rId1" Target="../media/image1.png"/></Relationships>');
  zip.file("xl/media/image1.png", logo);
  const buffer = await zip.generateAsync({ type: "nodebuffer" });

  const first = await inspectWorkbook(buffer);
  const second = await inspectWorkbook(buffer, first.hash);
  assert.strictEqual(first, second);

  const toCells = (values: Record<string, string | number>) =>
    Object.entries(values).map(([address, value]) => ({ address, value, formula: false }));
  const commonInfo = {
    B1: "LAPORAN PELAKSANAAN PEKERJAAN",
    A4: "Project ID",
    A6: "Project : Proyek uji",
    A7: "Address : Jakarta",
    A8: "Contact Person : Tim",
    A9: "Job Description : Pemeliharaan",
    A10: "Date : 31 Maret 2026",
  };
  const docNums = Object.fromEntries(Array.from({ length: 15 }, (_, index) => [`A${index + 14}`, index + 1]));
  const syntheticBook = {
    hash: first.hash,
    sheets: [
      {
        name: "Sheet1",
        rows: 141,
        columns: 6,
        merges: [],
        cells: toCells({ ...commonInfo, B13: "ITEM DESCRIPTION", A14: 1, B14: "Item laporan", C126: "Jakarta, " }),
      },
      {
        name: "Dokumentasi",
        rows: 28,
        columns: 4,
        merges: [],
        cells: toCells({ ...commonInfo, ...docNums, B13: "MATERIAL", C13: "LOKASI PEMASANGAN" }),
      },
    ],
  };
  const form = buildBlankDocumentationForm(syntheticBook, BLANK_DOCUMENTATION_LAYOUTS.commandCenter);
  assert.ok(form, "Synthetic commandCenter layout should resolve");
  const exportedBook = await exportWorkbook(buffer, [{ sheet: "Sheet1", address: "A10", value: "Date : 1 Maret 2026" }], first);
  const withPhotos = await exportPhotos(
    exportedBook,
    form,
    [
      { itemId: "doc-1-photo-1", buffer: sample },
      { itemId: "doc-15-photo-1", buffer: sample },
    ],
    "LPP Uji · 1 Maret 2026"
  );
  const reloaded = await JSZip.loadAsync(withPhotos);
  assert.ok(reloaded.file("xl/media/lpp-photo-1.jpg"));
  assert.ok(reloaded.file("xl/media/lpp-photo-2.jpg"));
  assert.deepEqual(await templateHeaderLogo(buffer, first.hash), await templateHeaderLogo(buffer));
});

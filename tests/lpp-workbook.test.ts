import { test } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import JSZip from "jszip";
import { XMLValidator } from "fast-xml-parser";
import { inspectWorkbook, exportWorkbook, validateEdits, isMergedChild } from "../lib/lpp/workbook";

async function fixture() {
  const zip = new JSZip();
  zip.file("xl/workbook.xml", '<workbook><sheets><sheet name="Data" r:id="r1"/></sheets></workbook>');
  zip.file("xl/_rels/workbook.xml.rels", '<Relationships><Relationship Id="r1" Target="worksheets/sheet1.xml"/></Relationships>');
  zip.file("xl/worksheets/sheet1.xml", '<worksheet><sheetData><row r="1"><c r="A1" s="2" t="inlineStr"><is><t>Title</t></is></c><c r="C1"><f>1+1</f><v>2</v></c></row><row r="3"><c r="A3" s="4"/><c r="C3"><v>3</v></c></row></sheetData><mergeCells><mergeCell ref="A1:B1"/></mergeCells></worksheet>');
  zip.file("xl/media/image.png", Buffer.from([0, 1, 3, 4]));
  return zip.generateAsync({ type: "nodebuffer" });
}
test("XML edits preserve styles, media, formulas; values remain literal", async () => {
  const original = await fixture(), wb = await inspectWorkbook(original);
  assert.equal(wb.sheets[0].cells[0].value, "Title");
  const edited = await exportWorkbook(original, [
    { sheet: "Data", address: "A1", value: '=HYPERLINK("https://example.test") & <tag>\nline\rnext' },
    { sheet: "Data", address: "A3", value: 0 },
    { sheet: "Data", address: "B3", value: false },
    { sheet: "Data", address: "A2", value: "new" },
    { sheet: "Data", address: "C3", value: null },
  ]);
  const zip = await JSZip.loadAsync(edited), xml = await zip.file("xl/worksheets/sheet1.xml")!.async("string");
  assert.equal(XMLValidator.validate(xml), true);
  assert.match(xml, /<c r="A3" s="4"><v>0<\/v>/);
  assert.match(xml, /<f>1\+1<\/f>/);
  assert.equal((await inspectWorkbook(edited)).sheets[0].cells.find((c) => c.address === "A1")?.value, '=HYPERLINK("https://example.test") & <tag>\nline\rnext');
  assert.deepEqual(await zip.file("xl/media/image.png")!.async("nodebuffer"), Buffer.from([0, 1, 3, 4]));
  for (const address of ["C1", "B1", "Z9999", "../A1"]) assert.throws(() => validateEdits(wb, [{ sheet: "Data", address, value: "x" }]));
  assert.throws(() => validateEdits(wb, [{ sheet: "Data", address: "A1", value: { formula: "x" } }]));
});
test("All available private templates", async (t) => {
const directory = process.env.LPP_TEST_TEMPLATE_DIR ?? "private/data-lpp";
const files = await readdir(directory).catch(() => []);
for (const [index, filename] of files.filter((f) => f.endsWith(".xlsx")).entries()) {
  await t.test(`Private template ${index + 1}: exact round-trip and unchanged archive parts`, async () => {
    const original = await readFile(`${directory}/${filename}`);
    assert.deepEqual(await exportWorkbook(original, []), original);
    const model = await inspectWorkbook(original);
    const first = model.sheets[0], cell = first.cells.find((c) => !c.formula && !isMergedChild(c.address, first.merges))!;
    const exported = await exportWorkbook(original, [{ sheet: first.name, address: cell.address, value: "LPP verification & <text>" }]);
    const before = await JSZip.loadAsync(original), after = await JSZip.loadAsync(exported);
    assert.deepEqual(Object.keys(after.files).sort(), Object.keys(before.files).sort());
    let changed = 0;
    for (const name of Object.keys(before.files)) {
      if (before.files[name].dir) continue;
      const a = await before.file(name)!.async("nodebuffer"), b = await after.file(name)!.async("nodebuffer");
      if (!a.equals(b)) { assert.match(name, /^xl\/worksheets\/sheet\d+\.xml$/); changed++; assert.equal(XMLValidator.validate(b.toString()), true); }
    }
    assert.equal(changed, 1);
    const result = await inspectWorkbook(exported);
    assert.equal(result.sheets[0].cells.find((c) => c.address === cell.address)?.value, "LPP verification & <text>");
    assert.deepEqual(result.sheets.map((s) => s.merges), model.sheets.map((s) => s.merges));
    const bulkEdits = model.sheets.flatMap((s) => s.cells.filter((c) => !c.formula && !isMergedChild(c.address, s.merges)).map((c, i) => ({ sheet: s.name, address: c.address, value: i % 3 === 0 ? null : i % 3 === 1 ? 123.5 : "Teks & <uji>" })));
    const bulkResult = await inspectWorkbook(await exportWorkbook(original, bulkEdits));
    for (const edit of bulkEdits) assert.equal(bulkResult.sheets.find((s) => s.name === edit.sheet)?.cells.find((c) => c.address === edit.address)?.value, edit.value);
  });
}
});

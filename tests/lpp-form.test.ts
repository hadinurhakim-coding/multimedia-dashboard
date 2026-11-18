import { test } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import JSZip from "jszip";
import { buildInstallationForm, editKey, fieldEdits, formErrors, readFormField } from "../lib/lpp/form";
import { exportWorkbook, inspectWorkbook } from "../lib/lpp/workbook";
import type { CellEdit, LppWorkbook } from "../types/lpp";

function fixture(): LppWorkbook {
  const cells = (values: Record<string, string>) => Object.entries(values).map(([address, value]) => ({ address, value, formula: false }));
  const info = { A4: "Project ID", A6: "Project : Contoh", A7: "Address : Kota", A8: "Contact Person : Tim", A9: "Job Description : Pemasangan", A10: "Date : 30 September 2024" };
  return { hash: "fixture", sheets: [
    { name: "Pekerjaan", rows: 40, columns: 6, merges: [], cells: cells({ ...info, B13: "ITEM DESCRIPTION", C6: "Tahap contoh", C30: "Kota, 1 Oktober 2024", A32: "Pelaksana", C32: "Penerima", A39: "Nama A", C39: "Nama B", A40: "Jabatan A", C40: "Jabatan B" }) },
    { name: "Dokumentasi", rows: 27, columns: 4, merges: [], cells: cells({ ...info, C13: "LOKASI PEMASANGAN", D5: "Tahap contoh" }) },
  ] };
}
test("Form fields synchronize both sheets and preserve literal serials and date prefixes", () => {
  const workbook = fixture(), form = buildInstallationForm(workbook)!;
  assert.ok(form);
  const project = form.information.find((f) => f.id === "project")!;
  assert.equal(readFormField(project, workbook, {}), "Contoh");
  assert.deepEqual(fieldEdits(project, "Pekerjaan baru").map((e) => e.value), ["Project : Pekerjaan baru", "Project : Pekerjaan baru"]);
  const typing = Object.fromEntries(fieldEdits(project, "Pekerjaan ").map((e) => [editKey(e.sheet, e.address), e]));
  assert.equal(readFormField(project, workbook, typing), "Pekerjaan ");
  const id = form.information.find((f) => f.id === "projectId")!;
  assert.equal(readFormField(id, workbook, {}), "");
  assert.equal(fieldEdits(id, "001")[0].value, "Project ID : 001");
  const date = form.information.find((f) => f.id === "date")!;
  assert.equal(readFormField(date, workbook, {}), "2024-09-30");
  assert.equal(fieldEdits(date, "2026-11-17")[0].value, "Date : 17 November 2026");
  assert.throws(() => fieldEdits(date, "2026-02-30"));
  assert.equal(fieldEdits(form.items[0].fields[1], "0000123")[0].value, "0000123");
  const changes = fieldEdits(project, "");
  const errors = formErrors(form, workbook, Object.fromEntries(changes.map((e) => [editKey(e.sheet, e.address), e])));
  assert.equal(errors.project, "Nama pekerjaan wajib diisi.");
  assert.equal(errors.projectId, undefined);
  assert.equal(buildInstallationForm({ ...workbook, sheets: [] }), null);
});

test("Private pilot form exports preserve all workbook parts except requested cell values", async (t) => {
  const directory = process.env.LPP_TEST_TEMPLATE_DIR ?? "private/data-lpp";
  const files = await readdir(directory).catch(() => []);
  let pilotCount = 0;
  for (const filename of files.filter((f) => f.endsWith(".xlsx"))) {
    const original = await readFile(`${directory}/${filename}`), workbook = await inspectWorkbook(original), form = buildInstallationForm(workbook);
    if (!form) continue;
    pilotCount++;
    assert.equal(Object.keys(formErrors(form, workbook, {})).length, 0);
    assert.deepEqual(await exportWorkbook(original, []), original);
    const changes: CellEdit[] = [
      ...fieldEdits(form.information.find((f) => f.id === "project")!, "Proyek uji form"),
      ...fieldEdits(form.information.find((f) => f.id === "date")!, "2026-11-17"),
      ...fieldEdits(form.information.find((f) => f.id === "projectId")!, "000123"),
      ...fieldEdits(form.items[0].fields[0], "Perangkat contoh"),
      ...fieldEdits(form.items[0].fields[1], "000987654"),
      ...fieldEdits(form.items[0].fields[3], "Lokasi contoh"),
      ...fieldEdits(form.signatures[2], "Penanggung jawab contoh"),
    ];
    const exported = await exportWorkbook(original, changes), reopened = await inspectWorkbook(exported);
    for (const change of changes) assert.equal(reopened.sheets.find((s) => s.name === change.sheet)?.cells.find((c) => c.address === change.address)?.value, change.value);
    for (const sheet of workbook.sheets) {
      for (const cell of sheet.cells.filter((c) => !changes.some((e) => e.sheet === sheet.name && e.address === c.address))) {
        assert.deepEqual(reopened.sheets.find((s) => s.name === sheet.name)?.cells.find((c) => c.address === cell.address), cell);
      }
    }
    const before = await JSZip.loadAsync(original), after = await JSZip.loadAsync(exported);
    assert.deepEqual(Object.keys(after.files).sort(), Object.keys(before.files).sort());
    for (const name of Object.keys(before.files).filter((n) => !before.files[n].dir && !/^xl\/worksheets\/sheet[12]\.xml$/.test(n))) {
      assert.deepEqual(await after.file(name)!.async("nodebuffer"), await before.file(name)!.async("nodebuffer"));
    }
    for (const [index, sheet] of workbook.sheets.entries()) {
      const part = `xl/worksheets/sheet${index + 1}.xml`;
      let oldXml = await before.file(part)!.async("string"), newXml = await after.file(part)!.async("string");
      for (const edit of changes.filter((e) => e.sheet === sheet.name)) {
        const regex = new RegExp(`<c\\b(?=[^>]*\\br="${edit.address}")[^>]*?(?:\\/>|>[\\s\\S]*?<\\/c>)`);
        const style = (xml: string) => xml.match(regex)?.[0].match(/\bs="[^"]*"/)?.[0];
        assert.equal(style(newXml), style(oldXml));
        oldXml = oldXml.replace(regex, "<edited/>"); newXml = newXml.replace(regex, "<edited/>");
      }
      assert.equal(newXml, oldXml);
    }
  }
  if (!pilotCount) t.skip("Private pilot template is not installed in this environment.");
  else assert.equal(pilotCount, 1);
});

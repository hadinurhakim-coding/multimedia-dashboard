import { test } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import JSZip from "jszip";
import sharp from "sharp";
import { normalizePhoto, exportPhotos, templatePhoto, watermarkedPhotoPreview } from "../lib/lpp/photos";
import { watermarkPhoto } from "../lib/lpp/watermark";
import { lppPhotoWatermark } from "../lib/lpp/naming";
import { MAX_PHOTO_BYTES, validatePhotoReferences } from "../lib/lpp/photo-policy";
import { buildInstallationForm, type LppForm } from "../lib/lpp/form";
import { inspectWorkbook } from "../lib/lpp/workbook";

const photo = () => sharp({ create: { width: 80, height: 120, channels: 3, background: "#00a2e9" } }).png().toBuffer();
function fixtureForm(): LppForm {
  return { kind: "installation-v1", information: [], signatures: [], items: [1, 2].map((number) => ({ id: `item-${number}`, number, fields: Array.from({ length: 4 }, (_, index) => ({ id: `${number}-${index}`, label: "Test", kind: "text", targets: [{ sheet: "Dokumentasi", address: `C${number + 13}`, prefix: "" }] })) })) };
}
const anchor = (row: number) => `<xdr:twoCellAnchor editAs="oneCell"><xdr:from><xdr:col>3</xdr:col><xdr:colOff>10</xdr:colOff><xdr:row>${row}</xdr:row><xdr:rowOff>20</xdr:rowOff></xdr:from><xdr:to><xdr:col>3</xdr:col><xdr:colOff>300</xdr:colOff><xdr:row>${row}</xdr:row><xdr:rowOff>250</xdr:rowOff></xdr:to><xdr:pic><xdr:blipFill><a:blip r:embed="rIdPhoto"/><a:srcRect l="10000"/></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="100" y="200"/><a:ext cx="400" cy="300"/></a:xfrm></xdr:spPr></xdr:pic><xdr:clientData/></xdr:twoCellAnchor>`;
async function fixture() {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", '<Types><Default Extension="png" ContentType="image/png"/></Types>');
  zip.file("xl/workbook.xml", '<workbook><sheets><sheet name="Dokumentasi" r:id="rIdSheet"/></sheets></workbook>');
  zip.file("xl/_rels/workbook.xml.rels", '<Relationships><Relationship Id="rIdSheet" Target="worksheets/sheet2.xml"/></Relationships>');
  zip.file("xl/worksheets/sheet2.xml", '<worksheet><drawing r:id="rIdDrawing"/></worksheet>');
  zip.file("xl/worksheets/_rels/sheet2.xml.rels", '<Relationships><Relationship Id="rIdDrawing" Target="../drawings/drawing2.xml"/></Relationships>');
  zip.file("xl/drawings/drawing2.xml", `<xdr:wsDr>${anchor(13)}${anchor(14)}</xdr:wsDr>`);
  zip.file("xl/drawings/_rels/drawing2.xml.rels", '<Relationships><Relationship Id="rIdPhoto" Target="../media/image1.png"/></Relationships>');
  zip.file("xl/media/image1.png", await photo());
  return zip.generateAsync({ type: "nodebuffer" });
}

test("Uploads validate image bytes, size, type and strip metadata", async () => {
  const original = await photo();
  const tagged = await sharp(original).withExif({ IFD0: { Artist: "PRIVATE TEST" } }).png().toBuffer();
  const normalized = await normalizePhoto(tagged, "image/png"), metadata = await sharp(normalized).metadata();
  assert.equal(metadata.format, "jpeg"); assert.equal(metadata.exif, undefined);
  assert.equal(metadata.width, 80); assert.equal(metadata.height, 120);
  await assert.rejects(normalizePhoto(original, "image/jpeg"));
  await assert.rejects(normalizePhoto(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), "image/png"));
  await assert.rejects(normalizePhoto(Buffer.alloc(MAX_PHOTO_BYTES + 1), "image/png"));
});
test("Photo references accept only existing form slots and opaque IDs", () => {
  const form = fixtureForm(), id = "a".repeat(64);
  assert.deepEqual(validatePhotoReferences({ "item-1": id }, form), { "item-1": id });
  assert.deepEqual(validatePhotoReferences(undefined, form), {});
  assert.throws(() => validatePhotoReferences({ "item-99": id }, form));
  assert.throws(() => validatePhotoReferences({ "item-1": "../other-owner/photo.jpg" }, form));
  assert.throws(() => validatePhotoReferences({ "item-1": id }, null));
});

test("Watermarks use the header date and change only the image footer", async () => {
  const original = await sharp({ create: { width: 1200, height: 700, channels: 3, background: "#8596a5" } }).png().toBuffer();
  const label = lppPhotoWatermark("LPP Videowall P2IS (New)", "2026-03-01");
  assert.equal(label, "LPP Videowall P2IS · 1 Maret 2026");
  assert.throws(() => lppPhotoWatermark("LPP", "2026-02-30"));
  const first = await watermarkPhoto(original, label);
  const second = await watermarkPhoto(original, lppPhotoWatermark("LPP Videowall P2IS", "2026-04-02"));
  assert.notDeepEqual(first, second, "Changing the date updates the burned-in watermark");
  const top = (buffer: Buffer) => sharp(buffer).extract({ left: 0, top: 0, width: 1200, height: 560 }).removeAlpha().raw().toBuffer();
  assert.deepEqual(await top(first), await top(original));
  assert.deepEqual(await top(second), await top(original));
  assert.deepEqual(await watermarkPhoto(original, label), first, "Fresh rendering does not accumulate stamps");
  assert.ok((await watermarkPhoto(original, 'LPP <test> & "quoted" · 1 Maret 2026')).length > 0, "Template names are escaped before text rendering");
  await assert.rejects(watermarkPhoto(original, ""));
});

test("All documentation slots are watermarked, including unchanged photos, with exact preview/export parity", async () => {
  const original = await fixture(), form = fixtureForm(), uploaded = await normalizePhoto(await photo(), "image/png");
  const label = lppPhotoWatermark("LPP Test", "2026-03-01");
  const before = await JSZip.loadAsync(original);
  for (const photos of [[], [{ itemId: "item-1", buffer: uploaded }]]) {
    const after = await JSZip.loadAsync(await exportPhotos(original, form, photos, label));
    for (const [index, itemId] of ["item-1", "item-2"].entries()) {
      assert.deepEqual(await after.file(`xl/media/lpp-photo-${index + 1}.png`)!.async("nodebuffer"), await watermarkedPhotoPreview(original, form, itemId, label, photos.find((photo) => photo.itemId === itemId)?.buffer));
    }
    for (const path of Object.keys(before.files).filter((path) => !before.files[path].dir && !["xl/drawings/drawing2.xml", "xl/drawings/_rels/drawing2.xml.rels"].includes(path))) {
      assert.deepEqual(await after.file(path)!.async("nodebuffer"), await before.file(path)!.async("nodebuffer"));
    }
  }
  await assert.rejects(exportPhotos(original, form, [{ itemId: "other-slot", buffer: uploaded }], label));
});
test("Replacing a shared image affects only its selected anchor and keeps original geometry", async () => {
  const original = await fixture(), form = fixtureForm();
  assert.deepEqual(await exportPhotos(original, form, []), original);
  assert.equal((await sharp(await templatePhoto(original, form, "item-1")).metadata()).format, "jpeg");
  const uploaded = await normalizePhoto(await photo(), "image/png");
  const exported = await exportPhotos(original, form, [{ itemId: "item-1", buffer: uploaded }]);
  const before = await JSZip.loadAsync(original), after = await JSZip.loadAsync(exported);
  for (const path of Object.keys(before.files).filter((p) => !before.files[p].dir && !["xl/drawings/drawing2.xml", "xl/drawings/_rels/drawing2.xml.rels"].includes(p))) assert.deepEqual(await after.file(path)!.async("nodebuffer"), await before.file(path)!.async("nodebuffer"));
  const drawing = await after.file("xl/drawings/drawing2.xml")!.async("string");
  assert.ok(drawing.includes(anchor(14)), "Unselected anchor using the same original image is untouched");
  assert.ok(drawing.includes(anchor(13).replace('r:embed="rIdPhoto"', 'r:embed="rIdLppPhoto1"').replace('<a:srcRect l="10000"/>', '<a:srcRect/>')));
  const replacement = await after.file("xl/media/lpp-photo-1.png")!.async("nodebuffer");
  const meta = await sharp(replacement).metadata(); assert.equal(meta.width, 1200); assert.equal(meta.height, 900);
  const pixels = await sharp(replacement).removeAlpha().raw().toBuffer();
  const sourcePixels = await sharp(uploaded).removeAlpha().raw().toBuffer();
  for (const offset of [0, (1200 - 1) * 3, (1200 * 900 - 1) * 3]) {
    assert.deepEqual([...pixels.subarray(offset, offset + 3)], [...sourcePixels.subarray(0, 3)], "Uploaded photo reaches every frame edge without white padding");
  }
  await assert.rejects(exportPhotos(original, form, [{ itemId: "item-99", buffer: await photo() }]));
});
test("Private pilot photo replacement preserves all original worksheet, print, logo and other image parts", async (t) => {
  const directory = process.env.LPP_TEST_TEMPLATE_DIR ?? "private/data-lpp";
  const files = await readdir(directory).catch(() => []);
  if (!files.length) { t.skip("Private templates intentionally absent on CI."); return; }
  let count = 0;
  for (const filename of files.filter((file) => file.endsWith(".xlsx"))) {
    const original = await readFile(`${directory}/${filename}`), form = buildInstallationForm(await inspectWorkbook(original));
    if (!form) continue;
    count++;
    assert.ok((await templatePhoto(original, form, "item-4")).length > 0);
    const exported = await exportPhotos(original, form, [{ itemId: "item-4", buffer: await photo() }, { itemId: "item-6", buffer: await photo() }]);
    const before = await JSZip.loadAsync(original), after = await JSZip.loadAsync(exported);
    for (const path of Object.keys(before.files).filter((p) => !before.files[p].dir && !["xl/drawings/drawing2.xml", "xl/drawings/_rels/drawing2.xml.rels"].includes(p))) assert.deepEqual(await after.file(path)!.async("nodebuffer"), await before.file(path)!.async("nodebuffer"));
    const strip = (value: string) => value.replace(/r:embed="[^"]*"/g, 'r:embed="IMAGE"').replace(/<a:srcRect\b[^>]*\/>/g, '<a:srcRect/>');
    assert.equal(strip(await after.file("xl/drawings/drawing2.xml")!.async("string")), strip(await before.file("xl/drawings/drawing2.xml")!.async("string")));
    assert.ok(after.file("xl/media/lpp-photo-1.png")); assert.ok(after.file("xl/media/lpp-photo-2.png"));
  }
  if (!count) t.skip("Private pilot template is not installed in this environment.");
  else assert.equal(count, 1);
});

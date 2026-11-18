// Pure image/OOXML processing; called only from authenticated server routes.
import JSZip from "jszip";
import sharp from "sharp";
import { XMLParser } from "fast-xml-parser";
import { posix } from "node:path";
import { formPhotoSlots, type LppForm } from "./form";
import { MAX_PHOTO_BYTES, PHOTO_TYPES } from "./photo-policy";
import { watermarkPhoto } from "./watermark";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@", removeNSPrefix: true, parseTagValue: false });
type Node = Record<string, unknown>;
const node = (value: unknown): Node => (value ?? {}) as Node;
const list = (value: unknown): Node[] => value == null ? [] : (Array.isArray(value) ? value : [value]) as Node[];
const imageOptions = { limitInputPixels: 40_000_000, failOn: "warning" as const };
export async function normalizePhoto(buffer: Buffer, contentType: string) {
  if (!PHOTO_TYPES.includes(contentType) || buffer.length === 0 || buffer.length > MAX_PHOTO_BYTES) throw new Error("Gunakan foto JPG, PNG, atau WebP maksimal 4 MB.");
  try {
    const source = sharp(buffer, imageOptions), metadata = await source.metadata();
    const format = { "image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp" }[contentType];
    if (metadata.format !== format || (metadata.pages ?? 1) !== 1) throw new Error();
    // Re-encode pixels, apply camera orientation and discard EXIF/GPS/other metadata.
    return await source.rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).flatten({ background: "#ffffff" }).jpeg({ quality: 85 }).toBuffer();
  } catch { throw new Error("Foto tidak dapat dibaca. Gunakan gambar statis JPG, PNG, atau WebP hingga 40 megapiksel."); }
}

type PhotoSlot = {
  itemId: string; drawing: string; rels: string; row: number; column: number;
  width: number; height: number; anchor?: string; media?: string; insetX?: number; insetY?: number;
};
const EMU_PER_POINT = 12700;
const EMU_PER_PIXEL = 9525;
const CELL_INSET_EMU = 45720;

function blankFrameDimensions(sheetNode: Node, row: number, column: number) {
  const colNumber = column + 1, rowNumber = row + 1;
  const colNode = list(node(sheetNode.cols).col).find((c) => Number(c["@min"]) <= colNumber && colNumber <= Number(c["@max"]));
  const colWidthChars = Number(colNode?.["@width"] ?? 0);
  const rowNode = list(node(sheetNode.sheetData).row).find((r) => Number(r["@r"]) === rowNumber);
  const defaultRowHeight = Number(node(sheetNode.sheetFormatPr)["@defaultRowHeight"] ?? 0);
  const rowHeightPt = Number(rowNode?.["@ht"] ?? defaultRowHeight);
  const cellWidthEmu = colWidthChars > 0
    ? Math.round((((256 * colWidthChars + Math.floor(128 / 7)) / 256) * 7) * EMU_PER_PIXEL)
    : 2_400_000 + CELL_INSET_EMU * 2;
  const cellHeightEmu = rowHeightPt > 0 ? Math.round(rowHeightPt * EMU_PER_POINT) : 1_800_000 + CELL_INSET_EMU * 2;
  return {
    width: Math.max(200_000, cellWidthEmu - CELL_INSET_EMU * 2),
    height: Math.max(200_000, cellHeightEmu - CELL_INSET_EMU * 2),
    insetX: CELL_INSET_EMU,
    insetY: CELL_INSET_EMU,
  };
}

function buildPictureAnchor(slot: PhotoSlot, relationshipId: string, shapeId: number) {
  const insetX = slot.insetX ?? CELL_INSET_EMU;
  const insetY = slot.insetY ?? CELL_INSET_EMU;
  return `<xdr:twoCellAnchor editAs="oneCell"><xdr:from><xdr:col>${slot.column}</xdr:col><xdr:colOff>${insetX}</xdr:colOff><xdr:row>${slot.row}</xdr:row><xdr:rowOff>${insetY}</xdr:rowOff></xdr:from><xdr:to><xdr:col>${slot.column}</xdr:col><xdr:colOff>${insetX + slot.width}</xdr:colOff><xdr:row>${slot.row}</xdr:row><xdr:rowOff>${insetY + slot.height}</xdr:rowOff></xdr:to><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${shapeId}" name="Picture ${shapeId}"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1" noChangeArrowheads="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="${relationshipId}"/><a:srcRect/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${slot.width}" cy="${slot.height}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:twoCellAnchor>`;
}

async function xml(zip: JSZip, path: string) {
  const file = zip.file(path);
  if (!file) throw new Error("Struktur foto template tidak valid.");
  return file.async("string");
}
const relPath = (part: string) => posix.join(posix.dirname(part), "_rels", posix.basename(part) + ".rels");
function resolveTarget(part: string, relationship: Node | undefined, prefix: string) {
  if (!relationship || relationship["@TargetMode"] === "External") throw new Error("Referensi foto tidak valid.");
  const target = String(relationship["@Target"]);
  const resolved = target.startsWith("/") ? target.slice(1) : posix.normalize(posix.join(posix.dirname(part), target));
  if (!resolved.startsWith(prefix)) throw new Error("Lokasi foto tidak valid.");
  return resolved;
}
async function photoSlots(zip: JSZip, form: LppForm): Promise<PhotoSlot[]> {
  const workbook = node(parser.parse(await xml(zip, "xl/workbook.xml")).workbook);
  const sheets = list(node(workbook.sheets).sheet);
  const formSlots = formPhotoSlots(form);
  const documentation = formSlots[0]?.sheet;
  if (formSlots.some((slot) => slot.sheet !== documentation)) throw new Error("Sheet dokumentasi tidak valid.");
  const sheet = sheets.find((s) => s["@name"] === documentation);
  const relationships = list(parser.parse(await xml(zip, "xl/_rels/workbook.xml.rels")).Relationships.Relationship);
  const sheetPath = resolveTarget("xl/workbook.xml", relationships.find((r) => r["@Id"] === sheet?.["@id"]), "xl/worksheets/");
  const worksheet = node(parser.parse(await xml(zip, sheetPath)).worksheet);
  const sheetRels = list(parser.parse(await xml(zip, relPath(sheetPath))).Relationships.Relationship);
  const drawing = resolveTarget(sheetPath, sheetRels.find((r) => r["@Id"] === node(worksheet.drawing)["@id"]), "xl/drawings/");
  const rels = relPath(drawing), drawingXml = await xml(zip, drawing);
  const imageRels = list(parser.parse(await xml(zip, rels)).Relationships.Relationship);
  const anchors = [...drawingXml.matchAll(/<xdr:(?:twoCellAnchor|oneCellAnchor)\b[^>]*>[\s\S]*?<\/xdr:(?:twoCellAnchor|oneCellAnchor)>/g)];
  return formSlots.map((slot) => {
    const matches = anchors.flatMap(([anchor]) => {
      const parsed = node(parser.parse(anchor)), data = node(parsed.twoCellAnchor ?? parsed.oneCellAnchor);
      if (Number(node(data.from).row) !== slot.row || Number(node(data.from).col) !== slot.column || !data.pic) return [];
      const pic = node(data.pic), blip = node(node(pic.blipFill).blip), extent = node(node(node(pic.spPr).xfrm).ext);
      if (slot.anchorId && String(node(node(pic.nvPicPr).cNvPr)["@id"]) !== slot.anchorId) return [];
      const width = Number(extent["@cx"]), height = Number(extent["@cy"]);
      if (!(width > 0 && height > 0)) throw new Error("Ukuran bingkai foto tidak valid.");
      return [{ itemId: slot.id, anchor, drawing, rels, row: slot.row, column: slot.column, width, height, media: resolveTarget(drawing, imageRels.find((r) => r["@Id"] === blip["@embed"]), "xl/media/") }];
    });
    if (matches.length === 0 && slot.hasTemplatePhoto === false) {
      return { itemId: slot.id, drawing, rels, row: slot.row, column: slot.column, ...blankFrameDimensions(worksheet, slot.row, slot.column) };
    }
    if (matches.length !== 1) throw new Error("Posisi foto perangkat tidak dapat dipastikan.");
    return matches[0];
  });
}
export async function templatePhoto(buffer: Buffer, form: LppForm, itemId: string, thumbnail = false) {
  const zip = await JSZip.loadAsync(buffer), slot = (await photoSlots(zip, form)).find((s) => s.itemId === itemId);
  if (!slot || !slot.media) throw new Error("Foto template tidak ditemukan.");
  const source = zip.file(slot.media);
  if (!source) throw new Error("Foto template tidak ditemukan.");
  // Safe preview, with the same orientation/metadata policy as uploaded photos.
  return photoPreview(await source.async("nodebuffer"), thumbnail);
}
export function photoPreview(buffer: Buffer, thumbnail = false) {
  const size = thumbnail ? 120 : 1000;
  return sharp(buffer, imageOptions).rotate().resize({ width: size, height: size, fit: "inside", withoutEnlargement: true }).flatten({ background: "#ffffff" }).jpeg({ quality: 85 }).toBuffer();
}
export async function templateHeaderLogo(buffer: Buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const workbook = node(parser.parse(await xml(zip, "xl/workbook.xml")).workbook);
  const sheet = list(node(workbook.sheets).sheet)[0];
  const relationships = list(parser.parse(await xml(zip, "xl/_rels/workbook.xml.rels")).Relationships.Relationship);
  const sheetPath = resolveTarget("xl/workbook.xml", relationships.find((r) => r["@Id"] === sheet?.["@id"]), "xl/worksheets/");
  const worksheet = node(parser.parse(await xml(zip, sheetPath)).worksheet);
  const sheetRels = list(parser.parse(await xml(zip, relPath(sheetPath))).Relationships.Relationship);
  const drawing = resolveTarget(sheetPath, sheetRels.find((r) => r["@Id"] === node(worksheet.drawing)["@id"]), "xl/drawings/");
  const data = node(parser.parse(await xml(zip, drawing)).wsDr);
  const candidates = [...list(data.twoCellAnchor), ...list(data.oneCellAnchor)].filter((anchor) => anchor.pic && Number(node(anchor.from).row) === 0 && Number(node(anchor.from).col) === 0);
  if (candidates.length !== 1) throw new Error("Logo template tidak ditemukan.");
  const embed = node(node(node(candidates[0].pic).blipFill).blip)["@embed"];
  const imageRels = list(parser.parse(await xml(zip, relPath(drawing))).Relationships.Relationship);
  const media = resolveTarget(drawing, imageRels.find((r) => r["@Id"] === embed), "xl/media/");
  const source = zip.file(media);
  if (!source) throw new Error("Logo template tidak ditemukan.");
  return sharp(await source.async("nodebuffer"), imageOptions).resize({ width: 440, height: 140, fit: "inside", withoutEnlargement: true }).png().toBuffer();
}
async function renderSlot(zip: JSZip, slot: PhotoSlot, uploaded?: Buffer, watermark?: string, format: "png" | "jpeg" = "png") {
  const original = uploaded || !slot.media ? undefined : zip.file(slot.media);
  if (!uploaded && !original) throw new Error("Foto template tidak ditemukan.");
  let source = uploaded ?? await original!.async("nodebuffer");
  if (!uploaded && slot.anchor) {
    // Preserve the original Excel crop before flattening it into the replacement image.
    const anchor = node(parser.parse(slot.anchor)), data = node(anchor.twoCellAnchor ?? anchor.oneCellAnchor);
    const crop = node(node(node(data.pic).blipFill).srcRect);
    const values = ["l", "t", "r", "b"].map((side) => Number(crop[`@${side}`] ?? 0));
    if (values.some((value) => value !== 0)) {
      const meta = await sharp(source, imageOptions).metadata();
      const [left, top, right, bottom] = values.map((value, index) => Math.round(value * (index % 2 ? meta.height! : meta.width!) / 100000));
      const width = meta.width! - left - right, height = meta.height! - top - bottom;
      if (!values.every(Number.isFinite) || width < 1 || height < 1 || width * height > 40_000_000) throw new Error("Potongan foto template tidak valid.");
      const extend = { left: Math.max(0, -left), top: Math.max(0, -top), right: Math.max(0, -right), bottom: Math.max(0, -bottom), background: "#ffffff" };
      source = await sharp(source, imageOptions).extend(extend).png().toBuffer();
      source = await sharp(source, imageOptions).extract({ left: left + extend.left, top: top + extend.top, width, height }).png().toBuffer();
    }
  }
  const scale = 1200 / Math.max(slot.width, slot.height);
  // Fill uploaded photos edge to edge with a proportional center crop, before stamping.
  // Existing template pictures retain their original frame fill.
  const framed = await sharp(source, imageOptions).rotate().resize(Math.max(1, Math.round(slot.width * scale)), Math.max(1, Math.round(slot.height * scale)), { fit: uploaded ? "cover" : "fill", position: "centre" }).png().toBuffer();
  if (watermark) return watermarkPhoto(framed, watermark, format);
  return format === "jpeg" ? sharp(framed).flatten({ background: "#ffffff" }).jpeg({ quality: 90, chromaSubsampling: "4:4:4" }).toBuffer() : framed;
}

export async function watermarkedPhotoPreview(buffer: Buffer, form: LppForm, itemId: string, watermark: string, uploaded?: Buffer) {
  const zip = await JSZip.loadAsync(buffer), slot = (await photoSlots(zip, form)).find((slot) => slot.itemId === itemId);
  if (!slot) throw new Error("Foto perangkat tidak ditemukan.");
  if (!uploaded && !slot.media) throw new Error("Foto perangkat belum diunggah.");
  return renderSlot(zip, slot, uploaded, watermark, form.photoFormat);
}

export async function exportPhotos(buffer: Buffer, form: LppForm, photos: { itemId: string; buffer: Buffer }[], watermark?: string) {
  if (!photos.length && !watermark) return buffer;
  const zip = await JSZip.loadAsync(buffer), slots = await photoSlots(zip, form);
  const seen = new Set<string>();
  for (const photo of photos) {
    if (!slots.some((slot) => slot.itemId === photo.itemId) || seen.has(photo.itemId)) throw new Error("Posisi foto tidak valid.");
    seen.add(photo.itemId);
  }
  const uploadedByItem = new Map(photos.map((photo) => [photo.itemId, photo.buffer]));
  const replacements = slots.filter((slot) => uploadedByItem.has(slot.itemId) || (Boolean(watermark) && Boolean(slot.media)));
  if (!replacements.length) return buffer;
  const extension = form.photoFormat === "jpeg" ? "jpg" : "png";
  for (const slot of replacements) {
    const replacement = await renderSlot(zip, slot, uploadedByItem.get(slot.itemId), watermark, form.photoFormat);
    let index = 1;
    while (zip.file(`xl/media/lpp-photo-${index}.${extension}`)) index++;
    const media = `xl/media/lpp-photo-${index}.${extension}`;
    const relationships = await xml(zip, slot.rels);
    let relationshipId = `rIdLppPhoto${index}`;
    while (relationships.includes(`Id="${relationshipId}"`)) relationshipId += "x";
    zip.file(media, replacement, { createFolders: false });
    zip.file(slot.rels, relationships.replace("</Relationships>", `<Relationship Id="${relationshipId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/lpp-photo-${index}.${extension}"/></Relationships>`), { createFolders: false });
    const drawingXml = await xml(zip, slot.drawing);
    if (slot.anchor) {
      const anchor = slot.anchor.replace(/r:embed="[^"]*"/, `r:embed="${relationshipId}"`).replace(/<a:srcRect\b[^>]*?(?:\/>|>[\s\S]*?<\/a:srcRect>)/, "<a:srcRect/>");
      zip.file(slot.drawing, drawingXml.replace(slot.anchor, () => anchor), { createFolders: false });
    } else {
      if (!drawingXml.includes("</xdr:wsDr>")) throw new Error("Struktur gambar template tidak valid.");
      const usedIds = [...drawingXml.matchAll(/<xdr:cNvPr\b[^>]*\bid="(\d+)"/g)].map((match) => Number(match[1]));
      const nextShapeId = Math.max(0, ...usedIds) + 1;
      zip.file(slot.drawing, drawingXml.replace("</xdr:wsDr>", `${buildPictureAnchor(slot, relationshipId, nextShapeId)}</xdr:wsDr>`), { createFolders: false });
    }
  }
  const types = await xml(zip, "[Content_Types].xml");
  if (!new RegExp(`<Default\\b[^>]*Extension="${extension}"`).test(types)) zip.file("[Content_Types].xml", types.replace("</Types>", `<Default Extension="${extension}" ContentType="image/${form.photoFormat ?? "png"}"/></Types>`), { createFolders: false });
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

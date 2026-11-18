// Kept free of filesystem/auth dependencies so fidelity can be tested in isolation.
// Import this module only through the server-only LPP service in the application.
import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import { createHash } from "node:crypto";
import { posix } from "node:path";
import type { CellEdit, CellValue, LppSheet, LppWorkbook } from "@/types/lpp";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@", parseTagValue: false, trimValues: false, htmlEntities: true });
type XmlNode = Record<string, unknown>;
const list = (value: unknown): XmlNode[] => value == null ? [] : (Array.isArray(value) ? value : [value]) as XmlNode[];
const node = (value: unknown) => (value ?? {}) as XmlNode;
function text(value: unknown): string {
  if (value == null) return "";
  if (typeof value !== "object") return String(value);
  if (Array.isArray(value)) return value.map(text).join("");
  const v = node(value);
  return text(v["#text"] ?? v.t ?? v.r ?? "");
}
export function coordinate(address: string) {
  const match = /^([A-Z]{1,3})([1-9]\d*)$/.exec(address);
  if (!match) throw new Error("Alamat sel tidak valid.");
  return { row: Number(match[2]), column: [...match[1]].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) };
}
export function columnName(column: number): string {
  let name = "";
  for (; column > 0; column = Math.floor((column - 1) / 26)) name = String.fromCharCode(65 + (column - 1) % 26) + name;
  return name;
}
export function isMergedChild(address: string, merges: string[]) {
  const point = coordinate(address);
  return merges.some((range) => {
    const [a, b = a] = range.split(":");
    const start = coordinate(a), end = coordinate(b);
    return address !== a && point.row >= start.row && point.row <= end.row && point.column >= start.column && point.column <= end.column;
  });
}
async function readArchive(buffer: Buffer) {
  if (buffer.length > 30 * 1024 * 1024) throw new Error("Template terlalu besar.");
  const zip = await JSZip.loadAsync(buffer);
  const read = async (path: string) => {
    const file = zip.file(path);
    if (!file) throw new Error("Struktur template tidak valid.");
    return file.async("string");
  };
  const workbook = node(parser.parse(await read("xl/workbook.xml")).workbook);
  const relationships = list(parser.parse(await read("xl/_rels/workbook.xml.rels")).Relationships.Relationship);
  const strings = zip.file("xl/sharedStrings.xml") ? list(parser.parse(await read("xl/sharedStrings.xml")).sst.si).map(text) : [];
  const sheets = [];
  for (const sheet of list(node(workbook.sheets).sheet)) {
    const rel = relationships.find((r) => r["@Id"] === sheet["@r:id"]);
    if (!rel || rel["@TargetMode"] === "External") throw new Error("Referensi sheet tidak valid.");
    const target = String(rel["@Target"]);
    const path = target.startsWith("/") ? target.slice(1) : posix.normalize(posix.join("xl", target));
    if (!path.startsWith("xl/worksheets/")) throw new Error("Lokasi sheet tidak valid.");
    const xml = await read(path);
    const data = node(parser.parse(xml).worksheet);
    const cells: LppSheet["cells"] = [];
    let rows = 0, columns = 0;
    for (const row of list(node(data.sheetData).row)) {
      rows = Math.max(rows, Number(row["@r"]));
      for (const cell of list(row.c)) {
        const address = String(cell["@r"]), point = coordinate(address);
        columns = Math.max(columns, point.column);
        rows = Math.max(rows, point.row);
        const raw = text(cell.v), type = cell["@t"];
        let value: CellValue = null;
        if (type === "s") value = strings[Number(raw)] ?? "";
        else if (type === "inlineStr") value = text(cell.is);
        else if (raw !== "") value = type === "b" ? raw === "1" : (!type || type === "n") && Number.isFinite(Number(raw)) ? Number(raw) : raw;
        cells.push({ address, value, formula: cell.f !== undefined });
      }
    }
    const merges = list(node(data.mergeCells).mergeCell).map((m) => String(m["@ref"]));
    for (const range of merges) {
      const end = coordinate(range.split(":").at(-1)!);
      rows = Math.max(rows, end.row); columns = Math.max(columns, end.column);
    }
    if (rows > 2000 || columns > 100) throw new Error("Ukuran sheet melampaui batas editor.");
    sheets.push({ path, xml, model: { name: String(sheet["@name"]), rows, columns, cells, merges } });
  }
  return { zip, sheets };
}
export async function inspectWorkbook(buffer: Buffer): Promise<LppWorkbook> {
  const { sheets } = await readArchive(buffer);
  return { hash: createHash("sha256").update(buffer).digest("hex"), sheets: sheets.map((s) => s.model) };
}
export function validateEdits(workbook: LppWorkbook, input: unknown): CellEdit[] {
  if (!Array.isArray(input) || input.length > 10000) throw new Error("Perubahan sel tidak valid.");
  const seen = new Set<string>();
  return input.map((edit: unknown) => {
    if (!edit || typeof edit !== "object") throw new Error("Perubahan sel tidak valid.");
    const { sheet, address, value } = edit as CellEdit;
    const target = workbook.sheets.find((s) => s.name === sheet);
    if (!target || typeof address !== "string") throw new Error("Sheet atau sel tidak valid.");
    const { row, column } = coordinate(address);
    const key = JSON.stringify([sheet, address]);
    if (row > target.rows || column > target.columns || isMergedChild(address, target.merges) || target.cells.find((c) => c.address === address)?.formula || seen.has(key)) throw new Error("Sel ini tidak dapat diubah.");
    if (!(value === null || typeof value === "string" || typeof value === "boolean" || typeof value === "number" && Number.isFinite(value))) throw new Error("Nilai sel tidak valid.");
    if (typeof value === "string" && (value.length > 32767 || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value))) throw new Error("Teks sel tidak valid.");
    seen.add(key);
    return { sheet, address, value };
  });
}
const escapeXml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/\r/g, "&#13;");
function replacementCell(address: string, value: CellValue, original?: string) {
  // Preserve style and all other cell attributes. Strings stay literal (no formula injection).
  const attrs = original?.match(/^<c\b([^>]*?)(?:\/?>)/)?.[1]?.replace(/\s+t="[^"]*"/, "").replace(/\/$/, "") ?? ` r="${address}"`;
  const extra = original?.replace(/^<c\b[^>]*>/, "").replace(/<\/c>$/, "").replace(/<(v|is|f)\b[^>]*?(?:\/>|>[\s\S]*?<\/\1>)/g, "") ?? "";
  const suffix = original?.endsWith("/>") ? "" : extra;
  if (value === null) return `<c${attrs}>${suffix}</c>`;
  if (typeof value === "string") return `<c${attrs} t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is>${suffix}</c>`;
  return `<c${attrs}${typeof value === "boolean" ? ' t="b"' : ""}><v>${typeof value === "boolean" ? Number(value) : value}</v>${suffix}</c>`;
}
export async function exportWorkbook(buffer: Buffer, input: unknown): Promise<Buffer> {
  const workbook = await inspectWorkbook(buffer);
  const edits = validateEdits(workbook, input);
  if (!edits.length) return buffer; // Exact original bytes when there are no edits.
  const { zip, sheets } = await readArchive(buffer);
  for (const sheet of sheets) {
    const changes = edits.filter((e) => e.sheet === sheet.model.name);
    if (!changes.length) continue;
    let xml = sheet.xml;
    for (const change of changes) {
      const cellRegex = new RegExp(`<c\\b(?=[^>]*\\br="${change.address}")[^>]*?(?:\\/>|>[\\s\\S]*?<\\/c>)`);
      const original = xml.match(cellRegex)?.[0];
      const replacement = replacementCell(change.address, change.value, original);
      if (original) xml = xml.replace(cellRegex, () => replacement);
      else {
        const point = coordinate(change.address);
        const rowRegex = new RegExp(`<row\\b(?=[^>]*\\br="${point.row}")[^>]*?(?:\\/>|>[\\s\\S]*?<\\/row>)`);
        const rowXml = xml.match(rowRegex)?.[0];
        if (rowXml) {
          let updated = rowXml.replace(/\/>$/, "></row>");
          const following = [...updated.matchAll(/<c\b[^>]*\br="([A-Z]+\d+)"/g)].find((m) => coordinate(m[1]).column > point.column);
          const at = following?.index ?? updated.lastIndexOf("</row>");
          updated = updated.slice(0, at) + replacement + updated.slice(at);
          xml = xml.replace(rowRegex, () => updated);
        } else {
          const following = [...xml.matchAll(/<row\b[^>]*\br="(\d+)"/g)].find((m) => Number(m[1]) > point.row);
          const at = following?.index ?? xml.indexOf("</sheetData>");
          xml = xml.slice(0, at) + `<row r="${point.row}">${replacement}</row>` + xml.slice(at);
        }
      }
    }
    zip.file(sheet.path, xml, { createFolders: false });
  }
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

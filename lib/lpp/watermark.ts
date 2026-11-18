import { join } from "node:path";
import sharp from "sharp";

const fontfile = join(process.cwd(), "assets", "fonts", "Roboto.ttf");
const escapeMarkup = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Burn the label into the exported pixels, not an Excel shape or browser overlay.
export async function watermarkPhoto(buffer: Buffer, label: string, format: "png" | "jpeg" = "png") {
  if (!label.trim() || label.length > 240) throw new Error("Teks watermark tidak valid.");
  const { width, height } = await sharp(buffer).metadata();
  if (!width || !height || width < 40 || height < 40) throw new Error("Ukuran foto watermark tidak valid.");
  const fontSize = Math.max(14, Math.min(30, Math.round(Math.min(width, height) * 0.045)));
  const padding = Math.max(4, Math.round(fontSize * 0.5));
  const text = await sharp({ text: {
    text: `<span foreground="#ffffff">${escapeMarkup(label)}</span>`,
    font: `Roboto Medium ${fontSize}`, fontfile, rgba: true,
  } }).png().toBuffer();
  const fitted = await sharp(text).resize({ width: width - padding * 2, height: Math.max(1, Math.floor(height * 0.12)), fit: "inside", withoutEnlargement: true }).png().toBuffer({ resolveWithObject: true });
  const bandHeight = fitted.info.height + padding * 2;
  const band = await sharp({ create: { width, height: bandHeight, channels: 4, background: { r: 0, g: 59, b: 92, alpha: 0.78 } } }).png().toBuffer();
  const rendered = sharp(buffer).composite([
    { input: band, left: 0, top: height - bandHeight },
    { input: fitted.data, left: padding, top: height - bandHeight + padding },
  ]);
  return format === "jpeg" ? rendered.flatten({ background: "#ffffff" }).jpeg({ quality: 90, chromaSubsampling: "4:4:4" }).toBuffer() : rendered.png().toBuffer();
}

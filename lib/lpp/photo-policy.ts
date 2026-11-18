import { formPhotoSlots, type LppForm } from "./form";
import type { LppPhotos } from "@/types/lpp";

export const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function validatePhotoReferences(input: unknown, form: LppForm | null): LppPhotos {
  if (input === undefined) return {};
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Data foto tidak valid.");
  const entries = Object.entries(input);
  const slots = form ? formPhotoSlots(form) : [];
  if (entries.length > slots.length) throw new Error("Jumlah foto tidak valid.");
  for (const [item, id] of entries) {
    if (!slots.some((entry) => entry.id === item) || typeof id !== "string" || !/^[a-f0-9]{64}$/.test(id)) throw new Error("Referensi foto tidak valid.");
  }
  return Object.fromEntries(entries);
}

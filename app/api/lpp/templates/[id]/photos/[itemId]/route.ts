import { requireLppUser, privateHeaders, lppFailure, LppError } from "@/lib/lpp/access";
import { getPhoto, template } from "@/lib/lpp/storage";
import { inspectWorkbook } from "@/lib/lpp/workbook";
import { getLppForm } from "@/lib/lpp/form-server";
import { templatePhoto, watermarkedPhotoPreview } from "@/lib/lpp/photos";
import { formPhotoSlots } from "@/lib/lpp/form";
import { validateReportDate } from "@/lib/lpp/report-date";
import { lppPhotoWatermark } from "@/lib/lpp/naming";

export async function GET(request: Request, context: { params: Promise<{ id: string; itemId: string }> }) {
  try {
    const user = await requireLppUser(request);
    const { id, itemId } = await context.params, source = await template(id);
    const form = getLppForm(id, await inspectWorkbook(source.buffer));
    const slot = form ? formPhotoSlots(form).find((entry) => entry.id === itemId) : undefined;
    if (!form || !slot) throw new LppError(404, "Foto perangkat tidak ditemukan.");
    const params = new URL(request.url).searchParams;
    if (params.get("watermark") === "1") {
      if (!form.reportHeader) throw new LppError(400, "Template ini belum memiliki tanggal watermark.");
      let date: string;
      try { date = validateReportDate(params.get("reportDate")); }
      catch { throw new LppError(400, "Tanggal watermark tidak valid."); }
      const photoId = params.get("photo");
      if (!photoId && slot.hasTemplatePhoto === false) throw new LppError(404, "Foto perangkat belum diunggah.");
      const buffer = await watermarkedPhotoPreview(source.buffer, form, itemId, lppPhotoWatermark(source.name, date), photoId ? await getPhoto(user.id, photoId) : undefined);
      return new Response(new Uint8Array(buffer), { headers: { ...privateHeaders, "Content-Type": `image/${form.photoFormat ?? "png"}` } });
    }
    if (slot.hasTemplatePhoto === false) throw new LppError(404, "Foto perangkat belum diunggah.");
    const buffer = await templatePhoto(source.buffer, form, itemId, new URL(request.url).searchParams.get("thumbnail") === "1");
    return new Response(new Uint8Array(buffer), { headers: { ...privateHeaders, "Content-Type": "image/jpeg" } });
  } catch (error) { return lppFailure(error); }
}

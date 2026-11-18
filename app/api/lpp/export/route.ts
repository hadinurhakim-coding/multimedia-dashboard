import { requireLppUser, privateHeaders, lppFailure, readJson, LppError } from "@/lib/lpp/access";
import { getDraft, template, getPhoto } from "@/lib/lpp/storage";
import { exportWorkbook, inspectWorkbook } from "@/lib/lpp/workbook";
import { getLppForm } from "@/lib/lpp/form-server";
import { editKey, formErrors } from "@/lib/lpp/form";
import { exportPhotos } from "@/lib/lpp/photos";
import { validatePhotoReferences } from "@/lib/lpp/photo-policy";
import { applyReportDate, resolveReportDate } from "@/lib/lpp/report-date";
import { lppExportFilename, lppPhotoWatermark } from "@/lib/lpp/naming";
export async function POST(request: Request) {
  try {
    const user = await requireLppUser(request), body = await readJson(request);
    if (typeof body.id !== "string") throw new LppError(400, "Draf tidak valid.");
    const { draft } = await getDraft(user.id, body.id), source = await template(draft.templateId);
    const workbook = await inspectWorkbook(source.buffer);
    if (workbook.hash !== draft.templateHash) throw new LppError(409, "Template telah berubah. Buat draf dari template terbaru.");
    const form = getLppForm(source.id, workbook);
    const edits = form?.reportHeader ? applyReportDate(form, draft.edits, resolveReportDate(draft)) : draft.edits;
    if (form && Object.keys(formErrors(form, workbook, Object.fromEntries(edits.map((edit) => [editKey(edit.sheet, edit.address), edit])))).length) throw new LppError(400, "Lengkapi field wajib pada form sebelum mengekspor laporan.");
    const photos = validatePhotoReferences(draft.photos, form);
    let buffer = await exportWorkbook(source.buffer, edits);
    if (form) buffer = await exportPhotos(buffer, form, await Promise.all(Object.entries(photos).map(async ([itemId, id]) => ({ itemId, buffer: await getPhoto(user.id, id) }))), form.reportHeader ? lppPhotoWatermark(source.name, resolveReportDate(draft)) : undefined);
    const filename = lppExportFilename(source.name, draft);
    const encodedFilename = encodeURIComponent(filename).replace(/['()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
    return new Response(new Uint8Array(buffer), { headers: { ...privateHeaders, "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${filename.replace(/[^\x20-\x7e]/g, "_")}"; filename*=UTF-8''${encodedFilename}` } });
  } catch (error) { return lppFailure(error); }
}

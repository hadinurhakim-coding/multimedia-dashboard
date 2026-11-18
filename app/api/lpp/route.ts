import { randomUUID } from "node:crypto";
import { requireLppUser, privateHeaders, lppFailure, readJson, LppError } from "@/lib/lpp/access";
import { templates, template, drafts, getDraft, saveDraft, photoExists } from "@/lib/lpp/storage";
import { inspectWorkbook, validateEdits } from "@/lib/lpp/workbook";
import { hasLppForm, getLppForm, hasDocumentationTable } from "@/lib/lpp/form-server";
import { validatePhotoReferences } from "@/lib/lpp/photo-policy";
import { applyReportDate, resolveReportDate, validateReportDate } from "@/lib/lpp/report-date";
import { templateDisplayName } from "@/lib/lpp/naming";
export async function GET(request: Request) {
  try {
    const user = await requireLppUser(request);
    const available = (await templates()).map((item) => ({ ...item, name: templateDisplayName(item.name), formAvailable: hasLppForm(item.id), documentationTableAvailable: hasDocumentationTable(item.id) })).sort((a, b) => Number(b.documentationTableAvailable) - Number(a.documentationTableAvailable) || Number(b.formAvailable) - Number(a.formAvailable));
    return Response.json({ templates: available, drafts: (await drafts(user.id)).map(({ edits, photos, ...summary }) => ({ ...summary, changes: edits.length, photoCount: Object.keys(photos ?? {}).length })), email: user.email }, { headers: privateHeaders });
  } catch (error) { return lppFailure(error); }
}
export async function POST(request: Request) {
  try {
    const user = await requireLppUser(request), body = await readJson(request);
    if (typeof body.templateId !== "string" || typeof body.title !== "string" || !body.title.trim() || body.title.length > 150) throw new LppError(400, "Judul atau template tidak valid.");
    const source = await template(body.templateId), workbook = await inspectWorkbook(source.buffer, source.hash);
    if (body.templateHash !== workbook.hash) throw new LppError(409, "Template telah berubah. Buka ulang template.");
    let edits;
    try { edits = validateEdits(workbook, body.edits); } catch (error) { throw new LppError(400, (error as Error).message); }
    const existing = typeof body.id === "string" ? (await getDraft(user.id, body.id)).draft : undefined;
    if (existing && (existing.templateId !== source.id || typeof body.revision !== "string")) throw new LppError(400, "Draf tidak valid.");
    const now = new Date().toISOString(), createdAt = existing?.createdAt ?? existing?.updatedAt ?? now;
    const form = getLppForm(source.id, workbook);
    let reportDate: string | undefined;
    if (form?.reportHeader) {
      try {
        reportDate = body.reportDate === undefined ? resolveReportDate(existing) : validateReportDate(body.reportDate);
        edits = validateEdits(workbook, applyReportDate(form, edits, reportDate));
      } catch (error) { throw new LppError(400, (error as Error).message); }
    }
    let photos;
    try { photos = validatePhotoReferences(body.photos ?? existing?.photos, form); }
    catch (error) { throw new LppError(400, (error as Error).message); }
    // Verify each unique referenced photo exists within the authenticated owner's namespace without downloading bytes.
    await Promise.all([...new Set(Object.values(photos))].map((id) => photoExists(user.id, id)));
    const draft = { id: existing?.id ?? randomUUID(), title: body.title.trim(), templateId: source.id, templateHash: workbook.hash, edits, photos, createdAt, ...(reportDate ? { reportDate } : {}), updatedAt: now, revision: randomUUID() };
    await saveDraft(user.id, draft, existing ? String(body.revision) : undefined);
    return Response.json(draft, { headers: privateHeaders });
  } catch (error) { return lppFailure(error); }
}

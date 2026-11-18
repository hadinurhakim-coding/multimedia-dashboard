import { requireLppUser, privateImageHeaders, lppFailure, LppError } from "@/lib/lpp/access";
import { template } from "@/lib/lpp/storage";
import { getLppForm } from "@/lib/lpp/form-server";
import { inspectWorkbook } from "@/lib/lpp/workbook";
import { templateHeaderLogo } from "@/lib/lpp/photos";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireLppUser(request);
    const { id } = await context.params, source = await template(id);
    if (!getLppForm(id, await inspectWorkbook(source.buffer, source.hash))?.reportHeader) throw new LppError(404, "Header laporan tidak tersedia.");
    const buffer = await templateHeaderLogo(source.buffer, source.hash);
    return new Response(new Uint8Array(buffer), { headers: { ...privateImageHeaders, "Content-Type": "image/png" } });
  } catch (error) { return lppFailure(error); }
}

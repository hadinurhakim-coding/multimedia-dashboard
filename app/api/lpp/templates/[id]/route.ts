import { requireLppUser, privateHeaders, lppFailure } from "@/lib/lpp/access";
import { template } from "@/lib/lpp/storage";
import { inspectWorkbook } from "@/lib/lpp/workbook";
import { getLppForm } from "@/lib/lpp/form-server";
import { jakartaDate } from "@/lib/lpp/report-date";
import { templateDisplayName } from "@/lib/lpp/naming";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireLppUser(request);
    const source = await template((await context.params).id);
    const workbook = await inspectWorkbook(source.buffer);
    return Response.json({ id: source.id, name: templateDisplayName(source.name), ...workbook, form: getLppForm(source.id, workbook), defaultReportDate: jakartaDate() }, { headers: privateHeaders });
  } catch (error) { return lppFailure(error); }
}

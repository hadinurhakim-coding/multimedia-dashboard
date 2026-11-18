import { requireLppUser, privateHeaders, lppFailure } from "@/lib/lpp/access";
import { getDraft, deleteDraft } from "@/lib/lpp/storage";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try { const user = await requireLppUser(request); return Response.json((await getDraft(user.id, (await context.params).id)).draft, { headers: privateHeaders }); }
  catch (error) { return lppFailure(error); }
}
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try { const user = await requireLppUser(request); await deleteDraft(user.id, (await context.params).id); return Response.json({ deleted: true }, { headers: privateHeaders }); }
  catch (error) { return lppFailure(error); }
}

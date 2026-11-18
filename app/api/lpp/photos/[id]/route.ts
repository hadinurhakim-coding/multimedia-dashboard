import { requireLppUser, privateHeaders, lppFailure } from "@/lib/lpp/access";
import { getPhoto } from "@/lib/lpp/storage";
import { photoPreview } from "@/lib/lpp/photos";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireLppUser(request);
    let buffer = await getPhoto(user.id, (await context.params).id);
    if (new URL(request.url).searchParams.get("thumbnail") === "1") buffer = await photoPreview(buffer, true);
    return new Response(new Uint8Array(buffer), { headers: { ...privateHeaders, "Content-Type": "image/jpeg" } });
  } catch (error) { return lppFailure(error); }
}

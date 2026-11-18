import { requireLppUser, privateHeaders, lppFailure, readBytes, LppError } from "@/lib/lpp/access";
import { normalizePhoto } from "@/lib/lpp/photos";
import { MAX_PHOTO_BYTES, PHOTO_TYPES } from "@/lib/lpp/photo-policy";
import { savePhoto } from "@/lib/lpp/storage";

export async function POST(request: Request) {
  try {
    const user = await requireLppUser(request);
    const contentType = request.headers.get("content-type") ?? "";
    if (!PHOTO_TYPES.includes(contentType)) throw new LppError(415, "Gunakan foto JPG, PNG, atau WebP.");
    const source = await readBytes(request, MAX_PHOTO_BYTES);
    let buffer: Buffer;
    try { buffer = await normalizePhoto(source, contentType); }
    catch (error) { throw new LppError(400, (error as Error).message); }
    const id = await savePhoto(user.id, buffer);
    return Response.json({ id }, { headers: privateHeaders });
  } catch (error) { return lppFailure(error); }
}

import { requireAppUser } from "@/lib/auth/access";
import { appFailure, privateHeaders } from "@/lib/security/http";
export async function GET(request: Request) {
  try {
    const user = await requireAppUser(request);
    return Response.json({ user: { id: user.id, email: user.email, name: user.name || "Pengguna" } }, { headers: privateHeaders });
  } catch (error) { return appFailure(error); }
}

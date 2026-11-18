import { getAuth } from "@/lib/auth/server";
import { currentAppUser } from "@/lib/auth/access";
import { accessConfig } from "@/lib/auth/config";
import { emailAllowed, mayAccessApp, publicProfile } from "@/lib/auth/policy";
import { AppError, appFailure, privateHeaders, readJson, requireSameOrigin } from "@/lib/security/http";
import { enforceLimits, limitRequest, requestClient, securityEvent } from "@/lib/security/gateway";
type Context = { params: Promise<{ path: string[] }> };
async function handle(request: Request, context: Context) {
  try {
    const path = (await context.params).path.join("/");
    if (!((path === "sign-in/email" || path === "sign-out") && request.method === "POST" || path === "get-session" && request.method === "GET")) throw new AppError(404, "Layanan autentikasi ini tidak tersedia.");
    requireSameOrigin(request, process.env.APP_ORIGIN);
    await limitRequest(request);
    if (path === "get-session") {
      const user = await currentAppUser();
      await limitRequest(request, user.id);
      return Response.json({ user: publicProfile(user) }, { headers: privateHeaders });
    }
    if (path === "sign-in/email") {
      const config = accessConfig();
      if (config.disabled) throw new AppError(503, "Akses aplikasi sedang dinonaktifkan oleh administrator.");
      await enforceLimits([{ scope: "loginClient", subject: requestClient(request) }]);
      const payload = await readJson(request.clone(), 8192);
      if (typeof payload.email !== "string" || payload.email.length > 254 || typeof payload.password !== "string" || !payload.password || payload.password.length > 256) throw new AppError(400, "Data login tidak valid.");
      const email = payload.email.trim().toLowerCase();
      await enforceLimits([{ scope: "loginAccount", subject: email }]);
      if (!emailAllowed(email, config.allowedEmails)) throw new AppError(401, "Login gagal. Periksa akun dan kata sandi.");
      const headers = new Headers(request.headers);
      headers.delete("content-length");
      request = new Request(request.url, { method: "POST", headers, body: JSON.stringify({ email, password: payload.password, rememberMe: false }) });
    }
    const handlers = getAuth().handler();
    const method = request.method as keyof typeof handlers;
    const response = await handlers[method](request, context);
    if (path === "sign-in/email") {
      if (!response.ok) {
        securityEvent("login_failed");
        throw new AppError(response.status === 429 ? 429 : response.status >= 500 ? 503 : 401, response.status === 429 ? "Terlalu banyak percobaan login. Coba kembali nanti." : "Login gagal. Periksa akun dan kata sandi.", response.status === 429 ? 60 : undefined);
      }
      const payload = await response.clone().json(), config = accessConfig();
      if (!mayAccessApp(payload.user ?? null, config.allowedEmails, config.manualAccounts)) throw new AppError(403, "Akun ini belum mendapat izin mengakses aplikasi.");
      securityEvent("login_succeeded", payload.user.id);
      // Session credentials travel only in the SDK's HttpOnly cookies.
      const headers = new Headers(response.headers);
      for (const name of ["content-length", "content-encoding", "set-auth-token", "set-auth-jwt"]) headers.delete(name);
      Object.entries(privateHeaders).forEach(([key, value]) => headers.set(key, value));
      return Response.json({ redirect: false, user: publicProfile(payload.user) }, { headers });
    }
    Object.entries(privateHeaders).forEach(([key, value]) => response.headers.set(key, value));
    return response;
  } catch (error) {
    return appFailure(error, "Login belum tersedia. Hubungi administrator.");
  }
}
export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };

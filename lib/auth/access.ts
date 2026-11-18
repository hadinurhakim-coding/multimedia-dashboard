import "server-only";
import { headers } from "next/headers";
import { getAuth } from "./server";
import { accessConfig } from "./config";
import { internalPermission, mayAccessApp, type AppPermission } from "./policy";
import { AppError, requireSameOrigin } from "@/lib/security/http";
import { limitRequest, securityEvent } from "@/lib/security/gateway";

export async function currentAppUser(options?: { disableCookieCache?: boolean }) {
  const config = accessConfig();
  if (config.disabled) throw new AppError(503, "Akses aplikasi sedang dinonaktifkan oleh administrator.");
  if (!(await headers()).get("cookie")) throw new AppError(401, "Silakan masuk untuk melanjutkan.");
  const disableCookieCache = options?.disableCookieCache ?? true;
  let result;
  try {
    result = await getAuth().getSession(
      disableCookieCache ? { query: { disableCookieCache: "true" } } : undefined
    );
  }
  catch { throw new AppError(503, "Layanan login belum tersedia. Silakan coba kembali."); }
  if (result.error && result.error.status !== 401) throw new AppError(503, "Layanan login belum tersedia. Silakan coba kembali.");
  const session = result.data;
  if (!session?.user) throw new AppError(401, "Sesi berakhir. Silakan masuk kembali.");
  if (!mayAccessApp(session.user, config.allowedEmails, config.manualAccounts)) throw new AppError(403, "Akun ini belum mendapat izin mengakses aplikasi.");
  if (config.sessionsValidAfter) {
    const cutoff = Date.parse(config.sessionsValidAfter), created = Date.parse(String(session.session.createdAt));
    if (!Number.isFinite(cutoff)) throw new AppError(503, "Konfigurasi keamanan belum valid.");
    if (!Number.isFinite(created) || created < cutoff) throw new AppError(401, "Sesi telah dicabut. Silakan masuk kembali.");
  }
  return session.user;
}
export async function requireAppUser(request: Request, permission: AppPermission = "dashboard") {
  requireSameOrigin(request, process.env.APP_ORIGIN);
  const isRead = request.method === "GET" || request.method === "HEAD";
  const isSessionCheck = new URL(request.url).pathname === "/api/session";
  const disableCookieCache = !isRead || isSessionCheck;
  let user;
  try {
    user = await currentAppUser({ disableCookieCache });
  } catch (error) {
    await limitRequest(request);
    throw error;
  }
  if (!internalPermission(permission)) {
    await limitRequest(request, user.id, { includeIngress: true });
    securityEvent("permission_denied", user.id);
    throw new AppError(403, "Akses ditolak.");
  }
  await limitRequest(request, user.id, { includeIngress: true });
  return user;
}

export async function currentPageUser() {
  const incoming = await headers();
  // Anonymous visitors get the login form without a provider/database request.
  if (incoming.get("cookie")) await limitRequest(new Request("https://application.invalid/", { headers: incoming }));
  return currentAppUser();
}

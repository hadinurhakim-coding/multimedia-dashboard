import "server-only";
import { requireAppUser } from "@/lib/auth/access";
import { AppError, appFailure } from "@/lib/security/http";
import { mayAccessLpp } from "./policy";

export { AppError as LppError, privateHeaders, privateImageHeaders, readJson, readBytes } from "@/lib/security/http";
export async function requireLppUser(request: Request) {
  const user = await requireAppUser(request, "lpp");
  if (!mayAccessLpp(user, process.env.LPP_ALLOWED_EMAILS ?? "", process.env.LPP_MANUALLY_APPROVED_ACCOUNTS || "{}")) throw new AppError(403, "Akun ini belum mendapat izin mengakses LPP.");
  return user;
}
export function lppFailure(error: unknown) {
  return appFailure(error, "LPP belum dapat diproses. Periksa konfigurasi penyimpanan atau hubungi administrator.");
}

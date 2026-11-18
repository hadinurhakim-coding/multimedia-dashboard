import "server-only";
import { createHmac } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { AppError } from "./http";
import { clientAddress, ratePolicies, userRateScopes, type RateScope } from "./rate-policy";

export function securityFingerprint(value: string) {
  const secret = process.env.NEON_AUTH_COOKIE_SECRET;
  if (!secret || secret.length < 32) throw new AppError(503, "Layanan login belum dikonfigurasi.");
  return createHmac("sha256", secret).update(value).digest("hex");
}
export function securityEvent(event: string, subject?: string) {
  // No passwords, cookies, raw email/IP, SQL or provider errors in logs.
  console.warn(JSON.stringify({ category: "security", event, at: new Date().toISOString(), ...(subject ? { subject: securityFingerprint(subject).slice(0, 16) } : {}) }));
}
export function requestClient(request: Request) {
  return clientAddress(request, process.env.VERCEL === "1", process.env.APP_TRUSTED_IP_HEADER);
}
export async function enforceLimits(entries: { scope: RateScope; subject: string }[]) {
  const connection = process.env.SECURITY_DATABASE_URL;
  if (!connection) throw new AppError(503, "Penyimpanan keamanan belum dikonfigurasi.");
  const rules = entries.map(({ scope, subject }) => ({ key: `${scope}:${securityFingerprint(subject)}`, ...ratePolicies[scope] }));
  let result;
  try {
    result = await neon(connection).query(
      'SELECT result.* FROM jsonb_to_recordset($1::jsonb) AS rule(key text, "limit" int, "window" int, cooldown int) CROSS JOIN LATERAL app_security.consume_limit(rule.key, rule."limit", rule."window", rule.cooldown) AS result',
      [JSON.stringify(rules)], { fetchOptions: { signal: AbortSignal.timeout(8000), cache: "no-store" } },
    );
  } catch { throw new AppError(503, "Pemeriksaan keamanan belum tersedia. Silakan coba kembali."); }
  if (result.length !== rules.length) throw new AppError(503, "Pemeriksaan keamanan belum tersedia.");
  const blocked = result.filter(row => row.allowed !== true);
  if (blocked.length) {
    if (blocked.some(row => row.newly_blocked === true)) securityEvent("rate_limit", entries[0]?.subject);
    throw new AppError(429, "Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.", Math.max(1, ...blocked.map(row => Number(row.retry_after) || 60)));
  }
}
export function limitRequest(request: Request, userId?: string) {
  return enforceLimits(userId ? userRateScopes(request).map(scope => ({ scope, subject: userId })) : [{ scope: "ingress", subject: requestClient(request) }]);
}

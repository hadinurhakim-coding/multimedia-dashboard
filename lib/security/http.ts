export class AppError extends Error {
  constructor(public status: number, message: string, public retryAfter?: number) { super(message); }
}
export const privateHeaders = { "Cache-Control": "private, no-store, max-age=0", "Vary": "Cookie", "X-Content-Type-Options": "nosniff" };
export const privateImageHeaders = {
  "Cache-Control": "private, max-age=3600, stale-while-revalidate=86400",
  Vary: "Cookie",
  "X-Content-Type-Options": "nosniff",
};
export function appFailure(error: unknown, fallback = "Layanan belum dapat diproses. Silakan coba kembali.") {
  return Response.json({ error: error instanceof AppError ? error.message : fallback }, {
    status: error instanceof AppError ? error.status : 503,
    headers: { ...privateHeaders, ...(error instanceof AppError && error.retryAfter ? { "Retry-After": String(error.retryAfter) } : {}) },
  });
}
export function requireSameOrigin(request: Request, configuredOrigin?: string) {
  if (["GET", "HEAD"].includes(request.method)) return;
  const allowed = configuredOrigin ?? new URL(request.url).origin;
  if (request.headers.get("origin") !== allowed || request.headers.get("sec-fetch-site") === "cross-site") throw new AppError(403, "Permintaan lintas situs ditolak.");
}
export async function readBytes(request: Request, limit: number): Promise<Buffer> {
  if (Number(request.headers.get("content-length")) > limit) throw new AppError(413, "Data terlalu besar.");
  const reader = request.body?.getReader();
  if (!reader) throw new AppError(400, "Data kosong.");
  const chunks: Uint8Array[] = []; let size = 0;
  for (;;) {
    const { value, done } = await reader.read(); if (done) break;
    size += value.byteLength;
    if (size > limit) { await reader.cancel(); throw new AppError(413, "Data terlalu besar."); }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
export async function readJson(request: Request, limit = 1024 * 1024): Promise<Record<string, unknown>> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") throw new AppError(415, "Gunakan JSON.");
  const body = await readBytes(request, limit);
  try {
    const parsed: unknown = JSON.parse(body.toString());
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    return parsed as Record<string, unknown>;
  } catch { throw new AppError(400, "Data JSON tidak valid."); }
}

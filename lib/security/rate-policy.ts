import { isIP } from "node:net";
export const ratePolicies = {
  ingress: { limit: 600, window: 60, cooldown: 60 },
  user: { limit: 300, window: 60, cooldown: 60 },
  loginClient: { limit: 20, window: 600, cooldown: 60 },
  loginAccount: { limit: 5, window: 600, cooldown: 60 },
  export: { limit: 10, window: 300, cooldown: 60 },
  upload: { limit: 30, window: 300, cooldown: 60 },
  write: { limit: 60, window: 60, cooldown: 60 },
} as const;
export type RateScope = keyof typeof ratePolicies;
export function clientAddress(request: Request, vercel = false, trustedHeader?: string) {
  // Vercel overwrites this header. A custom proxy must overwrite its configured header too.
  const header = vercel ? "x-vercel-forwarded-for" : trustedHeader;
  const value = header ? request.headers.get(header)?.trim() ?? "" : "";
  return isIP(value) ? value : "shared-untrusted-network";
}
export function userRateScopes(request: Request): RateScope[] {
  const scopes: RateScope[] = ["user"], path = new URL(request.url).pathname;
  if (path === "/api/lpp/export") scopes.push("export");
  else if (path === "/api/lpp/photos" && request.method === "POST") scopes.push("upload");
  else if (!["GET", "HEAD"].includes(request.method)) scopes.push("write");
  return scopes;
}

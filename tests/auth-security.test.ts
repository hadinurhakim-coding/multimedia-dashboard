import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { emailAllowed, internalPermission, mayAccessApp, publicProfile } from "../lib/auth/policy";
import { AppError, appFailure, readJson, requireSameOrigin } from "../lib/security/http";
import { clientAddress, userRateScopes } from "../lib/security/rate-policy";

test("Identity requires provider verification or exact manual enrollment and ignores caller roles", () => {
  const user = { id: "provider-user-1", email: "user@example.test", emailVerified: false };
  assert.equal(emailAllowed(" User@Example.Test ", "user@example.test"), true);
  assert.equal(mayAccessApp(user, "user@example.test"), false);
  assert.equal(mayAccessApp(user, "user@example.test", '{"user@example.test":"provider-user-1"}'), true);
  assert.equal(mayAccessApp({ ...user, id: "another-id" }, "user@example.test", '{"user@example.test":"provider-user-1"}'), false);
  assert.equal(mayAccessApp({ ...user, emailVerified: true }, ""), false);
  assert.equal(mayAccessApp({ ...user, emailVerified: true }, "user@example.test"), true);
  assert.equal(mayAccessApp(user, "user@example.test", "invalid-json"), false);
  assert.equal(internalPermission("events:read"), true);
  // @ts-expect-error Unknown permissions must remain denied at runtime.
  assert.equal(internalPermission("admin:all"), false);
});

test("Browser profile excludes provider credentials and metadata", () => {
  const identity = { id: "1", email: "user@example.test", emailVerified: true, name: "User", token: "private", role: "admin" };
  assert.deepEqual(publicProfile(identity), { id: "1", email: "user@example.test", name: "User" });
});

test("Untrusted forwarding headers cannot bypass IP buckets; sensitive endpoints use separate limits", () => {
  const request = new Request("https://app.example.test/api/lpp/export?alias=1", { method: "POST", headers: { "x-forwarded-for": "203.0.113.1", "x-vercel-forwarded-for": "203.0.113.2" } });
  assert.equal(clientAddress(request), "shared-untrusted-network");
  assert.equal(clientAddress(request, true), "203.0.113.2");
  assert.equal(clientAddress(request, false, "x-forwarded-for"), "203.0.113.1");
  assert.equal(clientAddress(new Request(request, { headers: { "x-vercel-forwarded-for": "203.0.113.1, 203.0.113.2" } }), true), "shared-untrusted-network");
  assert.deepEqual(userRateScopes(request), ["user", "export"]);
  assert.deepEqual(userRateScopes(new Request("https://app.example.test/api/lpp/photos", { method: "POST" })), ["user", "upload"]);
  assert.deepEqual(userRateScopes(new Request("https://app.example.test/api/lpp", { method: "POST" })), ["user", "write"]);
  assert.deepEqual(userRateScopes(new Request("https://app.example.test/api/events")), ["user"]);
});

test("Mutation requests require exact Origin and bounded valid JSON", async () => {
  const request = (headers: Record<string, string>, body = '{}') => new Request("https://app.example.test/api/lpp", { method: "POST", headers, body });
  assert.throws(() => requireSameOrigin(request({})), /lintas situs/);
  assert.throws(() => requireSameOrigin(request({ origin: "https://evil.test" })), /lintas situs/);
  assert.throws(() => requireSameOrigin(request({ origin: "https://app.example.test", "sec-fetch-site": "cross-site" })), /lintas situs/);
  assert.doesNotThrow(() => requireSameOrigin(request({ origin: "https://app.example.test" })));
  await assert.rejects(readJson(request({ "content-type": "text/plain" })), /JSON/);
  await assert.rejects(readJson(request({ "content-type": "application/json" }, '[]')), /JSON/);
  await assert.rejects(readJson(request({ "content-type": "application/json" }, '{"text":"too long"}'), 5), /terlalu besar/);
  assert.deepEqual(await readJson(request({ "content-type": "application/json; charset=utf-8" }, '{"ok":true}')), { ok: true });
});

test("Security responses are private, expose retry timing, and hide internal errors", async () => {
  const failure = appFailure(new Error("postgresql://sensitive-connection"));
  assert.equal(failure.status, 503);
  assert.match(failure.headers.get("cache-control")!, /private.*no-store/);
  assert.doesNotMatch(await failure.text(), /sensitive|postgresql/);
  const limit = appFailure(new AppError(429, "Wait", 30));
  assert.equal(limit.headers.get("retry-after"), "30");
});

test("Every application API declares an auth guard and auth proxy does not expose signup or admin routes", async () => {
  async function routes(directory: string): Promise<string[]> {
    return (await Promise.all((await readdir(directory, { withFileTypes: true })).map(entry => entry.isDirectory() ? routes(join(directory, entry.name)) : entry.name === "route.ts" ? [join(directory, entry.name)] : []))).flat();
  }
  for (const path of await routes("app/api")) {
    const source = await readFile(path, "utf8");
    if (path.includes(join("auth", "[...path]"))) { assert.match(source, /path === "sign-in\/email"/); assert.match(source, /Layanan autentikasi ini tidak tersedia/); }
    else assert.match(source, /await require(?:App|Lpp)User\(request/, path);
  }
  assert.doesNotMatch(await readFile("components/lpp/lpp-view.tsx", "utf8"), /authClient|current-password|signIn/);
  assert.match(await readFile("lib/neon.ts", "utf8"), /import "server-only"/);
});

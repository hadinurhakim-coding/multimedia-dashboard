import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { readdir, readFile, mkdir, writeFile, rename, unlink, lstat } from "node:fs/promises";
import path from "node:path";
import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { LppError } from "./access";
import type { LppDraft, LppTemplate } from "@/types/lpp";

const digest = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const bucket = () => process.env.LPP_S3_BUCKET;
function client() { return new S3Client({ endpoint: process.env.AWS_ENDPOINT_URL_S3, region: process.env.AWS_REGION ?? "us-east-1", forcePathStyle: true }); }
function root() {
  if (process.env.NODE_ENV === "production" && !process.env.LPP_PRIVATE_DIR) throw new LppError(503, "Penyimpanan LPP privat belum dikonfigurasi.");
  const result = path.resolve(/* turbopackIgnore: true */ process.env.LPP_PRIVATE_DIR || path.join(process.cwd(), "private"));
  const publicRoot = path.join(process.cwd(), "public");
  if (result === publicRoot || result.startsWith(publicRoot + path.sep)) throw new Error("Unsafe private directory");
  return result;
}
async function entries(prefix: string) {
  if (bucket()) {
    const keys: string[] = []; let token: string | undefined;
    do {
      const result = await client().send(new ListObjectsV2Command({ Bucket: bucket(), Prefix: prefix + "/", ContinuationToken: token }));
      keys.push(...(result.Contents ?? []).flatMap((o) => o.Key ? [o.Key.slice(prefix.length + 1)] : []));
      token = result.NextContinuationToken;
    } while (token);
    return keys.filter((k) => !k.includes("/"));
  }
  try { return (await readdir(/* turbopackIgnore: true */ path.join(root(), prefix), { withFileTypes: true })).filter((f) => f.isFile() && !f.isSymbolicLink()).map((f) => f.name); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
}
async function read(key: string): Promise<{ body: Buffer; etag?: string }> {
  if (bucket()) {
    const result = await client().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
    if (!result.Body) throw new Error("Missing private object");
    return { body: Buffer.from(await result.Body.transformToByteArray()), etag: result.ETag };
  }
  const file = path.join(/* turbopackIgnore: true */ root(), key);
  if ((await lstat(/* turbopackIgnore: true */ file)).isSymbolicLink()) throw new Error("Symlink is not allowed");
  return { body: await readFile(/* turbopackIgnore: true */ file) };
}
export async function templates(): Promise<LppTemplate[]> {
  return (await entries("data-lpp")).filter((name) => name.endsWith(".xlsx") && !name.startsWith("~$")).sort().map((name) => ({ id: digest(name), name: name.slice(0, -5) }));
}
export async function template(id: string) {
  const item = (await templates()).find((t) => t.id === id);
  if (!item) throw new LppError(404, "Template tidak ditemukan.");
  return { ...item, buffer: (await read(`data-lpp/${item.name}.xlsx`)).body };
}
const ownerPrefix = (owner: string) => `lpp-drafts/${digest(owner)}`;
function draftKey(owner: string, id: string) {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new LppError(404, "Draf tidak ditemukan.");
  return `${ownerPrefix(owner)}/${id}.json`;
}
export async function getDraft(owner: string, id: string) {
  try { const item = await read(draftKey(owner, id)); return { draft: JSON.parse(item.body.toString()) as LppDraft, etag: item.etag }; }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT" || (error as Error).name === "NoSuchKey") throw new LppError(404, "Draf tidak ditemukan.");
    throw error;
  }
}
export async function drafts(owner: string) {
  const result: LppDraft[] = [];
  for (const name of await entries(ownerPrefix(owner))) {
    if (/^[a-f0-9-]{36}\.json$/.test(name)) result.push((await getDraft(owner, name.slice(0, -5))).draft);
  }
  return result.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
// Local writes serialize per process; S3 uses conditional ETags across instances.
let pending = Promise.resolve();
async function serialize<T>(fn: () => Promise<T>): Promise<T> {
  const previous = pending; let release!: () => void;
  pending = new Promise<void>((resolve) => { release = resolve; });
  await previous;
  try { return await fn(); } finally { release(); }
}
export async function saveDraft(owner: string, draft: LppDraft, expected?: string) {
  return serialize(async () => {
    const key = draftKey(owner, draft.id);
    let etag: string | undefined;
    if (expected) {
      const existing = await getDraft(owner, draft.id);
      if (existing.draft.revision !== expected) throw new LppError(409, "Draf telah berubah. Muat ulang sebelum menyimpan.");
      etag = existing.etag;
    }
    const body = JSON.stringify(draft);
    if (bucket()) {
      try { await client().send(new PutObjectCommand({ Bucket: bucket(), Key: key, Body: body, ContentType: "application/json", CacheControl: "private, no-store", ...(expected ? { IfMatch: etag } : { IfNoneMatch: "*" }) })); }
      catch (error) { if ((error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 412) throw new LppError(409, "Draf telah berubah. Muat ulang."); throw error; }
    } else {
      const target = path.join(root(), key), tmp = `${target}.${randomUUID()}.tmp`;
      await mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
      await writeFile(tmp, body, { mode: 0o600 });
      await rename(tmp, target);
    }
  });
}
export async function deleteDraft(owner: string, id: string) {
  const key = draftKey(owner, id); await getDraft(owner, id);
  if (bucket()) await client().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
  else await unlink(path.join(root(), key));
}

function photoKey(owner: string, id: string) {
  if (!/^[a-f0-9]{64}$/.test(id)) throw new LppError(404, "Foto tidak ditemukan.");
  return `lpp-photos/${digest(owner)}/${id}.jpg`;
}
export async function getPhoto(owner: string, id: string) {
  try { return (await read(photoKey(owner, id))).body; }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT" || (error as Error).name === "NoSuchKey") throw new LppError(404, "Foto tidak ditemukan.");
    throw error;
  }
}
export async function savePhoto(owner: string, buffer: Buffer) {
  const id = digest(buffer), key = photoKey(owner, id);
  if (bucket()) await client().send(new PutObjectCommand({ Bucket: bucket(), Key: key, Body: buffer, ContentType: "image/jpeg", CacheControl: "private, no-store" }));
  else {
    const target = path.join(/* turbopackIgnore: true */ root(), key);
    await mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
    // Immutable, content-addressed uploads: no overwrite while another export reads.
    try { await writeFile(/* turbopackIgnore: true */ target, buffer, { mode: 0o600, flag: "wx" }); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
  }
  return id;
}

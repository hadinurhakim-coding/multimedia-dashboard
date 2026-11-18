import { execFileSync } from "node:child_process";
import { readdir, readFile, lstat } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

const PROHIBITED_EXTENSIONS = /\.(xlsx|xlsm|xls|csv|pem|key|p12|pfx|secret|secrets|credential|credentials)$/i;
const IGNORED_WORKTREE_ROOTS = new Set([".git", ".next", ".vercel", "node_modules"]);

const toPosix = (file) => file.split(path.sep).join("/");

function isProhibitedFile(file, { includeVercelDir = true } = {}) {
  const rel = toPosix(file);
  if (/(^|\/)private(\/|$)/i.test(rel)) return true;
  if (includeVercelDir && /(^|\/)\.vercel(\/|$)/i.test(rel)) return true;
  if (/(^|\/)\.env($|\.)/i.test(rel) && !/(^|\/)\.env(\.[^/]+)?\.example$/i.test(rel)) return true;
  return PROHIBITED_EXTENSIONS.test(rel);
}

function isGitWorkTree() {
  try {
    return execFileSync("git", ["rev-parse", "--is-inside-work-tree"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim() === "true";
  } catch (error) {
    const detail = `${error?.stderr ?? ""}${error?.message ?? ""}`;
    if (error?.code === "ENOENT" || /not a git repository/i.test(detail)) return false;
    throw error;
  }
}

async function walkWorktree(dir = ".") {
  const entries = await readdir(dir, { withFileTypes: true });
  const result = [];
  for (const item of entries) {
    const file = dir === "." ? item.name : path.join(dir, item.name);
    const rel = toPosix(file);
    if (dir === "." && IGNORED_WORKTREE_ROOTS.has(item.name) || item.name === "node_modules") continue;
    if (item.isSymbolicLink()) throw new Error("Symlinks are forbidden in published assets and private templates.");
    if (item.isDirectory()) {
      if (/(^|\/)private(\/|$)/i.test(rel)) { result.push(rel); continue; }
      result.push(...await walkWorktree(file));
    } else {
      result.push(rel);
    }
  }
  return result;
}

if (isGitWorkTree()) {
  const tracked = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
  const prohibited = tracked.filter((file) => isProhibitedFile(file));
  if (prohibited.length) throw new Error(`Prohibited private/secret files are tracked by Git: ${prohibited.join(", ")}. Remove them from the index before publishing.`);
  for (const probe of ["private/privacy-check.xlsx", ".env.local"]) {
    const ignored = execFileSync("git", ["check-ignore", probe], { encoding: "utf8" }).trim();
    if (!ignored) throw new Error(`${probe} must be ignored by Git.`);
  }
} else {
  // Build environments such as Vercel strip .git/, so audit the uploaded working tree directly.
  const files = await walkWorktree(".");
  const prohibited = files.filter((file) => isProhibitedFile(file, { includeVercelDir: false }));
  if (prohibited.length) throw new Error(`Prohibited private/secret files are present in build context: ${prohibited.join(", ")}. Exclude them before building.`);
}
async function walk(dir) {
  let items; try { items = await readdir(dir, { withFileTypes: true }); } catch (e) { if (e.code === "ENOENT") return []; throw e; }
  const result = [];
  for (const item of items) {
    const file = path.join(dir, item.name);
    if (item.isSymbolicLink()) throw new Error("Symlinks are forbidden in published assets and private templates.");
    result.push(...(item.isDirectory() ? await walk(file) : [file]));
  }
  return result;
}
const originals = await walk("private/data-lpp");
const hash = (buffer) => createHash("sha256").update(buffer).digest("hex");
const hashes = new Set(await Promise.all(originals.map(async (file) => hash(await readFile(file)))));
for (const base of ["public", "out", ".next/static"]) {
  for (const file of await walk(base)) {
    if (/(^|[\\/])private([\\/]|$)/i.test(file) || /\.(xlsx|xlsm|xls|csv)$/i.test(file)) throw new Error("Private spreadsheet found in public output.");
    if ((await lstat(file)).size < 35 * 1024 * 1024 && hashes.has(hash(await readFile(file)))) throw new Error("Private template copied into public output.");
  }
}
if (process.argv.includes("--build")) {
  for (const file of await walk(".next/server")) {
    if (!file.endsWith(".nft.json")) continue;
    const trace = JSON.parse(await readFile(file, "utf8"));
    if (trace.files?.some((f) => /(^|[\\/])(private[\\/]|\.env($|\.)|\.git[\\/])/i.test(f))) throw new Error("Private file included in server build trace.");
  }
}
console.log("Privacy check passed: no tracked private files or public template copies.");

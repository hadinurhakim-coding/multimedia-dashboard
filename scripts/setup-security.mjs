import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";
process.loadEnvFile(".env.local");
const connection = process.env.SECURITY_MIGRATION_DATABASE_URL;
if (!connection || new URL(connection).hostname.includes("-pooler")) throw new Error("Set a direct SECURITY_MIGRATION_DATABASE_URL for the intended branch. Never deploy the migration credential.");
const sql = neon(connection);
const statements = (await readFile(new URL("../migrations/001-app-security.sql", import.meta.url), "utf8")).split("-- statement-breakpoint").map(value => value.trim()).filter(Boolean);
try {
  await sql.transaction(statements.map(statement => sql.query(statement)));
  console.log("Shared security schema installed. Existing business and auth tables were not modified.");
} catch { throw new Error("Security migration failed. Check the selected database and permissions."); }

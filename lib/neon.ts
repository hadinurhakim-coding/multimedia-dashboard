import "server-only";
import { neon } from "@neondatabase/serverless";

// The official driver binds parameters; request input never becomes SQL syntax.
export async function queryNeon<T = Record<string, unknown>>(
  sqlQuery: string,
  params: (string | number | boolean | null | undefined)[] = [],
): Promise<T[]> {
  const connection = process.env.DATABASE_URL || process.env.DIRECT_URL;
  if (!connection) throw new Error("DATABASE_NOT_CONFIGURED");
  return await neon(connection).query(sqlQuery, params.map(value => value ?? null), {
    fetchOptions: { cache: "no-store", signal: AbortSignal.timeout(10000) },
  }) as T[];
}

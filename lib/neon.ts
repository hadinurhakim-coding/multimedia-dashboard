/**
 * Neon PostgreSQL Serverless HTTP Client
 * Connects securely to Neon cloud database via high-performance HTTP SQL API.
 * Compatible with Next.js App Router, Server Actions, Route Handlers, and Edge runtimes.
 */

interface NeonSqlResponse<T = Record<string, unknown>> {
  fields: { name: string; dataTypeID: number }[];
  rows: T[];
  command: string;
  rowCount: number;
}

export async function queryNeon<T = Record<string, unknown>>(
  sqlQuery: string,
  params: (string | number | boolean | null | undefined)[] = []
): Promise<T[]> {
  const connStr = process.env.DATABASE_URL || process.env.DIRECT_URL;

  if (!connStr) {
    throw new Error(
      "DATABASE_URL or DIRECT_URL is not configured in environment variables."
    );
  }

  // Parse hostname from connection string
  // Format: postgresql://user:password@host/dbname?...
  let host = "";
  try {
    const urlObj = new URL(connStr);
    host = urlObj.hostname;
  } catch {
    const match = connStr.match(/@([^/:?]+)/);
    if (match) {
      host = match[1];
    } else {
      throw new Error("Unable to parse host from DATABASE_URL");
    }
  }

  const endpoint = `https://${host}/sql`;

  // Neon HTTP API supports parameter substitution if parameterized query is formatted
  let formattedQuery = sqlQuery;
  if (params && params.length > 0) {
    params.forEach((param, idx) => {
      const placeholder = new RegExp(`\\$${idx + 1}(?!\\d)`, "g");
      if (param === null || param === undefined) {
        formattedQuery = formattedQuery.replace(placeholder, "NULL");
      } else if (typeof param === "number") {
        formattedQuery = formattedQuery.replace(placeholder, `${param}`);
      } else if (typeof param === "boolean") {
        formattedQuery = formattedQuery.replace(placeholder, param ? "TRUE" : "FALSE");
      } else {
        // Escape single quotes for SQL safety
        const escaped = String(param).replace(/'/g, "''");
        formattedQuery = formattedQuery.replace(placeholder, `'${escaped}'`);
      }
    });
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Neon-Connection-String": connStr,
    },
    body: JSON.stringify({
      query: formattedQuery,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`Neon HTTP Query Error (${res.status}):`, errorText);
    throw new Error(`Neon query failed: ${errorText}`);
  }

  const data: NeonSqlResponse<T> = await res.json();
  return data.rows || [];
}

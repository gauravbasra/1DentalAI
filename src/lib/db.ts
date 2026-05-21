import { Pool, type QueryResultRow } from "pg";

declare global {
  var __oneDentalPool: Pool | undefined;
}

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (!globalThis.__oneDentalPool) {
    globalThis.__oneDentalPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
  }

  return globalThis.__oneDentalPool;
}

export async function query<T extends QueryResultRow>(sql: string, values: unknown[] = []) {
  return getPool().query<T>(sql, values);
}

export function newId(prefix: string) {
  const random = crypto.randomUUID().replaceAll("-", "").slice(0, 20);
  return `${prefix}_${random}`;
}

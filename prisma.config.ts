import { defineConfig } from "prisma/config";
import { existsSync, readFileSync } from "node:fs";

function loadEnvVar(file: string, key: string) {
  if (process.env[key]) {
    return;
  }

  if (!existsSync(file)) {
    return;
  }

  const contents = readFileSync(file, "utf8");
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const equalsAt = trimmed.indexOf("=");
    if (equalsAt === -1) continue;

    const variable = trimmed.slice(0, equalsAt).trim();
    const value = trimmed.slice(equalsAt + 1).trim().replace(/^"|"$/g, "");
    if (variable === key) {
      process.env[key] = value;
      return;
    }
  }
}

loadEnvVar(".env.local", "DATABASE_URL");
loadEnvVar(".env", "DATABASE_URL");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/1dentalai?schema=public",
  },
});

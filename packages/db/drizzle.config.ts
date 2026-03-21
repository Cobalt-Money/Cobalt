import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.resolve(__dirname, "../..");

dotenv.config({
  path: path.resolve(monorepoRoot, "apps/server/.env"),
});

export default defineConfig({
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
  },
  dialect: "postgresql",
  out: path.resolve(__dirname, "src/migrations"),
  schema: path.resolve(__dirname, "src/schema"),
});

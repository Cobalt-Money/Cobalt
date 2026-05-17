import { defineConfig } from "evalite/config";

export default defineConfig({
  maxConcurrency: 5,
  setupFiles: ["dotenv/config"],
  testTimeout: 120_000,
});

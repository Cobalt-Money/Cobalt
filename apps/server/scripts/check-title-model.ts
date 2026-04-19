import { createGateway } from "@ai-sdk/gateway";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

const apiKey = process.env.AI_GATEWAY_API_KEY;
if (!apiKey) {
  throw new Error("AI_GATEWAY_API_KEY not set in apps/server/.env");
}

const gateway = createGateway({ apiKey });
const { models } = await gateway.getAvailableModels();

const googleFlash = models
  .filter((m) => m.id.startsWith("google/gemini") && /flash/i.test(m.id))
  .map((m) => ({
    id: m.id,
    input: m.pricing?.input,
    output: m.pricing?.output,
  }))
  .toSorted((a, b) => Number(a.input ?? 0) - Number(b.input ?? 0));

console.log("Google Gemini flash-family models:");
for (const m of googleFlash) {
  console.log(`  ${m.id.padEnd(50)} in=${m.input} out=${m.output}`);
}

const target = "google/gemini-2.5-flash-lite";
const found = models.find((m) => m.id === target);
console.log(`\nTarget "${target}": ${found ? "AVAILABLE" : "NOT AVAILABLE"}`);

const cheapest = models
  .map((m) => ({
    id: m.id,
    input: Number(m.pricing?.input ?? 0),
    output: Number(m.pricing?.output ?? 0),
  }))
  .filter((m) => m.input > 0)
  .toSorted((a, b) => a.input - b.input)
  .slice(0, 10);
console.log("\nCheapest 10 models (by input price):");
for (const m of cheapest) {
  console.log(`  ${m.id.padEnd(55)} in=${m.input} out=${m.output}`);
}

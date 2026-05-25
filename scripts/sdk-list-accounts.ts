/**
 * Smoke test for the published @cobalt-money/sdk against prod.
 *
 *   COBALT_API_KEY=ck_live_xxx bun scripts/sdk-list-accounts.ts
 *
 * Generates the key at https://cobaltpf.com → Settings → API Keys.
 */
import { cobalt } from "@cobalt-money/sdk";

const apiKey = process.env.COBALT_API_KEY;
if (!apiKey) {
  console.error("Missing COBALT_API_KEY. Issue one from Settings → API Keys.");
  process.exit(1);
}

cobalt.setConfig({
  baseUrl: "https://api.cobaltpf.com/v1",
  auth: () => apiKey,
});

const { data, error, response } = await cobalt.accounts.list();

if (error) {
  console.error("status:", response.status);
  console.error("error:", JSON.stringify(error, null, 2));
  process.exit(1);
}

console.log(`found ${data?.length ?? 0} accounts\n`);
console.log(JSON.stringify(data, null, 2));

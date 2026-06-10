/**
 * CLI: re-seed the shared landing-page demo network.
 *
 *   bun run ./scripts/seed-demo-network.ts
 *
 * Idempotent. See `src/demo/seed-demo-network.ts` for what gets written.
 */
import { seedDemoNetwork } from "../src/demo/seed-demo-network";

async function main(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log("seeding shared demo network…");
  await seedDemoNetwork();
  // eslint-disable-next-line no-console
  console.log("done.");
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});

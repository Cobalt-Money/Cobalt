import { OpenAPIHono } from "@hono/zod-openapi";

import { generateConnectionPortalRouter } from "./generate-connection-portal.js";

// POST /webhook — blocked on workflow infrastructure migration
// Reference: .sandbox/horizon-test/app/api/snaptrade/webhook/route.ts
//
// `requireAuth` is applied per-route via `createRoute({ middleware: ... })`,
// not via `.use("/*", requireAuth)` on this parent — see chain contract in
// `apps/server/src/index.ts`.
const snaptradeRouter = new OpenAPIHono().route("/", generateConnectionPortalRouter);

export { snaptradeRouter };

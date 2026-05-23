import { z } from "@hono/zod-openapi";

export { errorResponseSchema } from "../../_shared/schemas.js";

export const symbolQuerySchema = z.object({
  symbol: z.string().min(1).openapi({ example: "AAPL" }),
});

import { z } from "@hono/zod-openapi";

export const syncInstitutionSchema = z.object({
  institutionId: z.string(),
});

export type SyncInstitution = z.infer<typeof syncInstitutionSchema>;

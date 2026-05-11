import { z } from "@hono/zod-openapi";

export const errorResponseSchema = z
  .object({
    error: z.string(),
  })
  .openapi("ErrorResponse");

export const idParamsSchema = z.object({
  id: z.string().min(1),
});

const zodIssueSchema = z.object({
  code: z.string(),
  message: z.string(),
  path: z.array(z.union([z.string(), z.number()])),
});

export const createErrorSchema = <T extends z.ZodType>(_inputSchema: T) =>
  z.object({
    error: z.object({
      issues: z.array(zodIssueSchema),
      name: z.string(),
    }),
    success: z.literal(false),
  });

export const validationErrorSchema = createErrorSchema(z.unknown());
export type ValidationError = z.infer<typeof validationErrorSchema>;

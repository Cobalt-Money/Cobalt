import { APIError, createAuthEndpoint, sessionMiddleware } from "better-auth/api";
import * as z from "zod";

import { getInviteAdapter } from "../adapter";
import { DEFAULT_MAX_USES_TARGETED } from "../constants";
import { INVITE_ERROR_CODES } from "../error-codes";
import type { ResolvedInviteOptions } from "../types";
import { buildInviteUrl, generateInviteToken, normalizeEmail, normalizePhone } from "../utils";

const bodySchema = z.object({
  expiresInSeconds: z
    .number()
    .int()
    .positive()
    .max(60 * 60 * 24 * 365)
    .optional(),
  kind: z.string().default("friendship"),
  maxUses: z.number().int().positive().max(1000).optional(),
  organizationId: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
  targetEmail: z.string().email().nullable().optional(),
  targetPhone: z.string().nullable().optional(),
  targetUserId: z.string().nullable().optional(),
});

export const createInviteRoute = (options: ResolvedInviteOptions) =>
  createAuthEndpoint(
    "/invite/create",
    {
      body: bodySchema,
      metadata: {
        openapi: {
          description: "Create an invite token",
          responses: {
            "200": {
              content: {
                "application/json": {
                  schema: {
                    properties: {
                      invite: { type: "object" },
                      url: { type: "string" },
                    },
                    type: "object",
                  },
                },
              },
              description: "Invite created",
            },
          },
        },
      },
      method: "POST",
      use: [sessionMiddleware],
    },
    async (ctx) => {
      const inviter = ctx.context.session.user;
      const { body } = ctx;

      if (options.allowedKinds && !options.allowedKinds.includes(body.kind)) {
        throw new APIError("BAD_REQUEST", {
          message: `Unknown invite kind: ${body.kind}`,
        });
      }

      const targetEmail = normalizeEmail(body.targetEmail);
      const targetPhone = normalizePhone(body.targetPhone);
      const targetUserId = body.targetUserId ?? null;

      const isTargeted = Boolean(targetUserId || targetEmail || targetPhone);
      const maxUses =
        body.maxUses ?? (isTargeted ? DEFAULT_MAX_USES_TARGETED : options.defaultMaxUsesOpen);

      const expiresInSeconds = body.expiresInSeconds ?? options.defaultExpirySeconds;
      const now = new Date();
      const expiresAt = new Date(now.getTime() + expiresInSeconds * 1000);

      const adapter = getInviteAdapter(ctx);
      const invite = await adapter.createInvite({
        createdAt: now,
        expiresAt,
        inviterUserId: inviter.id,
        kind: body.kind,
        maxUses,
        organizationId: body.organizationId ?? null,
        revokedAt: null,
        role: body.role ?? null,
        targetEmail,
        targetPhone,
        targetUserId,
        token: generateInviteToken(),
        usesCount: 0,
      });

      const url = buildInviteUrl(options.inviteUrlBase, invite.token);

      if (options.sendInvite && (targetEmail || targetPhone)) {
        try {
          await options.sendInvite({
            invite,
            inviteUrl: url,
            inviterEmail: inviter.email ?? null,
            inviterName: inviter.name,
          });
        } catch (error) {
          ctx.context.logger.warn("[invite] sendInvite hook threw", {
            error,
            inviteId: invite.id,
          });
        }
      }

      return ctx.json({ invite, url });
    },
  );

const _errors = INVITE_ERROR_CODES;
void _errors;

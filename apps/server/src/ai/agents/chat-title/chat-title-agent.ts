import { env } from "@cobalt-web/env/server";
import { generateText } from "ai";

import { gatewayModel } from "../../model-provider.js";

const SHORT_MESSAGE_LIMIT = 30;
const PROMPT_TRUNCATE_LIMIT = 500;
const MAX_TITLE_LENGTH = 50;
const TITLE_MODEL = "google/gemini-2.5-flash-lite";

const SYSTEM_PROMPT = [
  "Write a 3–5 word title for a chat, based on the user's first message.",
  "",
  "Rules:",
  "- Lead with the noun or topic the user cares about.",
  "- Be specific: prefer concrete subjects over abstract verbs.",
  "- Use the user's own language where possible.",
  '- No quotes. No trailing punctuation. No prefixes like "Chat about" or "Help with".',
  "- Avoid buzzwords (streamline, optimize, leverage, innovative).",
  "- Sentence case.",
  "",
  "First message:",
].join("\n");

export function cleanTitle(raw: string): string {
  const stripped = raw
    .trim()
    .replaceAll(/^["'`]|["'`.]$/g, "")
    .replace(/^(Chat about|Discussion of|Question about|Help with|Re:)\s+/i, "")
    .trim();

  return stripped.length > MAX_TITLE_LENGTH
    ? `${stripped.slice(0, MAX_TITLE_LENGTH - 3)}...`
    : stripped;
}

export class MissingGatewayKeyError extends Error {
  constructor() {
    super("AI_GATEWAY_API_KEY not configured");
    this.name = "MissingGatewayKeyError";
  }
}

/**
 * Generate a chat title from the user's first message.
 * Pure agent: one LLM call + cleanup. No workflow/retry semantics — callers
 * (a workflow step, an API route, a script) classify errors themselves.
 */
export async function generateChatTitle(firstMessage: string): Promise<string> {
  const cleaned = firstMessage.trim();
  if (!cleaned) {
    return "";
  }
  if (cleaned.length <= SHORT_MESSAGE_LIMIT) {
    return cleanTitle(cleaned);
  }
  if (!env.AI_GATEWAY_API_KEY) {
    throw new MissingGatewayKeyError();
  }

  const truncated =
    cleaned.length > PROMPT_TRUNCATE_LIMIT
      ? `${cleaned.slice(0, PROMPT_TRUNCATE_LIMIT)}...`
      : cleaned;

  const result = await generateText({
    experimental_telemetry: {
      functionId: "chat-title-agent",
      isEnabled: true,
    },
    maxOutputTokens: 24,
    model: gatewayModel(TITLE_MODEL),
    prompt: `${SYSTEM_PROMPT}\n"""${truncated}"""\n\nTitle:`,
  });

  return cleanTitle(result.text);
}

import { updateChatTitle } from "@cobalt-web/server-data/chat/mutations";
import { FatalError, RetryableError } from "workflow";

import {
  generateChatTitle,
  MissingGatewayKeyError,
} from "../../ai/agents/chat-title/chat-title-agent.js";

export async function generateChatTitleStep(
  firstMessage: string
): Promise<string> {
  "use step";

  try {
    const title = await generateChatTitle(firstMessage);
    if (!title) {
      throw new RetryableError("Model returned empty title after cleaning", {
        retryAfter: "5s",
      });
    }
    return title;
  } catch (error) {
    if (error instanceof RetryableError || error instanceof FatalError) {
      throw error;
    }
    if (error instanceof MissingGatewayKeyError) {
      throw new FatalError(error.message);
    }
    const message = error instanceof Error ? error.message : String(error);
    const status = (error as { response?: { status?: number } })?.response
      ?.status;
    if (status === 429 || /rate limit|429/i.test(message)) {
      throw new RetryableError("Title model rate limited", {
        retryAfter: "1m",
      });
    }
    if (/timeout|ECONNRESET|ETIMEDOUT|ENOTFOUND|network/i.test(message)) {
      throw new RetryableError(`Network error: ${message}`, {
        retryAfter: "10s",
      });
    }
    throw new RetryableError(`Failed to generate title: ${message}`, {
      retryAfter: "5s",
    });
  }
}

export async function updateChatTitleStep(
  chatId: string,
  title: string
): Promise<void> {
  "use step";

  try {
    await updateChatTitle(chatId, title);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new RetryableError(`Failed to update chat title: ${message}`, {
      retryAfter: "2s",
    });
  }
}

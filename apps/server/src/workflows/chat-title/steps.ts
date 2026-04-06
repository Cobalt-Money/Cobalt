import { updateChatTitle } from "@cobalt-web/server-data/chat/mutations";
import {
  generateChatTitle,
  generateFallbackTitle,
} from "@cobalt-web/server-data/chat/title";
import { RetryableError, FatalError } from "workflow";

/**
 * Classifies a title generation error and throws an appropriate RetryableError.
 * Extracted to reduce cyclomatic complexity in generateChatTitleStep.
 */
function handleTitleGenerationError(error: unknown): never {
  const err = error as { response?: { status?: number } };
  const errorMessage = error instanceof Error ? error.message : "Unknown error";

  // If it's already a RetryableError or FatalError, re-throw it
  if (error instanceof RetryableError || error instanceof FatalError) {
    throw error;
  }

  // Handle rate limiting - retryable
  if (
    errorMessage.includes("rate limit") ||
    errorMessage.includes("429") ||
    err?.response?.status === 429
  ) {
    throw new RetryableError("AI model rate limited", {
      retryAfter: "1m",
    });
  }

  // Handle timeouts and network errors - retryable
  if (
    errorMessage.includes("timeout") ||
    errorMessage.includes("network") ||
    errorMessage.includes("ECONNRESET") ||
    errorMessage.includes("ETIMEDOUT") ||
    errorMessage.includes("ENOTFOUND")
  ) {
    throw new RetryableError(
      `Network error during title generation: ${errorMessage}`,
      { retryAfter: "10s" }
    );
  }

  // Handle schema validation errors from AI models - retryable
  if (
    errorMessage.includes("did not match schema") ||
    errorMessage.includes("No object generated")
  ) {
    throw new RetryableError(
      `AI model schema validation failed: ${errorMessage}`,
      { retryAfter: "10s" }
    );
  }

  // Other errors - retryable with default backoff
  throw new RetryableError(`Failed to generate chat title: ${errorMessage}`, {
    retryAfter: "5s",
  });
}

/**
 * Step 1: Generate chat title
 * Delegates to server-data title generation.
 * @param firstMessage - The first user message text
 * @param _chatId - The chat ID for logging
 * @returns Generated title
 */
export async function generateChatTitleStep(
  firstMessage: string,
  _chatId: string
): Promise<string> {
  "use step";

  const cleanedMessage = firstMessage.trim();

  // Handle edge cases - empty message is a fatal error (don't retry)
  if (!cleanedMessage || cleanedMessage.length === 0) {
    throw new FatalError("Cannot generate title for empty message");
  }

  // If message is very short, use it as title (with some cleanup)
  if (cleanedMessage.length <= 30) {
    return cleanedMessage;
  }

  try {
    const generatedTitle = await generateChatTitle(cleanedMessage);

    if (generatedTitle) {
      return generatedTitle;
    }

    // Fall back to truncated message if AI generation failed
    return generateFallbackTitle(cleanedMessage);
  } catch (error) {
    handleTitleGenerationError(error);
  }
}

/**
 * Step 2: Update chat title in database
 * Delegates to server-data mutation.
 * @param chatId - The chat ID to update
 * @param title - The title to set
 */
export async function updateChatTitleInDB(
  chatId: string,
  title: string
): Promise<void> {
  "use step";

  try {
    await updateChatTitle(chatId, title);
  } catch (error) {
    // Database errors are retryable
    throw new RetryableError(
      `Failed to update chat title: ${error instanceof Error ? error.message : "Unknown error"}`,
      { retryAfter: "2s" }
    );
  }
}

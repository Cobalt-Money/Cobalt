import { generateFallbackTitle } from "@cobalt-web/server-data/chat/title";
import { FatalError } from "workflow";

import { generateChatTitleStep, updateChatTitleInDB } from "./steps";

export interface ChatTitleWorkflowParams {
  chatId: string;
  firstMessage: string;
}

export interface ChatTitleWorkflowResult {
  success: boolean;
  title: string;
  chatId: string;
  error?: string;
}

/**
 * Main workflow for generating chat title with streaming
 * Orchestrates streaming title generation and database update
 * Writes tokens to stream as they arrive (handled in step)
 * Uses workflow API retry mechanism - steps throw RetryableError for transient failures
 * Falls back to generateFallbackTitle only if AI generation fails after all retries
 */
export async function generateChatTitleWorkflow(
  params: ChatTitleWorkflowParams
): Promise<ChatTitleWorkflowResult> {
  "use workflow";

  const { chatId, firstMessage } = params;

  try {
    // Step 1: Generate title with streaming (tokens written to stream in step)
    // This step will automatically retry on RetryableError
    // If it exhausts retries, it will throw and we'll catch it below
    const generatedTitle = await generateChatTitleStep(firstMessage, chatId);

    // Step 2: Update database with AI-generated title
    // This step will automatically retry on RetryableError
    await updateChatTitleInDB(chatId, generatedTitle);

    return {
      chatId,
      success: true,
      title: generatedTitle,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // If it's a FatalError, don't retry - use fallback immediately
    if (error instanceof FatalError) {
      try {
        const fallbackTitle = generateFallbackTitle(firstMessage);
        await updateChatTitleInDB(chatId, fallbackTitle);

        return {
          chatId,
          success: true,
          title: fallbackTitle,
        };
      } catch {
        // Even fallback failed - this is very unlikely but handle it

        return {
          chatId,
          error: errorMessage,
          success: false,
          title: chatId, // Last resort
        };
      }
    }

    // If we get here, it means all retries were exhausted for a RetryableError
    // or some other unexpected error occurred

    // Use fallback title as last resort
    try {
      const fallbackTitle = generateFallbackTitle(firstMessage);
      await updateChatTitleInDB(chatId, fallbackTitle);

      return {
        chatId,
        success: true,
        title: fallbackTitle,
      };
    } catch {
      // Even fallback failed - this is very unlikely but handle it

      return {
        chatId,
        error: errorMessage,
        success: false,
        title: chatId, // Last resort
      };
    }
  }
}

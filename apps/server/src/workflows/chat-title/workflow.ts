import { generateFallbackTitle } from "@cobalt-web/server-data/chat/_shared";

import { generateChatTitleStep, updateChatTitleStep } from "./steps.js";

export interface ChatTitleParams {
  chatId: string;
  firstMessage: string;
}

export interface ChatTitleResult {
  chatId: string;
  error?: string;
  success: boolean;
  title: string;
}

export async function generateChatTitleWorkflow(params: ChatTitleParams): Promise<ChatTitleResult> {
  "use workflow";

  const { chatId, firstMessage } = params;

  try {
    const title = await generateChatTitleStep(firstMessage);
    await updateChatTitleStep(chatId, title);
    return { chatId, success: true, title };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    const fallbackTitle = generateFallbackTitle(firstMessage);
    try {
      await updateChatTitleStep(chatId, fallbackTitle);
      return { chatId, success: true, title: fallbackTitle };
    } catch {
      return {
        chatId,
        error: errorMessage,
        success: false,
        title: fallbackTitle,
      };
    }
  }
}

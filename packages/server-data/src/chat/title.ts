import { generateText } from "ai";

export async function generateChatTitle(
  firstMessage: string
): Promise<string | null> {
  try {
    const cleanedMessage = firstMessage.trim();
    if (!cleanedMessage || cleanedMessage.length === 0) {
      return null;
    }
    if (cleanedMessage.length <= 30) {
      return cleanedMessage.length > 0 ? cleanedMessage : null;
    }

    const truncatedMessage =
      cleanedMessage.length > 500
        ? `${cleanedMessage.slice(0, 500)}...`
        : cleanedMessage;

    const result = await generateText({
      experimental_telemetry: {
        functionId: "chat-title-generation",
        isEnabled: true,
      },
      maxOutputTokens: 50,
      model: "vertex/gemini-3-flash",
      prompt: `Generate a concise, descriptive title for a chat conversation based on this first user message. The title should be:

1. 3-8 words maximum
2. Descriptive of the main topic or question
3. Professional and clear
4. No quotes, no "Chat about", no "Discussion of"
5. Focus on the key subject matter

User message: "${truncatedMessage}"

Generate only the title, nothing else:`,
    });

    const generatedTitle = result.text.trim();
    if (!generatedTitle || generatedTitle.length === 0) {
      return null;
    }

    const cleanedTitle = generatedTitle
      .replaceAll(/^["']|["']$/g, "")
      .replace(/^(Chat about|Discussion of|Question about|Help with)\s*/i, "")
      .trim();

    const finalTitle =
      cleanedTitle.length > 50
        ? `${cleanedTitle.slice(0, 47)}...`
        : cleanedTitle;
    return finalTitle.length > 0 ? finalTitle : null;
  } catch (error) {
    console.error("Failed to generate chat title:", error);
    return null;
  }
}

export function generateFallbackTitle(firstMessage: string): string {
  const cleaned = firstMessage.trim();
  if (!cleaned) {
    return "New Chat";
  }

  const words = cleaned.split(/\s+/).slice(0, 6);
  const title = words.join(" ");
  return title.length > 40 ? `${title.slice(0, 37)}...` : title;
}

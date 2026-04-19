export interface ToolRendererContext {
  messageId: string;
  chatId?: string;
  partIndex: number;
}

export function toolRendererKey(
  context: ToolRendererContext,
  suffix: string
): string {
  return `${context.chatId ?? "chat"}-${context.messageId}-${suffix}-${context.partIndex}`;
}

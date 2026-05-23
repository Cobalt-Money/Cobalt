import type { PartInsert } from "@cobalt-web/db/schema/ai/chat";
import type { parts } from "@cobalt-web/db/schema/schema";
import { isToolUIPart } from "ai";
import type { DynamicToolUIPart, ToolUIPart, UIMessage } from "ai";
import type { InferSelectModel } from "drizzle-orm";

type PartRow = InferSelectModel<typeof parts>;

function nil(v: string | null | undefined): boolean {
  return v === undefined || v === null;
}

const MAX_TITLE_LENGTH = 50;
const FALLBACK_WORD_COUNT = 6;

export function generateFallbackTitle(firstMessage: string): string {
  const cleaned = firstMessage.trim();
  if (!cleaned) {
    return "New chat";
  }
  const words = cleaned.split(/\s+/).slice(0, FALLBACK_WORD_COUNT);
  const title = words.join(" ");
  return title.length > MAX_TITLE_LENGTH ? `${title.slice(0, MAX_TITLE_LENGTH - 3)}...` : title;
}

function textPart(p: PartRow): Record<string, unknown> | null {
  return nil(p.text_text) ? null : { text: p.text_text, type: "text" };
}

function reasoningPart(p: PartRow): Record<string, unknown> | null {
  return nil(p.reasoning_text)
    ? null
    : {
        providerMetadata: p.providerMetadata ?? undefined,
        text: p.reasoning_text,
        type: "reasoning",
      };
}

function filePart(p: PartRow): Record<string, unknown> | null {
  if (nil(p.file_filename) || nil(p.file_mediaType) || nil(p.file_url)) {
    return null;
  }
  return {
    filename: p.file_filename,
    mediaType: p.file_mediaType,
    type: "file",
    url: p.file_url,
  };
}

function sourceUrlPart(p: PartRow): Record<string, unknown> | null {
  if (nil(p.source_url_sourceId) || nil(p.source_url_title) || nil(p.source_url_url)) {
    return null;
  }
  return {
    providerMetadata: p.providerMetadata ?? undefined,
    sourceId: p.source_url_sourceId,
    title: p.source_url_title,
    type: "source-url",
    url: p.source_url_url,
  };
}

function sourceDocPart(p: PartRow): Record<string, unknown> | null {
  if (
    nil(p.source_document_filename) ||
    nil(p.source_document_mediaType) ||
    nil(p.source_document_sourceId) ||
    nil(p.source_document_title)
  ) {
    return null;
  }
  return {
    filename: p.source_document_filename,
    mediaType: p.source_document_mediaType,
    providerMetadata: p.providerMetadata ?? undefined,
    sourceId: p.source_document_sourceId,
    title: p.source_document_title,
    type: "source-document",
  };
}

function toolPart(p: PartRow, t: string): Record<string, unknown> | null {
  if (nil(p.tool_state) || nil(p.tool_toolCallId)) {
    return null;
  }
  const out: Record<string, unknown> = {
    input: p.tool_input ?? {},
    state: p.tool_state,
    toolCallId: p.tool_toolCallId,
    type: t,
  };
  if (p.tool_errorText) {
    out.errorText = p.tool_errorText;
  }
  if (p.tool_output) {
    out.output = p.tool_output;
  }
  return out;
}

type UIMessagePart = UIMessage["parts"][number];

type PartBase = Pick<PartInsert, "messageId" | "order" | "partId">;

function mapToolPartToDb(part: ToolUIPart | DynamicToolUIPart, base: PartBase): PartInsert {
  const input = "input" in part ? part.input : undefined;
  const output = "output" in part ? part.output : undefined;
  const errorText = "errorText" in part ? part.errorText : undefined;
  return {
    ...base,
    tool_errorText: errorText ?? null,
    tool_input: (input ?? {}) as Record<string, unknown>,
    tool_output: output ? (output as Record<string, unknown>) : null,
    tool_state: part.state,
    tool_toolCallId: part.toolCallId,
    type: part.type,
  };
}

function mapDynamicPartToDb(part: UIMessagePart, base: PartBase): PartInsert | null {
  if (isToolUIPart(part)) {
    return mapToolPartToDb(part as ToolUIPart | DynamicToolUIPart, base);
  }
  const t = (part as { type: string }).type;
  if (t.startsWith("data-") && "data" in part) {
    return {
      ...base,
      data: (part as { type: string; data: unknown }).data as Record<string, unknown>,
      type: t,
    };
  }
  return null;
}

/**
 * Map a single AI SDK UIMessage part → DB `parts` insert row.
 * Returns `null` for unrecognised / unsupported types so callers can filter.
 */
export function mapUIPartToDb(
  part: UIMessagePart,
  messageId: string,
  order: number,
): PartInsert | null {
  const base = { messageId, order };

  switch (part.type) {
    case "text": {
      return { ...base, text_text: part.text, type: "text" };
    }
    case "reasoning": {
      return {
        ...base,
        providerMetadata: (part.providerMetadata as Record<string, unknown>) ?? null,
        reasoning_text: part.text,
        type: "reasoning",
      };
    }
    case "file": {
      return {
        ...base,
        file_filename: part.filename ?? null,
        file_mediaType: part.mediaType,
        file_url: part.url,
        type: "file",
      };
    }
    case "source-url": {
      return {
        ...base,
        providerMetadata: (part.providerMetadata as Record<string, unknown>) ?? null,
        source_url_sourceId: part.sourceId,
        source_url_title: part.title,
        source_url_url: part.url,
        type: "source-url",
      };
    }
    case "source-document": {
      return {
        ...base,
        providerMetadata: (part.providerMetadata as Record<string, unknown>) ?? null,
        source_document_filename: part.filename ?? null,
        source_document_mediaType: part.mediaType,
        source_document_sourceId: part.sourceId,
        source_document_title: part.title,
        type: "source-document",
      };
    }
    case "step-start": {
      return { ...base, type: "step-start" };
    }
    default: {
      return mapDynamicPartToDb(part, base);
    }
  }
}

/**
 * Map all parts of a UIMessage to DB insert rows.
 * Filters out any unsupported part types.
 */
export function mapUIMessagePartsToDbParts(
  messageParts: UIMessage["parts"],
  messageId: string,
): PartInsert[] {
  return messageParts
    .map((part, i) => mapUIPartToDb(part, messageId, i))
    .filter((r): r is PartInsert => r !== null);
}

/** `parts` row → AI SDK message part. */
export function partDbToUi(part: PartRow): Record<string, unknown> | null {
  if (!part.partId || !part.type) {
    return null;
  }

  const t = part.type;

  switch (t) {
    case "text": {
      return textPart(part);
    }
    case "reasoning": {
      return reasoningPart(part);
    }
    case "file": {
      return filePart(part);
    }
    case "source-url": {
      return sourceUrlPart(part);
    }
    case "source-document": {
      return sourceDocPart(part);
    }
    case "step-start": {
      return { type: "step-start" };
    }
    default: {
      break;
    }
  }

  if (t.startsWith("data-") && part.data) {
    return { data: part.data, type: t };
  }
  if (t.startsWith("tool-")) {
    return toolPart(part, t);
  }

  return { type: t };
}

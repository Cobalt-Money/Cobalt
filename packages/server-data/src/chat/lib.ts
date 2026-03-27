import type { parts } from "@cobalt-web/db/schema/drizzle-schema";
import type { InferSelectModel } from "drizzle-orm";

type PartRow = InferSelectModel<typeof parts>;

function nil(v: string | null | undefined): boolean {
  return v === undefined || v === null;
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
  if (
    nil(p.source_url_sourceId) ||
    nil(p.source_url_title) ||
    nil(p.source_url_url)
  ) {
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
    state: p.tool_state,
    toolCallId: p.tool_toolCallId,
    type: t,
  };
  if (p.tool_errorText) {
    out.errorText = p.tool_errorText;
  }
  if (p.tool_input) {
    out.input = p.tool_input;
  }
  if (p.tool_output) {
    out.output = p.tool_output;
  }
  return out;
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

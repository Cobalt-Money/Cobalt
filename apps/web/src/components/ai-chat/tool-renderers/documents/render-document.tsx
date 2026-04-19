import type { Spec } from "@json-render/core";
import { useMemo } from "react";

import { ToolErrorCard } from "../shared";
import type { ToolRendererContext } from "../types";
import { toolRendererKey } from "../types";
import { buildPDFTree } from "./document-registry";
import { PDFDownloadLink } from "./pdf-download-link";

interface DocumentInvocation {
  type: "tool-renderDocument";
  toolCallId: string;
  state: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
}

function isDocumentSpec(
  output: unknown
): output is { root: string; elements: Record<string, unknown> } {
  return (
    typeof output === "object" &&
    output !== null &&
    "root" in output &&
    "elements" in output &&
    typeof (output as { root: unknown }).root === "string" &&
    typeof (output as { elements: unknown }).elements === "object"
  );
}

function extractTitle(spec: {
  root: string;
  elements: Record<string, { type?: string; props?: Record<string, unknown> }>;
}): string {
  for (const el of Object.values(spec.elements)) {
    if (
      el.type === "PDFHeader" &&
      el.props?.title &&
      typeof el.props.title === "string"
    ) {
      return el.props.title;
    }
  }
  return "Document";
}

export function RenderDocumentToolRenderer({
  invocation: part,
  context,
}: {
  invocation: DocumentInvocation;
  context: ToolRendererContext;
}) {
  const pdfContent = useMemo(() => {
    if (part.output && isDocumentSpec(part.output)) {
      return buildPDFTree(part.output as unknown as Spec);
    }
    return null;
  }, [part.output]);

  const title = useMemo(() => {
    if (part.output && isDocumentSpec(part.output)) {
      return extractTitle(part.output as Parameters<typeof extractTitle>[0]);
    }
    return "Document";
  }, [part.output]);

  if (part.state === "output-available" && pdfContent) {
    return (
      <div key={toolRendererKey(context, "document")} className="py-1">
        <PDFDownloadLink title={title}>{pdfContent}</PDFDownloadLink>
      </div>
    );
  }
  if (part.state === "output-error") {
    return (
      <ToolErrorCard
        context={context}
        errorText={part.errorText}
        suffix="document-error"
        title="Failed to generate document"
      />
    );
  }
  return null;
}

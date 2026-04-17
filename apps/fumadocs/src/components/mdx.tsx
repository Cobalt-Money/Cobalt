import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";

import { APIPage } from "@/components/api-page";
import {
  AmpIcon,
  ClaudeIcon,
  CodexIcon,
  CursorIcon,
  GeminiIcon,
  McpClientCards,
  McpSectionHeader,
  OpenCodeIcon,
  TerminalIcon,
  VSCodeIcon,
} from "@/components/mcp-client-cards";

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    APIPage,
    AmpIcon,
    ClaudeIcon,
    CodexIcon,
    CursorIcon,
    GeminiIcon,
    McpClientCards,
    McpSectionHeader,
    OpenCodeIcon,
    TerminalIcon,
    VSCodeIcon,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}

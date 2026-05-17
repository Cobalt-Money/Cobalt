import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";

import {
  AmpIcon,
  ChatGPTIcon,
  ClaudeIcon,
  CodexIcon,
  CursorIcon,
  GeminiIcon,
  McpClientCards,
  McpSectionHeader,
  OpenCodeIcon,
  PiIcon,
  TerminalIcon,
  VSCodeIcon,
  ZedIcon,
} from "@/components/mcp-client-cards";

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    AmpIcon,
    ChatGPTIcon,
    ClaudeIcon,
    CodexIcon,
    CursorIcon,
    GeminiIcon,
    McpClientCards,
    McpSectionHeader,
    OpenCodeIcon,
    PiIcon,
    TerminalIcon,
    VSCodeIcon,
    ZedIcon,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}

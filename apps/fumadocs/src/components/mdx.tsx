import { createAPIPage } from "fumadocs-openapi/ui";
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
import { openapi } from "@/lib/openapi";

const APIPage = createAPIPage(openapi);

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    AmpIcon,
    APIPage,
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

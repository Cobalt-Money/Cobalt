import { docs } from "collections/server";
import { loader, multiple } from "fumadocs-core/source";
import type { InferPageType } from "fumadocs-core/source";
import { lucideIconsPlugin } from "fumadocs-core/source/lucide-icons";
import type { DocData, DocMethods } from "fumadocs-mdx/runtime/types";
import { openapiPlugin, openapiSource } from "fumadocs-openapi/server";

import { openapi } from "./openapi";

export type DocsPageData = DocData &
  DocMethods & { title?: string; description?: string; full?: boolean };

// See https://fumadocs.dev/docs/headless/source-api for more info
export const source = loader(
  multiple({
    docs: docs.toFumadocsSource(),
    openapi: await openapiSource(openapi, {
      baseDir: "api-reference",
    }),
  }),
  {
    baseUrl: "/docs",
    plugins: [lucideIconsPlugin(), openapiPlugin()],
  }
);

export function getPageImage(page: InferPageType<typeof source>) {
  const segments = [...page.slugs, "image.webp"];

  return {
    segments,
    url: `/og/docs/${segments.join("/")}`,
  };
}

export async function getLLMText(page: InferPageType<typeof source>) {
  if ("getText" in page.data) {
    const data = page.data as unknown as DocsPageData;
    const processed = await data.getText("processed");
    return `# ${page.data.title}\n\n${processed}`;
  }

  return `# ${page.data.title}`;
}

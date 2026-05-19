import { docs } from "collections/server";
import { loader } from "fumadocs-core/source";
import type { InferPageType } from "fumadocs-core/source";
import { lucideIconsPlugin } from "fumadocs-core/source/lucide-icons";
import type { DocData, DocMethods } from "fumadocs-mdx/runtime/types";

export type DocsPageData = DocData &
  DocMethods & { title?: string; description?: string; full?: boolean };

// See https://fumadocs.dev/docs/headless/source-api for more info
export const source = loader(docs.toFumadocsSource(), {
  baseUrl: "/docs",
  plugins: [lucideIconsPlugin()],
});

export function getPageImage(page: InferPageType<typeof source>) {
  const segments = [...page.slugs, "image.webp"];

  return {
    segments,
    url: `/og/docs/${segments.join("/")}`,
  };
}

export async function getLLMText(page: InferPageType<typeof source>) {
  const data = page.data as unknown as DocsPageData;
  const processed = await data.getText("processed");
  return `# ${data.title}\n\n${processed}`;
}

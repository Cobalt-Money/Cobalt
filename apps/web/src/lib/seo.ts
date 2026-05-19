export const SITE_URL = "https://cobaltpf.com";
export const SITE_NAME = "Cobalt";
export const DEFAULT_TITLE = "Cobalt — Talk to your money";
export const DEFAULT_DESCRIPTION =
  "Other finance apps give you homework. Cobalt gives you answers — ask anything about your money, from anywhere.";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;
export const TWITTER_HANDLE = "@trycobalt";

interface SeoMetaInput {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  type?: "website" | "article";
  publishedTime?: string;
  author?: string;
}

export function buildSeoMeta({
  title,
  description = DEFAULT_DESCRIPTION,
  path = "/",
  image = DEFAULT_OG_IMAGE,
  type = "website",
  publishedTime,
  author,
}: SeoMetaInput) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;
  const url = `${SITE_URL}${path}`;
  const meta: Record<string, string>[] = [
    { title: fullTitle },
    { content: description, name: "description" },

    { content: fullTitle, property: "og:title" },
    { content: description, property: "og:description" },
    { content: type, property: "og:type" },
    { content: url, property: "og:url" },
    { content: image, property: "og:image" },
    { content: SITE_NAME, property: "og:site_name" },

    { content: "summary_large_image", name: "twitter:card" },
    { content: TWITTER_HANDLE, name: "twitter:site" },
    { content: fullTitle, name: "twitter:title" },
    { content: description, name: "twitter:description" },
    { content: image, name: "twitter:image" },
  ];

  if (publishedTime) {
    meta.push({ content: publishedTime, property: "article:published_time" });
  }
  if (author) {
    meta.push({ content: author, property: "article:author" });
  }

  const links = [{ href: url, rel: "canonical" }];

  return { links, meta };
}

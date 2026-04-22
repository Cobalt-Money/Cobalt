"use client";

import { code } from "@streamdown/code";
import { defaultRehypePlugins, Streamdown } from "streamdown";

// Strict security config for AI-generated content
const rehypePlugins = [
  defaultRehypePlugins.raw,
  defaultRehypePlugins.sanitize,
  [
    defaultRehypePlugins.harden[0],
    {
      allowDataImages: false,
      allowedImagePrefixes: ["https://cdn.your-domain.com"],
      allowedLinkPrefixes: [
        "https://your-domain.com",
        "https://docs.your-domain.com",
      ],
      allowedProtocols: ["https", "mailto"],
    },
  ],
];

export default function SecureChat({ content }: { content: string }) {
  return (
    <Streamdown
      linkSafety={{
        enabled: true,
        onLinkCheck: (url) => {
          const trusted = ["your-domain.com"];
          const { hostname } = new URL(url);
          return trusted.some((d) => hostname.endsWith(d));
        },
      }}
      plugins={{ code }}
      rehypePlugins={rehypePlugins}
    >
      {content}
    </Streamdown>
  );
}

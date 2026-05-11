import { describe, expect, it, vi } from "vitest";

vi.mock(import("nitro/storage"), (() => ({
  useStorage: () => ({
    getItem: () => Promise.resolve(null),
    getKeys: () => Promise.resolve([]),
  }),
})) as never);

const { keyToPath, parseFrontmatter } = await import("./index.js");

describe("keyToPath", () => {
  it("converts unstorage key separators to path slashes", () => {
    expect(keyToPath("a:b:c.md")).toBe("a/b/c.md");
  });

  it("returns input unchanged when no colons", () => {
    expect(keyToPath("file.md")).toBe("file.md");
  });

  it("handles empty input", () => {
    expect(keyToPath("")).toBe("");
  });
});

describe("parseFrontmatter", () => {
  describe("happy path", () => {
    it("splits frontmatter and body", () => {
      const input = `---
title: Hello
description: A test
---
This is the body.`;
      const { body, meta } = parseFrontmatter(input);
      expect(meta).toStrictEqual({ description: "A test", title: "Hello" });
      expect(body).toBe("This is the body.");
    });

    it("trims whitespace around keys and values", () => {
      const input = `---
  spaced_key  :   spaced value
---
body`;
      const { meta } = parseFrontmatter(input);
      expect(meta.spaced_key).toBe("spaced value");
    });

    it("supports keywords field with comma values", () => {
      const input = `---
keywords: a, b, c
---
body`;
      expect(parseFrontmatter(input).meta.keywords).toBe("a, b, c");
    });
  });

  describe("missing or malformed frontmatter", () => {
    it("returns body unchanged and empty meta when no frontmatter", () => {
      const input = "just some markdown";
      expect(parseFrontmatter(input)).toStrictEqual({ body: input, meta: {} });
    });

    it("returns empty meta when frontmatter has no fences", () => {
      const input = "title: Hello\n\nbody";
      expect(parseFrontmatter(input)).toStrictEqual({ body: input, meta: {} });
    });

    it("ignores frontmatter lines without a colon", () => {
      const input = `---
notakeyvalue
title: Real
---
body`;
      const { meta } = parseFrontmatter(input);
      expect(meta).toStrictEqual({ title: "Real" });
    });

    it("ignores lines starting with colon (no key)", () => {
      const input = `---
: orphan
title: Real
---
body`;
      const { meta } = parseFrontmatter(input);
      expect(meta).toStrictEqual({ title: "Real" });
    });
  });

  describe("body preservation", () => {
    it("preserves multiline body verbatim", () => {
      const input = `---
title: T
---
line1
line2

line4`;
      expect(parseFrontmatter(input).body).toBe("line1\nline2\n\nline4");
    });

    it("returns empty body when frontmatter is the whole document", () => {
      const input = `---
title: T
---
`;
      expect(parseFrontmatter(input).body).toBe("");
    });
  });
});

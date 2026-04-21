import type { ComponentType } from "react";

export interface BlogFrontmatter {
  title: string;
  description?: string;
  date: string;
  author?: string;
  tags?: string[];
  coverImage?: string;
  draft?: boolean;
}

export interface BlogPost {
  slug: string;
  frontmatter: BlogFrontmatter;
  Component: ComponentType;
}

interface MdxModule {
  default: ComponentType;
  frontmatter: BlogFrontmatter;
}

const modules = import.meta.glob<MdxModule>("/content/blog/*.mdx", {
  eager: true,
});

const slugFromPath = (path: string): string =>
  path.replace(/^.*\/content\/blog\//, "").replace(/\.mdx$/, "");

const allPosts: BlogPost[] = Object.entries(modules)
  .map(([path, mod]) => ({
    Component: mod.default,
    frontmatter: mod.frontmatter,
    slug: slugFromPath(path),
  }))
  .toSorted(
    (a, b) =>
      new Date(b.frontmatter.date).getTime() -
      new Date(a.frontmatter.date).getTime()
  );

const isPublished = (post: BlogPost): boolean =>
  import.meta.env.DEV || !post.frontmatter.draft;

export const getBlogPosts = (): BlogPost[] => allPosts.filter(isPublished);

export const getBlogPost = (slug: string): BlogPost | undefined =>
  allPosts.find((post) => post.slug === slug && isPublished(post));

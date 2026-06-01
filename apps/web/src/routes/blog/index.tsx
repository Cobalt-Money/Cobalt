import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { Container, MarketingFooter, MarketingNav } from "@/components/landing/marketing-shell";
import { getBlogPosts } from "@/lib/blog";
import { buildSeoMeta } from "@/lib/seo";

export const Route = createFileRoute("/blog/")({
  component: BlogIndex,
  head: () => {
    const seo = buildSeoMeta({
      description:
        "Field notes from the Cobalt team — product updates, design notes, and the occasional essay on personal finance.",
      path: "/blog",
      title: "Blog",
    });
    return { links: seo.links, meta: seo.meta };
  },
  staticData: { title: "Blog" },
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const ALL = "All";

function BlogIndex() {
  const posts = getBlogPosts();
  const [active, setActive] = useState<string>(ALL);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of posts) {
      for (const t of p.frontmatter.tags ?? []) {
        set.add(t);
      }
    }
    return [ALL, ...[...set].toSorted()];
  }, [posts]);

  const filtered = useMemo(
    () => (active === ALL ? posts : posts.filter((p) => p.frontmatter.tags?.includes(active))),
    [posts, active],
  );

  return (
    <div className="min-h-svh bg-background text-foreground">
      <MarketingNav />
      <main>
        <Container className="max-w-3xl py-24 sm:py-32">
          <header className="mb-12">
            <h1 className="mb-8 font-semibold text-4xl leading-tight sm:text-5xl">Blog</h1>
            <nav className="flex flex-wrap items-center gap-y-2 text-sm">
              {categories.map((cat, i) => (
                <span key={cat} className="flex items-center">
                  {i > 0 ? (
                    <span aria-hidden className="px-2 text-muted-foreground/40">
                      |
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setActive(cat)}
                    className={
                      cat === active
                        ? "rounded-md bg-foreground px-2 py-0.5 font-medium text-background"
                        : "text-muted-foreground transition-colors hover:text-foreground"
                    }
                  >
                    {cat}
                  </button>
                </span>
              ))}
            </nav>
          </header>

          {filtered.length === 0 ? (
            <p className="text-muted-foreground">No posts yet. Check back soon.</p>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((post) => (
                <li key={post.slug}>
                  <Link
                    className="group block py-10 transition-opacity hover:opacity-90"
                    params={{ slug: post.slug }}
                    to="/blog/$slug"
                  >
                    <p className="mb-3 text-muted-foreground text-sm">
                      {dateFormatter.format(new Date(post.frontmatter.date))}
                      {post.frontmatter.author ? ` · ${post.frontmatter.author}` : ""}
                    </p>
                    <h2 className="font-semibold text-2xl leading-tight sm:text-3xl">
                      {post.frontmatter.title}
                    </h2>
                    {post.frontmatter.description ? (
                      <p className="mt-3 max-w-xl text-muted-foreground leading-relaxed">
                        {post.frontmatter.description}
                      </p>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Container>
      </main>
      <MarketingFooter />
    </div>
  );
}

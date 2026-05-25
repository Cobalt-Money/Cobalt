import { Link, createFileRoute } from "@tanstack/react-router";

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

function BlogIndex() {
  const posts = getBlogPosts();

  return (
    <div className="min-h-svh bg-background text-foreground">
      <MarketingNav />
      <main>
        <Container className="max-w-3xl py-24 sm:py-32">
          {posts.length === 0 ? (
            <p className="text-muted-foreground">No posts yet. Check back soon.</p>
          ) : (
            <ul className="divide-y divide-border">
              {posts.map((post) => (
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
                    <h2 className="text-2xl font-semibold leading-tight sm:text-3xl">
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

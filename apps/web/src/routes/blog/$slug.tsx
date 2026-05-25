import { Link, createFileRoute, notFound } from "@tanstack/react-router";

import {
  Container,
  MarketingFooter,
  MarketingNav,
} from "@/components/landing/marketing-shell";
import { getBlogPost } from "@/lib/blog";
import { SITE_URL, buildSeoMeta } from "@/lib/seo";

export const Route = createFileRoute("/blog/$slug")({
  component: BlogPostPage,
  staticData: { title: "Blog" },
  head: ({ params }) => {
    const post = getBlogPost(params.slug);
    if (!post) {
      return {};
    }
    const { frontmatter } = post;
    const seo = buildSeoMeta({
      title: frontmatter.title,
      description: frontmatter.description,
      path: `/blog/${params.slug}`,
      image: frontmatter.coverImage ? `${SITE_URL}${frontmatter.coverImage}` : undefined,
      type: "article",
      publishedTime: frontmatter.date,
      author: frontmatter.author,
    });
    return {
      meta: seo.meta,
      links: seo.links,
      scripts: [
        {
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: frontmatter.title,
            description: frontmatter.description,
            datePublished: frontmatter.date,
            author: frontmatter.author
              ? { "@type": "Person", name: frontmatter.author }
              : undefined,
            mainEntityOfPage: `${SITE_URL}/blog/${params.slug}`,
          }),
          type: "application/ld+json",
        },
      ],
    };
  },
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function BlogArticleStyles() {
  return (
    <style>{`
      .blog-article { font-size: 1.0625rem; line-height: 1.75; color: var(--muted-foreground, currentColor); }
      .blog-article > * + * { margin-top: 1.25em; }
      .blog-article h1 { display: none; }
      .blog-article h2 { font-size: 1.75rem; font-weight: 600; line-height: 1.2; margin-top: 2.5em; color: var(--foreground); }
      .blog-article h3 { font-size: 1.375rem; font-weight: 600; line-height: 1.25; margin-top: 2em; color: var(--foreground); }
      .blog-article a { color: var(--foreground); text-decoration: underline; text-underline-offset: 3px; }
      .blog-article ul { list-style: disc; padding-left: 1.25em; }
      .blog-article ol { list-style: decimal; padding-left: 1.25em; }
      .blog-article li + li { margin-top: 0.5em; }
      .blog-article blockquote { border-left: 2px solid var(--border); padding-left: 1em; color: var(--muted-foreground); }
      .blog-article code { font-family: ui-monospace, SFMono-Regular, monospace; font-size: 0.9em; background: var(--muted); padding: 0.15em 0.35em; border-radius: 3px; }
      .blog-article pre { background: var(--muted); padding: 1em 1.25em; border-radius: 6px; overflow-x: auto; font-size: 0.9em; }
      .blog-article pre code { background: transparent; padding: 0; }
      .blog-article hr { border: 0; border-top: 1px solid var(--border); margin: 2.5em 0; }
      .blog-article img { border-radius: 6px; }
    `}</style>
  );
}

function BlogPostPage() {
  const { slug } = Route.useParams();
  const post = getBlogPost(slug);

  if (!post) {
    throw notFound();
  }

  const { frontmatter, Component } = post;

  return (
    <div className="min-h-svh bg-background text-foreground">
      <BlogArticleStyles />
      <MarketingNav />
      <main>
        <Container className="max-w-2xl py-20 sm:py-28">
          <Link
            className="mb-12 inline-flex items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground"
            to="/blog"
          >
            ← All posts
          </Link>

          <header className="mb-12">
            <p className="mb-5 text-muted-foreground text-sm">
              {dateFormatter.format(new Date(frontmatter.date))}
              {frontmatter.author ? ` · ${frontmatter.author}` : ""}
            </p>
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
              {frontmatter.title}
            </h1>
            {frontmatter.description ? (
              <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
                {frontmatter.description}
              </p>
            ) : null}
          </header>

          <article className="blog-article">
            <Component />
          </article>

          <div className="mt-20 border-t border-border pt-10">
            <Link
              className="text-muted-foreground text-sm transition-colors hover:text-foreground"
              to="/blog"
            >
              ← Back to all posts
            </Link>
          </div>
        </Container>
      </main>
      <MarketingFooter />
    </div>
  );
}

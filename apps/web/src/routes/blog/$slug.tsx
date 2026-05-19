import { Link, createFileRoute, notFound } from "@tanstack/react-router";

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
      image: frontmatter.coverImage
        ? `${SITE_URL}${frontmatter.coverImage}`
        : undefined,
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

function BlogPostPage() {
  const { slug } = Route.useParams();
  const post = getBlogPost(slug);

  if (!post) {
    throw notFound();
  }

  const { frontmatter, Component } = post;

  return (
    <div className="h-svh overflow-y-auto bg-black text-white">
      <div className="container mx-auto max-w-3xl px-6 py-16">
        <Link
          className="mb-8 inline-block text-gray-400 text-sm hover:text-white"
          to="/blog"
        >
          ← All posts
        </Link>

        <header className="mb-10">
          <p className="mb-3 text-gray-500 text-sm">
            {dateFormatter.format(new Date(frontmatter.date))}
            {frontmatter.author ? ` · ${frontmatter.author}` : ""}
          </p>
          <h1 className="mb-4 font-bold font-manrope text-4xl">
            {frontmatter.title}
          </h1>
          {frontmatter.description ? (
            <p className="text-gray-400 text-lg">{frontmatter.description}</p>
          ) : null}
        </header>

        <article className="prose prose-invert max-w-none">
          <Component />
        </article>
      </div>
    </div>
  );
}

import { Link, createFileRoute } from "@tanstack/react-router";

import { getBlogPosts } from "@/lib/blog";
import { buildSeoMeta } from "@/lib/seo";

export const Route = createFileRoute("/blog/")({
  component: BlogIndex,
  head: () => {
    const seo = buildSeoMeta({
      description: "Product updates, design notes, and occasional essays from the Cobalt team.",
      path: "/blog",
      title: "Blog",
    });
    return { links: seo.links, meta: seo.meta };
  },
  staticData: { title: "Blog" },
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function BlogIndex() {
  const posts = getBlogPosts();

  return (
    <div className="h-svh overflow-y-auto bg-black text-white">
      <div className="container mx-auto max-w-3xl px-6 py-16">
        <header className="mb-12">
          <h1 className="mb-3 font-bold font-manrope text-4xl">Blog</h1>
          <p className="text-gray-400 text-lg">
            Product updates, design notes, and occasional essays from the Cobalt team.
          </p>
        </header>

        {posts.length === 0 ? (
          <p className="text-gray-400">No posts yet. Check back soon.</p>
        ) : (
          <ul className="space-y-8">
            {posts.map((post) => (
              <li className="border-foreground/10 border-b pb-8 last:border-b-0" key={post.slug}>
                <Link className="group block" params={{ slug: post.slug }} to="/blog/$slug">
                  <p className="mb-2 text-gray-500 text-sm">
                    {dateFormatter.format(new Date(post.frontmatter.date))}
                  </p>
                  <h2 className="mb-2 font-manrope font-semibold text-2xl group-hover:text-yellow-400">
                    {post.frontmatter.title}
                  </h2>
                  {post.frontmatter.description ? (
                    <p className="text-gray-400">{post.frontmatter.description}</p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

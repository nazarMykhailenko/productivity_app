import TodoView from "@/components/TodoView";
import { DEFAULT_CATEGORIES } from "@/lib/categories";

// The seeded categories exist on every fresh install, so prerender those five
// at build time. Slugs added later fall through to on-demand rendering.
export function generateStaticParams() {
  return DEFAULT_CATEGORIES.map((c) => ({ slug: c.id }));
}

// Categories are user-defined and live in localStorage, so this route can't be
// fully static; TodoView resolves the slug against the store on the client.
export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <TodoView category={decodeURIComponent(slug)} />;
}

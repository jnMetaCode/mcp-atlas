import catalog from "../../../lib/data";
import { notFound } from "next/navigation";
import { PageIntro } from "../../../components/ui";
import CatalogBrowser from "../../../components/catalog-browser";
export function generateStaticParams() {
  return catalog.categories.map((c) => ({ slug: c.id }));
}
export default async function Category({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const c = catalog.categories.find((c) => c.id === slug);
  if (!c) notFound();
  return (
    <div className="page-container">
      <a className="breadcrumb" href="/categories/">
        场景分类 / {c.name}
      </a>
      <PageIntro
        eyebrow="EXPLORE BY PURPOSE"
        title={c.name}
        description={c.description}
      />
      <CatalogBrowser initialCategory={c.id} />
    </div>
  );
}

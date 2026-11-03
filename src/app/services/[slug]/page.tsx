import AppLink from "../../../components/app-link";
import catalog from "../../../lib/data";
import { notFound } from "next/navigation";
import { PageIntro } from "../../../components/ui";
import CatalogBrowser from "../../../components/catalog-browser";
export function generateStaticParams() {
  return catalog.services.map((c) => ({ slug: c.id }));
}
export default async function Service({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const s = catalog.services.find((s) => s.id === slug);
  if (!s) notFound();
  return (
    <div className="page-container">
      <AppLink href="/services/" className="breadcrumb">
        服务索引 / {s.name}
      </AppLink>
      <PageIntro
        eyebrow="EXPLORE IMPLEMENTATIONS"
        title={s.name + " 的 MCP 实现"}
        description={s.description}
      />
      <CatalogBrowser initialService={s.id} />
    </div>
  );
}

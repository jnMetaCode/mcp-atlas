import AppLink from "../../../components/app-link";
import { notFound } from "next/navigation";
import guides from "../../../../data/guides.json";
import catalog from "../../../lib/data";
import { PageIntro } from "../../../components/ui";
import GuideContent from "../../../components/guide-content";
export function generateStaticParams() {
  return guides
    .filter((guide) =>
      catalog.servers.some((server) => server.id === guide.serverId),
    )
    .map((guide) => ({ slug: guide.id }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return { title: guides.find((guide) => guide.id === slug)?.title };
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = guides.find((guide) => guide.id === slug);
  if (!guide || !catalog.servers.some((server) => server.id === guide.serverId))
    notFound();
  const server = catalog.servers.find(
    (server) => server.id === guide.serverId,
  )!;
  return (
    <div className="page-container narrow">
      <AppLink className="breadcrumb" href="/guides/">
        上手指南 / {guide.title}
      </AppLink>
      <PageIntro
        eyebrow="CONFIGURE WITH CONTEXT"
        title={guide.title}
        description="按具体接入方式提供示例，区分文档核对与实际连接测试。"
      />
      <section className="content-panel">
        <GuideContent guide={guide} />
      </section>
      <AppLink className="text-link" href={"/servers/" + server.slug + "/"}>
        ← 查看 {server.name} 项目详情
      </AppLink>
    </div>
  );
}

import AppLink from "../../../components/app-link";
import catalog from "../../../lib/data";
import guides from "../../../../data/guides.json";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { IconMark, SourceLink, Card } from "../../../components/ui";
import { labels } from "../../../lib/catalog.mjs";
import ReviewStatus from "../../../components/review-status";
import GuideContent from "../../../components/guide-content";

export function generateStaticParams() {
  return catalog.servers.map((server) => ({ slug: server.slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const server = catalog.servers.find((server) => server.slug === slug);
  return {
    title: server?.name,
    description: server?.summaryZh,
    alternates: { canonical: "/servers/" + slug + "/" },
  };
}
export default async function Detail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const server = catalog.servers.find((server) => server.slug === slug);
  if (!server) notFound();
  const related = catalog.servers.filter(
    (other) =>
      other.id !== server.id &&
      other.serviceIds.some((id) => server.serviceIds.includes(id)),
  );
  const availableGuides = guides.filter((guide) =>
    server.guideIds.includes(guide.id),
  );
  const authentication = [
    ...new Set(
      server.distributions.flatMap(
        (distribution) => distribution.authentication,
      ),
    ),
  ]
    .map(
      (value) =>
        labels.authentication[value as keyof typeof labels.authentication],
    )
    .join(" / ");
  return (
    <div className="page-container">
      <AppLink className="breadcrumb" href="/servers/">
        发现 MCP / {server.name}
      </AppLink>
      <div className="detail-header">
        <IconMark server={server} />
        <div>
          <span
            className={
              "badge " + (server.identity === "first_party" ? "official" : "")
            }
          >
            {labels.identity[server.identity as keyof typeof labels.identity]}
          </span>
          {server.isAuthor && <span className="badge">本站作者开发</span>}
          <h1>{server.name}</h1>
          <p>
            {server.publisher} ·{" "}
            {
              catalog.categories.find(
                (category) => category.id === server.category,
              )?.name
            }
          </p>
        </div>
        <SourceLink href={server.source}>查看上游项目</SourceLink>
      </div>
      {server.status === "archived" && (
        <div className="notice">此项目已归档，接入前请确认上游维护状态。</div>
      )}
      <p className="detail-summary">{server.summaryZh}</p>
      <div className="detail-layout">
        <div>
          <section className="content-panel">
            <span className="eyebrow">WHY THIS PROJECT</span>
            <h2>它适合什么任务？</h2>
            <p>{server.reason}</p>
            <div className="tags">
              {server.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </section>
          <section className="content-panel">
            <span className="eyebrow">CONNECTION OPTIONS</span>
            <h2>选择接入方式</h2>
            <p>
              运行环境、认证和传输分别记录；同一项目不同接入方式可能有不同条件。
            </p>
            {server.distributions.map((distribution) => (
              <article className="distribution" key={distribution.id}>
                <h3>{distribution.label}</h3>
                <dl>
                  <div>
                    <dt>运行方式</dt>
                    <dd>
                      {
                        labels.deployment[
                          distribution.deployment as keyof typeof labels.deployment
                        ]
                      }
                    </dd>
                  </div>
                  <div>
                    <dt>认证方式</dt>
                    <dd>
                      {distribution.authentication
                        .map(
                          (value) =>
                            labels.authentication[
                              value as keyof typeof labels.authentication
                            ],
                        )
                        .join(" / ")}
                    </dd>
                  </div>
                  <div>
                    <dt>传输</dt>
                    <dd>
                      {distribution.transport
                        .map((value) =>
                          value === "unknown" ? "未确认" : value,
                        )
                        .join(" / ")}
                    </dd>
                  </div>
                  {distribution.package && (
                    <div>
                      <dt>软件包</dt>
                      <dd>
                        <code>{distribution.package}</code>
                      </dd>
                    </div>
                  )}
                  {distribution.endpoint && (
                    <div>
                      <dt>服务端点</dt>
                      <dd>
                        <code>{distribution.endpoint}</code>
                      </dd>
                    </div>
                  )}
                </dl>
              </article>
            ))}
          </section>
          <section className="content-panel">
            <span className="eyebrow">GET STARTED</span>
            <h2>中文配置指南</h2>
            {availableGuides.length ? (
              <>
                <p>
                  以下示例已核对上游文档并通过配置语法检查，尚未进行实际连接测试。
                </p>
                <div className="guide-links">
                  {availableGuides.map((guide) => (
                    <AppLink
                      className="guide-link"
                      href={"/guides/" + guide.id + "/"}
                      key={guide.id}
                    >
                      <span>
                        {guide.title}
                        <small>{guide.clientVersionRange}</small>
                      </span>
                      <ArrowUpRight size={17} />
                    </AppLink>
                  ))}
                </div>
                {availableGuides.map((guide) => (
                  <div key={guide.id} className="embedded-guide">
                    <h3>{guide.title}</h3>
                    <GuideContent guide={guide} />
                  </div>
                ))}
              </>
            ) : (
              <p>
                当前尚未整理此项目的客户端配置示例，请按上游文档选择与你的客户端版本对应的配置。
              </p>
            )}
            <SourceLink href={server.source}>
              上游原始文档（补充参考）
            </SourceLink>
            <div className="notice">
              连接未实测 · 文档审核不代表客户端兼容、任务执行通过或安全认证。
            </div>
          </section>
          <section className="content-panel">
            <span className="eyebrow">SOURCES & REVIEW</span>
            <h2>信息从哪里来？</h2>
            <p>
              每个来源标明核对日期与对应信息。费用、版本或身份有变化时可提交修正。
            </p>
            {server.sourceRefs.map((source) => (
              <div className="source-record" key={source.id}>
                <SourceLink href={source.url}>
                  {source.kind === "publisher"
                    ? "发布者身份依据"
                    : "项目与文档来源"}
                </SourceLink>
                <small>
                  {source.reviewedAt} ·{" "}
                  {source.fields
                    .map(
                      (field) =>
                        ({
                          summaryZh: "介绍",
                          identity: "身份",
                          distributions: "接入方式",
                          sourceCode: "源码",
                          pricing: "费用",
                        })[field] || field,
                    )
                    .join("、")}
                </small>
              </div>
            ))}
            <p className="muted-note">
              最近审核：{server.reviewedAt} ·{" "}
              <ReviewStatus date={server.reviewedAt} />
              <br />
              最近连接测试：尚未进行
            </p>
            <AppLink
              href={"/submit/?project=" + server.id + "&type=correction"}
              className="text-link"
            >
              报告错误或补充指南
              <ArrowUpRight size={15} />
            </AppLink>
          </section>
        </div>
        <aside className="detail-aside">
          <h3>接入概览</h3>
          {[
            [
              "运行方式",
              labels.deployment[
                server.deployment as keyof typeof labels.deployment
              ],
            ],
            ["认证", authentication],
            [
              "源码",
              labels.sourceCode[
                server.sourceCode as keyof typeof labels.sourceCode
              ],
            ],
            ["许可证", server.license],
            [
              "底层服务费用",
              labels.pricing[server.pricing as keyof typeof labels.pricing],
            ],
            [
              "配置指南",
              availableGuides.length
                ? `${availableGuides.length} 篇 · 文档核对`
                : "待补充",
            ],
            ["连接测试", "未实测"],
          ].map(([key, value]) => (
            <div className="fact-row" key={key}>
              <span>{key}</span>
              <strong>{value}</strong>
            </div>
          ))}
          <p>源码开放不代表底层 API 或服务免费。费用请以提供方说明为准。</p>
          <AppLink
            className="button full"
            href={
              "/compare/?ids=" +
              [server.id, ...related.map((other) => other.id)]
                .slice(0, 3)
                .join(",")
            }
          >
            查看对比
            <ArrowUpRight size={15} />
          </AppLink>
        </aside>
      </div>
      {related.length > 0 && (
        <section className="section">
          <div className="section-heading">
            <h2>相关能力的其他实现</h2>
          </div>
          <div className="project-grid">
            {related.map((other) => (
              <Card key={other.id} server={other} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

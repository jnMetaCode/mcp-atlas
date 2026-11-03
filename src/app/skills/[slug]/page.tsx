import AppLink from "../../../components/app-link";
import skills from "../../../../data/skills.json";
import catalog from "../../../lib/data";
import { notFound } from "next/navigation";
import { PageIntro, SourceLink, Card } from "../../../components/ui";
import InstallCommand from "../../../components/install-command";
export function generateStaticParams() {
  return skills.map((s) => ({ slug: s.id }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return {
    title: skills.find((s) => s.id === slug)?.name,
    alternates: { canonical: "/skills/" + slug + "/" },
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const s = skills.find((s) => s.id === slug);
  if (!s) notFound();
  return (
    <div className="page-container narrow">
      <AppLink href="/skills/" className="text-link">
        ← Skills 技能目录
      </AppLink>
      <PageIntro eyebrow="SKILL GUIDE" title={s.name} description={s.summary} />
      <section className="content-panel">
        <p>
          {s.publisher} · {s.client} · 文档核对 {s.reviewedAt} · 未安装实测
        </p>
        <h2>准备条件</h2>
        <ul>
          {s.prerequisites.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <h2>
          {s.client === "Claude Code"
            ? "在 Claude Code 中安装"
            : "安装与客户端选择"}
        </h2>
        <p>
          命令运行位置：{s.installContext}。{s.installScope}
        </p>
        {s.publisher === "Anthropic" && (
          <p>
            不是仅安装本页面这一项。文档技能属于 document-skills，其他示例属于
            example-skills。
          </p>
        )}
        <ol>
          <li>阅读下方来源中的 SKILL.md、依赖脚本和许可。</li>
          <li>
            在标注的位置输入下面命令；检查安装器列出的集合、技能和目标客户端后再确认。
          </li>
          <li>
            回到客户端确认启用；用测试项目和下方示例请求验证，缺少依赖时按该技能说明补齐。
          </li>
        </ol>
        <InstallCommand command={s.installCommand} context={s.installContext} />
        <h2>如何使用和验证</h2>
        <p>示例请求：{s.example}</p>
        <p>
          先在测试项目中尝试，确认客户端加载了对应技能、能访问必要环境，并核对输出。本站没有实际安装或执行此
          Skill，不能保证结果。
        </p>
        <h2>所需能力与操作范围</h2>
        <ul>
          {s.permissions.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <h2>无法启用时</h2>
        <p>
          检查对应客户端的登录状态、插件可用性、组织策略和集合是否启用。工具依赖缺失需按该
          Skill 的说明补齐；其他客户端不能直接照抄此插件命令。
        </p>
        <h2>停止使用</h2>
        <p>{s.removal}</p>
        <p>许可：{s.license}</p>
        <SourceLink href={s.source}>查看该 Skill 的源文件</SourceLink>
        <SourceLink href={s.installSource}>核对上游安装说明</SourceLink>
        {"documentationUrl" in s &&
          typeof s.documentationUrl === "string" &&
          s.documentationUrl !== s.installSource && (
            <SourceLink href={s.documentationUrl}>
              官方文档（补充参考）
            </SourceLink>
          )}
      </section>
      {s.relatedServers.length > 0 && (
        <section>
          <h2>相关 MCP 工具</h2>
          <p>以下是任务相关工具，不是本 Skill 的必需依赖。</p>
          <div className="project-grid">
            {catalog.servers
              .filter((server) => s.relatedServers.includes(server.id))
              .map((server) => (
                <Card key={server.id} server={server} />
              ))}
          </div>
        </section>
      )}
    </div>
  );
}

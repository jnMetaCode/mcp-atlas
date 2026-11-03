import AppLink from "./app-link";
import { ArrowUpRight, Compass, ArrowRight } from "lucide-react";
import catalog from "../lib/data";
import { labels } from "../lib/catalog.mjs";
export type Server = (typeof catalog.servers)[number];
export function Header() {
  return (
    <header className="site-header">
      <AppLink className="brand" href="/">
        <span className="brand-icon">
          <Compass size={24} />
        </span>
        <span>
          MCP<span className="brand-light">Atlas</span>
          <i>探索工具的更多可能</i>
        </span>
      </AppLink>
      <nav aria-label="主导航">
        <AppLink href="/servers/">发现 MCP</AppLink>
        <AppLink href="/categories/">场景分类</AppLink>
        <AppLink href="/services/">服务索引</AppLink>
        <AppLink href="/guides/">上手指南</AppLink>
        <AppLink href="/skills/">Skills 技能</AppLink>
        <AppLink href="/showcase/">作者作品</AppLink>
      </nav>
      <AppLink className="button small header-cta" href="/submit/">
        提交项目 <ArrowUpRight size={15} />
      </AppLink>
    </header>
  );
}
export function Footer() {
  return (
    <footer>
      <div className="footer-top">
        <AppLink href="/" className="brand">
          <Compass size={23} /> MCP Atlas
        </AppLink>
        <p>连接好工具，让想法多走一步。</p>
        <div>
          <AppLink href="/about/">关于项目</AppLink>
          <AppLink href="/submit/">参与共建</AppLink>
          <AppLink href="/data/v1/catalog.json">目录数据 ↗</AppLink>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 MCP Atlas · 开源目录预览版</span>
        <span>独立社区项目 · 与 MCP 服务提供方无隶属关系</span>
      </div>
    </footer>
  );
}
export function IconMark({ server: s }: { server: Server }) {
  return (
    <span
      className="project-icon"
      style={{ background: s.color + "12", color: s.color }}
    >
      {s.mark}
    </span>
  );
}
export function Card({ server: s }: { server: Server }) {
  return (
    <article className="project-card">
      <div className="card-top">
        <IconMark server={s} />
        <span
          className={
            "badge " + (s.identity === "first_party" ? "official" : "")
          }
        >
          {labels.identity[s.identity as keyof typeof labels.identity]}
        </span>
      </div>
      <AppLink href={"/servers/" + s.slug + "/"} className="card-title">
        {s.name}
        <ArrowUpRight size={16} />
      </AppLink>
      <p className="publisher">{s.publisher}</p>
      <p className="card-summary">{s.summaryZh}</p>
      <div className="tags">
        {s.isAuthor && <span>本站作者开发</span>}
        {s.tags.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
      <div className="card-bottom">
        <span>
          <i className={"dot " + (s.deployment === "unknown" ? "muted" : "")} />
          {labels.deployment[s.deployment as keyof typeof labels.deployment]}
        </span>
        <AppLink
          href={"/servers/" + s.slug + "/"}
          aria-label={"查看 " + s.name}
        >
          <ArrowRight size={17} />
        </AppLink>
      </div>
    </article>
  );
}
export function PageIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="page-intro">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}
export function SourceLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <AppLink
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="source-link"
    >
      {children}
      <ArrowUpRight size={15} />
    </AppLink>
  );
}

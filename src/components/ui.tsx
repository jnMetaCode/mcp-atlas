import { ArrowUpRight, Compass, ArrowRight } from "lucide-react";
import catalog from "../lib/data";
import { labels } from "../lib/catalog.mjs";
export type Server = (typeof catalog.servers)[number];
export function Header() {
  return (
    <header className="site-header">
      <a className="brand" href="/">
        <span className="brand-icon">
          <Compass size={24} />
        </span>
        <span>
          MCP<span className="brand-light">Atlas</span>
          <i>探索工具的更多可能</i>
        </span>
      </a>
      <nav aria-label="主导航">
        <a href="/servers/">发现 MCP</a>
        <a href="/categories/">场景分类</a>
        <a href="/services/">服务索引</a>
        <a href="/guides/">上手指南</a>
        <a href="/skills/">Skills 技能</a>
        <a href="/showcase/">作者作品</a>
      </nav>
      <a className="button small header-cta" href="/submit/">
        提交项目 <ArrowUpRight size={15} />
      </a>
    </header>
  );
}
export function Footer() {
  return (
    <footer>
      <div className="footer-top">
        <a href="/" className="brand">
          <Compass size={23} /> MCP Atlas
        </a>
        <p>连接好工具，让想法多走一步。</p>
        <div>
          <a href="/about/">关于项目</a>
          <a href="/submit/">参与共建</a>
          <a href="/data/v1/catalog.json">目录数据 ↗</a>
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
      <a href={"/servers/" + s.slug + "/"} className="card-title">
        {s.name}
        <ArrowUpRight size={16} />
      </a>
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
        <a href={"/servers/" + s.slug + "/"} aria-label={"查看 " + s.name}>
          <ArrowRight size={17} />
        </a>
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
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="source-link"
    >
      {children}
      <ArrowUpRight size={15} />
    </a>
  );
}

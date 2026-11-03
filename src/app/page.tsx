import { withBasePath } from "../lib/base-path.mjs";
import AppLink from "../components/app-link";
import {
  ArrowRight,
  ArrowUpRight,
  Search,
  Sparkles,
  Code2,
  BookOpen,
  Database,
  Globe,
  PanelsTopLeft,
  Palette,
  Cloud,
  Compass,
  Check,
  GitBranch,
} from "lucide-react";
import catalog from "../lib/data";
import { Card } from "../components/ui";
const icons = [
  Code2,
  Search,
  BookOpen,
  PanelsTopLeft,
  Database,
  Globe,
  Palette,
  Cloud,
];
export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="hero-grid" />
        <div className="hero-main">
          <AppLink className="hero-pill" href="/about/">
            <span /> 一个开放、持续生长的 MCP 工具地图{" "}
            <ArrowUpRight size={14} />
          </AppLink>
          <h1>
            好工具，
            <br />让 AI <span>多一种可能。</span>
            <svg viewBox="0 0 300 15" aria-hidden="true">
              <path d="M3 11 Q140 -3 296 6" />
            </svg>
          </h1>
          <p className="hero-description">
            搜索官方与社区 MCP，比较接入条件。
            <br />
            跟着中文配置指南，找到下一步怎么用。
          </p>
          <form action={withBasePath("/servers/")} className="hero-search">
            <Search size={22} />
            <input
              name="q"
              aria-label="搜索 MCP"
              placeholder="搜索工具、服务，或你想完成的任务…"
            />
            <button type="submit">
              探索 MCP <ArrowRight size={17} />
            </button>
          </form>
          <div className="hot-search">
            <span>试试搜索</span>
            {["GitHub", "浏览器", "文档", "数据库"].map((t) => (
              <AppLink key={t} href={"/servers/?q=" + encodeURIComponent(t)}>
                {t}
                <ArrowUpRight size={12} />
              </AppLink>
            ))}
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="orbit orbit-three" />
          <div className="center-node">
            <Compass size={49} />
            <span>MCP</span>
          </div>
          <div className="floating-node node-one">
            <Code2 />
            <span>开发</span>
          </div>
          <div className="floating-node node-two">
            <Database />
            <span>数据</span>
          </div>
          <div className="floating-node node-three">
            <Globe />
            <span>浏览器</span>
          </div>
          <div className="floating-node node-four">
            <BookOpen />
            <span>知识</span>
          </div>
          <div className="orbit-point point-one" />
          <div className="orbit-point point-two" />
          <span className="visual-label">
            ONE PROTOCOL. MORE POSSIBILITIES.
          </span>
        </div>
      </section>
      <div className="trust-strip">
        <span>
          <GitBranch size={17} /> 跨平台收录
        </span>
        <span>
          <Check size={17} /> 来源可追溯
        </span>
        <span>
          <BookOpen size={17} /> 中文说明
        </span>
        <span className="strip-note">
          精选起步，持续完善 <i /> PREVIEW 01
        </span>
      </div>
      <section className="section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">FIND YOUR WORKFLOW</span>
            <h2>从你想做的事开始</h2>
            <p>不用先记住工具名，找到你的使用场景。</p>
          </div>
          <AppLink className="text-link" href="/categories/">
            所有分类 <ArrowRight size={16} />
          </AppLink>
        </div>
        <div className="category-grid">
          {catalog.categories.map((c, i) => {
            const Icon = icons[i];
            return (
              <AppLink
                className="category-card"
                href={"/categories/" + c.id + "/"}
                key={c.id}
              >
                <span className="category-icon">
                  <Icon size={22} />
                </span>
                <div>
                  <h3>{c.name}</h3>
                  <span>
                    {catalog.servers.filter((s) => s.category === c.id).length}{" "}
                    个项目
                  </span>
                </div>
                <ArrowUpRight size={16} />
              </AppLink>
            );
          })}
        </div>
      </section>
      <section className="section featured-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">EDITOR’S PICKS</span>
            <h2>
              值得认识的 MCP <Sparkles size={22} />
            </h2>
            <p>先了解它能做什么，再决定是否适合你的工作流。</p>
          </div>
          <AppLink className="text-link" href="/servers/">
            浏览全部 {catalog.servers.length} 个项目 <ArrowRight size={16} />
          </AppLink>
        </div>
        <div className="project-grid">
          {catalog.servers
            .filter((s) => s.featured)
            .map((s) => (
              <Card key={s.id} server={s} />
            ))}
        </div>
      </section>
      <section className="section">
        <div className="editorial-banner">
          <div className="banner-art">
            <Compass size={68} />
            <span>BUILD IN THE OPEN</span>
          </div>
          <div>
            <span className="eyebrow">一起补全这张地图</span>
            <h2>
              你用过的好工具，
              <br />
              也可能是别人的下一步。
            </h2>
            <p>分享一个项目，修正一条信息，或者贡献一份上手经验。</p>
            <AppLink href="/submit/" className="button">
              参与目录共建 <ArrowUpRight size={16} />
            </AppLink>
          </div>
          <span className="banner-number">↗</span>
        </div>
      </section>
      <section className="section bottom-note">
        <div>
          <span className="eyebrow">A SMALL, HONEST START</span>
          <h2>认真收录，也如实说明。</h2>
        </div>
        <p>
          当前为精选目录预览版。项目均附上游来源；费用和兼容性未确认时会明确标记。本站收录不代表已完成连接测试。
        </p>
        <AppLink href="/about/" className="text-link">
          了解收录方式 <ArrowRight size={16} />
        </AppLink>
      </section>
    </>
  );
}

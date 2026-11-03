import { PageIntro, SourceLink } from "../../components/ui";
import catalog from "../../lib/data";
export const metadata = { title: "关于项目" };
export default function Page() {
  return (
    <div className="page-container narrow">
      <PageIntro
        eyebrow="A MAP, MADE TOGETHER"
        title="让好工具更容易被找到"
        description="MCP Atlas 是一个独立的中文 MCP 导航项目，面向不同公司、社区和个人开发者。"
      />
      <section className="content-panel">
        <h2>从发现到判断</h2>
        <p>
          我们按使用场景整理项目，标明维护者、接入条件与公开来源。希望你找到工具后，能继续判断它是否适合自己的任务。
        </p>
        <h2>透明比数量更重要</h2>
        <p>
          当前收录 {catalog.servers.length}
          个项目，是功能预览而非完整目录。费用未确认、连接未实测时会明确标注。官方身份依据来自上游发布记录，参考实现单独标记。
        </p>
        <h2>如何理解“已审核”</h2>
        <p>
          信息审核只表示查阅公开资料，不代表实际安装、连接测试、安全审计或服务质量背书。审核日期与连接测试日期分开记录。
        </p>
        <h2>作者与推荐</h2>
        <p>
          作者作品使用独立入口，进入公共目录时将明确标注。作者身份与赞助不影响自然搜索排序。
        </p>
        <h2>开放协作</h2>
        <p>
          代码采用 MIT，原创指南采用 CC BY 4.0，整理的事实数据采用
          CC0。公开贡献仓库尚未配置；收录保留上游来源与第三方权利。
        </p>
        <SourceLink href="https://registry.modelcontextprotocol.io/">
          了解公共 MCP Registry
        </SourceLink>
      </section>
    </div>
  );
}

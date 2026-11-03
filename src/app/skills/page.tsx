import AppLink from "../../components/app-link";
import SkillBrowser from "../../components/skill-browser";
import skills from "../../../data/skills.json";
import { PageIntro } from "../../components/ui";
export const metadata = {
  title: "Skills 技能目录",
  description: "按任务了解 Agent Skills 的用途、适用客户端与中文安装步骤。",
};
export default function Page() {
  return (
    <div className="page-container">
      <PageIntro
        eyebrow="AGENT SKILLS"
        title="把方法，变成可复用的技能"
        description="Skills 提供任务方法和工作流程；MCP 提供工具与数据连接。两者分别收录，按实际任务搭配。"
      />
      <p className="muted-note">
        精选起步 · 当前 {skills.length} 项 · 已阅读来源，未安装实测 ·
        不承诺通用客户端兼容。
      </p>
      <SkillBrowser />
      <section className="content-panel">
        <h2>更多发现来源</h2>
        <p>
          以下网站用于继续发现候选；目录索引和上游技能是不同内容，本页没有复制第三方榜单或评分。
        </p>
        <p>
          <AppLink
            href="https://skills.sh/"
            target="_blank"
            rel="noopener noreferrer"
          >
            skills.sh 技能目录 ↗
          </AppLink>{" "}
          ·{" "}
          <AppLink
            href="https://github.com/topics/agent-skills"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub Agent Skills 主题 ↗
          </AppLink>
        </p>
        <p>
          欢迎通过提交项目入口推荐 GitHub
          仓库或其他公开网址。重复来源按仓库和目录路径核对；只有人工核对后才会进入正式目录。
        </p>
        <AppLink className="text-link" href="/submit/?type=skill">
          推荐一个技能来源 →
        </AppLink>
      </section>
    </div>
  );
}

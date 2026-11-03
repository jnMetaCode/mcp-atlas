import { PageIntro } from "../../components/ui";
import Submission from "../../components/submission";
import site from "../../../data/site.json";
import { repositoryUrl } from "../../lib/contribution.mjs";
export const metadata = { title: "参与共建" };
export default function Page() {
  return (
    <div className="page-container narrow">
      <PageIntro
        eyebrow="BUILD IN THE OPEN"
        title="一起补全这张工具地图"
        description="欢迎推荐项目、修正信息，或者贡献一份使用经验。"
      />
      <div className="notice">
        {repositoryUrl(site.repository)
          ? "填好信息后，可前往 GitHub 检查并提交；也可复制或下载申请。"
          : "公开 GitHub 仓库尚未配置。目前可复制或下载申请；生成文本不代表已经提交。"}
      </div>
      <Submission />
      <section className="content-panel">
        <h2>我们会核对哪些信息？</h2>
        <p>
          MCP 接入文档或 Skill
          原始目录、适用客户端、安装说明、维护者、实际场景，以及身份、许可与费用的依据。社区实现同样欢迎，收录不以公司规模或
          Star 数为门槛。
        </p>
        <p>
          未确认的信息可以留空。若提交的是你维护的项目，请说明关联关系，方便读者判断。
        </p>
      </section>
    </div>
  );
}

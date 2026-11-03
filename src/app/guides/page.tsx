import { PageIntro, SourceLink } from "../../components/ui";
import GuideBrowser from "../../components/guide-browser";
import guides from "../../../data/guides.json";
export const metadata = { title: "上手指南" };
export default function Page() {
  return (
    <div className="page-container narrow">
      <PageIntro
        eyebrow="A GOOD PLACE TO START"
        title="连接之前，先弄清这几件事"
        description="给第一次接触 MCP 的你，一份简短的接入路线。"
      />
      <section className="content-panel">
        <h2>按项目查看配置示例</h2>
        <p>
          覆盖当前收录的 {new Set(guides.map((guide) => guide.serverId)).size}
          个项目，包含配置文件示例和界面连接步骤。已核对上游文档；连接与任务未实测。请按每篇标注的客户端使用，不同客户端格式不能混用。
        </p>
        <GuideBrowser />
      </section>
      <section className="content-panel">
        <h2>01 · 从实际任务出发</h2>
        <p>
          先明确你需要读取什么数据、完成什么操作，再按场景寻找工具。一个支持 MCP
          的客户端，仍需正确配置具体服务才能使用。
        </p>
        <h2>02 · 分清维护者与服务商</h2>
        <p>
          连接同一服务的项目可能由服务商、社区或个人维护。查看身份依据，避免把社区连接器理解为服务商官方实现。
        </p>
        <h2>03 · 确认运行和认证条件</h2>
        <p>
          本地运行需要对应环境；远程连接也可能需要账号和授权。开源代码与底层服务费用是两回事，未确认费用时应回到提供方说明。
        </p>
        <h2>04 · 按客户端文档配置</h2>
        <p>
          不同客户端的配置格式可能不同，使用与你的客户端版本对应的说明。本站示例明确标注核对范围；项目详情同时提供上游文档。
        </p>
        <h2>05 · 用一个小任务验证</h2>
        <p>
          完成配置后，先选择范围清楚的小任务，确认连接与结果符合预期。连接成功和具体任务执行成功是两项不同验证。
        </p>
        <SourceLink href="https://modelcontextprotocol.io/docs/getting-started/intro">
          MCP 官方介绍
        </SourceLink>
      </section>
    </div>
  );
}

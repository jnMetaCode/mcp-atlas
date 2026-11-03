# MCP Atlas

跨公司、跨开发者的中文 MCP 导航。当前功能预览包含 32 个真实项目、8 个场景分类、32 篇文档核对配置指南。

**[在线体验 Beta](https://mcp-atlas-yx.vasthen67.chatgpt.site) · [Skills 技能目录](https://mcp-atlas-yx.vasthen67.chatgpt.site/skills/) · [反馈问题](https://github.com/jnMetaCode/mcp-atlas/issues/new/choose)**

另有 26 项 Agent Skills，按任务与维护者检索，提供来源及中文安装说明。MCP 与 Skills 分开收录，便于判断连接条件与使用方法。

## 邀请你试用

可以从以下任务开始：搜索一个项目、比较两种实现、阅读并复制适用客户端的配置，或查找一个 Skills。欢迎反馈搜索不到的内容、步骤不清楚之处和手机操作问题；描述页面地址、客户端版本、预期与实际结果即可。不要提交 Token、私人数据或完整敏感日志。

当前为精选测试版，不承诺全网覆盖。指南经过文档核对，MCP 连接和 Skills 安装尚未实测；未确认的费用明确保留未知。

## 开发

需要 Node.js 22 或以上。

```sh
npm install
npm run dev
```

```sh
npm run validate
npm test
npm run build
npm run test:e2e
```

构建输出在 `out/`，可部署到支持目录索引的静态托管平台。

## 已实现

首页、目录检索、源码/费用等多维筛选、筛选计数、24 项分页、URL 及浏览器历史恢复、分类、服务索引、项目详情、最多三个项目对比、会话内保存选择、配置指南与复制、作者作品空状态、收录/纠错预填、申请复制与下载、静态 JSON 快照、站点地图及数据校验。

Figma、Slack、Atlassian 均已关联官方和社区实现，可从服务索引选择对比。不同实现不因服务相同而合并。

## 当前限制

- 所有项目均未做第三方连接实测；32 篇配置指南只经过文档核对与 JSON 检查。
- 上游支持范围可能更广；未确认的部署、认证、费用与许可证明确显示未知。
- 没有真实作者作品素材，没有展示虚构作品。
- 公开仓库为 https://github.com/jnMetaCode/mcp-atlas；申请可在 GitHub 确认提交，网站不自动发送。
- Registry 候选导入、差异报告、来源链接检查及可选草稿 PR 流程已提供，尚未完成真实外网与远程工作流验证。
- 浏览器测试需有运行浏览器及绑定本地端口的权限；受限环境可能无法启动。提供测试不代表已执行通过。
- 测试版已部署至 https://mcp-atlas-yx.vasthen67.chatgpt.site ，现已公开开放 Beta 测试，无需本机启动。

## 内容维护

编辑 `data/catalog.json` 和 `data/guides.json`。每项保留来源、身份依据与审核日期。`npm run validate` 使用 JSON Schema、引用与事实断言校验，全部通过后生成 `public/data/v1`。新增未经实测的条目使用 `testStatus: untested`。

当前目录 Schema 为 v2，快照路径仍是 `/data/v1/`。下载内容通过 `schemaVersion` 和 `snapshot` 声明结构与批次；预览期间没有承诺旧字段长期兼容。

分类和服务关联分别表达。浏览器是能力聚合，不是公司服务。官方身份必须有证据；开源、免费、实测三者分别判断。

## 开源与贡献

代码使用 MIT，原创指南使用 CC BY 4.0，整理的事实数据使用 CC0；第三方内容保留原权利。见 [LICENSE](LICENSE)、[内容许可](LICENSE-CONTENT.md) 和 [贡献指南](CONTRIBUTING.md)。

公开 GitHub 仓库准备好后，在 `data/site.json` 填入 `repository`，提交页会启用 GitHub 草稿入口。该入口由访问者确认提交，本站不自动代发。没有配置时提供复制与下载。

完整设计见 [开发需求与设计文档](docs/开发需求与设计文档.md)。
当前证据与待完成项见 [首版验收对照](docs/首版验收对照.md)。

部署地址、静态打包与发布检查见 [静态部署指南](docs/静态部署指南.md)。组件交互检查运行 `npm run test:dom`，它不依赖本地监听端口，也不替代浏览器测试。

## 维护工具

Skills 扫描状态分为 `needs_review`（新候选）、`needs_recheck`（缺少已审核内容基线）、`already_listed`（内容标识一致）和 `upstream_changed`（上游内容变化）。内容基线只在下载正文与已审核 SHA-256 一致时记录，不因扫描观察到新版本而自动推进。上游缺失不会直接删除正式条目。

Skills 独立目录包含 26 项、3 个维护者，提供分类、搜索和各来源的安装说明。公开可读不代表开源或已实测；许可按技能目录单独判断。结构化下载位于 `/data/v1/skills.json`。

`npm run skills:discover` 根据 `data/skill-sources.json` 只读扫描指定 GitHub 仓库的 `skills/*/SKILL.md`，按仓库和路径标识已收录项与待审核项。完整扫描成功后才将报告写入 `.maintenance/skills/`，不会修改正式目录或运行上游代码。其他网站目前通过人工来源入口发现，不是全网抓取；第三方榜单和评分不复制。首次联网运行遇到 GitHub HTTP 403，未生成成功报告，需要后续在 API 可用时验证。

```sh
npm run registry:sync
npm run check:links
```

以上命令需要能访问公网的运行环境，仅产生待审核材料，不直接改动目录。无网络时可运行固定样例演示，详见 [目录维护指南](docs/目录维护指南.md)。

周期工作流默认只生成报告；只有真实仓库配置 `MCP_ENABLE_MAINTENANCE_PR=true` 后才创建草稿 PR，且只提交维护快照和提案。

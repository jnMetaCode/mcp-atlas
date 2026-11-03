# 参与 MCP Atlas

目录可选字段 `upstreamUpdatedAt` 表示项目在上游的更新日期（YYYY-MM-DD），不是本站审核或抓取时间。填写时必须在 `sourceRefs` 中提供包含 `upstreamUpdatedAt` 的字段来源，并确保来源核对日期不早于更新事件。无证据时省略，不填写推测日期。上游排序将未知日期置后；相关度排序同分时优先有指南的项目，作者身份不参与加权。

欢迎推荐新项目、修正事实、贡献中文指南和代码。社区实现与官方实现遵守相同的信息质量标准。

## 内容变更

1. 在 `data/catalog.json` 中新增或修改项目，使用稳定 ID。仓库相同不一定是同一个 MCP。
2. 每个接入方式独立填写 `distributions`，认证与传输按同一个变体记录。
3. `sourceRefs` 指明来源、审核日期和适用字段；`sourceIds` 引用同项目中的来源。
4. 官方身份必须有上游证据。价格未确认使用 `unknown`，源码开放不代表底层服务免费。
5. 指南写入 `data/guides.json`，更新项目 `guideIds`。当前支持 JSON 示例；使用 `scope: documentation` 不代表已做连接测试。
6. 测试证据单独写入 `verifications`，不能只修改 `testStatus` 为通过。
7. 作者项目设置 `isAuthor: true`；不改自然搜索排序。

发布前运行：

```sh
npm ci
npm test
npm run validate
npm run build
npm run test:e2e
```

浏览器测试需安装与 Playwright 版本匹配的 Chromium；已有浏览器时不必重新下载。`npm run test:e2e` 自动启动本地静态服务。

CI 只做格式、引用、构建和可重复测试，不能替代上游事实审核或第三方 MCP 连接测试。不要直接编辑 `public/data/v1`，这些文件由源数据生成。

## 开放贡献入口

`data/site.json` 的 `repository` 初始为 null。公开 GitHub 仓库准备好后填入其 HTTPS 地址，提交页会显示前往 GitHub 的入口。请勿填写 Sites 私有源码仓库地址或不存在的地址。

## 审核与许可

维护者核对身份、字段来源、日期、指南和利益关系；自动发现的信息不能直接当作已审核内容。署名与尊重不同经验水平的贡献者。

代码按 MIT 贡献；原创中文指南按 CC BY 4.0 贡献；结构化事实数据按 CC0 1.0 贡献。不得将没有授权的第三方整篇内容或评分复制进来。详见 LICENSE 和 LICENSE-CONTENT.md。

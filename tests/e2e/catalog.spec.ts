import { test, expect, type Page } from "@playwright/test";
import catalog from "../../data/catalog.json";
import guides from "../../data/guides.json";
import skills from "../../data/skills.json";
import { withBasePath } from "../../src/lib/base-path.mjs";
test.beforeEach(async ({ page }) => {
  const goto = page.goto.bind(page);
  page.goto = ((url, ...args) =>
    goto(withBasePath(url), ...args)) as typeof page.goto;
});
const firstPageCount = Math.min(catalog.servers.length, 24);
test("Skills 分页可刷新分享、越界恢复，搜索返回第一页", async ({ page }) => {
  await page.goto("/skills/");
  await expect(page.locator(".index-card")).toHaveCount(12);
  await page
    .getByRole("navigation", { name: "Skills 分页" })
    .getByRole("button", { name: "下一页" })
    .click();
  await expect(page).toHaveURL(/page=2/);
  await expect(
    page.getByRole("region", { name: "技能结果，第 2 页" }),
  ).toBeFocused();
  await page.reload();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.locator(".index-card")).toHaveCount(12);
  await page.getByRole("searchbox", { name: "搜索 Skills" }).fill("Supabase");
  await expect(page).not.toHaveURL(/page=/);
  await expect(page.locator(".index-card")).toHaveCount(2);
  await page.goto("/skills/?page=999");
  await expect(page).toHaveURL(
    new RegExp("page=" + Math.ceil(skills.length / 12)),
  );
  await expect(page.locator(".index-card")).toHaveCount(
    skills.length % 12 || 12,
  );
});
test("审核提示按访问日期更新，不依赖重新构建", async ({ page }) => {
  await page.clock.install({ time: new Date("2027-06-01T12:00:00Z") });
  await page.goto("/servers/github/");
  await expect(page.getByText("待复核", { exact: true })).toBeVisible();
  await expect(page.getByText(/最近审核：2026-10-22/)).toBeVisible();
  await page.clock.setFixedTime(new Date("2026-11-02T12:00:00Z"));
  await page.clock.runFor(60000);
  await expect(page.getByText("信息审核期内", { exact: true })).toBeVisible();
});
test("Skills 跨维护者筛选、中文检索及空结果恢复", async ({ page }) => {
  await page.goto("/skills/");
  await page
    .getByRole("combobox", { name: "Skills 维护者" })
    .selectOption("Vercel");
  await page.getByRole("searchbox", { name: "搜索 Skills" }).fill("性能");
  await expect(page.locator(".index-card")).toHaveCount(3);
  await expect(page).toHaveURL(/publisher=Vercel/);
  await page.reload();
  await expect(
    page.getByRole("searchbox", { name: "搜索 Skills" }),
  ).toHaveValue("性能");
  await expect(page.locator(".index-card")).toHaveCount(3);
  await page
    .getByRole("combobox", { name: "Skills 分类" })
    .selectOption("设计与开发");
  await expect(page.locator(".index-card")).toHaveCount(1);
  await page.goBack();
  await expect(page.getByRole("combobox", { name: "Skills 分类" })).toHaveValue(
    "",
  );
  await expect(page.locator(".index-card")).toHaveCount(3);
  await page
    .getByRole("searchbox", { name: "搜索 Skills" })
    .fill("不存在的技能");
  await expect(
    page.getByRole("heading", { name: "没有匹配的技能" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "清空技能筛选" }).click();
  await expect(page.locator(".index-card")).toHaveCount(
    Math.min(12, skills.length),
  );
});
test("Skills 独立目录可以进入中文安装页，并说明集合与未实测范围", async ({
  page,
}) => {
  await page.goto("/skills/");
  await page.getByRole("link", { name: /Frontend Design/ }).click();
  await expect(
    page.getByRole("heading", { name: "在 Claude Code 中安装" }),
  ).toBeVisible();
  await expect(page.getByText(/不是仅安装本页面这一项/)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "所需能力与操作范围" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});
test("键盘翻页后焦点转移到新结果区", async ({ page }) => {
  await page.goto("/servers/");
  await page.getByRole("button", { name: "下一页", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".catalog-results")).toBeFocused();
  await expect(
    page.getByRole("region", { name: "目录结果，第 2 / 2 页，共 32 个项目" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "上一页", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".catalog-results")).toBeFocused();
  await expect(page).not.toHaveURL(/page=2/);
});
test("每个项目详情有中文指南入口，指南包含排错和移除步骤", async ({ page }) => {
  for (const server of catalog.servers.filter(
    (s) => s.status === "published",
  )) {
    await page.goto("/servers/" + server.slug + "/");
    const guide = guides.find((g) => g.serverId === server.id)!;
    await expect(
      page
        .locator(".guide-links")
        .getByRole("link", { name: guide.title, exact: false }),
    ).toBeVisible();
  }
  await page.goto("/guides/elevenlabs-claude-connector/");
  await expect(
    page.getByRole("button", { name: "复制连接参数" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "常见问题与排查" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "停止使用与撤销授权" }),
  ).toBeVisible();
});
async function openFilters(page: Page) {
  const button = page.getByRole("button", { name: /筛选项目/ });
  if (await button.isVisible()) await button.click();
}
test("指南检索和客户端筛选可以恢复，页面不溢出", async ({ page }) => {
  await page.goto("/guides/");
  await page.getByRole("searchbox", { name: "搜索配置指南" }).fill("文件系统");
  await expect(page.locator(".guide-link")).toHaveCount(1);
  await page
    .getByRole("combobox", { name: "指南客户端" })
    .selectOption("Cursor");
  await expect(
    page.getByRole("heading", { name: "没有匹配的配置指南" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "清空指南筛选" }).click();
  await expect(page.locator(".guide-link")).toHaveCount(guides.length);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});
test("目录桌面两栏与手机筛选布局不会挤压卡片", async ({ page }) => {
  await page.goto("/servers/");
  const toggle = page.getByRole("button", { name: /筛选项目/ });
  const sidebar = page.locator("#catalog-filters");
  const results = page.locator(".catalog-results");
  if ((page.viewportSize()?.width || 0) > 760) {
    await expect(toggle).toBeHidden();
    const left = await sidebar.boundingBox();
    const right = await results.boundingBox();
    expect(left).not.toBeNull();
    expect(right).not.toBeNull();
    expect(right!.x).toBeGreaterThan(left!.x + left!.width);
    expect(Math.abs(right!.y - left!.y)).toBeLessThan(4);
    expect(right!.width).toBeGreaterThan(500);
  } else {
    await expect(toggle).toBeVisible();
    await expect(sidebar).toBeHidden();
    await toggle.click();
    await expect(sidebar).toBeVisible();
    await toggle.click();
    await expect(sidebar).toBeHidden();
  }
  expect(
    (await page.locator(".result-grid .project-card").first().boundingBox())!
      .width,
  ).toBeGreaterThan(130);
});
test("中文搜索、未知费用、空结果恢复", async ({ page }) => {
  await page.goto("/servers/");
  await page.getByRole("textbox", { name: "搜索目录" }).fill("文件系统");
  await expect(page.locator(".result-grid .project-card")).toHaveCount(1);
  await expect(page.locator(".result-grid")).toContainText("Filesystem");
  await page.getByRole("button", { name: "清空搜索" }).click();
  await openFilters(page);
  await page
    .getByRole("group", { name: "底层服务费用" })
    .getByRole("checkbox", { name: "免费", exact: true })
    .check();
  await expect(
    page.getByRole("heading", { name: "暂时没有匹配项目" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "清空筛选", exact: true }).click();
  await expect(page.locator(".result-grid .project-card")).toHaveCount(
    firstPageCount,
  );
});
test("组合条件经刷新与浏览器前后退可恢复", async ({ page }) => {
  await page.goto("/servers/");
  await openFilters(page);
  await page
    .getByRole("group", { name: "使用场景" })
    .getByRole("checkbox", { name: /浏览器与自动化/ })
    .check();
  await expect(page.locator(".result-grid .project-card")).toHaveCount(2);
  await page
    .getByRole("group", { name: "发布者身份" })
    .getByRole("checkbox", { name: /官方发布/ })
    .check();
  await expect(page).toHaveURL(/identity=first_party/);
  await page.goBack();
  await expect(page).not.toHaveURL(/identity=/);
  await expect(
    page
      .getByRole("group", { name: "发布者身份" })
      .getByRole("checkbox", { name: /官方发布/ }),
  ).not.toBeChecked();
  await page.goForward();
  await page.reload();
  await openFilters(page);
  await expect(
    page
      .getByRole("group", { name: "使用场景" })
      .getByRole("checkbox", { name: /浏览器与自动化/ }),
  ).toBeChecked();
  await expect(
    page
      .getByRole("group", { name: "发布者身份" })
      .getByRole("checkbox", { name: /官方发布/ }),
  ).toBeChecked();
  await expect(page.locator(".result-grid .project-card")).toHaveCount(2);
});
test("对比最多三个，跨刷新保留，目标页可移除", async ({ page }) => {
  await page.goto("/servers/");
  const choices = page.locator(".compare-check input");
  for (let i = 0; i < 3; i++) await choices.nth(i).check();
  await choices.nth(3).click();
  await expect(page.getByRole("status")).toContainText("最多对比 3");
  await expect(choices.nth(3)).not.toBeChecked();
  await page.reload();
  await expect(page.locator(".compare-tray")).toContainText("已选择 3/3");
  await page.getByRole("link", { name: /开始对比/ }).click();
  await expect(page.locator(".compare-table thead th")).toHaveCount(4);
  await page.getByRole("button", { name: /移除 / }).first().click();
  await expect(page.locator(".compare-table thead th")).toHaveCount(3);
});
test("非法参数清理，超出页数恢复，分享对比剔除无效 ID", async ({ page }) => {
  await page.goto(
    "/servers/?category=bad&identity=constructor&page=bad&extra=x",
  );
  await expect(page).toHaveURL(/\/servers\/$/);
  await expect(page.locator(".result-grid .project-card")).toHaveCount(
    firstPageCount,
  );
  await page.goto("/servers/?page=999");
  await expect(page).toHaveURL(/page=2/);
  await expect(page.locator(".result-grid .project-card")).toHaveCount(
    catalog.servers.length - 24,
  );
  await expect(page.getByRole("button", { name: "下一页" })).toBeDisabled();
  await page.getByRole("button", { name: "上一页" }).click();
  await expect(page).toHaveURL(/\/servers\/$/);
  await expect(page.locator(".result-grid .project-card")).toHaveCount(
    firstPageCount,
  );
  await page.goto("/compare/?ids=github,github,missing,playwright");
  await expect(page.locator(".compare-table thead th")).toHaveCount(3);
});
test("指南的完整配置可复制，明确未实测", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/guides/playwright-vscode-local/");
  await expect(
    page.getByText("文档核对 · 未连接实测", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "复制配置", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("配置已复制");
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(JSON.parse(text).servers.playwright.command).toBe("npx");
});
test("剪贴板受限时可手动复制，不误报成功", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: () => Promise.reject(new Error("denied")) },
      configurable: true,
    });
  });
  await page.goto("/guides/github-vscode-remote/");
  await page.getByRole("button", { name: "复制配置", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("手动复制");
  await expect(
    page.getByRole("button", { name: "复制配置", exact: true }),
  ).toBeVisible();
});
test("纠错入口预填项目，下载内容不伪装提交", async ({ page }) => {
  await page.goto("/servers/github/");
  await page.getByRole("link", { name: /报告错误或补充指南/ }).click();
  await expect(
    page.getByRole("textbox", { name: "项目名称", exact: true }),
  ).toHaveValue("GitHub MCP Server");
  await expect(page.getByRole("combobox", { name: "贡献类型" })).toHaveValue(
    "correction",
  );
  await page
    .getByRole("textbox", { name: "需要修正的信息及依据" })
    .fill("需要核对费用来源。");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "下载申请文件" }).click();
  expect((await download).suggestedFilename()).toBe("mcp-correction.md");
  await expect(page.getByRole("status")).toContainText("尚未提交");
});
test("主要页面无横向溢出，内部页可访问且无脚本异常", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const path of [
    "/",
    "/servers/",
    "/servers/github/",
    "/guides/playwright-vscode-local/",
    "/submit/",
  ]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    ).toBe(true);
  }
  expect(errors).toEqual([]);
});

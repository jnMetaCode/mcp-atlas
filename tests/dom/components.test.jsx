import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import React, { act } from "react";
import {
  render,
  fireEvent,
  cleanup,
  waitFor,
  within,
} from "@testing-library/react";
import CatalogBrowser from "../../src/components/catalog-browser";
import Compare from "../../src/components/compare";
import GuideContent from "../../src/components/guide-content";
import Submission from "../../src/components/submission";
import GuideBrowser from "../../src/components/guide-browser";
import InstallCommand from "../../src/components/install-command";
import guides from "../../data/guides.json";

beforeEach(() => {
  cleanup();
  history.replaceState(null, "", "/servers/");
  sessionStorage.clear();
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: async () => {} },
  });
});
afterEach(() => cleanup());
const cards = () => document.querySelectorAll(".result-grid .project-card");
test("技能推荐入口选择独立类型并携带客户端与安装依据", async () => {
  history.replaceState(null, "", "/submit/?type=skill");
  const view = render(<Submission />);
  await waitFor(() =>
    assert.equal(
      view.getByRole("combobox", { name: "贡献类型" }).value,
      "skill",
    ),
  );
  fireEvent.change(view.getByRole("textbox", { name: "适用客户端" }), {
    target: { value: "Claude Code" },
  });
  fireEvent.change(view.getByRole("textbox", { name: "安装说明来源" }), {
    target: { value: "https://example.com/install" },
  });
  assert(
    view.container.querySelector("pre").textContent.includes("Skills 收录申请"),
  );
  assert(
    view.container
      .querySelector("pre")
      .textContent.includes("适用客户端：Claude Code"),
  );
});
test("技能命令完整复制但不执行，失败清除之前的成功状态", async () => {
  const command =
    "/plugin marketplace add example/repo\n/plugin install test@example";
  let received = "";
  navigator.clipboard.writeText = async (text) => {
    received = text;
  };
  const view = render(
    <InstallCommand command={command} context="Claude Code 会话命令" />,
  );
  fireEvent.click(view.getByRole("button", { name: "复制安装命令" }));
  await waitFor(() => assert.equal(received, command));
  await waitFor(() =>
    assert(view.getByRole("status").textContent.includes("尚未执行")),
  );
  navigator.clipboard.writeText = async () => {
    throw new Error("denied");
  };
  fireEvent.click(view.getByRole("button", { name: "已复制" }));
  await waitFor(() =>
    assert(view.getByRole("button", { name: "复制安装命令" })),
  );
  assert(view.getByRole("status").textContent.includes("手动复制"));
});
test("指南按中文别名和客户端筛选，空结果可清空恢复", () => {
  const view = render(<GuideBrowser />);
  assert.equal(
    view.container.querySelectorAll(".guide-link").length,
    guides.length,
  );
  fireEvent.change(view.getByRole("searchbox", { name: "搜索配置指南" }), {
    target: { value: "文件系统" },
  });
  assert.equal(view.container.querySelectorAll(".guide-link").length, 1);
  fireEvent.change(view.getByRole("combobox", { name: "指南客户端" }), {
    target: { value: "Cursor" },
  });
  assert(view.getByRole("heading", { name: "没有匹配的配置指南" }));
  fireEvent.click(view.getByRole("button", { name: "清空指南筛选" }));
  assert.equal(
    view.container.querySelectorAll(".guide-link").length,
    guides.length,
  );
  fireEvent.change(view.getByRole("combobox", { name: "指南客户端" }), {
    target: { value: "Claude Desktop" },
  });
  assert(view.getByText(/界面连接步骤/));
});
test("界面连接指南复制参数并明确不能当配置文件导入", async () => {
  const guide = guides.find((g) => g.templateFormat === "connection-info");
  assert(guide);
  let copied = "";
  navigator.clipboard.writeText = async (text) => {
    copied = text;
  };
  const view = render(<GuideContent guide={guide} />);
  assert(view.getByText(/不是可直接导入的客户端配置文件/));
  fireEvent.click(view.getByRole("button", { name: "复制连接参数" }));
  await waitFor(() =>
    assert(view.getByRole("status").textContent.includes("不要粘贴到配置文件")),
  );
  assert.equal(JSON.parse(copied).url, "https://api.elevenlabs.io/v1/mcp");
});

test("切换上游排序重置分页，分享链接重挂载保留排序和说明", async () => {
  history.replaceState(null, "", "/servers/?page=2");
  const view = render(<CatalogBrowser />);
  await waitFor(() => assert.equal(cards().length, 8));
  fireEvent.change(view.getByRole("combobox", { name: "排序方式" }), {
    target: { value: "updated" },
  });
  assert.equal(cards().length, 24);
  assert.equal(new URLSearchParams(location.search).get("sort"), "updated");
  assert.equal(new URLSearchParams(location.search).get("page"), null);
  assert(view.getByText(/不使用本站审核日期代替/));
  view.unmount();
  const restored = render(<CatalogBrowser />);
  await waitFor(() =>
    assert.equal(
      restored.getByRole("combobox", { name: "排序方式" }).value,
      "updated",
    ),
  );
});

test("目录实际组件解析分享 URL、搜索并清空查询", async () => {
  history.replaceState(null, "", "/servers/?q=文件系统");
  const view = render(<CatalogBrowser />);
  await waitFor(() => assert.equal(cards().length, 1));
  assert(
    document.querySelector(".result-grid").textContent.includes("Filesystem"),
  );
  fireEvent.click(view.getByRole("button", { name: "清空搜索" }));
  assert.equal(cards().length, 24);
  assert.equal(location.search, "");
  fireEvent.change(view.getByRole("textbox", { name: "搜索目录" }), {
    target: { value: "GitHub" },
  });
  assert.equal(cards().length, 1);
  assert.equal(new URLSearchParams(location.search).get("q"), "GitHub");
});
test("目录筛选、标签移除与浏览器后退恢复实际界面", async () => {
  const view = render(<CatalogBrowser />);
  fireEvent.click(
    within(view.getByRole("group", { name: "使用场景" })).getByRole(
      "checkbox",
      { name: "浏览器与自动化" },
    ),
  );
  assert.equal(cards().length, 2);
  fireEvent.click(
    within(view.getByRole("group", { name: "底层服务费用" })).getByRole(
      "checkbox",
      { name: "免费", exact: true },
    ),
  );
  assert(view.getByRole("heading", { name: "暂时没有匹配项目" }));
  fireEvent.click(view.getByRole("button", { name: "移除筛选：免费" }));
  assert.equal(cards().length, 2);
  await act(async () => {
    history.back();
    await new Promise((resolve) => setTimeout(resolve, 25));
  });
  await waitFor(() =>
    assert(view.getByRole("heading", { name: "暂时没有匹配项目" })),
  );
});
test("目录翻页及越界页码复原，翻页后检索回到第一页", async () => {
  history.replaceState(null, "", "/servers/?page=999");
  const view = render(<CatalogBrowser />);
  await waitFor(() => assert.equal(cards().length, 8));
  assert.equal(new URLSearchParams(location.search).get("page"), "2");
  assert(view.getByRole("button", { name: "下一页" }).disabled);
  fireEvent.click(view.getByRole("button", { name: "上一页" }));
  assert.equal(cards().length, 24);
  fireEvent.click(view.getByRole("button", { name: "下一页" }));
  fireEvent.change(view.getByRole("textbox", { name: "搜索目录" }), {
    target: { value: "文档" },
  });
  assert(!new URLSearchParams(location.search).has("page"));
});
test("对比上限、会话保存与重新挂载恢复", async () => {
  let view = render(<CatalogBrowser />);
  const choices = document.querySelectorAll(".compare-check input");
  for (let i = 0; i < 4; i++) fireEvent.click(choices[i]);
  assert.equal(
    JSON.parse(sessionStorage.getItem("mcp-atlas:compare:v1")).length,
    3,
  );
  assert.equal(choices[3].checked, false);
  assert(view.getByRole("status").textContent.includes("最多对比 3"));
  view.unmount();
  view = render(<CatalogBrowser />);
  await waitFor(() =>
    assert.equal(
      document.querySelectorAll(".compare-check input:checked").length,
      3,
    ),
  );
  assert.equal(
    new URL(view.getByRole("link", { name: /开始对比/ }).href).searchParams
      .get("ids")
      .split(",").length,
    3,
  );
});
test("分享的对比选择进入会话，移除后 URL 和会话保持一致", async () => {
  history.replaceState(
    null,
    "",
    "/compare/?ids=github,github,missing,playwright",
  );
  const view = render(<Compare />);
  await waitFor(() =>
    assert.equal(
      document.querySelectorAll(".compare-table thead th").length,
      3,
    ),
  );
  assert.deepEqual(JSON.parse(sessionStorage.getItem("mcp-atlas:compare:v1")), [
    "github",
    "playwright",
  ]);
  assert.equal(
    new URLSearchParams(location.search).get("ids"),
    "github,playwright",
  );
  fireEvent.click(view.getByRole("button", { name: "移除 GitHub MCP Server" }));
  assert.deepEqual(JSON.parse(sessionStorage.getItem("mcp-atlas:compare:v1")), [
    "playwright",
  ]);
  assert.equal(new URLSearchParams(location.search).get("ids"), "playwright");
});
test("配置复制返回完整 JSON，失败时没有成功标签", async () => {
  let copied;
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: async (value) => {
        copied = value;
      },
    },
  });
  const view = render(<GuideContent guide={guides[0]} />);
  fireEvent.click(view.getByRole("button", { name: "复制配置" }));
  await waitFor(() => assert(view.getByRole("button", { name: "已复制" })));
  assert.equal(copied, guides[0].configTemplate);
  assert.equal(JSON.parse(copied).servers.playwright.command, "npx");
  navigator.clipboard.writeText = async () => {
    throw new Error("denied");
  };
  fireEvent.click(view.getByRole("button", { name: "已复制" }));
  await waitFor(() =>
    assert(view.getByRole("status").textContent.includes("手动复制")),
  );
  assert(view.getByRole("button", { name: "复制配置" }));
});
function fillSubmission(view) {
  fireEvent.change(
    view.getByRole("textbox", { name: "项目名称", exact: true }),
    { target: { value: "Test MCP" } },
  );
  fireEvent.change(view.getByRole("textbox", { name: "项目或文档链接" }), {
    target: { value: "https://project.example/" },
  });
  fireEvent.change(view.getByRole("textbox", { name: "能解决什么问题？" }), {
    target: { value: "说明一个具体任务" },
  });
}
test("贡献表单不接受只有空格的必填内容", async () => {
  let copies = 0;
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: async () => {
        copies++;
      },
    },
  });
  const view = render(<Submission />);
  fillSubmission(view);
  fireEvent.change(
    view.getByRole("textbox", { name: "项目名称", exact: true }),
    { target: { value: "   " } },
  );
  fireEvent.submit(document.querySelector("form"));
  await waitFor(() =>
    assert(view.getByRole("status").textContent.includes("项目名称")),
  );
  assert.equal(copies, 0);
});
test("贡献表单第二次复制失败时清除之前的成功状态", async () => {
  const view = render(<Submission />);
  fillSubmission(view);
  fireEvent.submit(document.querySelector("form"));
  await waitFor(() =>
    assert(view.getByRole("button", { name: /已复制申请内容/ })),
  );
  navigator.clipboard.writeText = async () => {
    throw new Error("denied");
  };
  fireEvent.submit(document.querySelector("form"));
  await waitFor(() =>
    assert(view.getByRole("status").textContent.includes("剪贴板不可用")),
  );
  assert(view.getByRole("button", { name: "复制申请内容" }));
});
test("纠错入口预填现有项目，未知 ID 不伪造项目", async () => {
  history.replaceState(null, "", "/submit/?type=correction&project=github");
  let view = render(<Submission />);
  assert.equal(
    view.getByRole("textbox", { name: "项目名称", exact: true }).value,
    "GitHub MCP Server",
  );
  assert.equal(
    view.getByRole("combobox", { name: "贡献类型" }).value,
    "correction",
  );
  view.unmount();
  history.replaceState(null, "", "/submit/?type=correction&project=missing");
  view = render(<Submission />);
  assert.equal(
    view.getByRole("textbox", { name: "项目名称", exact: true }).value,
    "",
  );
});

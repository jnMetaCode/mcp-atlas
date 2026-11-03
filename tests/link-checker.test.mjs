import { test } from "node:test";
import assert from "node:assert/strict";
import {
  collectSourceLinks,
  checkSourceLink,
  checkLinks,
} from "../scripts/lib/link-checker.mjs";

const link = { url: "https://fixture.example/source", references: ["fixture"] };
const response =
  (status, headers = {}) =>
  async () => ({ status, headers, body: "" });
const noSleep = async () => {};
test("来源去重，撤回项目和 MCP 调用端点不进入 HTTP 检查", () => {
  const catalog = {
    servers: [
      {
        id: "a",
        status: "published",
        source: link.url,
        identityEvidence: link.url,
        sourceRefs: [{ url: link.url }],
        distributions: [{ endpoint: "https://fixture.example/mcp" }],
      },
      {
        id: "b",
        status: "withdrawn",
        source: "https://fixture.example/withdrawn",
        sourceRefs: [],
      },
    ],
  };
  const result = collectSourceLinks(catalog, [
    { id: "guide", serverId: "a", sourceRefs: [{ url: link.url }] },
    {
      id: "private",
      serverId: "b",
      sourceRefs: [{ url: "https://fixture.example/private" }],
    },
  ]);
  assert.equal(result.length, 1);
  assert.deepEqual(result[0].references, ["a", "guide:guide"]);
});
test("404 与 410 标记待人工核对的失效，不删条目", async () => {
  for (const status of [404, 410]) {
    const result = await checkSourceLink(link, {
      requestFn: response(status),
      sleep: noSleep,
    });
    assert.equal(result.result, "broken");
    assert.equal(result.httpStatus, status);
  }
});
test("403、429 和 503 不被当成项目下线", async () => {
  for (const [status, expected] of [
    [403, "restricted"],
    [429, "rate_limited"],
    [503, "temporary_error"],
  ]) {
    const result = await checkSourceLink(link, {
      requestFn: response(status),
      sleep: noSleep,
    });
    assert.equal(result.result, expected);
  }
});
test("HEAD 不支持时使用只读 GET 并丢弃响应正文", async () => {
  const calls = [];
  const result = await checkSourceLink(link, {
    sleep: noSleep,
    requestFn: async (url, options) => {
      calls.push(options);
      return {
        status: options.method === "HEAD" ? 405 : 200,
        headers: {},
        body: "",
      };
    },
  });
  assert.equal(result.result, "reachable");
  assert.deepEqual(
    calls.map((call) => call.method),
    ["HEAD", "GET"],
  );
  assert.equal(calls[1].discardBody, true);
  assert.equal(calls[1].headers.Range, "bytes=0-4095");
});
test("304 只有在存在成功缓存时才视为可达", async () => {
  let sent;
  const previous = {
    ...link,
    result: "reachable",
    etag: "version-1",
    lastModified: null,
    httpStatus: 200,
    finalUrl: link.url,
    error: null,
  };
  const result = await checkSourceLink(link, {
    previous,
    requestFn: async (_url, options) => {
      sent = options.headers;
      return { status: 304, headers: {}, body: "" };
    },
  });
  assert.equal(sent["If-None-Match"], "version-1");
  assert.equal(result.result, "reachable");
  assert.equal(
    (await checkSourceLink(link, { requestFn: response(304) })).result,
    "needs_review",
  );
});
test("DNS 故障与被拦截重定向分别报告，非法 URL 不泄露凭证", async () => {
  const failure = async () => {
    const error = new Error("network");
    error.code = "ENOTFOUND";
    throw error;
  };
  assert.equal(
    (await checkSourceLink(link, { requestFn: failure, sleep: noSleep }))
      .result,
    "unreachable",
  );
  const blocked = await checkSourceLink(
    { ...link, url: "https://user:secret@fixture.example/source" },
    {
      requestFn: async () => {
        throw new Error("must_not_request");
      },
    },
  );
  assert.equal(blocked.result, "blocked");
  assert(!JSON.stringify(blocked).includes("secret"));
});
test("链接检查并发有上限，报告不会修改输入目录", async () => {
  let active = 0;
  let peak = 0;
  const links = Array.from({ length: 8 }, (_, i) => ({
    ...link,
    url: `https://fixture.example/${i}`,
  }));
  const original = JSON.stringify(links);
  const report = await checkLinks(links, {
    concurrency: 2,
    requestFn: async () => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 1));
      active--;
      return { status: 200, headers: {}, body: "" };
    },
  });
  assert.equal(peak, 2);
  assert.equal(report.results.length, 8);
  assert.equal(report.summary.reachable, 8);
  assert.equal(JSON.stringify(links), original);
});
test("成功缓存重验证和重复检查不产生内容差异", async () => {
  const first = await checkLinks([link], {
    requestFn: response(200, { etag: "v1" }),
  });
  const second = await checkLinks([link], {
    previous: first.results,
    requestFn: response(304),
  });
  assert.equal(second.changes.length, 0);
});

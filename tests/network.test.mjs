import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isPublicAddress,
  resolvePublicHost,
  requestWithPolicy,
  validateRequestUrl,
  retryDelay,
} from "../scripts/lib/network.mjs";

test("网络策略拒绝本地、私网、保留地址与 IPv4 映射地址", () => {
  for (const ip of [
    "127.0.0.1",
    "10.0.0.1",
    "172.31.2.3",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "198.19.0.1",
    "192.0.2.1",
    "203.0.113.1",
    "224.0.0.1",
    "::1",
    "::ffff:127.0.0.1",
    "fc00::1",
    "fe80::1",
    "2001:db8::1",
    "2002:c000:201::1",
    "3fff::1",
  ])
    assert.equal(isPublicAddress(ip), false, ip);
  for (const ip of [
    "8.8.8.8",
    "1.1.1.1",
    "2606:4700:4700::1111",
    "2001:4860:4860::8888",
  ])
    assert.equal(isPublicAddress(ip), true, ip);
});
test("DNS 多个地址中任何一项为私网都会拒绝连接", async () => {
  await assert.rejects(
    resolvePublicHost("fixture.example", async () => [
      { address: "8.8.8.8", family: 4 },
      { address: "127.0.0.1", family: 4 },
    ]),
    { code: "blocked_address" },
  );
  const resolved = await resolvePublicHost("fixture.example", async () => [
    { address: "8.8.8.8", family: 4 },
  ]);
  assert.equal(resolved[0].address, "8.8.8.8");
});
test("Registry 请求限制为允许的来源域名", () => {
  assert.throws(
    () =>
      validateRequestUrl("https://other.example/a", [
        "registry.modelcontextprotocol.io",
      ]),
    { code: "blocked_host" },
  );
});
test("每次重定向均检查目标，阻止跳往私网", async () => {
  let count = 0;
  await assert.rejects(
    requestWithPolicy("https://fixture.example/start", {
      requestFn: async () => {
        count++;
        return {
          status: 302,
          headers: { location: "https://127.0.0.1/admin" },
        };
      },
      sleep: async () => {},
    }),
    { code: "blocked_url" },
  );
  assert.equal(count, 1);
});
test("Registry 跨域重定向也被允许列表阻止", async () => {
  await assert.rejects(
    requestWithPolicy("https://registry.modelcontextprotocol.io/v0.1/servers", {
      allowedHosts: ["registry.modelcontextprotocol.io"],
      requestFn: async () => ({
        status: 302,
        headers: { location: "https://other.example/" },
      }),
    }),
    { code: "blocked_host" },
  );
});
test("429 遵循有上限的 Retry-After，最多尝试三次", async () => {
  let calls = 0;
  const pauses = [];
  const response = await requestWithPolicy("https://fixture.example/a", {
    requestFn: async () => {
      calls++;
      return { status: 429, headers: { "retry-after": "120" } };
    },
    sleep: async (ms) => pauses.push(ms),
  });
  assert.equal(calls, 3);
  assert.deepEqual(pauses, [10000, 10000]);
  assert.equal(response.status, 429);
});
test("重定向循环与长度限制有界，不发送无限请求", async () => {
  await assert.rejects(
    requestWithPolicy("https://fixture.example/a", {
      requestFn: async () => ({ status: 301, headers: { location: "/a" } }),
    }),
    { code: "redirect_loop" },
  );
  let calls = 0;
  await assert.rejects(
    requestWithPolicy("https://fixture.example/a", {
      maxRedirects: 1,
      requestFn: async () => ({
        status: 302,
        headers: { location: "/next" + calls++ },
      }),
    }),
    { code: "redirect_limit" },
  );
  assert.equal(calls, 2);
});
test("被拦截地址不重试，DNS 故障有界重试", async () => {
  let calls = 0;
  const failure = (code) => {
    const error = new Error(code);
    error.code = code;
    throw error;
  };
  await assert.rejects(
    requestWithPolicy("https://fixture.example/a", {
      requestFn: async () => {
        calls++;
        return failure("blocked_address");
      },
      sleep: async () => {},
    }),
    { code: "blocked_address" },
  );
  assert.equal(calls, 1);
  calls = 0;
  await assert.rejects(
    requestWithPolicy("https://fixture.example/a", {
      requestFn: async () => {
        calls++;
        return failure("ENOTFOUND");
      },
      sleep: async () => {},
    }),
    { code: "ENOTFOUND" },
  );
  assert.equal(calls, 3);
});
test("无效重试参数和认证 URL 在请求之前拒绝", async () => {
  await assert.rejects(
    requestWithPolicy("https://fixture.example/a", { maxAttempts: 0 }),
    { code: "invalid_request_limits" },
  );
  assert.throws(
    () => validateRequestUrl("https://user:password@fixture.example/a"),
    { code: "blocked_url" },
  );
});
test("日期型 Retry-After 与过期日期正确夹取", () => {
  assert.equal(
    retryDelay(
      "Thu, 22 Oct 2026 10:00:03 GMT",
      0,
      Date.parse("2026-10-22T10:00:00Z"),
    ),
    3000,
  );
  assert.equal(retryDelay("-1", 0), 0);
});

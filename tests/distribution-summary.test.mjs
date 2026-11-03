import { test } from "node:test";
import assert from "node:assert/strict";
import { distributionSummary } from "../src/lib/distribution-summary.mjs";
const server = {
  distributions: [
    {
      label: "本地进程",
      deployment: "local",
      transport: ["stdio"],
      authentication: ["api_key"],
    },
    {
      label: "托管服务",
      deployment: "remote",
      transport: ["streamable_http"],
      authentication: ["oauth"],
    },
  ],
};
test("对比保留每个变体的认证、部署和传输对应关系", () => {
  assert.equal(
    distributionSummary(server, "authentication"),
    "本地进程：需要凭证\n托管服务：OAuth",
  );
  assert.equal(
    distributionSummary(server, "deployment"),
    "本地进程：本地运行\n托管服务：远程连接",
  );
  assert.equal(
    distributionSummary(server, "transport"),
    "本地进程：stdio\n托管服务：streamable_http",
  );
});
test("未知条件保留未确认，不变成匿名或本地运行", () => {
  const record = {
    distributions: [
      {
        label: "待核对",
        deployment: "unknown",
        transport: ["unknown"],
        authentication: ["unknown"],
      },
    ],
  };
  for (const field of ["deployment", "transport", "authentication"])
    assert.equal(distributionSummary(record, field), "待核对：未确认");
});

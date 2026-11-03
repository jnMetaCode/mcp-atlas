import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { synchronizeRegistry } from "../scripts/registry-sync.mjs";
import { currentGeneration, withDirectoryLock } from "../scripts/lib/files.mjs";
const fixture = JSON.parse(
  await readFile(new URL("./fixtures/registry-pages.json", import.meta.url)),
);
const catalog = { servers: [] };
const mapping = { schemaVersion: 1, bindings: [] };
async function temporary(callback) {
  const path = await mkdtemp(join(tmpdir(), "mcp-maintenance-"));
  try {
    await callback(path);
  } finally {
    await rm(path, { recursive: true, force: true });
  }
}
test("完整批次提交，分页失败保留原检查点和报告", async () =>
  temporary(async (directory) => {
    const first = await synchronizeRegistry({
      directory,
      catalog,
      mapping,
      fixture,
      startedAt: "2026-10-22T10:00:00Z",
    });
    assert.equal(first.report.changes.length, 2);
    const original = await readFile(join(directory, "current.json"), "utf8");
    await assert.rejects(
      synchronizeRegistry({
        directory,
        catalog,
        mapping,
        fixture: { pages: [fixture.pages[0]] },
        startedAt: "2026-10-22T10:10:00Z",
      }),
      /fixture_page_missing/,
    );
    assert.equal(
      await readFile(join(directory, "current.json"), "utf8"),
      original,
    );
    const state = JSON.parse(
      await readFile(
        join(await currentGeneration(directory), "state.json"),
        "utf8",
      ),
    );
    assert.equal(state.checkpoint, "2026-10-22T09:59:00.000Z");
  }));
test("再次同步无差异，失败后的锁会释放", async () =>
  temporary(async (directory) => {
    await assert.rejects(
      synchronizeRegistry({
        directory,
        catalog,
        mapping,
        fixture: { pages: [fixture.pages[0]] },
        startedAt: "2026-10-22T10:00:00Z",
      }),
      /fixture_page_missing/,
    );
    await synchronizeRegistry({
      directory,
      catalog,
      mapping,
      fixture,
      startedAt: "2026-10-22T10:10:00Z",
    });
    const second = await synchronizeRegistry({
      directory,
      catalog,
      mapping,
      fixture,
      startedAt: "2026-10-22T10:20:00Z",
    });
    assert.equal(second.report.changes.length, 0);
  }));
test("已有运行锁不会被抢占或移除", async () =>
  temporary(async (directory) => {
    await withDirectoryLock(directory, async () => {
      await assert.rejects(
        withDirectoryLock(directory, async () => {}),
        /maintenance_locked/,
      );
      assert(await readFile(join(directory, ".lock"), "utf8"));
    });
  }));
test("本地指针不能跳出批次目录", async () =>
  temporary(async (directory) => {
    await writeFile(
      join(directory, "current.json"),
      JSON.stringify({ schemaVersion: 1, generation: "../../other" }),
    );
    await assert.rejects(
      currentGeneration(directory),
      /invalid_generation_pointer/,
    );
  }));

test("相同时间戳的重复运行也不会覆写已经选中的批次", async () =>
  temporary(async (directory) => {
    const first = await synchronizeRegistry({
      directory,
      catalog,
      mapping,
      fixture,
      startedAt: "2026-10-22T10:00:00Z",
    });
    const original = await readFile(
      join(first.directory, "report.json"),
      "utf8",
    );
    const second = await synchronizeRegistry({
      directory,
      catalog,
      mapping,
      fixture,
      startedAt: "2026-10-22T10:00:00Z",
    });
    assert.notEqual(first.directory, second.directory);
    assert.equal(second.report.changes.length, 0);
    assert.equal(
      await readFile(join(first.directory, "report.json"), "utf8"),
      original,
    );
  }));

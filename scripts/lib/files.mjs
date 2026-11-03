import { mkdir, writeFile, rename, readFile, rm, open } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { randomUUID } from "node:crypto";

export async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT" && fallback !== undefined) return fallback;
    throw error;
  }
}
export async function atomicJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temp = path + "." + randomUUID() + ".tmp";
  try {
    await writeFile(temp, JSON.stringify(value, null, 2) + "\n", {
      flag: "wx",
    });
    await rename(temp, path);
  } finally {
    await rm(temp, { force: true });
  }
}
export async function withDirectoryLock(directory, callback) {
  await mkdir(directory, { recursive: true });
  const lockPath = join(directory, ".lock");
  let lock;
  try {
    lock = await open(lockPath, "wx");
  } catch (error) {
    if (error.code === "EEXIST") throw new Error("maintenance_locked");
    throw error;
  }
  try {
    await lock.writeFile(
      JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }),
    );
    return await callback();
  } finally {
    await lock.close();
    await rm(lockPath, { force: true });
  }
}
export async function currentGeneration(directory) {
  const pointer = await readJson(join(directory, "current.json"), null);
  if (!pointer) return null;
  if (
    pointer.schemaVersion !== 1 ||
    typeof pointer.generation !== "string" ||
    !/^runs\/[a-z0-9-]+$/.test(pointer.generation)
  )
    throw new Error("invalid_generation_pointer");
  return resolve(directory, pointer.generation);
}

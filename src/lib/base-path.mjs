export function normalizeBasePath(value = "") {
  if (value === "" || value === "/") return "";
  if (!/^\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(value))
    throw new Error("Invalid BASE_PATH");
  return value;
}
export const basePath = normalizeBasePath(
  process.env.NEXT_PUBLIC_BASE_PATH || "",
);
export function withBasePath(path) {
  if (
    typeof path !== "string" ||
    !path.startsWith("/") ||
    path.startsWith("//")
  )
    return path;
  return basePath + path;
}

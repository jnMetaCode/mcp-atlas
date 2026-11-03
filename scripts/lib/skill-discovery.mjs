export function skillObservations(source, tree, published) {
  const skillRoot = source.skillRoot || "skills";
  if (!/^(?:[a-z0-9_-]+\/)*skills$/.test(skillRoot))
    throw new Error("Invalid skill root");
  if (
    tree?.truncated ||
    !Array.isArray(tree?.tree) ||
    !/^[a-f0-9]{40,64}$/.test(tree?.sha || "")
  )
    throw new Error("Incomplete upstream tree");
  const seen = new Set();
  const candidates = [];
  for (const entry of tree.tree) {
    if (
      entry.type !== "blob" ||
      !entry.path.startsWith(skillRoot + "/") ||
      !/^[a-z0-9-]+\/SKILL\.md$/.test(entry.path.slice(skillRoot.length + 1))
    )
      continue;
    if (!/^[a-f0-9]{40,64}$/.test(entry.sha || "") || seen.has(entry.path))
      throw new Error("Invalid or duplicate upstream entry");
    seen.add(entry.path);
    const path = entry.path.replace(/\/SKILL\.md$/, "");
    const previous = published.find(
      (s) =>
        s.repository.toLowerCase() === source.repository.toLowerCase() &&
        s.sourcePath === path,
    );
    candidates.push({
      repository: source.repository,
      path,
      source: `https://github.com/${source.repository}/tree/${source.ref}/${path}`,
      commit: tree.sha,
      blob: entry.sha,
      status: !previous
        ? "needs_review"
        : !previous.sourceBlob
          ? "needs_recheck"
          : previous.sourceBlob === entry.sha
            ? "already_listed"
            : "upstream_changed",
    });
  }
  return candidates;
}

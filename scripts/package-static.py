"""Package an already checked static export; never includes source credentials."""
import hashlib
import json
from pathlib import Path
import zipfile
import subprocess

root = Path(__file__).resolve().parent.parent
output = root / "out"
if not (output / "index.html").is_file():
    raise SystemExit("Run npm run build and npm run check:export first")
subprocess.run(["node", "scripts/check-export.mjs"], cwd=root, check=True)
files = sorted(output.rglob("*"))
manifest = []
for path in files:
    if path.is_symlink():
        raise SystemExit("Symlinks are not allowed in static releases")
    if not path.is_file():
        continue
    relative = path.relative_to(output).as_posix()
    if any(part.startswith(".") for part in path.relative_to(output).parts):
        raise SystemExit("Hidden files are not allowed in static releases")
    content = path.read_bytes()
    manifest.append({"path": relative, "bytes": len(content), "sha256": hashlib.sha256(content).hexdigest()})
version = json.loads((root / "package.json").read_text())["version"]
release = root / "release"
release.mkdir(exist_ok=True)
archive = release / f"mcp-atlas-{version}-static.zip"
temporary = archive.with_suffix(".zip.tmp")
try:
    with zipfile.ZipFile(temporary, "w", zipfile.ZIP_DEFLATED) as bundle:
        for record in manifest:
            bundle.write(output / record["path"], "site/" + record["path"])
        bundle.writestr("manifest.json", json.dumps({"version": version, "files": manifest}, ensure_ascii=False, indent=2))
        bundle.write(root / "docs/静态部署指南.md", "DEPLOY.md")
    with zipfile.ZipFile(temporary) as bundle:
        if bundle.testzip() is not None:
            raise SystemExit("Archive verification failed")
    temporary.replace(archive)
finally:
    temporary.unlink(missing_ok=True)
checksum = hashlib.sha256(archive.read_bytes()).hexdigest()
archive.with_suffix(".zip.sha256").write_text(f"{checksum}  {archive.name}\n")
print(f"{archive}: {len(manifest)} static files; ZIP CRC verified; SHA-256 sidecar written")

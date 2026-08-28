"""
Bump version in CHANGELOG.md, ui/package.json, src-tauri/tauri.conf.json,
and src-tauri/Cargo.toml to the version passed via the VERSION env var.
"""
import json
import os
import re
import sys

version = os.environ["VERSION"]
today = os.environ.get("TODAY", "")

# ── CHANGELOG ─────────────────────────────────────────────────────────────────
with open("CHANGELOG.md") as f:
    cl = f.read()

date_str = f" — {today}" if today else ""
cl = cl.replace(
    "## [Unreleased]",
    f"## [Unreleased]\n\n## [{version}]{date_str}",
    1,
)
with open("CHANGELOG.md", "w") as f:
    f.write(cl)

# ── ui/package.json ───────────────────────────────────────────────────────────
with open("ui/package.json") as f:
    pkg = json.load(f)
pkg["version"] = version
with open("ui/package.json", "w") as f:
    json.dump(pkg, f, indent=2)
    f.write("\n")

# ── src-tauri/tauri.conf.json ─────────────────────────────────────────────────
with open("src-tauri/tauri.conf.json") as f:
    conf = json.load(f)
conf["version"] = version
with open("src-tauri/tauri.conf.json", "w") as f:
    json.dump(conf, f, indent=2)
    f.write("\n")

# ── src-tauri/Cargo.toml ──────────────────────────────────────────────────────
with open("src-tauri/Cargo.toml") as f:
    cargo = f.read()
cargo = re.sub(
    r'^(version\s*=\s*)"[^"]+"',
    f'\\1"{version}"',
    cargo,
    count=1,
    flags=re.MULTILINE,
)
with open("src-tauri/Cargo.toml", "w") as f:
    f.write(cargo)

print(f"Bumped all versions to {version}")

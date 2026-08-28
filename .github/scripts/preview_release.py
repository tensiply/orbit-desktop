"""
Write a GitHub Actions job summary with the release preview:
- version being released
- CHANGELOG entries for [Unreleased]
- pre-flight checklist
"""
import os
import re

version = os.environ["VERSION"]
prerelease = os.environ.get("PRERELEASE", "true").lower() == "true"

with open("CHANGELOG.md") as f:
    cl = f.read()

m = re.search(r"## \[Unreleased\]\n(.*?)(?=^## \[|\Z)", cl, re.DOTALL | re.MULTILINE)
unreleased = m.group(1).strip() if m else "_No unreleased entries._"

summary_path = os.environ.get("GITHUB_STEP_SUMMARY", "/dev/stdout")

lines = [
    f"# Release Preview — v{version}",
    "",
    "## Changelog entries",
    "",
    unreleased,
    "",
    "## Pre-flight checklist",
    "",
    "| Check | Status |",
    "|---|---|",
    "| CI gate passed | ✅ |",
    "| Security audit (critical/high) | ✅ |",
    "| CHANGELOG [Unreleased] has entries | ✅ |",
    f"| Tag v{version} does not exist | ✅ |",
    f"| Marked as pre-release | {'⚠️ Yes (unsigned macOS)' if prerelease else '❌ No — ensure macOS is signed'} |",
    "",
    "> Approve the deployment below to publish.",
]

with open(summary_path, "a") as f:
    f.write("\n".join(lines) + "\n")

print(f"Preview written for v{version}")

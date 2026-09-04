#!/usr/bin/env python3
"""Map a Tauri bundle filename to the canonical homologated asset name.

Tauri derives filenames from productName + version, e.g.:
    Orbit Desktop_0.3.0_amd64.AppImage          (stable)
    Orbit Desktop CANARY_0.3.1_amd64.deb        (canary; GH may show the space as '.')
    Orbit.Desktop.CANARY_0.3.1_amd64.AppImage.sig

Output (given channel):
    orbit-desktop-<channel>-<version>-<arch>.<ext>
e.g. orbit-desktop-stable-0.3.0-x86_64.AppImage

Prints the new name, or nothing if the input doesn't match (caller leaves it as-is).
"""
import re
import sys

ARCH = {"amd64": "x86_64", "arm64": "aarch64", "x86_64": "x86_64", "aarch64": "aarch64"}

# productName is "Orbit Desktop" (+ optional " CANARY"/" DEV"); GH renders spaces as '.'.
PATTERN = re.compile(
    r"^Orbit[ .]Desktop(?:[ .](?:CANARY|DEV))?_(?P<ver>[0-9][^_]*)_(?P<arch>[^.]+)\.(?P<ext>.+)$"
)


def homologate(name: str, channel: str) -> str:
    m = PATTERN.match(name)
    if not m:
        return ""
    arch = ARCH.get(m["arch"], m["arch"])
    return f"orbit-desktop-{channel}-{m['ver']}-{arch}.{m['ext']}"


if __name__ == "__main__":
    print(homologate(sys.argv[1], sys.argv[2]))

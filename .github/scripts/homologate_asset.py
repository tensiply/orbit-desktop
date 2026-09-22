#!/usr/bin/env python3
"""Map a Tauri bundle filename to the canonical homologated asset name.

Tauri derives filenames from productName + version, e.g.:
    Orbit Desktop_0.3.0_amd64.AppImage          (stable, Linux)
    Orbit Desktop CANARY_0.3.1_amd64.deb        (canary; GH may show the space as '.')
    Orbit.Desktop.CANARY_0.3.1_amd64.AppImage.sig
    Orbit Desktop_0.4.0_x64-setup.exe           (stable, Windows NSIS)
    Orbit Desktop_0.4.0_x64_en-US.msi           (stable, Windows MSI)

Output (given channel):
    orbit-desktop-<channel>-<version>-<arch>.<ext>
e.g. orbit-desktop-stable-0.4.0-x86_64.exe

Prints the new name, or nothing if the input doesn't match (caller leaves it as-is).
"""
import re
import sys

ARCH = {
    "amd64": "x86_64",
    "arm64": "aarch64",
    "x86_64": "x86_64",
    "aarch64": "aarch64",
    "x64": "x86_64",  # Tauri's Windows arch token
}

# productName is "Orbit Desktop" (+ optional " CANARY"/" DEV"); GH renders spaces as '.'.
# The arch token may be followed by an infix Tauri adds on Windows (`-setup`
# for NSIS, `_en-US` for MSI) which we drop from the canonical name.
PATTERN = re.compile(
    r"^Orbit[ .]Desktop(?:[ .](?:CANARY|DEV))?_(?P<ver>[0-9][^_]*)_(?P<arch>[^._-]+)[^.]*\.(?P<ext>.+)$"
)


def homologate(name: str, channel: str) -> str:
    m = PATTERN.match(name)
    if not m:
        return ""
    arch = ARCH.get(m["arch"], m["arch"])
    return f"orbit-desktop-{channel}-{m['ver']}-{arch}.{m['ext']}"


if __name__ == "__main__":
    print(homologate(sys.argv[1], sys.argv[2]))

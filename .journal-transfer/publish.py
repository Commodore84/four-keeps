#!/usr/bin/env python3
"""Publish a verified journal tree from lossless staged transfer parts."""
from pathlib import Path
import hashlib
import subprocess
import zlib

BASE = "0d54554cf8ea5ee2b8fbad06b2130d95910ce256"
EXPECTED_TREE = "9e9eccc555748e447fbf4b2e9432d30ec523945b"
TARGET = "refs/heads/feat/clean-app-shell"
FILES = [
    ("src/app/App.tsx", "a2484fa284faffeaf587d45e3db8678dd9b200a2", ["00-0.z","00-1.z","00-2.z","00-3.z"]),
    ("src/game/adventureOrchestrator.ts", "68346e5a09257e09e9d0c58fb6c53da45bce3454", ["01.z"]),
    ("src/game/campaign.ts", "fab956d9ac406f27979f59b2dd34e7b4a3c2be0e", ["02-0.z","02-1.z"]),
    ("src/game/encounterJournal.test.ts", "a21f0e2d82dfb927172def210e42d377f5fb6e59", ["03.z"]),
    ("src/game/encounterJournal.ts", "131599f9ef83e873c695a8a8569a1a19dfe7a68e", ["04.z"]),
    ("tests/e2e/character-forecast.spec.ts", "3475f5f13542720274c5e9ce08595a063dd8367f", ["05.z"]),
    ("tests/e2e/class-playtests.spec.ts", "6e34f7bff53ed6fa0058195a069306831a4e846c", ["06.z"]),
    ("tests/e2e/player-journey.spec.ts", "6b9cc025595d5b020f229b121a28fd612b842944", ["07.z"]),
    ("tests/e2e/rogue-positioning.spec.ts", "f0ba9fd32de16e48b509eeac69d2b81593dcd8de", ["08.z"]),
    ("tests/e2e/shell.spec.ts", "b55b857d354d354cd65f7afd0798a698334178b9", ["09.z"]),
]
def git(*args):
    return subprocess.check_output(["git", *args], text=True).strip()

# Decode and verify every byte before touching the target branch.
decoded = []
for name, expected, parts in FILES:
    data = zlib.decompress(b"".join((Path("/tmp/journal-transfer") / part).read_bytes() for part in parts))
    actual = hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()
    if actual != expected:
        raise RuntimeError(f"Blob mismatch: {name}: {actual} != {expected}")
    decoded.append((name, data))
print(f"Verified {len(decoded)} transferred source files", flush=True)

head = git("ls-remote", "origin", TARGET).split()[0]
if head != BASE:
    raise RuntimeError(f"Target branch advanced: {head} != {BASE}")
git("checkout", "--detach", BASE)
for name, data in decoded:
    target = Path(name)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
git("add", *(name for name, _ in decoded))
tree = git("write-tree")
if tree != EXPECTED_TREE:
    raise RuntimeError(f"Tree mismatch: {tree} != {EXPECTED_TREE}")
print(f"Verified complete tree: {tree}", flush=True)
subprocess.check_call(["git", "-c", "user.name=Four Keeps Journal Publisher", "-c", "user.email=41898282+github-actions[bot]@users.noreply.github.com", "commit", "-m", "Publish verified Four Keeps Journal fresh-campaign experience"])
published = git("rev-parse", "HEAD")
# Final fast-forward push; never force.
subprocess.check_call(["git", "push", "origin", f"HEAD:{TARGET}"])
print(f"PUBLISHED_SHA={published}", flush=True)

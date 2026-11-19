#!/usr/bin/env python3
from pathlib import Path
import hashlib, subprocess, zlib
BASE="ddf8f28f5efb685c4e745930e17c7e6fb54d79be"
EXPECTED_TREE="5a0db9909b289f110c214eb57ec31a908ce040b1"
TARGET="refs/heads/feat/clean-app-shell"
FILES=[
 ("src/app/App.tsx","d9c0b4f3f1d7ac77a7d8f7e27ac4b3b212f8824a",[f"00-{i}.z" for i in range(6)]+["00-42.z"]),
 ("src/app/DMNarration.test.ts","d053c89d5ca42d5b0f25723c82f451025cd559c1",["01-0.z"]),
 ("src/app/DMNarration.tsx","9b7f6cdd9c9e869718e439b53fd372d2aa568893",["02-0.z"]),
 ("tests/e2e/class-playtests.spec.ts","77ee9b7acfe853cfd73ad8ac1651b1b33a73ece0",["03-0.z","03-7.z"]),
]
def git(*args):
 return subprocess.check_output(["git",*args],text=True).strip()
decoded=[]
for name,expected,parts in FILES:
 data=zlib.decompress(b"".join((Path(".clar-transfer")/part).read_bytes() for part in parts))
 actual=hashlib.sha1(b"blob "+str(len(data)).encode()+b"\0"+data).hexdigest()
 if actual!=expected:raise RuntimeError(f"Blob mismatch: {name} {actual} != {expected}")
 decoded.append((name,data))
print(f"Verified {len(decoded)} source files",flush=True)
head=git("ls-remote","origin",TARGET).split()[0]
if head!=BASE:raise RuntimeError(f"Target branch advanced: {head} != {BASE}")
git("checkout","--detach",BASE)
for name,data in decoded:
 p=Path(name);p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data)
git("add",*(name for name,_ in decoded))
tree=git("write-tree")
if tree!=EXPECTED_TREE:raise RuntimeError(f"Tree mismatch: {tree} != {EXPECTED_TREE}")
print(f"Verified exact tree: {tree}",flush=True)
subprocess.check_call(["git","-c","user.name=Four Keeps Publisher","-c","user.email=41898282+github-actions[bot]@users.noreply.github.com","commit","-m","Use adventure composer for clarification and measured narration lines"])
published=git("rev-parse","HEAD")
subprocess.check_call(["git","push","origin",f"HEAD:{TARGET}"])
print(f"PUBLISHED_SHA={published}",flush=True)

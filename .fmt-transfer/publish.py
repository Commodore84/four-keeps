#!/usr/bin/env python3
from pathlib import Path
import hashlib, subprocess, zlib
BASE="ab5a6991f7ec9e7020de1f998fdf0e4f75770b06"
EXPECTED_TREE="a0c613e2cdbc203b1c9d915b5aeb3c5fbc94acc1"
TARGET="refs/heads/feat/clean-app-shell"
FILES=[
 ("src/app/App.tsx","3fd059e82717dc4193e3a8b54b8de34feb297f5b",["00-0.z","00-1.z","00-2.z","00-3.z"]),
 ("src/app/DMNarration.test.ts","8ac4d6d91170018dad989b10fceea365f5409b56",["01.z"]),
 ("src/app/DMNarration.tsx","097ea6bb2cb73d80fecdeaf80d45dc1b15624039",["02.z"]),
 ("tests/e2e/class-playtests.spec.ts","dbbdee26cb1a0561ce9cb574eff43b5f1a469edc",["03.z"]),
]
def git(*args):
 return subprocess.check_output(["git",*args],text=True).strip()
decoded=[]
for name,expected,parts in FILES:
 data=zlib.decompress(b"".join((Path(".fmt-transfer")/part).read_bytes() for part in parts))
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
subprocess.check_call(["git","-c","user.name=Four Keeps Publisher","-c","user.email=41898282+github-actions[bot]@users.noreply.github.com","commit","-m","Polish opening and format narration paragraphs and dialogue"])
published=git("rev-parse","HEAD")
subprocess.check_call(["git","push","origin",f"HEAD:{TARGET}"])
print(f"PUBLISHED_SHA={published}",flush=True)

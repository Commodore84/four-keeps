#!/usr/bin/env python3
import hashlib, pathlib, subprocess, zlib
BASE="e935d9f04ce28c5793213e04f198449057a7a1f7"
EXPECTED_TREE="187e2e06108e00035fb246882ccf697514c2cb74"
TARGET="refs/heads/feat/clean-app-shell"
def git(*args):
 return subprocess.check_output(["git",*args],text=True).strip()
head=git("ls-remote","origin",TARGET).split()[0]
if head!=BASE:raise RuntimeError(f"Target advanced: {head} != {BASE}")
patch=zlib.decompress(pathlib.Path(".merchant-transfer/changes.z").read_bytes())
subprocess.check_call(["git","checkout","--detach",BASE])
subprocess.run(["git","apply","--index","-"],input=patch,check=True)
tree=git("write-tree")
if tree!=EXPECTED_TREE:raise RuntimeError(f"Tree mismatch: {tree} != {EXPECTED_TREE}")
print("VERIFIED_TREE="+tree,flush=True)
subprocess.check_call(["git","-c","user.name=Four Keeps Publisher","-c","user.email=41898282+github-actions[bot]@users.noreply.github.com","commit","-m","Open merchant browsing immediately and add deterministic multi-item cart"])
published=git("rev-parse","HEAD")
subprocess.check_call(["git","push","origin",f"HEAD:{TARGET}"])
print("PUBLISHED_SHA="+published,flush=True)

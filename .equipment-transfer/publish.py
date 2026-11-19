#!/usr/bin/env python3
import pathlib,subprocess,zlib
BASE="fb531b777ea6d20c35b91911fb5dfb8db3688aa7"
TREE="60f06d39172993c2dded177410a9772c2017a1ec"
TARGET="refs/heads/feat/clean-app-shell"
def git(*args):return subprocess.check_output(["git",*args],text=True).strip()
if git("ls-remote","origin",TARGET).split()[0]!=BASE:raise RuntimeError("Target advanced; refusing to publish")
patch=zlib.decompress(pathlib.Path(".equipment-transfer/changes.z").read_bytes())
subprocess.check_call(["git","checkout","--detach",BASE])
subprocess.run(["git","apply","--index","-"],input=patch,check=True)
if git("write-tree")!=TREE:raise RuntimeError("Exact tree mismatch")
print("VERIFIED_TREE="+TREE,flush=True)
subprocess.check_call(["git","-c","user.name=Four Keeps Publisher","-c","user.email=41898282+github-actions[bot]@users.noreply.github.com","commit","-m","Expand rules-aligned merchant catalogs with searchable settlement stock"])
sha=git("rev-parse","HEAD")
subprocess.check_call(["git","push","origin",f"HEAD:{TARGET}"])
print("PUBLISHED_SHA="+sha,flush=True)

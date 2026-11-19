#!/usr/bin/env python3
import pathlib,subprocess,zlib
BASE="050f32016236d061fbccf45f111883c2a056b71d"
TREE="9886c4f868e16afae4e5f5054b76aa6951475e68"
TARGET="refs/heads/feat/clean-app-shell"
def git(*args):return subprocess.check_output(["git",*args],text=True).strip()
if git("ls-remote","origin",TARGET).split()[0]!=BASE:raise RuntimeError("Target branch advanced; refusing to publish")
patch=zlib.decompress(pathlib.Path(".specialists-transfer/changes.z").read_bytes())
subprocess.check_call(["git","checkout","--detach",BASE])
subprocess.run(["git","apply","--index","-"],input=patch,check=True)
if git("write-tree")!=TREE:raise RuntimeError("Exact tree mismatch")
print("VERIFIED_TREE="+TREE,flush=True)
subprocess.check_call(["git","-c","user.name=Four Keeps Publisher","-c","user.email=41898282+github-actions[bot]@users.noreply.github.com","commit","-m","Partition city equipment among specialists and limit traveling stock"])
sha=git("rev-parse","HEAD")
subprocess.check_call(["git","push","origin",f"HEAD:{TARGET}"])
print("PUBLISHED_SHA="+sha,flush=True)

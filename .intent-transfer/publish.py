#!/usr/bin/env python3
from pathlib import Path
import hashlib, subprocess, zlib
BASE="89614860fef6b6c1eac39e3c2ffc480676d2bf2a"
EXPECTED_TREE="1a5f0d6d6bb5823d59a2cbd9673c4b8b61f0661c"
TARGET="refs/heads/feat/clean-app-shell"
FILES=[
 ("api/dm.js","923534e0de6d910dadc4df4fb0f7e30b41bf25a8",["00.z"]),
 ("src/app/App.tsx","4c50394d5f8647d07ad257a18567927a25462da7",["01-0.z","01-1.z","01-2.z","01-3.z"]),
 ("src/game/frontierShop.test.ts","0eecfd39e8da950c45be6e3f00eff04d5fb27efd",["02.z"]),
 ("src/game/frontierShop.ts","8a865297994e0beb9b84d37e51a550faf08faef1",["03.z"]),
 ("tests/e2e/class-playtests.spec.ts","3360668bf702cd3128595b59c246ac0c03f8a3a6",["04.z"]),
]
def git(*args):
 return subprocess.check_output(["git",*args],text=True).strip()
decoded=[]
for name,expected,parts in FILES:
 data=zlib.decompress(b"".join((Path("/tmp/intent-transfer")/part).read_bytes() for part in parts))
 if name=="src/app/App.tsx":
  before=b"isMerchantBrowseRequest,isMerchantNegotiationRequest"
  after=b"isMerchantNegotiationRequest"
  if data.count(before)!=1:raise RuntimeError("Expected browse import not found exactly once")
  data=data.replace(before,after)
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
subprocess.check_call(["git","-c","user.name=Four Keeps Journal Publisher","-c","user.email=41898282+github-actions[bot]@users.noreply.github.com","commit","-m","Fix DM merchant intent and preserve conversational exploration"])
published=git("rev-parse","HEAD")
subprocess.check_call(["git","push","origin",f"HEAD:{TARGET}"])
print(f"PUBLISHED_SHA={published}",flush=True)

#!/usr/bin/env python3
"""Build read-only public dashboard snapshot using Actions token (no secrets in output)."""
import json, os, urllib.request, datetime, pathlib
repo=os.environ.get("GITHUB_REPOSITORY","Mikejpatterson/NCGS")
token=os.environ["GITHUB_TOKEN"]
base=f"https://api.github.com/repos/{repo}"
headers={"Authorization":f"Bearer {token}","Accept":"application/vnd.github+json","User-Agent":"NCGS-dashboard"}
def get(path):
    with urllib.request.urlopen(urllib.request.Request(base+path,headers=headers),timeout=20) as r:
        return json.load(r)
runs=get("/actions/runs?per_page=55").get("workflow_runs",[])
runs=[{k:r.get(k) for k in ("id","name","status","conclusion","created_at","run_started_at","updated_at","html_url","head_branch","run_number","event")} | {"triggered_by":(r.get("triggering_actor") or r.get("actor") or {}).get("login")} for r in runs]
comments=get("/issues/1/comments?per_page=100")
comments=[{k:c.get(k) for k in ("id","html_url","created_at","body")} | {"author":(c.get("user") or {}).get("login")} for c in comments[-20:]]
commits=get("/commits?sha=design%2Fcrest-editorial-prototype&per_page=7")
commits=[{"url":c.get("html_url"),"message":c.get("commit",{}).get("message","").split("\n")[0],"date":c.get("commit",{}).get("committer",{}).get("date")} for c in commits]
out={"generated_at":datetime.datetime.now(datetime.timezone.utc).isoformat(),"runs":runs,"comments":comments,"commits":commits,"data_source":"GitHub Actions authenticated API"}
dest=pathlib.Path("site/control-centre/status.json")
dest.parent.mkdir(parents=True,exist_ok=True)
dest.write_text(json.dumps(out,separators=(",",":")),encoding="utf-8")
print(f"Wrote {dest} with {len(runs)} runs")

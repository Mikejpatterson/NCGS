#!/usr/bin/env python3
"""Bounded read-only OpenAI review of NCGS design diff; sends one issue comment."""
import json, os, sys, urllib.request, urllib.error

API_KEY = os.environ["OPENAI_API_KEY"]
GITHUB_TOKEN = os.environ["GITHUB_TOKEN"]
REPO = os.environ.get("GITHUB_REPOSITORY", "Mikejpatterson/NCGS")
BASE = "main"
HEAD = "design/crest-editorial-prototype"
ISSUE = 1
MODEL = os.environ.get("OPENAI_REVIEW_MODEL", "gpt-5-mini")

def get(url, headers):
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=45) as resp:
        return json.load(resp)

def post(url, payload, headers, timeout=100):
    req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.load(resp)

gh_headers={"Authorization": "Bearer "+GITHUB_TOKEN, "Accept":"application/vnd.github+json", "X-GitHub-Api-Version":"2022-11-28"}
api="https://api.github.com/repos/"+REPO
compare=get(api+"/compare/"+BASE+"..."+HEAD,gh_headers)
files=compare.get("files",[])
safe_paths=[f for f in files if f.get("filename","").startswith(("src/","docs/","CLAUDE.md","build.js"))]
diff="\n\n".join("### "+f["filename"]+"\n"+f.get("patch","[binary or patch unavailable]")[:9000] for f in safe_paths)[:42000]
if not diff:
    print("No reviewable textual changes");sys.exit(0)

def local(path, max_len=12000):
    try:
        with open(path,encoding="utf-8") as f:return f.read()[:max_len]
    except FileNotFoundError:return "[unavailable]"

instructions="""You are an independent design-and-engineering reviewer of NCGS.
Challenge design assumptions and unsafe CSS selectors. Ground findings in supplied diff;
distinguish demonstrated defects from risks. Focus on phone usability, score integrity,
the current scoring header imbalance, Buggy Wars team colours, typography, responsive layout,
offline behavior, and the requirement not to change scoring logic. The crest must match
an approved production vector that has NOT been integrated; do not claim otherwise.
Respond in Markdown, maximum 900 words, with: (1) severity-ranked findings with filenames,
(2) challenges to Claude and concrete alternatives, (3) verification plan, (4) disagreements
requiring owner decision. If insufficient evidence, explicitly say so.
Do not output credentials or private user data. Never instruct auto-merge or deployment."""

user_text=(
"Review the current NCGS design branch against main. This is a planning/review pass, not permission to deploy.\n"
+"Requirements:\n"+local("CLAUDE.md",7500)+"\n"
+"Editorial brief:\n"+local("docs/EDITORIAL-PROTOTYPE.md",4500)+"\n"
+"Code diff (truncated):\n"+diff)
request={"model":MODEL,"instructions":instructions,"input":user_text,"max_output_tokens":1900}
try:
    result=post("https://api.openai.com/v1/responses",request,
        {"Authorization":"Bearer "+API_KEY,"Content-Type":"application/json"},timeout=110)
except urllib.error.HTTPError as exc:
    print("OpenAI API request failed HTTP",exc.code, "(check billing, model and key permissions)")
    sys.exit(1)

parts=[]
for item in result.get("output",[]):
    for section in item.get("content",[]):
        if section.get("type")=="output_text":parts.append(section.get("text",""))
review="\n".join(parts).strip()
if not review:
    print("No text returned; response status:", result.get("status"))
    sys.exit(1)
head_sha=compare.get("commits", [{}])[-1].get("sha","unknown") if compare.get("commits") else "unknown"
comment=("## OpenAI independent review — automated dry run\n\n"
    +"**Model:** "+MODEL+" | **Branch:** `"+HEAD+"` | **Head SHA:** `"+head_sha[:12]+"`\n\n"
    +"This is an independent reviewer, not the ChatGPT conversation. Findings require Claude's response and human review.\n\n"
    +review[:14000]+"\n\n@claude Please challenge these findings in this issue before implementing fixes. Do not merge or deploy.")
posted=post(api+"/issues/"+str(ISSUE)+"/comments",{"body":comment},gh_headers,timeout=45)
print("Posted OpenAI review to GitHub Issue #1:",posted.get("html_url","(URL unavailable)"))

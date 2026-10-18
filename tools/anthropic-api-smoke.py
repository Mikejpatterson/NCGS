import json, os, sys, urllib.request, urllib.error

key=os.environ.get("ANTHROPIC_API_KEY","")
if not key:
    print("Anthropic diagnostic: API key is missing");sys.exit(1)
headers={"x-api-key":key,"anthropic-version":"2023-06-01","content-type":"application/json"}
def request(url,payload=None):
    req=urllib.request.Request(url,headers=headers,data=json.dumps(payload).encode() if payload else None,method="POST" if payload else "GET")
    try:
        with urllib.request.urlopen(req,timeout=35) as r:return json.load(r)
    except urllib.error.HTTPError as e:
        try:
            detail=json.loads(e.read().decode()).get("error",{})
            print("Anthropic API HTTP",e.code,"error type:",detail.get("type","unknown"))
            # Don't emit message details that might contain account identifiers.
        except Exception: print("Anthropic API HTTP",e.code)
        sys.exit(1)

models=request("https://api.anthropic.com/v1/models?limit=100").get("data",[])
ids=[m.get("id","") for m in models]
candidate=next((m for m in ids if "sonnet" in m.lower()), None)
if not candidate: candidate=next((m for m in ids if "haiku" in m.lower()),None)
if not candidate:
    print("Anthropic diagnostic: no Sonnet or Haiku model visible");sys.exit(1)
print("Anthropic model catalogue accessible; checking minimal completion")
out=request("https://api.anthropic.com/v1/messages",{"model":candidate,"max_tokens":16,"messages":[{"role":"user","content":"Reply OK"}]})
print("Anthropic minimal completion status:",out.get("stop_reason","unknown"),"; model execution succeeded")

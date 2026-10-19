#!/usr/bin/env python3
"""The agents' to-do list: .github/agent-queue.md on the design branch.

Format: one task per level-2 heading, the body underneath is the instruction.
    ## [ ] header-proposal (pause)
    Instruction text, as long as needed.
    ## [x] done-task
"[ ]" waits, "[x]" is done. "(pause)" means: after this task is approved, stop and ask the owner to look
before starting the next one. The coding agent cannot edit this file (.github/ is protected); the owner and
ChatGPT edit it; the workflow ticks tasks off.

    queue.py next <file> <task.md out>   prints the id of the next waiting task and writes its text (exit 3 if none)
    queue.py done <file> <id>            ticks the task off in place
    queue.py get <file> <id> <task.md>   writes that waiting task's text (exit 3 if missing or done)
    queue.py info <file> <id>            prints "pause" or "go"
"""
import re, sys

HEAD = re.compile(r'^## \[( |x|X)\] +([A-Za-z0-9._-]+)(.*)$')


def parse(path):
    items, cur = [], None
    for line in open(path, encoding="utf-8").read().splitlines():
        m = HEAD.match(line)
        if m:
            cur = {"id": m.group(2), "done": m.group(1).lower() == "x", "pause": "(pause)" in m.group(3).lower(), "body": []}
            items.append(cur)
        elif cur is not None:
            cur["body"].append(line)
    for it in items:
        it["text"] = "\n".join(it["body"]).strip()
    return items


def main():
    cmd, path = sys.argv[1], sys.argv[2]
    items = parse(path)
    if cmd == "next":
        for it in items:
            if not it["done"] and it["text"]:
                open(sys.argv[3], "w", encoding="utf-8").write(it["text"] + "\n")
                print(it["id"])
                return
        sys.exit(3)
    if cmd == "get":
        it = next((i for i in items if i["id"] == sys.argv[3] and not i["done"]), None)
        if not it:
            sys.exit(3)
        open(sys.argv[4], "w", encoding="utf-8").write(it["text"] + "\n")
        print(it["id"])
        return
    if cmd == "info":
        it = next((i for i in items if i["id"] == sys.argv[3]), None)
        print("pause" if it and it["pause"] else "go")
        return
    if cmd == "done":
        tid = sys.argv[3]
        lines = open(path, encoding="utf-8").read().splitlines(keepends=True)
        for n, line in enumerate(lines):
            m = HEAD.match(line.rstrip("\n"))
            if m and m.group(2) == tid:
                lines[n] = line.replace("[ ]", "[x]", 1)
                open(path, "w", encoding="utf-8").writelines(lines)
                return
        sys.exit(4)


if __name__ == "__main__":
    main()

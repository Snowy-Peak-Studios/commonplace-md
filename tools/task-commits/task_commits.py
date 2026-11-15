"""Adds commits to the tasks they were made for.

A commit is for a task when its message starts with the task's ID: `T-12: ...`, or `T-11, T-12: ...` for
several tasks. Each such commit is added to the task's `commits` property as one line,
`"[abc1234](https://github.com/owner/repo/commit/<sha>) T-12: the first line of the message"`, oldest
first. Commonplace.md shows them on the task's page. Commits made from the app itself (their message ends
with "from Commonplace.md": claims, field changes) are left out.

    python task_commits.py --event "$GITHUB_EVENT_PATH"   # the commits of one push (the GitHub Action)
    python task_commits.py --all                          # every commit on the branch (once, to fill old tasks)

Run it at the repo's root. The vault's folder and its tasks folder come from `.commonplace.json` (`folder`,
`tasks.folder`), else the root and `Tasks`. A task is a `.md` file in the tasks folder (or below it) with
an `id` property. Files are written UTF-8 with LF line endings. No packages needed.
"""

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path

APP_SUFFIX = "from Commonplace.md"
ID_RUN = re.compile(r"^\s*([A-Za-z][A-Za-z0-9]*-\d+(?:(?:\s*[,&/]\s*|\s+and\s+)[A-Za-z][A-Za-z0-9]*-\d+)*)(?![\w-])")
ID_SPLIT = re.compile(r"\s*[,&/]\s*|\s+and\s+")
TITLE_MAX = 100


def task_ids(message):
    """The task IDs a commit message starts with, in lower case."""
    first = (message or "").split("\n", 1)[0]
    m = ID_RUN.match(first)
    return [x.lower() for x in ID_SPLIT.split(m.group(1))] if m else []


def entry(repo, sha, message):
    """A commit as one line of the `commits` list (a quoted YAML string)."""
    title = (message or "").split("\n", 1)[0].strip()
    if len(title) > TITLE_MAX:
        title = title[: TITLE_MAX - 1].rstrip() + "…"
    text = f"[{sha[:7]}](https://github.com/{repo}/commit/{sha}) {title}"
    return '"' + text.replace("\\", "\\\\").replace('"', '\\"') + '"'


def front_matter(lines):
    """The index of the front matter's closing `---`, or None when the note has none."""
    if not lines or lines[0].strip() != "---":
        return None
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            return i
    return None


def add_commits(text, entries):
    """The note's text with `entries` added to its `commits` list (those already there are skipped)."""
    entries = [e for e in entries if e.split(")", 1)[0].rsplit("/", 1)[-1] not in text]
    if not entries:
        return text
    lines = text.split("\n")
    end = front_matter(lines)
    if end is None:
        return text
    items = [f"  - {e}" for e in entries]
    key = next((i for i in range(1, end) if re.match(r"^commits\s*:", lines[i])), None)
    if key is not None:
        rest = lines[key].split(":", 1)[1].strip()
        if rest and rest not in ('""', "''", "[]"):
            # A value on the key's own line: keep it as the list's first item.
            items.insert(0, f"  - {rest}")
            lines[key] = "commits:"
            lines[key + 1:key + 1] = items
            return "\n".join(lines)
        lines[key] = "commits:"
        last = key
        while last + 1 < end and re.match(r"^\s*-\s", lines[last + 1]):
            last += 1
        lines[last + 1:last + 1] = items
        return "\n".join(lines)
    # A new list goes after `type` (else before `work_time`, else at the end): lines that rarely change, so a
    # person's or an agent's own edit of the task (status, assignee, work time) doesn't clash with it in git.
    after = next((i for i in range(1, end) if re.match(r"^type\s*:", lines[i])), None)
    at = after + 1 if after is not None else next((i for i in range(1, end) if re.match(r"^work_time\s*:", lines[i])), end)
    lines[at:at] = ["commits:"] + items
    return "\n".join(lines)


def settings(root):
    folder, tasks = "", "Tasks"
    marker = root / ".commonplace.json"
    if marker.exists():
        data = json.loads(marker.read_text(encoding="utf-8"))
        folder = (data.get("folder") or "").strip("/")
        tasks = ((data.get("tasks") or {}).get("folder") or tasks).strip("/")
    return root / folder / tasks


def find_tasks(folder):
    """Task ID (lower case) -> path, from each note's `id` property."""
    found = {}
    for path in sorted(folder.rglob("*.md")) if folder.exists() else []:
        lines = path.read_text(encoding="utf-8").split("\n")
        end = front_matter(lines)
        for line in lines[1:end or 0]:
            m = re.match(r"""^id\s*:\s*["']?([^"'\s#]+)""", line)
            if m:
                found.setdefault(m.group(1).lower(), path)
                break
    return found


def push_commits(event_path):
    event = json.loads(Path(event_path).read_text(encoding="utf-8"))
    return [(c["id"], c.get("message", "")) for c in event.get("commits", [])]


def all_commits():
    out = subprocess.run(["git", "log", "--reverse", "--format=%H%x00%B%x01"], capture_output=True, check=True).stdout
    commits = []
    for chunk in out.decode("utf-8", "replace").split("\x01"):
        if "\x00" in chunk:
            sha, message = chunk.strip("\n").split("\x00", 1)
            commits.append((sha.strip(), message.strip()))
    return commits


def repo_name():
    if os.environ.get("GITHUB_REPOSITORY"):
        return os.environ["GITHUB_REPOSITORY"]
    url = subprocess.run(["git", "remote", "get-url", "origin"], capture_output=True, text=True, check=True).stdout.strip()
    m = re.search(r"github\.com[:/]([^/]+/[^/]+?)(?:\.git)?$", url)
    if not m:
        sys.exit(f"Can't tell the GitHub repo from {url}; pass --repo owner/name.")
    return m.group(1)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--event", help="the push event's JSON (GITHUB_EVENT_PATH)")
    src.add_argument("--all", action="store_true", help="every commit on the branch")
    ap.add_argument("--repo", help="owner/name (default: GITHUB_REPOSITORY, else the origin remote)")
    args = ap.parse_args()

    root = Path.cwd()
    repo = args.repo or repo_name()
    tasks = find_tasks(settings(root))
    commits = push_commits(args.event) if args.event else all_commits()

    wanted = {}
    for sha, message in commits:
        if message.split("\n", 1)[0].rstrip().endswith(APP_SUFFIX):
            continue
        for task_id in task_ids(message):
            if task_id in tasks:
                wanted.setdefault(tasks[task_id], []).append(entry(repo, sha, message))

    changed = []
    for path, entries in wanted.items():
        text = path.read_text(encoding="utf-8")
        new = add_commits(text, entries)
        if new != text:
            with open(path, "w", encoding="utf-8", newline="") as f:
                f.write(new)
            changed.append(path)
    for path in changed:
        print(path.relative_to(root).as_posix())


if __name__ == "__main__":
    main()

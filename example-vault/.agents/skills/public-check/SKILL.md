---
name: public-check
description: Before a push to a public repo, check that nothing private goes out - people's names, emails, tokens, private repo and project names, local paths, task IDs - in the files and in the commits' authors and messages. Use before every push to a public repo, or when your person asks for a privacy check.
---

# Check before a public push

A push to a public repo can't be taken back: forks and caches keep it. Run this in the public repo's clone before every push, and push only when it's clean.

## 1. The private list

- Your person keeps a list of what must never go public, in their **private** notes (for example a page "Public and Private" in their private vault). Never in the public repo.
- If there's none yet, ask them for it and offer to write it there: people's names, emails and logins (other than the public commit author), private repo and project names, company and client names, local paths, the form of their task IDs.

## 2. The files

Every tracked file, the third-party code too. Each command must print nothing.

```sh
# Private words. Short words get word edges (\b) so they don't match inside other words.
git grep -n -I -i -E 'first name|last name|\bshortword\b|private-repo|example@mail\.com|C:\\Users'

# Task IDs from the private notes (here, IDs like T-7). Leave out minified third-party code if it matches.
git grep -n -I -E '\bT-[0-9]+\b'

# Tokens and keys
git grep -n -I -E 'gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY'
```

## 3. The commits about to go out

```sh
# Messages, authors and committers
git log --format='%an <%ae> | %cn <%ce>%n%B' origin/<branch>..HEAD | grep -i -E '<the same private words and ID pattern>'

# Every author is the public identity
git log --format='%an <%ae>' origin/<branch>..HEAD | sort -u
```

## 4. Fix before you push

- A private word in a file: change the file and commit the fix.
- A private word in a commit message or author that isn't pushed yet: ask your person before you rewrite those commits. Never rewrite pushed ones.
- Never push now to fix it later.
- When something new turns private (a new person, a new private repo), add it to the list.

## 5. Report

What you checked, and that it's clean, or what you found and fixed. Push only when it's clean and your person has said to push.

---
parent: "[[How To]]"
---

# Add a vault

> [!TIP]
> **tl;dr:** A vault is a GitHub repo (or a folder in one) with your notes. It comes into the app by itself, through an invite link, or by hand in **Settings**.

A vault is a GitHub repo (or a folder in one) that holds your notes. There are three ways to get one into the app.

## By itself

If the repo has a `.commonplace.json` file at its top, the app finds it when it opens (at most once an hour), with its settings, for everyone whose token can save to it. To look at once: **Settings › Look for vaults**.

To make that file for a repo you already added: **Settings**, open the repo, press **Share with everyone**. It's one commit.

## With an invite link

Someone who has the repo presses **Copy invite link** in **Settings** and sends it. The link opens the app with the repo's settings filled in. It carries no token and no notes: see [Invite someone](Invite%20someone.md).

## By hand

1. **Settings › Notes repos › Add a repo**.
2. Fill in **Owner** and **Repo**. For a vault like this one, also:
   - **Start page**: `Home.md`
   - **Inbox page**: `Notes/Inbox.md`
   - **Inboxes folder**: `Notes/Inboxes`
   - **New notes folder**: `Notes`
   - **Note template**: `Templates/Note.md`
   - **Vault rules**: on
   - **Folder**: only if the vault is in a folder of the repo.
3. Press **Save repos**, then **Check access**.

## What you see

The repo is in the list at the top of the files. Pick it there to switch between vaults; the last one opens next time.

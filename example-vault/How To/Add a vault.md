---
parent: "[[How To]]"
---

# Add a vault

> [!TIP]
> **tl;dr:** A vault is a GitHub repo (or a folder in one) with your notes. It comes into the app by itself, through an invite link, or by hand in **Settings**. A vault can also be only on this device, with no GitHub at all.

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

## Only on this device

A local vault needs no GitHub account and no token. Its notes are not on GitHub and not on your other devices.

1. **Settings › Notes repos › Add a vault on this device** (or on the first page, before you connect GitHub).
2. In Chrome and Edge on a computer, pick one:
   - **Create a new vault**: a name, **Pick a location**, and empty or these example notes. A new folder with the vault's name is made there.
   - **Open a folder as a vault**: **Pick the folder** of notes you already have. It opens as it is.
3. The notes are real `.md` files your agent can read and change. **Reload** shows their changes. The browser asks once each time it's opened before it lets the app in.

In Firefox, Safari and on phones (or if you pick **In this browser**), a new vault is kept in the browser: it's lost if the browser's data is cleared, so press **Download a copy** now and then.

**Save** saves on the device. The vault says *on this device* in the list, and a line above the note says it's only here.

## A copy on this device

Every vault on GitHub is also kept on the device, so it opens with no connection; a line above the note says so. In Chrome and Edge on a computer, **Settings**, open the repo, **Keep it in a folder** keeps that copy in a folder instead (like the repo's clone): other tools read the same files, and each commit updates them. A file changed there by another tool is marked **Not on GitHub** and never overwritten; **Upload** sends it.

With no connection, **Save** keeps the note on the device, marked **Waiting to upload**, and it goes to GitHub by itself when the connection is back. See [Save, drafts and conflicts](Save%2C%20drafts%20and%20conflicts.md).

## What you see

The repo is in the list at the top of the files. Pick it there to switch between vaults; the last one opens next time.

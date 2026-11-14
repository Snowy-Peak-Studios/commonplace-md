---
parent: "[[How To]]"
---

# Connect to GitHub

The app reads and saves your notes with a token: a key you make on GitHub that opens only the repos you pick. It stays on your device and goes only to GitHub.

## Make a token

1. Open [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new).
2. **Resource owner**: you, or the organization that owns your notes repo.
3. **Repository access**: *Only select repositories*, and pick your notes repo (or several).
4. **Repository permissions › Contents**: *Read and write* (or *Read-only* for a device that only reads).
5. Press **Generate token** and copy it.

Make one token per device, so you can take one back without the others.

## Paste it

1. Open the app. The first time, it asks for the token.
2. Paste it and press **Connect**. The app checks it with GitHub before it keeps it.

## What you see

The app goes on to [add a vault](Add%20a%20vault.md), or opens one an invite link brought you.

- **An organization's repo** may need an owner to approve the token first (the organization's **Settings › Personal access tokens › Pending requests**). Until then the app says it can't find the repo.
- **A new token later**: **Settings › GitHub**: paste it and press **Save token**. **Disconnect** takes the token off the device; unsaved drafts stay.

# Privacy and security

[README](../README.md) · [Getting started](getting-started.md) · [Block reference](blocks.md)

- The tokens are kept in this browser's storage (`localStorage`) on this device, and are sent only to `api.github.com`; each repo's requests carry its owner's token. Anyone who can use this browser profile could read it, so revoke it on GitHub if a device is lost.
- Make tokens for the notes repos only (*Only select repositories*), with *Contents* as the only permission.
- A local vault's notes stay on the device: in the folder you picked, or in this browser's storage (IndexedDB). They're never sent anywhere.
- A GitHub vault's copy on the device is kept the same way (IndexedDB, or the folder you picked), and only ever filled from GitHub with the same token. **Settings › This device** shows how much each takes, and drops it.
- The page's Content Security Policy lets it connect to `api.github.com` and to the app's own site (for the example notes a new local vault can start with) only. There's no server, no analytics and no account of ours. (An image a note links from the web loads from that site. A PDF is shown from a copy in the page's own memory, never from another site.)
- The app's repo holds code only. Your notes are in your repo, private if you made it private; GitHub Pages serves only the app.
- Unsaved drafts stay in this browser until saved or discarded (**Settings › This device**). The released version and the one in development share this browser's storage (the same token, settings and drafts), and each keeps its own offline copy of the app.

// The download's pieces, with no file access: the page, the packed example notes, and the read-me.

/** The released page, changed to run from the disk: plain scripts, no network, nothing to install. */
export function downloadIndex(html) {
  const moduleTag = '<script type="module" src="src/app.js"></script>';
  if (!html.includes(moduleTag)) throw new Error(`index.html has no ${moduleTag}`);
  const csp = "connect-src 'self' https://api.github.com;";
  if (!html.includes(csp)) throw new Error(`index.html's Content Security Policy has no ${csp}`);
  return html
    // Chrome and Edge refuse module scripts from a file:// page; plain scripts run (deferred, as a module is).
    .replace(moduleTag, '<script defer src="vault-data.js"></script>\n  <script defer src="app.js"></script>')
    // Nothing in the download talks to the network, GitHub included.
    .replace(csp, "connect-src 'none';")
    // A page from the disk can't be installed as an app.
    .replace(/\s*<link rel="manifest"[^>]*>/, "");
}

/** The packed starters: one plain script setting `globalThis.COMMONPLACE_PACKED` (each path's bytes in base64). */
export function packedScript(files) {
  const packed = {};
  for (const { path, bytes } of [...files].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))) {
    packed[path] = Buffer.from(bytes).toString("base64");
  }
  return `// The example notes, packed for the download (a page from the disk can't fetch its own files).\nglobalThis.COMMONPLACE_PACKED = ${JSON.stringify(packed)};\n`;
}

/** What the zip's read-me says. */
export function readMe(version) {
  return `Commonplace.md ${version}: the download to try it out

Open index.html in Chrome or Edge (double-click it, or drag it into the browser).
It needs no GitHub account, no token and no internet. It opens the example notes, and you
can change them: your changes are kept only in this browser, on this device, and never go
to GitHub. Settings > Download a copy saves them as a zip.

To keep your own notes on GitHub and use them on every device, set it up with GitHub:
https://github.com/Snowy-Peak-Studios/commonplace-md/blob/main/docs/getting-started.md#set-it-up-with-github
For a team, an organization or a developer, we recommend that full setup.
`;
}

# Third-party code in vendor/

`vendor.js` is built by `tools/vendor` from these npm packages (exact versions in `tools/vendor/package-lock.json`):

| Package | License |
|---|---|
| CodeMirror 6 (`@codemirror/*`, `@lezer/*`, `style-mod`, `w3c-keyname`, `crelt`) | MIT |
| markdown-it (with `linkify-it`, `mdurl`, `uc.micro`, `punycode.js`) | MIT |
| `entities` (used by markdown-it) | BSD-2-Clause |
| DOMPurify | Apache-2.0 or MPL-2.0 |
| js-yaml | MIT |
| Lucide icons (`lucide`) | ISC |

`mermaid.min.js` is Mermaid's own prebuilt bundle (`mermaid`, exact version in `tools/vendor/package.json`), copied as it is. Its license notices, and those of the packages it bundles, are at the end of the file.

| Package | License |
|---|---|
| Mermaid (`mermaid`) | MIT |

Each package's full license text is in its folder under `tools/vendor/node_modules/` after `npm install`.

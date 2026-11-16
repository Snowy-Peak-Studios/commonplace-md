// The GitHub REST API (and a little GraphQL), straight from the browser (api.github.com allows it through CORS).

const API = "https://api.github.com";

export class GitHubError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
  /** GitHub refuses a save whose `sha` is no longer the file's current one. */
  get isConflict() {
    return this.status === 409 || (this.status === 422 && /sha/i.test(this.message));
  }
}

const encodePath = (path) => path.split("/").map(encodeURIComponent).join("/");

export function encodeBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** The sha git gives a file (its text, or its bytes): SHA-1 of "blob <bytes>\0" and the bytes, as the tree lists it. */
export async function blobSha(text) {
  const body = typeof text === "string" ? new TextEncoder().encode(text) : new Uint8Array(text);
  const head = new TextEncoder().encode(`blob ${body.length}\0`);
  const all = new Uint8Array(head.length + body.length);
  all.set(head);
  all.set(body, head.length);
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-1", all));
  return [...hash].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function decodeBase64(b64) {
  const bin = atob(b64.replace(/\s/g, ""));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder("utf-8").decode(bytes);
}

/** The owner a REST path is about, in lower case: `/repos/<owner>/...` -> owner; "" for any other path. */
export function ownerOfPath(path) {
  const m = /^\/repos\/([^/?#]+)\//.exec(String(path ?? ""));
  if (!m) return "";
  try { return decodeURIComponent(m[1]).toLowerCase(); } catch { return m[1].toLowerCase(); }
}

/**
 * GitHub's page for a new fine-grained token, filled in for one owner: a name, a description, the resource
 * owner (`target_name`), Contents read and write (or read only) and how many days it lasts. The person still
 * picks the repos and presses Generate token: GitHub has no way to pick repos from a link.
 */
export function newTokenUrl({ owner = "", name = "Commonplace.md", write = true, days = 366 } = {}) {
  const p = new URLSearchParams({ name: String(name).slice(0, 40),
    description: `For Commonplace.md on one device: it reads${write ? " and saves" : ""} the notes in the repos picked below.` });
  if (owner) p.set("target_name", owner);
  p.set("expires_in", String(days));
  p.set("contents", write ? "write" : "read");
  return `https://github.com/settings/personal-access-tokens/new?${p}`;
}

export class GitHub {
  /**
   * `token` is the device's main token; `tokens` ({ owner in lower case: token }) are its tokens for other
   * owners. A fine-grained token opens one owner's repos, so each request about a repo goes with its owner's.
   */
  constructor(token, tokens = {}) {
    this.token = token;
    this.tokens = tokens;
  }

  /** The token for an owner's repos: this device's own token for that owner, else the main one. */
  tokenFor(owner = "") {
    return (owner && this.tokens[String(owner).toLowerCase()]) || this.token;
  }

  async request(method, path, { body, accept, as = "json", owner } = {}) {
    let res;
    try {
      res = await fetch(API + path, {
        method,
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${this.tokenFor(owner ?? ownerOfPath(path))}`,
          Accept: accept || "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new GitHubError(0, "Can't reach GitHub. Check the connection.");
    }
    if (!res.ok) {
      let message = res.statusText;
      try { message = (await res.json()).message || message; } catch { /* not JSON */ }
      if (res.status === 401) message = "GitHub didn't accept the token. Paste a new one in Settings.";
      throw new GitHubError(res.status, message);
    }
    if (as === "blob") return res.blob();
    return res.status === 204 ? null : res.json();
  }

  user() {
    return this.request("GET", "/user");
  }

  /** The repos this token can see, the most recently pushed first: up to `pages` requests of 100. */
  async listRepos(pages = 3) {
    const all = [];
    for (let page = 1; page <= pages; page++) {
      const batch = await this.request("GET", `/user/repos?per_page=100&sort=pushed&page=${page}`);
      all.push(...batch);
      if (batch.length < 100) break;
    }
    return all;
  }

  repo(r) {
    return this.request("GET", `/repos/${r.owner}/${r.repo}`);
  }

  branch(r) {
    return this.request("GET", `/repos/${r.owner}/${r.repo}/branches/${encodeURIComponent(r.branch)}`);
  }

  /** Every file of the branch (or of one commit, by its sha) in one request. */
  tree(r, ref = r.branch) {
    return this.request("GET", `/repos/${r.owner}/${r.repo}/git/trees/${encodeURIComponent(ref)}?recursive=1`);
  }

  /**
   * The branch's latest commit sha, asked cheaply: just the sha, and with the last answer's ETag an
   * unchanged branch answers 304 Not Modified, which GitHub doesn't count against the rate limit.
   * Resolves to { sha, etag }, with `sha` null when nothing changed since that ETag.
   */
  async headSha(r, etag = null) {
    let res;
    try {
      res = await fetch(`${API}/repos/${r.owner}/${r.repo}/commits/${encodeURIComponent(r.branch)}`, {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${this.tokenFor(r.owner)}`,
          Accept: "application/vnd.github.sha",
          "X-GitHub-Api-Version": "2022-11-28",
          ...(etag ? { "If-None-Match": etag } : {}),
        },
      });
    } catch {
      throw new GitHubError(0, "Can't reach GitHub. Check the connection.");
    }
    if (res.status === 304) return { sha: null, etag };
    if (!res.ok) throw new GitHubError(res.status, res.statusText);
    return { sha: (await res.text()).trim(), etag: res.headers.get("ETag") };
  }

  async readText(r, path) {
    const data = await this.request("GET", `/repos/${r.owner}/${r.repo}/contents/${encodePath(path)}?ref=${encodeURIComponent(r.branch)}`);
    if (Array.isArray(data)) throw new GitHubError(400, `${path} is a folder.`);
    // Files over 1 MB come without their content; the blob API serves them.
    const b64 = data.content || (data.size ? (await this.request("GET", `/repos/${r.owner}/${r.repo}/git/blobs/${data.sha}`)).content : "");
    return { text: decodeBase64(b64), sha: data.sha };
  }

  /** A file's bytes by its blob sha (images in a private repo need the token, so no raw URL). */
  readBlob(r, sha) {
    return this.request("GET", `/repos/${r.owner}/${r.repo}/git/blobs/${sha}`, { accept: "application/vnd.github.raw+json", as: "blob" });
  }

  /** A text file by its blob sha. */
  async readBlobText(r, sha) {
    const data = await this.request("GET", `/repos/${r.owner}/${r.repo}/git/blobs/${sha}`);
    return decodeBase64(data.content || "");
  }

  /**
   * GitHub's GraphQL API: many files or histories in one request. Partial answers come back as they are.
   * It goes with the token for `owner` (by default the `owner` variable), else the main one.
   */
  async graphql(query, variables = {}, owner = variables.owner) {
    const res = await this.request("POST", "/graphql", { body: { query, variables }, owner: owner ?? "" });
    if (!res?.data) throw new GitHubError(200, res?.errors?.[0]?.message || "GitHub's GraphQL API sent nothing back.");
    return res.data;
  }

  /** One commit per save. Without a `sha` it creates the file; with a stale one GitHub refuses. */
  async writeText(r, path, text, sha, message) {
    const body = { message, content: encodeBase64(text), branch: r.branch };
    if (sha) body.sha = sha;
    const data = await this.request("PUT", `/repos/${r.owner}/${r.repo}/contents/${encodePath(path)}`, { body });
    return { sha: data.content.sha, commit: data.commit.sha, parent: data.commit.parents?.[0]?.sha ?? null };
  }

  /**
   * Several text files in one commit, through the Git data API: a tree on top of the branch's latest commit,
   * a commit, and the branch moved to it. If someone pushed in the meantime, GitHub refuses to move the
   * branch (it isn't a fast-forward), so nothing is overwritten. Resolves to { commit, parent, shas } with
   * each file's new blob sha.
   */
  async commitFiles(r, files, message) {
    const base = `/repos/${r.owner}/${r.repo}/git`;
    const ref = await this.request("GET", `${base}/ref/heads/${encodePath(r.branch)}`);
    const parent = ref.object.sha;
    const head = await this.request("GET", `${base}/commits/${parent}`);
    const tree = await this.request("POST", `${base}/trees`, {
      body: { base_tree: head.tree.sha, tree: files.map((f) => ({ path: f.path, mode: "100644", type: "blob", content: f.text })) },
    });
    const made = await this.request("POST", `${base}/commits`, { body: { message, tree: tree.sha, parents: [parent] } });
    await this.request("PATCH", `${base}/refs/heads/${encodePath(r.branch)}`, { body: { sha: made.sha } });
    const shas = {};
    for (const f of files) shas[f.path] = await blobSha(f.text);
    return { commit: made.sha, parent, shas };
  }

  /** GitHub's code search; it only covers the repo's default branch and lags a little behind. */
  searchCode(r, query) {
    const q = `${query} repo:${r.owner}/${r.repo}` + (r.folder ? ` path:${r.folder}` : "");
    return this.request("GET", `/search/code?per_page=50&q=${encodeURIComponent(q)}`);
  }
}

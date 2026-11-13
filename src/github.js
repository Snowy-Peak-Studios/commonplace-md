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

export function decodeBase64(b64) {
  const bin = atob(b64.replace(/\s/g, ""));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder("utf-8").decode(bytes);
}

export class GitHub {
  constructor(token) {
    this.token = token;
  }

  async request(method, path, { body, accept, as = "json" } = {}) {
    let res;
    try {
      res = await fetch(API + path, {
        method,
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${this.token}`,
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
          Authorization: `Bearer ${this.token}`,
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

  /** GitHub's GraphQL API: many files or histories in one request. Partial answers come back as they are. */
  async graphql(query, variables = {}) {
    const res = await this.request("POST", "/graphql", { body: { query, variables } });
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

  /** GitHub's code search; it only covers the repo's default branch and lags a little behind. */
  searchCode(r, query) {
    const q = `${query} repo:${r.owner}/${r.repo}` + (r.folder ? ` path:${r.folder}` : "");
    return this.request("GET", `/search/code?per_page=50&q=${encodeURIComponent(q)}`);
  }
}

// Loaded only for the optional private inbox overview or its explicit setup action.
import { overviewOptions, overviewRows, overviewEach, resolveOverviewSource, sourceKey, overviewSource,
  overviewBlock, writeOverviewNote, overviewContents, overviewPath, overviewOwnerProblem, OVERVIEW_KINDS } from "./inbox-overview.js";
export { overviewOptions, overviewSource, writeOverviewNote, overviewContents, overviewPath };

const LABELS = { reviews: "For review", questions: "Questions", assignments: "Assignments", mentions: "Mentions", "new-tasks": "New tasks" };
const STATES = { loading: "Reading…", current: "Current", offline: "Offline copy", stale: "Stale · unavailable", access: "Access needed", permission: "Folder permission needed", setup: "Setup needed", disabled: "Inboxes disabled", unavailable: "Unavailable", partial: "Incomplete copy" };

export function mountOverview(el, optionsText, api) {
  const { h, fill, icon } = api;
  let options;
  try { options = overviewOptions(optionsText); } catch (e) { fill(el, h("p", { class: "note error" }, e.message)); return; }
  let generation = 0;
  const entries = options.sources.map((source) => ({ source, state: "loading", rows: [], snapshot: null, files: new Map(), repo: null }));
  const current = (g) => generation === g && api.current();
  const list = h("div", { class: "overview-items", "aria-live": "polite" });
  const statuses = h("ul", { class: "overview-sources", "aria-label": "Source status" });
  const summary = h("p", { class: "muted overview-summary" });
  const sourceSummary = h("summary", {}, "Selected sources");
  const sourceDetails = h("details", { class: "overview-source-status" }, sourceSummary, statuses);
  const button = h("button", { type: "button", class: "btn small", onclick: () => refresh() }, icon("reload"), "Refresh selected vaults");
  const box = h("section", { class: "attention inbox-overview", "aria-label": `Inbox overview: ${options.context}` },
    h("div", { class: "suggest-head" }, icon("inbox"), h("strong", {}, options.context), button),
    h("p", { class: "muted" }, "Read-only · open an item to act in its source vault"), summary, sourceDetails, list);
  fill(el, box);
  const sourceLabel = (entry) => entry.repo?.label || (entry.source.kind === "github" ? `${entry.source.owner}/${entry.source.repo}` : entry.source.vault);
  const origin = (entry) => entry.source.kind === "github" ? `${entry.source.owner}/${entry.source.repo} · ${entry.source.branch} · ${entry.source.folder || "/"}` : "Only on this device";
  const render = () => {
    if (!api.current()) return;
    fill(statuses, ...entries.map((entry) => h("li", {},
      h("strong", {}, sourceLabel(entry)), h("span", { class: "chip" }, STATES[entry.state] || entry.state),
      h("small", { class: "muted" }, origin(entry)),
      entry.checkedAt ? h("small", { class: "muted" }, `Checked ${new Date(entry.checkedAt).toLocaleString()}`) : null,
      entry.message ? h("span", { class: "overview-detail" }, entry.message) : null,
      entry.repo ? h("a", { href: api.href(entry.repo, entry.source.inbox), class: "overview-open" }, "Open source") : null)));
    const problems = entries.filter((e) => !["current", "loading"].includes(e.state)).length;
    sourceSummary.textContent = `Selected sources · ${entries.length}${problems ? ` · ${problems} need attention` : ""}`;
    const all = entries.flatMap((entry) => entry.rows.map((row) => ({ entry, row })));
    all.sort((a, b) => OVERVIEW_KINDS.indexOf(a.row.kind) - OVERVIEW_KINDS.indexOf(b.row.kind));
    const visible = all.slice(0, options.limit);
    const loading = entries.some((e) => e.state === "loading");
    summary.textContent = `${visible.length} shown${all.length > visible.length ? ` of ${all.length}` : ""} · Manual refresh · Limit ${options.limit}`
      + (loading ? " · Reading selected sources" : "")
      + (options.defaults.length ? ` · Defaults: ${options.defaults.join(", ")}` : "");
    const sections = [];
    for (const kind of OVERVIEW_KINDS) {
      const items = visible.filter((item) => item.row.kind === kind);
      if (!items.length) continue;
      const rows = h("ol", { class: "attention-list" });
      for (const { entry, row } of items) rows.append(h("li", { "data-overview-key": row.key },
        h("span", { class: "chip overview-origin", title: origin(entry) }, sourceLabel(entry)),
        h("small", { class: "muted overview-row-source" }, origin(entry)),
        h("a", { class: "suggest-name", href: api.href(entry.repo, row.path, row.heading || null) }, row.label),
        row.status ? h("span", { class: "chip" }, row.status) : null,
        row.detail ? h("span", { class: "attention-text" }, row.detail) : null));
      sections.push(h("section", { class: "overview-kind", "aria-label": LABELS[kind] }, h("h3", {}, LABELS[kind]), rows));
    }
    fill(list, ...(sections.length ? sections : [h("p", { class: "muted" }, !entries.length ? "No sources selected. Use Settings to choose vaults." : loading ? "Reading the selected sources…" : entries.every((e) => e.state === "current") ? "Nothing waits on you in these sources." : "No items to show. Check each source's status above; unavailable is not empty.")]));
  };
  async function refresh() {
    const g = ++generation;
    if (!api.current()) return;
    button.disabled = true;
    api.prune(options.sources.map(sourceKey));
    for (const entry of entries) { entry.state = "loading"; entry.rows = []; entry.message = ""; }
    render();
    await overviewEach(entries, 3, async (entry) => {
      if (!current(g)) return;
      try {
        entry.repo = resolveOverviewSource(entry.source, api.repos());
        const result = await api.read(entry.repo, entry.source, options, entry.files, () => current(g));
        if (!current(g)) return;
        const ownerProblem = overviewOwnerProblem(result.inboxProps, entry.source);
        if (ownerProblem) throw Object.assign(new Error(ownerProblem), { kind: "setup" });
        entry.rows = overviewRows({ ...result, source: entry.source, options });
        entry.state = result.state;
        entry.message = result.message || "";
        entry.checkedAt = result.checkedAt;
        entry.snapshot = { rows: entry.rows, checkedAt: entry.checkedAt, accessEpoch: entry.files.accessEpoch };
      } catch (e) {
        if (!current(g)) return;
        const offline = e.status === 0 && entry.snapshot && entry.snapshot.accessEpoch === entry.files.accessEpoch;
        entry.rows = offline ? entry.snapshot.rows : [];
        entry.state = offline ? "stale" : e.kind || (e.status === 401 || e.status === 403 || e.status === 404 ? "access" : e.status === 0 || e.status >= 500 ? "unavailable" : "setup");
        entry.message = offline ? "The last successful in-memory result is shown; reconnect and refresh." : e.message || "Open this source to check access.";
        if (!offline) { entry.snapshot = null; entry.files.clear(); api.forget(sourceKey(entry.source)); }
      }
      render();
    }, () => current(g));
    if (current(g)) { button.disabled = false; render(); }
  }
  render();
  queueMicrotask(() => refresh());
}

export async function showOverviewSetup(api) {
  const { h, fill, modal } = api;
  const prefs = api.preferences();
  let saved = null;
  if (prefs.repo) {
    try { saved = await api.existing(prefs); } catch { /* an unavailable old dashboard can be replaced explicitly */ }
  }
  let previous;
  try { previous = saved ? overviewOptions(saved.block) : null; } catch { /* setup can replace malformed options */ }
  const context = h("input", { class: "input", value: previous?.context || "My inbox", maxlength: 120 });
  const path = h("input", { class: "input", value: prefs.path || "Inbox overview.md" });
  const target = h("select", { class: "input", "aria-label": "Private dashboard vault" },
    h("option", { value: "", selected: !prefs.repo }, "Create a private dashboard on this device"),
    api.repos().filter((r) => r.local === "browser").map((r) => h("option", { value: r.id, selected: r.id === prefs.repo }, r.label)));
  const kinds = OVERVIEW_KINDS.map((kind) => ({ kind, input: h("input", { type: "checkbox", checked: !previous || previous.show.includes(kind) }) }));
  const states = h("input", { class: "input", value: (previous?.reviewStatuses || ["Testing"]).join(", ") });
  const limit = h("input", { class: "input", type: "number", min: 1, max: 200, value: previous?.limit || 50 });
  const rows = api.repos().filter((r) => r.id !== prefs.repo).map((repo) => {
    const binding = overviewSource(repo);
    const prior = previous?.sources.find((s) => sourceKey(s) === sourceKey(binding));
    const check = h("input", { type: "checkbox", checked: !!prior });
    const person = h("input", { class: "input", value: prior?.person || "", placeholder: "Your name in this vault" });
    const login = h("input", { class: "input", value: prior?.login ?? api.login(repo), placeholder: "Mention login (optional)" });
    const inbox = h("input", { class: "input", value: prior?.inbox || repo.inbox || "", placeholder: "Notes/Inbox.md" });
    let checkVersion = 0;
    const result = h("p", { class: "note overview-binding-result", role: "status" });
    const useOwner = h("button", { type: "button", class: "btn small", hidden: true }, "Use this inbox owner");
    const checkInbox = h("button", { type: "button", class: "btn small" }, "Check inbox");
    let checked = null;
    const invalidate = () => { checkVersion++; checked = null; result.textContent = ""; useOwner.hidden = true; checkInbox.disabled = false; };
    for (const input of [inbox, person, login]) input.addEventListener("input", invalidate);
    checkInbox.addEventListener("click", async () => {
      const version = ++checkVersion, requested = inbox.value.trim();
      useOwner.hidden = true; checked = null; checkInbox.disabled = true;
      result.className = "note overview-binding-result"; result.textContent = "Checking this inbox only…";
      try {
        const path = overviewPath(requested);
        if (!path.toLowerCase().endsWith(".md")) throw new Error("Choose an inbox Markdown page.");
        const data = await api.inspect(repo, path, () => version === checkVersion && check.checked && checkInbox.isConnected);
        if (version !== checkVersion || !check.checked || !checkInbox.isConnected) return;
        if (typeof data.owner !== "string" || !data.owner.trim()) throw new Error(`No single owner name is declared in ${path}. Open the inbox and check its owner property, or keep an explicit person binding for a shared inbox.`);
        checked = { owner: data.owner.trim(), path };
        result.textContent = `Inbox owner: ${checked.owner}${data.github ? ` · GitHub: ${data.github}` : ""}. Use this name for task and capture matching; the mention login is separate.`;
        useOwner.hidden = false;
      } catch (e) {
        if (version !== checkVersion || !check.checked || !checkInbox.isConnected) return;
        result.className = "error overview-binding-result"; result.textContent = e.message;
      } finally { if (version === checkVersion) checkInbox.disabled = false; }
    });
    useOwner.addEventListener("click", () => {
      if (!checked || !check.checked || checked.path !== inbox.value.trim()) return;
      person.value = checked.owner;
      result.className = "note overview-binding-result";
      result.textContent = `Selected person now matches ${checked.owner}. Save and open overview to keep this binding.`;
      useOwner.hidden = true;
    });
    const details = h("div", { class: "overview-source-fields", hidden: !check.checked },
      h("label", { class: "field" }, h("span", {}, "Person in this vault"), person,
        h("small", {}, "The exact name in your inbox's owner property. Check the inbox below if unsure.")),
      h("label", { class: "field" }, h("span", {}, "Mention login"), login),
      h("label", { class: "field" }, h("span", {}, "Your inbox page"), inbox),
      h("div", { class: "overview-binding-actions" }, checkInbox, useOwner), result);
    check.addEventListener("change", () => { details.hidden = !check.checked; invalidate(); });
    return { repo, check, person, login, inbox, node: h("div", { class: "overview-source-choice" },
      h("label", { class: "checkline" }, check, h("span", {}, repo.label, h("small", { class: "muted" }, repo.local ? " · on this device" : ` · ${repo.owner}/${repo.repo} · ${repo.branch} · ${repo.folder || "/"}`))), details) };
  });
  const missingSources = previous?.sources.filter((source) => { try { resolveOverviewSource(source, api.repos()); return false; } catch { return true; } }) || [];
  const error = h("p", { class: "error", role: "alert" });
  const body = h("div", {}, h("p", {}, "Choose only the vaults to include. This creates a read-only overview; source notes stay in their own vaults."),
    h("p", { class: "hint" }, "The dashboard is kept only in this browser profile. Export or back up its private local vault to keep it; another device needs its own setup and local bindings. The first scan may read every Markdown note in each selected vault for mentions and captures. The row limit limits display, not requests or bytes."),
    h("label", { class: "field" }, h("span", {}, "Context name"), context),
    h("label", { class: "field" }, h("span", {}, "Private dashboard vault"), target),
    h("label", { class: "field" }, h("span", {}, "Dashboard note"), path),
    h("div", { class: "field" }, h("span", {}, "Show"), h("div", { class: "overview-kind-choices" }, kinds.map((k) => h("label", { class: "checkline" }, k.input, LABELS[k.kind])))),
    h("label", { class: "field" }, h("span", {}, "Review statuses (comma separated)"), states),
    h("label", { class: "field" }, h("span", {}, "Maximum visible rows"), limit),
    h("h3", {}, "Selected sources"),
    missingSources.length ? h("p", { class: "note" }, `${missingSources.length} saved source bindings are unavailable on this device. Add them in Settings to include them again; saving keeps only the choices below.`) : null, ...rows.map((r) => r.node),
    rows.length ? null : h("p", {}, "Add source vaults in Settings first."), error);
  await modal({ title: "Set up inbox overview", body: [body], wide: true, buttons: [
    { label: "Cancel", value: null },
    { label: "Save and open overview", kind: "primary", value: "save", onclick: async () => {
      try {
        const options = { context: context.value.trim() || "My inbox", show: kinds.filter((k) => k.input.checked).map((k) => k.kind), refresh: "manual", limit: Number(limit.value), reviewStatuses: states.value.split(",").map((s) => s.trim()).filter(Boolean),
          sources: rows.filter((r) => r.check.checked).map((r) => overviewSource(r.repo, { person: r.person.value.trim(), login: r.login.value.trim(), inbox: r.inbox.value.trim() })) };
        overviewOptions(overviewBlock(options).split("\n").slice(1, -2).join("\n"));
        const destination = overviewPath(path.value.trim());
        if (!destination.toLowerCase().endsWith(".md")) throw new Error("The dashboard note needs an .md name.");
        if (rows.some((r) => r.check.checked && r.repo.id === target.value)) throw new Error("Keep the private dashboard separate from its source vaults.");
        await api.save({ target: target.value, path: destination, options });
        return true;
      } catch (e) { error.textContent = e.message; return false; }
    } },
  ] });
}

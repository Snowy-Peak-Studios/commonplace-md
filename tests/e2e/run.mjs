// End-to-end check of Commonplace.md in Chrome against the example vault on GitHub (reads only).
// Every PUT to GitHub is intercepted and answered here, so nothing is written.
// See tests/e2e/README.md for how to run it.
import puppeteer from "puppeteer-core";
import { fillTemplate, isoDate, sprints, sprintChoices, sprintSuggestions, suggestTasks, LinkIndex } from "../../src/vault.js";
import { parseCsv } from "../../src/csv.js";
import { blobSha } from "../../src/github.js";
import { parseBase, candidatePaths, runView, noteProps } from "../../src/bases.js";

const BASE = process.env.BASE || "http://localhost:8765/";
const OWNER = process.env.OWNER || "Snowy-Peak-Studios";
const REPO = process.env.REPO || "commonplace-md";
const BRANCH = process.env.BRANCH || "dev";
const FOLDER = (process.env.FOLDER ?? "example-vault").replace(/^\/+|\/+$/g, "");
const OUT = process.argv[2];
const token = process.env.GH_TOKEN;
if (!OUT || !token) {
  console.error("Usage: GH_TOKEN=<token> node run.mjs <folder for screenshots>");
  process.exit(2);
}

const APP = "Commonplace.md";
const API = "https://api.github.com";
const REPO_API = `${API}/repos/${OWNER}/${REPO}`;
const PRE = FOLDER ? FOLDER + "/" : "";
// The id the app gives the repo it joins (see addRepo in src/app.js).
const ID = REPO.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "repo";
const encPath = (p) => p.split("/").map(encodeURIComponent).join("/");
/** The app's address of a file in the example vault. */
const at = (path = "") => BASE + "#/" + [ID, ...path.split("/").filter(Boolean)].map(encodeURIComponent).join("/");
const contentsUrl = (path) => `${REPO_API}/contents/${encPath(PRE + path)}`;
const hashPath = (url) => decodeURIComponent(url.split("#")[1] || "");

const log = (...a) => console.log(...a);
const errors = [];
const puts = [];
// One commit of several files (Start the next sprint) goes through the Git data API: its writes are answered here.
const treeWrites = [], commitWrites = [], refWrites = [];
let putMode = "ok";
let fakeHead = null; // answer "the branch's latest commit" with this sha, as if someone else had pushed
let readOnlyRepo = false; // answer GitHub's "can this person push?" with no
let fakeLogin = null; // answer "who is signed in?" with this login, to be the example inboxes' person

const CSV_PATH = "Data/Test table.csv";
const CSV_TEXT = 'Name,Price,Note\nApples,3,\nPears,5,"the best, by far"\n';
const MP3_PATH = "Data/Test song.mp3"; // a file the app can't show: offered as a download
const MP3_BYTES = Buffer.from([0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
const b64 = (s) => Buffer.from(s, "utf8").toString("base64");
const json = (status, body) => ({ status, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify(body) });

/** GitHub as this script sees it, with the same token. */
const ghGet = async (path) => (await fetch(API + path, { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } })).json();
const realFile = async (path) => {
  const d = await ghGet(`/repos/${OWNER}/${REPO}/contents/${encPath(PRE + path)}?ref=${encodeURIComponent(BRANCH)}`);
  return { text: Buffer.from(d.content, "base64").toString("utf8"), sha: d.sha };
};

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  userDataDir: OUT + "/profile",
  args: ["--no-first-run", "--no-default-browser-check"],
});
/** GitHub searches the app makes: a task's commits come from its own `commits` property, never a search. */
const searches = [];
const page = await browser.newPage();
page.on("dialog", (d) => d.accept());
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
// A failed request says which address it was, so an expected one can be told from a real one.
page.on("response", (r) => { if (r.status() >= 400) errors.push(`  (${r.status()} ${r.request().method()} ${r.url().replace(/[?#].*$/, "")})`); });
await page.setRequestInterception(true);
page.on("request", async (req) => {
  const url = req.url();
  if (!url.startsWith(API) || req.method() === "OPTIONS") return req.continue();
  if (req.method() === "PUT") {
    const body = JSON.parse(req.postData());
    puts.push({ url, body, text: Buffer.from(body.content, "base64").toString("utf8") });
    if (putMode === "conflict") return req.respond(json(409, { message: "is at abc but expected def" }));
    return req.respond(json(200, { content: { sha: "fake" + puts.length }, commit: { sha: "c" + puts.length } }));
  }
  if (req.method() === "POST" && url === `${REPO_API}/git/trees`) {
    treeWrites.push(JSON.parse(req.postData()));
    return req.respond(json(201, { sha: "faketree" + treeWrites.length, tree: [] }));
  }
  if (req.method() === "POST" && url === `${REPO_API}/git/commits`) {
    commitWrites.push(JSON.parse(req.postData()));
    return req.respond(json(201, { sha: "fakecommit" + commitWrites.length }));
  }
  if (req.method() === "PATCH" && url.startsWith(`${REPO_API}/git/refs/`)) {
    refWrites.push({ url, body: JSON.parse(req.postData()) });
    return req.respond(json(200, { object: { sha: refWrites.at(-1).body.sha } }));
  }
  // Any other write is refused here, so the check never changes the repo (GraphQL's POST only reads).
  if (!["GET", "HEAD"].includes(req.method()) && url !== `${API}/graphql`) return req.respond(json(403, { message: "Blocked by the browser check." }));
  if (req.method() === "GET" && url.startsWith(`${API}/search/commits`)) searches.push(url);
  // No vaults found by themselves: the check sees only the example vault, whatever else the token can open.
  if (req.method() === "GET" && url.startsWith(`${API}/user/repos`)) return req.respond(json(200, []));
  if (fakeHead && req.method() === "GET" && url.startsWith(`${REPO_API}/commits/`)) {
    return req.respond({ status: 200, contentType: "text/plain", body: fakeHead,
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Expose-Headers": "ETag", ETag: `"${fakeHead}"` } });
  }
  if (fakeLogin && req.method() === "GET" && url === `${API}/user`) return req.respond(json(200, { login: fakeLogin, avatar_url: "" }));
  if (readOnlyRepo && req.method() === "GET" && url === REPO_API) {
    return req.respond(json(200, { full_name: `${OWNER}/${REPO}`, permissions: { pull: true, push: false, admin: false } }));
  }
  // A CSV file and an MP3 added to the example vault's tree, served from here.
  if (url.startsWith(`${REPO_API}/git/trees/`)) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } });
    const data = await res.json();
    data.tree.push({ path: PRE + CSV_PATH, type: "blob", sha: "csvsha" }, { path: PRE + MP3_PATH, type: "blob", sha: "mp3sha" });
    return req.respond(json(200, data));
  }
  if (url.startsWith(`${REPO_API}/git/blobs/mp3sha`)) {
    return req.respond({ status: 200, contentType: "application/octet-stream", headers: { "Access-Control-Allow-Origin": "*" }, body: MP3_BYTES });
  }
  // A note "created" by the New note check: its PUT was answered here, so its GET is too.
  const created = puts.find((p) => !p.body.sha && p.url === url.split("?")[0]);
  if (created && req.method() === "GET") return req.respond(json(200, { sha: "fake-new", size: created.text.length, content: b64(created.text) }));
  const committed = treeWrites.flatMap((t) => t.tree).findLast((e) => `${REPO_API}/contents/${encPath(e.path)}` === url.split("?")[0]);
  if (committed && req.method() === "GET") return req.respond(json(200, { sha: await blobSha(committed.content), size: committed.content.length, content: b64(committed.content) }));
  if (url.split("?")[0] === contentsUrl(CSV_PATH)) return req.respond(json(200, { sha: "csvsha", size: CSV_TEXT.length, content: b64(CSV_TEXT) }));
  // A note in a commit answered here (Start the next sprint) has a blob only here: a whole-vault read asks for it too.
  const blob = req.method() === "GET" && /\/git\/blobs\/([0-9a-f]{40})$/.exec(url.split("?")[0]);
  if (blob) {
    for (const e of treeWrites.flatMap((w) => w.tree)) {
      if (e.content != null && await blobSha(e.content) === blob[1]) {
        return req.respond(json(200, { sha: blob[1], size: e.content.length, encoding: "base64", content: b64(e.content) }));
      }
    }
  }
  req.continue();
});

const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const check = (ok, what) => log(`${ok ? "PASS" : "FAIL"}  ${what}`);
/** Polls `fn` in a page until it's true or `ms` pass. */
const until = async (fn, ms = 10000, on = page) => {
  for (const end = Date.now() + ms; Date.now() < end; await wait(150)) {
    if (await on.evaluate(fn).catch(() => false)) return true;
  }
  return false;
};
const storedRepos = (on = page) => on.evaluate(() => JSON.parse(localStorage.getItem("commonplace:repos") || "null"));

// 0. Joining: the device starts empty and gets the example vault through an invite link.
const invite = new URLSearchParams({
  owner: OWNER, repo: REPO, branch: BRANCH, label: "Example vault", vault: "1",
  inbox: "Notes/Inbox.md", inboxes: "Notes/Inboxes", home: "Home.md", notes: "Notes", template: "Templates/Note.md",
});
if (FOLDER) invite.set("folder", FOLDER);
await page.setViewport({ width: 1280, height: 860 });
await page.goto(BASE, { waitUntil: "networkidle0" });
await page.evaluate(() => localStorage.clear()); // the profile folder may hold an earlier run
await page.goto("about:blank");
await page.goto(BASE + "#/join?" + invite, { waitUntil: "networkidle0" });
check(await page.$eval(".welcome", (w, t) => t.every((x) => w.innerText.includes(x)), ["Example vault", OWNER, REPO, "Resource owner"]).catch(() => false),
  "an invite link shows the guest's own steps");
await shot("0-invite-desktop");
await page.type(".welcome input", token);
await page.click(".welcome .btn.primary");
await until(() => !location.hash.startsWith("#/join") && !!document.querySelector(".preview h1"), 20000);
check(page.url().includes(`#/${ID}/`), "after connecting, the invited repo opens: " + page.url());
const joined = await storedRepos();
const want = { owner: OWNER, repo: REPO, branch: BRANCH, folder: FOLDER, vault: true, inbox: "Notes/Inbox.md", inboxes: "Notes/Inboxes", home: "Home.md", notes: "Notes", template: "Templates/Note.md" };
check(joined?.length === 1 && Object.entries(want).every(([k, v]) => joined[0][k] === v),
  "the device has only the invited repo, with every setting from the link: " + JSON.stringify(joined));
check(await page.evaluate(() => !Object.keys(localStorage).some((k) => k.startsWith("notes-app:"))), "everything is stored under commonplace:");

// 1. Start: lands on Home, rendered.
await page.waitForSelector(".preview h1", { timeout: 20000 }).catch(async (e) => {
  log("MAIN:", (await page.$eval("main", (m) => m.innerText)).slice(0, 300), " ERRORS:", errors.join(" | "));
  throw e;
});
check(page.url().endsWith(`#/${ID}/Home.md`), "start page is the example vault's Home: " + page.url());
const backHidden = () => page.$eval("#back-btn", (b) => b.hidden);
check(await backHidden(), "no Back button on the first page (the invite link was replaced, not left behind)");
const realTree = await ghGet(`/repos/${OWNER}/${REPO}/git/trees/${encodeURIComponent(BRANCH)}?recursive=1`);
const realFiles = realTree.tree.filter((e) => e.type === "blob" && e.path.startsWith(PRE) && !e.path.slice(PRE.length).split("/").some((s) => s.startsWith(".")));
const treeCount = await page.$$eval("#tree a.file", (a) => a.length);
check(treeCount === realFiles.length + 2, `tree lists the example vault: ${treeCount} files (${realFiles.length} on GitHub, plus the test CSV and MP3)`);
check(!(await page.$("#tree [data-path^='.']")), "no dot-files in the tree");
await page.waitForFunction(() => document.querySelector(".embed-page .embed-body")?.innerText.trim().length > 20, { timeout: 10000 }).catch(() => {});
check(await page.$eval(".embed-page .embed-body", (b) => b.innerText.trim().length > 20).catch(() => false), "![[Task Board#Current goals]] shows that section inside Home");
check(await until(() => {
  const img = document.querySelector(".preview .embed-img img");
  img?.scrollIntoView();
  return !!img && img.complete && img.naturalWidth > 0;
}), "![[commonplace.svg]] shows the image");
await page.evaluate(() => document.querySelector("#main").scrollTo(0, 0));
check(await page.$('.preview .callout[data-callout="tip"]') !== null, "the tip callout shows as a callout");
check(await page.$$eval("#shortcuts a.file", (a) => a.map((x) => x.textContent)).then((t) => t.includes("Inbox")), "the sidebar has an Inbox shortcut");
// Home's ```top-tasks block: the same box as the inbox's, in the page's text.
await page.waitForSelector(".note-body .suggest .suggest-list a.suggest-name", { timeout: 15000 }).catch(() => {});
const homeBox = await page.evaluate(() => ({
  box: !!document.querySelector(".note-body .suggest"), code: !!document.querySelector(".note-body .top-tasks-block"),
  rows: document.querySelectorAll(".note-body .suggest .suggest-list a.suggest-name").length,
}));
check(homeBox.box && !homeBox.code && homeBox.rows >= 1, "Home's top-tasks block shows the top tasks box: " + JSON.stringify(homeBox));
// Home's ```base block: a view written in the page, drawn like a .base file's: only the done tasks.
await page.waitForFunction(() => document.querySelector(".note-body .base-view .base-table tr[data-path]"), { timeout: 15000 }).catch(() => {});
const homeBase = await page.evaluate(() => {
  const view = document.querySelector(".note-body .base-view");
  return { code: !!document.querySelector(".note-body .base-block"), tab: view?.querySelector(".base-tab")?.textContent ?? "",
    count: view?.querySelector(".base-count")?.textContent ?? "", heads: [...(view?.querySelectorAll("th") ?? [])].map((t) => t.textContent.trim()),
    rows: [...(view?.querySelectorAll("tr[data-path]") ?? [])].map((r) => r.dataset.path) };
});
const doneTasks = [];
for (const t of ["Make a note template", "Write the welcome note"]) {
  if (/^status: Done$/m.test((await realFile(`Tasks/${t}.md`)).text)) doneTasks.push(`Tasks/${t}.md`);
}
check(!homeBase.code && homeBase.tab === "Done tasks" && homeBase.heads.join("|").startsWith("Task|Done by")
  && doneTasks.every((p) => homeBase.rows.includes(p)) && homeBase.rows.every((p) => p.startsWith("Tasks/")),
  "Home's ```base block shows its own view, the done tasks: " + JSON.stringify(homeBase));
// Its fields: line puts each task's parent first, as a link to it: "Try the app on a phone" is part of "Get set up".
const homeFields = await page.evaluate(() => {
  const box = document.querySelector(".note-body .suggest");
  const li = [...(box?.querySelectorAll(".suggest-list li") ?? [])].find((x) => x.querySelector("a.suggest-name")?.textContent.includes("Try the app on a phone"));
  const tags = li?.querySelector(".suggest-tags");
  return { head: box?.querySelector(".suggest-head small")?.textContent ?? "", first: tags?.firstElementChild?.className ?? "",
    parent: tags?.querySelector("a.parent-chip")?.textContent ?? "", href: decodeURIComponent(tags?.querySelector("a.parent-chip")?.getAttribute("href") ?? "") };
});
check(homeFields.head.includes("Shows parent, state, priority, area") && /parent-chip/.test(homeFields.first)
  && homeFields.parent === "Get set up" && homeFields.href.endsWith("/Tasks/Get set up.md"),
  "Home's fields: line shows each task's parent first, linking to it: " + JSON.stringify(homeFields));
await page.evaluate(() => document.querySelector(".note-body .suggest")?.scrollIntoView({ block: "center" }));
await shot("1c-home-top-tasks");
await page.evaluate(() => document.querySelector("#main").scrollTo(0, 0));
await shot("1-home-desktop");
await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
await shot("1b-home-light");
await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "dark" }]);

// 2. Inbox: the button opens the shared inbox (no inbox has this login), with its properties.
await page.click("#inbox-btn");
await page.waitForFunction(() => location.hash.includes("Inbox.md") && document.querySelector(".preview h2"));
check(hashPath(page.url()) === `/${ID}/Notes/Inbox.md`, "the Inbox button opens Notes/Inbox.md: " + hashPath(page.url()));
const inbox = await page.evaluate(() => ({
  props: document.querySelector(".props")?.innerText,
  missing: document.querySelectorAll(".preview a.wikilink.missing").length,
}));
check(inbox.props?.includes("owner") && inbox.props.includes("github"), "Inbox shows its properties");
check(inbox.missing === 0, "no missing links on the Inbox: " + inbox.missing);
await page.waitForSelector(".suggest-list a.suggest-name", { timeout: 15000 }).catch(() => {});
const inboxBoxes = await page.evaluate(() => ({
  all: document.querySelectorAll(".preview .suggest").length, inText: document.querySelectorAll(".note-body .suggest").length,
}));
check(inboxBoxes.all === 1 && inboxBoxes.inText === 1, "the inbox's box comes from the ```top-tasks block in its text, and only once: " + JSON.stringify(inboxBoxes));
// The box's head says every option the block writes out: range, areas, sprint and owner.
const inboxHead = await page.$eval(".note-body .suggest .suggest-head small", (s) => s.textContent).catch(() => "");
check(["All areas", "Top 3", "By priority, newest first", "Current sprint, then the next", "For Your name"].every((t) => inboxHead.includes(t))
  && !inboxHead.includes("sets no"),
  "the inbox's box says its block's options: " + inboxHead);
await shot("2-inbox-desktop");

// 2a. The inbox's ```needs-attention block, under its top tasks: one box, its questions first, then its mentions.
await page.waitForFunction(() => document.querySelectorAll(".note-body .attention .attention-list a.suggest-name").length >= 2, { timeout: 20000 }).catch(() => {});
const attention = await page.evaluate(() => {
  const box = document.querySelector(".note-body .attention");
  const top = document.querySelector(".note-body .suggest");
  return {
    code: !!document.querySelector(".note-body .attention-block"),
    boxes: document.querySelectorAll(".note-body .attention").length,
    underTop: !!(box && top && box.compareDocumentPosition(top) & Node.DOCUMENT_POSITION_PRECEDING),
    title: box?.querySelector(".suggest-head strong")?.textContent ?? "",
    head: box?.querySelector(".suggest-head small")?.textContent ?? "",
    rows: [...(box?.querySelectorAll(".attention-list li") ?? [])].map((li) => ({
      kind: li.querySelector(".chip.kind")?.textContent ?? "", name: li.querySelector(".suggest-name")?.textContent ?? "",
      state: li.querySelector(".chip.state")?.textContent ?? "", text: li.querySelector(".attention-text")?.textContent ?? "",
      href: decodeURIComponent(li.querySelector("a")?.getAttribute("href") ?? "") })),
  };
});
const qRow = attention.rows.findIndex((r) => r.kind === "Question" && r.name.includes("Add a reading list") && r.state === "Waiting for your answer"
  && r.text === "Books only, or articles too?" && r.href.includes("Tasks/Add a reading list.md"));
const mRow = attention.rows.findIndex((r) => r.kind === "Mention" && r.name.startsWith("Guide") && r.href.endsWith("/Guide.md?h=Mentions")
  && r.text.includes("@your-github-login"));
check(!attention.code && attention.boxes === 1 && attention.underTop && attention.title === "Needs your attention"
  && attention.head.includes("for Your name") && attention.head.includes("of @your-github-login") && qRow >= 0 && mRow > qRow,
  "the inbox's ```needs-attention block is one box under the top tasks: its question, then the Guide's mention, each linking to its place: " + JSON.stringify(attention));
await page.evaluate(() => document.querySelector(".note-body .attention")?.scrollIntoView({ block: "center" }));
await shot("2a-inbox-attention");

// 2b. The inbox's top tasks: the owner's claimed ones first, then free tasks by priority; Claim saves the task.
const boxRows = () => page.$$eval(".suggest > .suggest-list > li", (li) => li.filter((x) => x.querySelector(".suggest-name")).map((x) => ({
  name: x.querySelector(".suggest-name").textContent, claim: [...x.querySelectorAll("button")].some((b) => b.textContent.includes("Claim")),
  claimed: x.querySelector(".chip.claimed")?.textContent ?? null,
})));
const rows0 = await boxRows();
const free0 = rows0.filter((r) => !r.claimed);
const mine0 = rows0.filter((r) => r.claimed);
check(mine0.length === 1 && mine0[0].name === "T-3 Try the app on a phone" && mine0[0].claimed === "Claimed" && !mine0[0].claim,
  "the owner's claimed task stays in the box, marked Claimed, with no Claim button: " + JSON.stringify(mine0));
check(rows0.findIndex((r) => r.claimed) === 0, "claimed tasks come before the free ones");
check(free0.length >= 1 && free0.length <= 3, "the inbox suggests one to three free tasks: " + free0.length);
// With sprints, the free tasks are the current sprint's (else the next one's, marked): worked out here from the real notes and today.
const realNotes = async (folder) => Promise.all(realFiles.filter((e) => e.path.startsWith(PRE + folder + "/") && e.path.endsWith(".md"))
  .map(async (e) => ({ path: e.path.slice(PRE.length), props: noteProps((await realFile(e.path.slice(PRE.length))).text) })));
const inboxTasks = await realNotes("Tasks");
const inboxSprints = sprints(await realNotes("Sprints"), isoDate());
const sprintIndex = new LinkIndex([...inboxTasks, ...inboxSprints].map((n) => n.path));
const expectFree = (notes) => {
  const s = { now: inboxSprints.find((x) => x.when === "now"), next: inboxSprints.find((x) => x.when === "next") };
  return (sprintSuggestions(notes, { now: s.now?.path, next: s.next?.path, resolve: (t) => sprintIndex.resolve(t) }) ?? suggestTasks(notes))
    .map((n) => `${n.props.id} ${n.path.slice(6, -3)}${n.nextSprint ? " (next sprint)" : ""}`);
};
const freeNames = () => page.$$eval(".suggest > .suggest-list > li", (li) => li.filter((x) => x.querySelector(".suggest-name") && !x.querySelector(".chip.claimed"))
  .map((x) => x.querySelector(".suggest-name").textContent + (x.querySelector(".chip.next-sprint") ? " (next sprint)" : "")));
const want0 = expectFree(inboxTasks);
check(JSON.stringify(await freeNames()) === JSON.stringify(want0), "the free tasks are the current sprint's (else the next one's, marked), by priority: "
  + JSON.stringify(await freeNames()) + " expected " + JSON.stringify(want0));
const sprintChip = await page.$eval(".suggest-head .sprint-chip", (c) => c.textContent).catch(() => null);
const sprintShown = inboxSprints.find((x) => x.when === "now") ?? inboxSprints.find((x) => x.when === "next");
check(sprintChip === (sprintShown?.name ?? null), "the box's head names the sprint they come from: " + sprintChip);
check(free0[0]?.name === want0[0]?.replace(" (next sprint)", ""), "the High one comes first: " + free0[0]?.name);
check(!free0.some((s) => /Try the app|Write the welcome|Make a note/.test(s.name)), "no taken or done task is suggested as free: " + JSON.stringify(free0.map((s) => s.name)));
check(free0.every((s) => s.claim), "each free one has a Claim button");
// Whether each task can be started now: a chip, its reason in the tooltip and on a tap.
const stateChips = await page.$$eval(".suggest > .suggest-list > li", (li) => li.map((x) => {
  const chip = x.querySelector(".chip.state");
  return chip ? { text: chip.textContent, title: chip.title } : null;
}));
// A task with an open question (a `question` property) needs a decision until it's answered; the rest are ready.
check(stateChips.length === rows0.length && stateChips.every((c) => (c?.text === "Ready" && c.title.startsWith("Ready to start"))
  || (c?.text === "Needs a decision" && c.title.startsWith("Waiting for an answer: "))),
  "every task shows whether it's ready, with the reason as a tooltip: " + JSON.stringify(stateChips));
await page.click(".suggest > .suggest-list > li .chip.state");
await page.waitForFunction((why) => document.querySelector("#toast.show")?.textContent.includes(why), { timeout: 5000 }, stateChips[0]?.title ?? "").catch(() => {});
check(await page.$eval("#toast", (t, why) => t.classList.contains("show") && t.textContent.includes(why), stateChips[0]?.title ?? "-"), "tapping it says why (for phones, which have no tooltips)");
const putsBefore = puts.length;
const first = free0[0]?.name ?? "";
const firstId = first.split(" ")[0];
const firstTitle = first.slice(firstId.length + 1);
await page.evaluate((t) => [...document.querySelectorAll(".suggest > .suggest-list > li")].find((li) => li.textContent.includes(t))
  ?.querySelectorAll("button").forEach((b) => { if (b.textContent.includes("Claim")) b.click(); }), firstTitle);
await page.waitForSelector("dialog.modal[open] .btn.primary");
await page.click("dialog.modal .btn.primary");
await page.waitForFunction((n) => document.querySelector("#toast.show")?.textContent.includes("Claimed"), { timeout: 15000 }).catch(() => {});
const claim = puts.length > putsBefore ? puts.at(-1) : null;
check(claim?.url === contentsUrl(`Tasks/${firstTitle}.md`), "Claim saves the task: " + claim?.url);
check(/^status: In Progress$/m.test(claim?.text ?? "") && /^assignee: Your name$/m.test(claim?.text ?? ""), "its status is In Progress and its assignee the inbox's owner");
check(claim?.body.message?.startsWith(`${firstId}: claimed by Your name`), "the commit says who claimed it: " + claim?.body.message);
await page.waitForFunction((t) => [...document.querySelectorAll(".suggest-list li")].some((li) => li.querySelector(".chip.claimed") && li.textContent.includes(t)), { timeout: 10000 }, firstTitle).catch(() => {});
const rows1 = await boxRows();
check(rows1.find((r) => r.name === first)?.claimed === "Claimed" && rows1.filter((r) => r.claimed).some((r) => r.name === first),
  "the claimed task stays, marked Claimed: " + JSON.stringify(rows1));
const claimedNotes = inboxTasks.map((n) => (n.path === `Tasks/${firstTitle}.md` ? { ...n, props: { ...n.props, status: "In Progress", assignee: "Your name" } } : n));
const want1 = expectFree(claimedNotes);
check(JSON.stringify(await freeNames()) === JSON.stringify(want1), "the free ones after the claim: " + JSON.stringify(await freeNames()) + " expected " + JSON.stringify(want1));
// The box's pickers: a task's priority and area, each change one commit of one line.
const pickers = await page.$$eval(".suggest-list select.pick", (s) => s.map((x) => x.getAttribute("aria-label")));
check(pickers.includes("Priority of Add a reading list") && pickers.includes("Area of Add a reading list"), "each task has a priority and an area picker: " + JSON.stringify(pickers));
const areaOptions = await page.$eval('select[aria-label="Area of Add a reading list"]', (s) => [...s.options].map((o) => o.value));
check(["Docs", "Notes", "Setup", "Sharing"].every((a) => areaOptions.includes(a)), "the area picker offers the areas the tasks use: " + JSON.stringify(areaOptions));
const putsBeforePick = puts.length;
await page.select('select[aria-label="Priority of Add a reading list"]', "High");
await page.waitForFunction((n) => document.querySelector("#toast.show")?.textContent.includes("priority is now High"), { timeout: 15000 }).catch(() => {});
const pickPut = puts.length > putsBeforePick ? puts.at(-1) : null;
const pickBefore = await ghGet(`/repos/${OWNER}/${REPO}/contents/${encPath(PRE + "Tasks/Add a reading list.md")}?ref=${BRANCH}`)
  .then((d) => Buffer.from(d.content, "base64").toString("utf8")).catch(() => "");
check(pickPut?.url === contentsUrl("Tasks/Add a reading list.md") && pickPut.text === pickBefore.replace(/^priority: .*$/m, "priority: High"),
  "a new priority saves the task with only that line changed");
check(pickPut?.body.message?.startsWith("T-5: priority set to High"), "the commit says what changed: " + pickPut?.body.message);
await page.waitForFunction(() => document.querySelector('select[aria-label="Priority of Add a reading list"]')?.value === "High", { timeout: 10000 }).catch(() => {});
check(await page.$eval('select[aria-label="Priority of Add a reading list"]', (s) => s.value).catch(() => null) === "High", "the box shows the new priority");
// Not now: a task goes on the waiting list (status Waiting), out of the suggestions; Bring back takes it off.
// With sprints the button is Push to the next sprint; this task is in the last sprint there is, so it asks, and offers the waiting list.
const putsBeforeWait = puts.length;
const putOffLabel = sprintShown ? "Push to the next sprint" : "Not now";
const putOffButtons = await page.$$eval(".suggest-list li button", (b) => b.map((x) => x.textContent));
check(putOffButtons.includes(putOffLabel) && (!sprintShown || !putOffButtons.includes("Not now")),
  `with sprints ${sprintShown ? "on" : "off"}, putting a task off is ${putOffLabel}: ` + JSON.stringify([...new Set(putOffButtons)]));
await page.evaluate((label) => [...document.querySelectorAll(".suggest-list li")].find((li) => li.textContent.includes("Add a reading list"))
  ?.querySelectorAll("button").forEach((b) => { if (b.textContent === label) b.click(); }), putOffLabel);
if (sprintShown) {
  await page.waitForSelector("dialog.modal[open] .btn.primary");
  const askWait = await page.$eval("dialog.modal[open]", (d) => d.textContent);
  check(/No sprint after .+ yet/.test(askWait) && askWait.includes("waiting list"), "with no sprint after the task's, it says so and offers the waiting list: " + askWait);
  await page.click("dialog.modal .btn.primary");
}
await page.waitForFunction(() => document.querySelector(".suggest-waiting summary")?.textContent.includes("Waiting (1)"), { timeout: 15000 }).catch(() => {});
const waitPut = puts.length > putsBeforeWait ? puts.at(-1) : null;
check(waitPut?.url === contentsUrl("Tasks/Add a reading list.md") && /^status: Waiting$/m.test(waitPut.text ?? ""), "Not now saves the task with status Waiting");
check(waitPut?.body.message?.startsWith("T-5: status set to Waiting"), "the commit says so: " + waitPut?.body.message);
const afterWait = await boxRows();
check(!afterWait.some((r) => r.name === "T-5 Add a reading list" && !r.waiting), "it leaves the suggestions: " + JSON.stringify(afterWait.map((r) => r.name)));
await page.click(".suggest-waiting summary");
const waitingRows = await page.$$eval(".suggest-waiting li", (li) => li.map((x) => x.querySelector(".suggest-name")?.textContent));
check(waitingRows.length === 1 && waitingRows[0] === "T-5 Add a reading list", "the waiting list holds it: " + JSON.stringify(waitingRows));
await shot("2c-waiting-list");
const putsBeforeBack = puts.length;
await page.evaluate(() => [...document.querySelectorAll(".suggest-waiting button")].find((b) => b.textContent === "Bring back")?.click());
await page.waitForFunction(() => !document.querySelector(".suggest-waiting")
  && [...document.querySelectorAll(".suggest > .suggest-list > li")].some((li) => li.textContent.includes("Add a reading list")),
{ timeout: 15000 }).catch(() => {});
const backPut = puts.length > putsBeforeBack ? puts.at(-1) : null;
// Saves here are faked, so the real note still says To Do: Bring back reads it fresh, finds nothing to change and
// commits nothing. Any commit it does make must say To Do.
check((!backPut || /^status: To Do$/m.test(backPut.text)) && !(await page.$(".suggest-waiting"))
  && (await boxRows()).some((r) => r.name === "T-5 Add a reading list" && r.claim), "Bring back takes it off the waiting list, back into the suggestions");
// Push to the next sprint: a task in the current sprint moves into the next one, one commit of its sprint line.
const sprintNext = inboxSprints.find((x) => x.when === "next");
if (inboxSprints.find((x) => x.when === "now") && sprintNext) {
  const putsBeforePush = puts.length;
  await page.evaluate(() => [...document.querySelectorAll(".suggest-list li")].find((li) => li.textContent.includes("Try the app on a phone"))
    ?.querySelectorAll("button").forEach((b) => { if (b.textContent === "Push to the next sprint") b.click(); }));
  await page.waitForFunction(() => document.querySelector("#toast.show")?.textContent.includes("pushed to"), { timeout: 15000 }).catch(() => {});
  const pushPut = puts.length > putsBeforePush ? puts.at(-1) : null;
  const pushBefore = (await realFile("Tasks/Try the app on a phone.md")).text;
  check(pushPut?.url === contentsUrl("Tasks/Try the app on a phone.md")
    && pushPut.text === pushBefore.replace(/^sprint: .*$/m, `sprint: "[[${sprintNext.name}]]"`),
  `Push to the next sprint saves the task in ${sprintNext.name}, with only that line changed`);
  check(pushPut?.body.message?.startsWith(`T-3: pushed to ${sprintNext.name}`), "the commit says so: " + pushPut?.body.message);
  // The box is drawn again after the change; wait until it has its tasks back.
  await page.waitForFunction(() => [...document.querySelectorAll(".suggest > .suggest-list > li")].some((li) => li.textContent.includes("Add a reading list")
    && [...li.querySelectorAll("button")].some((b) => b.textContent.includes("Claim"))), { timeout: 15000 }).catch(() => {});
} else {
  log("SKIP  Push to the next sprint: the example vault has no current and next sprint today");
}
// Claiming a task from the next sprint moves it into the current one, in the same commit.
const sprintNow = inboxSprints.find((x) => x.when === "now");
const fromNext = want1.find((n) => n.endsWith(" (next sprint)"))?.replace(" (next sprint)", "");
if (sprintNow && fromNext) {
  const nextTitle = fromNext.slice(fromNext.indexOf(" ") + 1);
  const putsBeforeNext = puts.length;
  await shot("2d-from-the-next-sprint");
  await page.evaluate((t) => [...document.querySelectorAll(".suggest > .suggest-list > li")].find((li) => li.textContent.includes(t))
    ?.querySelectorAll("button").forEach((b) => { if (b.textContent.includes("Claim")) b.click(); }), nextTitle);
  await page.waitForSelector("dialog.modal[open] .btn.primary");
  const askNext = await page.$eval("dialog.modal[open]", (d) => d.textContent);
  check(askNext.includes(`moves into ${sprintNow.name}`), "claiming one from the next sprint says it moves into the current one: " + askNext);
  await page.click("dialog.modal .btn.primary");
  await page.waitForFunction(() => document.querySelector("#toast.show")?.textContent.includes("Claimed"), { timeout: 15000 }).catch(() => {});
  const nextPut = puts.length > putsBeforeNext ? puts.at(-1) : null;
  check(nextPut?.url === contentsUrl(`Tasks/${nextTitle}.md`) && /^status: In Progress$/m.test(nextPut.text ?? "")
    && new RegExp(`^sprint: "\\[\\[${sprintNow.name}\\]\\]"$`, "m").test(nextPut.text ?? ""),
  `its claim moves it into ${sprintNow.name}, in the same commit: ` + JSON.stringify(nextPut?.text?.match(/^sprint:.*$/m)?.[0]));
  check(nextPut?.body.message?.includes(`moved into ${sprintNow.name}`), "the commit says so: " + nextPut?.body.message);
} else check(true, `no task from the next sprint to claim today (${isoDate()}), so the move isn't checked`);
// The claims were never saved, so read the real tree again for the checks below.
await page.reload({ waitUntil: "networkidle0" });

// 3. Following a wikilink.
await page.evaluate(() => [...document.querySelectorAll(".preview a.wikilink")].find((a) => a.dataset.path && !a.dataset.path.endsWith("Inbox.md"))?.click());
await page.waitForFunction(() => !location.hash.includes("Inbox.md") && document.querySelector(".preview h1, .preview h2"));
check(true, "a wikilink opened " + hashPath(page.url()));
const linked = hashPath(page.url());
check(!(await backHidden()), "after a link, the Back button shows");
await page.click("#back-btn");
await page.waitForFunction(() => location.hash.includes("Inbox.md") && document.querySelector(".preview h1, .preview h2"));
check(hashPath(page.url()) === `/${ID}/Notes/Inbox.md`, "Back returns to the Inbox: " + hashPath(page.url()));
await page.click("#back-btn");
await page.waitForFunction(() => location.hash.endsWith("Home.md") && document.querySelector(".preview h1"));
check(hashPath(page.url()) === `/${ID}/Home.md` && await backHidden(), "and again to Home, the first page, where it hides");
await page.goForward();
await page.goForward();
await page.waitForFunction((p) => decodeURIComponent(location.hash).includes(p.split("/").pop()), {}, linked);
check(hashPath(page.url()) === linked && !(await backHidden()), "Forward (the browser's) goes on to the linked note, with Back shown");

// 3a. Reload sits beside Save, and a quiet banner says when GitHub has newer notes.
const reloadBtn = await page.evaluate(() => {
  const b = document.querySelector("#reload-btn");
  return { inBar: !!b?.closest(".bar-actions") && !b.closest(".menu"), shown: !!b && !b.hidden, nextToSave: b?.nextElementSibling?.id === "save-btn" };
});
check(reloadBtn.inBar && reloadBtn.shown && reloadBtn.nextToSave, "Reload from GitHub is a button beside Save, not in the menu: " + JSON.stringify(reloadBtn));
check(await page.$eval("#nudge", (n) => n.hidden), "no newer-notes banner while the notes are up to date");
await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
await wait(1500);
check(await page.$eval("#nudge", (n) => n.hidden), "coming back to the tab, GitHub has nothing newer: still no banner");
fakeHead = "0123456789abcdef0123456789abcdef01234567";
await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
await page.waitForFunction(() => !document.querySelector("#nudge").hidden, { timeout: 8000 }).catch(() => {});
check(!(await page.$eval("#nudge", (n) => n.hidden)), "when GitHub has a newer commit, the banner shows");
await shot("3c-newer-notes");
fakeHead = null;
await page.click("#nudge-reload");
await page.waitForFunction(() => document.querySelector("#nudge").hidden && document.querySelector(".preview h1"), { timeout: 15000 }).catch(() => {});
check(await page.$eval("#nudge", (n) => n.hidden), "its Reload reads the notes again, and the banner goes");

// 3b. Go up: to the page in the note's parent property.
await page.goto(at("Guide.md"), { waitUntil: "networkidle0" });
await page.waitForSelector(".preview h1");
const upBtn = await page.$eval("#up-btn", (b) => ({ hidden: b.hidden, title: b.title }));
check(!upBtn.hidden && upBtn.title === "Up to Home", "the Guide has an Up button to its parent, Home: " + JSON.stringify(upBtn));
await page.click("#up-btn");
await page.waitForFunction(() => location.hash.endsWith("/Home.md") && document.querySelector("#title .name")?.textContent === "Home");
check(hashPath(page.url()) === `/${ID}/Home.md`, "Up opens Home: " + hashPath(page.url()));
check(await page.$eval("#up-btn", (b) => b.hidden), "Home has no parent, so no Up button");

// 3c. Plain Markdown links between notes, as GitHub reads them: the How To pages link that way.
await page.goto(at("How To/How To.md"), { waitUntil: "networkidle0" });
await page.waitForSelector(".preview h1");
const plainLinks = await page.$$eval(".note-body a[href]", (a) => a.map((x) => ({ text: x.textContent, href: x.getAttribute("href") })));
const toVault = plainLinks.find((l) => l.text === "Add a vault");
const toGuide = plainLinks.find((l) => l.text === "The guide");
check(toVault?.href === `#/${ID}/How%20To/Add%20a%20vault.md` && toGuide?.href === `#/${ID}/Guide.md`,
  "plain Markdown links lead to the notes in the app, in the same folder and one up: " + JSON.stringify([toVault, toGuide]));
await page.click(`.note-body a[href="${toVault.href}"]`);
await page.waitForFunction(() => location.hash.endsWith("/Add%20a%20vault.md") && document.querySelector(".preview h1")?.textContent === "Add a vault", { timeout: 15000 }).catch(() => {});
check(hashPath(page.url()) === `/${ID}/How To/Add a vault.md`, "following one opens that note: " + hashPath(page.url()));

// 3d. Two ```needs-attention blocks, one per kind, make two separate boxes ("Your name"'s inbox).
await page.goto(at("Notes/Inboxes/Your name.md"), { waitUntil: "networkidle0" });
await page.waitForFunction(() => document.querySelectorAll(".note-body .attention .attention-list a.suggest-name").length >= 2, { timeout: 20000 }).catch(() => {});
const twoBoxes = await page.$$eval(".note-body .attention", (boxes) => boxes.map((b) => ({
  title: b.querySelector(".suggest-head strong")?.textContent ?? "",
  rows: [...b.querySelectorAll(".attention-list a.suggest-name")].map((a) => a.textContent),
  kinds: b.querySelectorAll(".chip.kind").length,
})));
check(twoBoxes.length === 2 && twoBoxes[0].title === "Questions for you" && twoBoxes[0].rows.some((r) => r.includes("Add a reading list"))
  && twoBoxes[1].title === "Mentions of you" && twoBoxes[1].rows.some((r) => r.startsWith("Guide")) && twoBoxes.every((b) => b.kinds === 0),
  "two needs-attention blocks, show: questions and show: mentions, make two separate boxes: " + JSON.stringify(twoBoxes));

// 4. The Guide: folded nav box, no %% left, links with headings and aliases.
await page.goto(at("Guide.md"), { waitUntil: "networkidle0" });
await page.waitForSelector(".preview h1");
const guide = await page.evaluate(() => {
  const links = [...document.querySelectorAll(".preview a.wikilink")];
  return {
    navOpen: document.querySelector('.callout[data-callout="nav"]')?.open,
    hasComment: document.querySelector(".preview").innerText.includes("%%"),
    alias: links.find((a) => a.textContent === "the shared inbox")?.dataset.path,
    heading: links.find((a) => a.textContent.includes("how saving works"))?.getAttribute("href"),
    missing: document.querySelectorAll(".preview a.wikilink.missing").length,
    folded: document.querySelector('.callout[data-callout="warning"]')?.open,
  };
});
check(guide.navOpen === false, "nav box shows as a folded callout");
check(!guide.hasComment, "no %% comments in the preview");
check(guide.alias === "Notes/Inbox.md", "[[Notes/Inbox|the shared inbox]] leads to the Inbox with its own text");
check(guide.heading?.includes("Home.md?h="), "[[Home#How saving works|...]] leads to the heading: " + guide.heading);
check(guide.missing === 0, "no missing links on the Guide: " + guide.missing);
check(guide.folded === false, "a [!warning]- callout starts folded");
// A mention is a link to that person's inbox; one in code isn't a mention.
await page.waitForSelector(".preview a.mention", { timeout: 10000 }).catch(() => {});
const guideMentions = await page.evaluate(() => ({
  links: [...document.querySelectorAll(".preview a.mention")].map((a) => [a.textContent, decodeURIComponent(a.getAttribute("href"))]),
  inCode: [...document.querySelectorAll(".preview code")].some((c) => c.querySelector(".mention")),
}));
check(guideMentions.links.length >= 1 && guideMentions.links.every(([text, href]) => text === "@your-github-login" && /\/Notes\/Inbox(es\/Your name)?\.md$/.test(href))
  && !guideMentions.inCode, "@your-github-login in the Guide is a link to that person's inbox, and not in code: " + JSON.stringify(guideMentions));
await shot("2b-guide-desktop");
// Lists with subpoints: each point that has some gets an arrow that folds them; only the view changes.
const foldState = () => page.evaluate(() => {
  const li = [...document.querySelectorAll(".note-body li.has-fold")].find((x) => x.textContent.startsWith("Plan the week"));
  return { arrows: document.querySelectorAll(".note-body li > .fold, .note-body li > p > .fold").length,
    folded: li?.classList.contains("folded"), shown: li ? li.querySelector(":scope > ul").offsetParent !== null : null,
    expanded: li?.querySelector(".fold").getAttribute("aria-expanded"), save: document.querySelector("#save-btn")?.disabled };
});
const fold0 = await foldState();
check(fold0.arrows === 5 && fold0.folded === false && fold0.shown && fold0.expanded === "true",
  "the Guide's points with subpoints have arrows (bullets, a deeper one, numbered and tasks), all open: " + JSON.stringify(fold0));
await page.evaluate(() => [...document.querySelectorAll(".note-body li.has-fold")].find((x) => x.textContent.startsWith("Plan the week"))?.querySelector(".fold").click());
const fold1 = await foldState();
check(fold1.folded && !fold1.shown && fold1.expanded === "false" && fold1.save, "a tap folds its subpoints away, and the note isn't changed: " + JSON.stringify(fold1));
await page.evaluate(() => document.querySelector(".note-body li.folded")?.scrollIntoView({ block: "center" }));
await shot("2e-guide-folded");
// A redraw (here the colour scheme, which draws the diagrams again) keeps the fold.
await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
await until(() => !!document.querySelector(".note-body .mermaid-diagram"), 5000);
await wait(300);
check((await foldState()).folded === true, "the fold stays when the page is drawn again");
await shot("2f-guide-folded-light");
await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "dark" }]);
await page.evaluate(() => document.querySelector(".note-body li.folded .fold")?.click());
check((await foldState()).shown === true, "a second tap shows them again");

// 5. A task page: tick a checkbox, save (faked), check the commit body.
const taskPath = "Tasks/Try the app on a phone.md";
await page.goto(at(taskPath), { waitUntil: "networkidle0" });
await page.waitForSelector(".preview input.task");
await page.click(".preview input.task:not([checked])");
await wait(200);
check(await page.$eval("#save-btn", (b) => !b.disabled), "ticking a checkbox enables Save");
await page.click("#save-btn");
await page.waitForFunction(() => document.querySelector("#toast").textContent.includes("Saved"), { timeout: 5000 }).catch(() => {});
const p1 = puts.at(-1);
check(p1 && p1.url === contentsUrl(taskPath), "save PUT goes to the right path: " + p1?.url);
check(p1 && p1.body.branch === BRANCH && p1.body.sha && p1.body.message === `Edit ${taskPath} from ${APP}`, "save sends branch, sha and message: " + p1?.body.message);
check(p1 && !p1.text.includes("\r"), "saved text has LF line endings");
const real = await realFile(taskPath);
const diff = real.text.split("\n").map((l, i) => [l, p1?.text.split("\n")[i]]).filter(([a, b]) => a !== b);
check(diff.length === 1 && diff[0][0].includes("[ ]") && diff[0][1].includes("[x]"), "exactly one line changed, [ ] to [x]: " + JSON.stringify(diff));
check(p1?.body.sha === real.sha, "save used the file's current sha");

// 6. Edit mode: the nav box can't be changed, typing at the end works.
await page.goto(at("Guide.md"), { waitUntil: "networkidle0" });
await page.waitForSelector("#mode:not([hidden])");
await page.evaluate(() => document.querySelectorAll("#mode button")[1].click());
await page.waitForSelector(".cm-editor .cm-nav");
const navTry = await page.evaluate(async () => {
  const { EditorView } = await import(new URL("vendor/vendor.js", location.href).href);
  const view = EditorView.findFromDOM(document.querySelector(".cm-editor"));
  const before = view.state.doc.toString();
  const from = before.indexOf("%% nav:");
  const to = before.indexOf("%% /nav %%") + 10;
  view.dispatch({ changes: { from: from + 3, insert: "X" } });           // inside
  view.dispatch({ changes: { from: from - 1, to: from + 5 } });          // across the start
  view.dispatch({ changes: { from: to, to: to + 1 } });                  // joining the last line with the next
  view.dispatch({ changes: { from, insert: "Y" } });                     // at the start of the first line
  const blocked = view.state.doc.toString() === before;
  view.dispatch({ changes: { from: from - 1, insert: "\nnew line above" } }); // end of the line before: allowed
  view.dispatch({ changes: { from: view.state.doc.length, insert: "\n- typed at the end\n" } });
  const after = view.state.doc.toString();
  return { blocked, keptNav: after.includes(before.slice(from, to)), added: after.includes("new line above") && after.includes("typed at the end") };
});
check(navTry.blocked, "edits inside or touching the nav box are refused");
check(navTry.keptNav && navTry.added, "edits next to it and elsewhere work");
await page.evaluate(async () => {
  const { EditorView } = await import(new URL("vendor/vendor.js", location.href).href);
  const view = EditorView.findFromDOM(document.querySelector(".cm-editor"));
  view.dispatch({ changes: { from: view.state.doc.length, insert: "See [[No such page here]]\n" } });
  // CodeMirror only draws the lines on screen, so bring the new one into view.
  view.dispatch({ selection: { anchor: view.state.doc.length }, scrollIntoView: true });
});
await wait(600);
check(await page.$eval(".link-warn", (e) => !e.hidden && e.textContent.includes("No such page here")), "a link to no page is warned about");
check(await page.$(".cm-missing") !== null, "the editor marks the missing link");
// Typing @ in the editor offers the people with an inbox; picking one writes @login.
await page.evaluate(async () => {
  const { EditorView } = await import(new URL("vendor/vendor.js", location.href).href);
  const view = EditorView.findFromDOM(document.querySelector(".cm-editor"));
  view.focus();
  view.dispatch({ selection: { anchor: view.state.doc.length }, scrollIntoView: true });
});
await page.keyboard.type("Ask @your");
await page.waitForSelector(".cm-tooltip-autocomplete li", { timeout: 8000 }).catch(() => {});
const picker = await page.$$eval(".cm-tooltip-autocomplete li", (li) => li.map((x) => x.textContent)).catch(() => []);
// CodeMirror ignores Enter for a moment after the list opens, so a quick key press doesn't pick by mistake.
await wait(300);
await page.keyboard.press("Enter");
await wait(200);
const picked = await page.evaluate(async () => {
  const { EditorView } = await import(new URL("vendor/vendor.js", location.href).href);
  return EditorView.findFromDOM(document.querySelector(".cm-editor")).state.doc.toString().slice(-60);
});
check(picker.some((x) => x.includes("@your-github-login") && x.includes("Your name")) && picked.trimEnd().endsWith("Ask @your-github-login"),
  "typing @ offers the people with an inbox, and picking one writes @login: " + JSON.stringify({ picker, end: picked }));
await shot("3-guide-edit-desktop");
await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
await shot("3b-guide-edit-light");
await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "dark" }]);

// 7. Draft survives a reload.
await wait(600);
await page.reload({ waitUntil: "networkidle0" });
await page.waitForSelector(".banner", { timeout: 10000 }).catch(() => {});
check(await page.$eval(".banner", (b) => b.textContent.includes("weren't saved")).catch(() => false), "unsaved changes are offered back after a reload");
await page.evaluate(() => [...document.querySelectorAll(".banner button")].find((b) => b.textContent.startsWith("Restore")).click());
await wait(300);
check(await page.$eval("#save-btn", (b) => !b.disabled), "restored draft can be saved");

// 8. Conflict: GitHub refuses; both versions are shown.
putMode = "conflict";
await page.click("#save-btn");
await page.waitForSelector("dialog.modal[open] .cm-mergeView", { timeout: 8000 }).catch(() => {});
check(await page.$("dialog.modal[open] .cm-mergeView") !== null, "a refused save shows both versions");
await shot("4-conflict");
await page.evaluate(() => [...document.querySelectorAll("dialog.modal button")].find((b) => b.textContent === "Decide later").click());
await wait(200);
check(!(await page.$("dialog.modal")), "Decide later closes the conflict view");
putMode = "ok";

// 8a. Leaving a note with unsaved changes asks first: Stay puts the address back, Keep as a draft keeps them
// on this device, Discard drops them, and Save saves before moving on. Links, Back and Settings all ask.
const guideHash = await page.evaluate(() => location.hash);
const leaveDialog = () => page.evaluate(() => {
  const d = document.querySelector("dialog.modal[open]");
  return d ? { title: d.querySelector("h2")?.textContent, buttons: [...d.querySelectorAll("button")].map((b) => b.textContent.trim()) } : null;
});
const answerLeave = async (label) => {
  await page.evaluate((l) => [...document.querySelectorAll("dialog.modal[open] button")].find((b) => b.textContent.trim() === l).click(), label);
  await wait(400);
};
const draftOfGuide = () => page.evaluate((h) => Object.keys(localStorage).some((k) => k.startsWith("commonplace:draft:") && k.endsWith(":" + decodeURIComponent(h.split("/").slice(2).join("/")))), guideHash);
await page.evaluate(() => [...document.querySelectorAll("#tree a")].find((a) => a.textContent.trim() === "Home").click());
check(await until(() => !!document.querySelector("dialog.modal[open]"), 5000), "following a link from a note with unsaved changes asks first");
const asked = await leaveDialog();
check(asked?.title === "Leave without saving?" && JSON.stringify(asked.buttons) === JSON.stringify(["Stay", "Discard", "Keep as a draft", "Save"]),
  "with Stay, Discard, Keep as a draft and Save: " + JSON.stringify(asked));
await shot("4b-leave-unsaved");
await answerLeave("Stay");
check(await page.evaluate((h) => location.hash === h && document.querySelector("#save-btn .label")?.textContent === "Save" && !!document.querySelector(".cm-editor"), guideHash),
  "Stay puts the address back and keeps the changes open");
await page.evaluate(() => [...document.querySelectorAll("#tree a")].find((a) => a.textContent.trim() === "Home").click());
await until(() => !!document.querySelector("dialog.modal[open]"), 5000);
await answerLeave("Keep as a draft");
check(await until(() => /\/Home\.md$/.test(location.hash) && !document.querySelector("dialog.modal[open]"), 8000) && await draftOfGuide(),
  "Keep as a draft moves on and keeps the changes on this device");
await page.evaluate(() => document.querySelector("#back-btn").click());
await page.waitForSelector(".banner", { timeout: 10000 }).catch(() => {});
check(await page.evaluate((h) => location.hash === h, guideHash) && await page.$eval(".banner", (b) => b.textContent.includes("weren't saved")).catch(() => false),
  "Back opens the note again, with the draft offered back");
await page.evaluate(() => [...document.querySelectorAll(".banner button")].find((b) => b.textContent.startsWith("Restore")).click());
await wait(300);
await page.evaluate(() => document.querySelector("#settings-btn").click());
check(await until(() => !!document.querySelector("dialog.modal[open]"), 5000), "opening Settings asks too");
await answerLeave("Discard");
check(await until(() => location.hash.startsWith("#/settings"), 8000) && !(await draftOfGuide()), "Discard moves on and drops the changes");
await page.goto(BASE + guideHash, { waitUntil: "networkidle0" });
await page.waitForSelector(".cm-editor, .preview");
const bannersAfter = await page.$$eval(".banner", (b) => b.map((x) => x.textContent));
check(!bannersAfter.some((t) => t.includes("weren't saved")), "and nothing is offered back: " + JSON.stringify(bannersAfter));
await page.evaluate(() => document.querySelectorAll("#mode button")[1].click());
await page.waitForSelector(".cm-editor");
await page.evaluate(async () => {
  const { EditorView } = await import(new URL("vendor/vendor.js", location.href).href);
  const view = EditorView.findFromDOM(document.querySelector(".cm-editor"));
  view.dispatch({ changes: { from: view.state.doc.length, insert: "\nSaved on the way out.\n" } });
});
const putsBeforeLeave = puts.length;
await page.evaluate(() => [...document.querySelectorAll("#tree a")].find((a) => a.textContent.trim() === "Home").click());
await until(() => !!document.querySelector("dialog.modal[open]"), 5000);
await answerLeave("Save");
check(await until(() => /\/Home\.md$/.test(location.hash), 8000) && puts.length === putsBeforeLeave + 1 && puts.at(-1).text.endsWith("Saved on the way out.\n"),
  "Save saves the note, then moves on");
await page.evaluate(() => document.querySelectorAll("#mode button")[0].click());
await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("commonplace:draft:")).forEach((k) => localStorage.removeItem(k)));

// 8b. New note: only a title, in the New notes folder, from the note template, and not over an existing page.
await page.goto(at("Notes/Inbox.md"), { waitUntil: "networkidle0" });
await page.reload({ waitUntil: "networkidle0" });
await page.waitForSelector(".preview");
await page.click("#side-new");
await page.waitForSelector("dialog.modal[open] input");
check(await page.$$eval("dialog.modal .field", (f) => f.length) === 1, "the New note dialog asks only for a title");
await page.type("dialog.modal input", "Inbox");
check(await page.$eval("dialog.modal small", (s) => s.classList.contains("bad") && s.textContent.includes("already exists")), "a title that's already a page is refused");
check(await page.$eval("dialog.modal .btn.primary", (b) => b.disabled), "Create is off for it");
await page.$eval("dialog.modal input", (i) => { i.value = ""; });
const title = "Test note from e2e";
await page.type("dialog.modal input", title);
check(await page.$eval("dialog.modal small", (s) => s.textContent) === `It will be Notes/${title}.md`, "the dialog says where the note goes");
await shot("4b-new-note");
await page.click("dialog.modal .btn.primary");
await until(() => location.hash.includes("Test%20note%20from%20e2e.md") && !!document.querySelector(".cm-content")?.textContent.includes("Test note from e2e"));
const created = puts.at(-1);
check(created?.url === contentsUrl(`Notes/${title}.md`) && !created.body.sha, "the new note is created in Notes/ without a sha");
const template = await realFile("Templates/Note.md");
check(created?.text === fillTemplate(template.text, { title, date: isoDate() }), "it starts from Templates/Note.md, with {{title}} and {{date}} filled in: " + JSON.stringify(created?.text));
check(created?.body.message === `Add Notes/${title}.md from ${APP}`, "with a clear commit message");
check(await page.$eval(".cm-content", (c) => c.textContent.includes("# Test note from e2e")).catch(() => false), "and opens in Edit mode");
await page.evaluate(() => document.querySelectorAll("#mode button")[0].click());

// 9. CSV as a table: the real reading list, and saving the test table back.
await page.goto(at("Data/Reading list.csv"), { waitUntil: "networkidle0" });
await page.reload({ waitUntil: "networkidle0" });
await page.waitForSelector("table.csv");
const readingRows = parseCsv((await realFile("Data/Reading list.csv")).text).rows.length;
check(await page.$$eval("table.csv tbody tr", (r) => r.length) === readingRows, `the reading list shows its ${readingRows} rows`);
await page.goto(at(CSV_PATH), { waitUntil: "networkidle0" });
await page.waitForSelector("table.csv");
check(await page.$$eval("table.csv tbody tr", (r) => r.length) === 3, "CSV shows 3 rows");
const cell = await page.$('td[data-r="1"][data-c="2"]');
await cell.click();
await page.keyboard.type("crisp");
await page.click(".table-tools button"); // + Row
await page.keyboard.type("Plums");
await page.click("#save-btn");
await wait(800);
const p2 = puts.at(-1);
check(p2?.text === 'Name,Price,Note\nApples,3,crisp\nPears,5,"the best, by far"\nPlums,,\n', "CSV saves back as CSV: " + JSON.stringify(p2?.text));
await shot("5-csv");

// 9a. Other kinds of files: a TSV as a table, JSON with colours, a PDF, and a download for the rest.
await page.goto(at("Data/Pantry.tsv"), { waitUntil: "networkidle0" });
await page.waitForSelector("table.csv");
const pantry = await page.$$eval("table.csv tbody tr", (rows) => rows.map((r) => [...r.querySelectorAll("td")].map((td) => td.textContent)));
check(pantry.length === 5 && pantry[0].length === 4 && pantry[3][0] === "Lentils, red", "a TSV is a table split at the tabs, commas kept in cells: " + JSON.stringify(pantry[3]));
await page.goto(at("Data/settings.json"), { waitUntil: "networkidle0" });
await page.waitForSelector(".cm-content");
const jsonColours = await page.$eval(".cm-content", (c) => new Set([...c.querySelectorAll("span")].map((s) => getComputedStyle(s).color)).size).catch(() => 0);
check(jsonColours >= 3, `JSON opens as text with colours: ${jsonColours} colours`);
await shot("5b-json");
await page.goto(at("Data/word_count.py"), { waitUntil: "networkidle0" });
await page.waitForSelector(".cm-content");
check(await page.$$eval(".cm-content span", (s) => s.length).catch(() => 0) > 10, "a Python script has colours too");
await page.goto(at("Attachments/An example PDF.pdf"), { waitUntil: "networkidle0" });
await until(() => !!document.querySelector(".file-actions a[download]")?.href.startsWith("blob:"));
const pdf = await page.evaluate(() => ({
  download: document.querySelector(".file-actions a[download]")?.getAttribute("download"),
  frame: document.querySelector("iframe.pdf-view")?.src || null,
  viewer: navigator.pdfViewerEnabled,
  open: !!document.querySelector('.file-actions a[target="_blank"][href^="blob:"]'),
}));
check(pdf?.download === "An example PDF.pdf" && pdf.open, "a PDF has Download and Open in a new tab: " + JSON.stringify(pdf));
check(pdf && (pdf.viewer ? pdf.frame?.startsWith("blob:") : pdf.frame === null), "and shows in the page where the browser has a PDF viewer: " + JSON.stringify(pdf));
await shot("5c-pdf");
await page.goto(at(MP3_PATH), { waitUntil: "networkidle0" });
await until(() => !!document.querySelector(".empty .file-actions a[download]")?.href.startsWith("blob:"));
const mp3 = await page.$eval(".empty .file-actions a[download]", (a) => a.getAttribute("download")).catch(() => null);
check(mp3 === "Test song.mp3", "a file the app can't show offers a Download: " + mp3);
check(await page.$eval("#save-btn", (b) => b.hidden), "and has no Save button");

// 9b. Base views: the Task Board's table, checked against the real notes and the real Bases/Tasks.base.
const gql = async (query) => (await (await fetch(`${API}/graphql`, {
  method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ query }),
})).json()).data;
/** The .md notes right inside a folder of the example vault (Tasks/ has no subfolders), with their properties. */
const folderNotes = async (folder) => {
  const d = await gql(`{ repository(owner: ${JSON.stringify(OWNER)}, name: ${JSON.stringify(REPO)}) { object(expression: ${JSON.stringify(BRANCH + ":" + PRE + folder)}) {
    ... on Tree { entries { name type object { ... on Blob { text } } } } } } }`);
  return d.repository.object.entries.filter((e) => e.type === "blob" && e.name.endsWith(".md"))
    .map((e) => ({ path: `${folder}/${e.name}`, props: noteProps(e.object.text) }));
};
// The Task Board has two bases: the tasks' one first, then the sprints'. These look at the first.
const tabNamesNow = () => page.$eval(".base-view", (v) => [...v.querySelectorAll(".base-tab")].map((x) => x.textContent));
const pickTab = async (name) => {
  await page.evaluate((n) => [...document.querySelector(".base-view").querySelectorAll(".base-tab")].find((b) => b.textContent === n).click(), name);
  await wait(100);
  return page.$eval(".base-view .base-count", (c) => parseInt(c.textContent, 10));
};
const datesShown = () => until(() => [...document.querySelectorAll('.base-table td[data-key="file.mtime"]')].some((td) => /^\d{4}-\d\d-\d\d$/.test(td.textContent)), 40000);

const tasksBase = parseBase((await realFile("Bases/Tasks.base")).text);
const taskNotes = await folderNotes("Tasks");
const taskPaths = new Set(candidatePaths(tasksBase, taskNotes.map((n) => n.path)));
const expected = tasksBase.views.map((v, i) => ({ name: v.name, ...runView(tasksBase, i, taskNotes.filter((n) => taskPaths.has(n.path))) }));
await page.setViewport({ width: 1280, height: 860 });
await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "dark" }]);
await page.goto(at("Task Board.md"), { waitUntil: "networkidle0" });
await page.reload({ waitUntil: "networkidle0" });
check(await until(() => !!document.querySelector(".base-view .base-table"), 40000), "the Task Board's base shows as a table");
check(!(await page.$(".base-view .note.error")), "with no error: " + await page.$eval(".base-view .note.error", (e) => e.textContent).catch(() => "none"));
const boardTabs = await tabNamesNow();
check(JSON.stringify(boardTabs) === JSON.stringify(expected.map((v) => v.name)), "its views show as tabs: " + JSON.stringify(boardTabs));
for (const v of expected) {
  const n = await pickTab(v.name);
  check(n === v.count, `the ${v.name} tab shows ${n} notes, as many as the notes' properties give (${v.count})`);
}
check(await page.$eval('.base-view .base-tab[aria-selected="true"]', (b) => b.textContent) === expected.at(-1).name, "the chosen tab is marked selected");
await pickTab(expected[0].name);
const groupLabels = await page.$eval(".base-view", (v) => [...v.querySelectorAll(".base-table tr.base-group .base-group-label")].map((x) => x.firstChild.textContent));
check(JSON.stringify(groupLabels) === JSON.stringify(expected[0].groups.map((g) => g.label)), `${expected[0].name} groups in the base's order: ` + JSON.stringify(groupLabels));
check(await datesShown(), "Last modified fills in with the notes' last commit dates");
await page.evaluate(() => { document.querySelector(".base-view").scrollIntoView(); });
await shot("13-board-desktop-dark");
await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
await shot("13b-board-desktop-light");
await pickTab(expected.at(-1).name);
await page.reload({ waitUntil: "networkidle0" });
await until(() => !!document.querySelector(".base-view .base-table"), 40000);
check(await page.$eval('.base-view .base-tab[aria-selected="true"]', (b) => b.textContent).catch(() => null) === expected.at(-1).name, "the last chosen tab is remembered");
await pickTab(expected[0].name);

// Phone width: the table scrolls inside its own box, the page doesn't.
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await page.reload({ waitUntil: "networkidle0" });
await until(() => !!document.querySelector(".base-view .base-table"), 40000);
await datesShown();
const phone = await page.evaluate(() => {
  const scroller = document.querySelector(".base-scroll");
  const tabs = [...document.querySelector(".base-view").querySelectorAll(".base-tab")];
  const name = document.querySelector(".base-table td.base-name");
  return {
    pageFits: document.documentElement.scrollWidth <= innerWidth && document.querySelector("main").scrollWidth <= innerWidth,
    tableScrolls: scroller.scrollWidth > scroller.clientWidth && scroller.getBoundingClientRect().right <= innerWidth + 0.5,
    oneTabRow: tabs.every((t) => t.offsetTop === tabs[0].offsetTop),
    sticky: name.classList.contains("base-sticky") && getComputedStyle(name).position === "sticky" && getComputedStyle(name).backgroundColor !== "rgba(0, 0, 0, 0)",
  };
});
check(phone.pageFits, "phone width: no sideways scroll on the page");
check(phone.tableScrolls, "phone width: the table scrolls inside its own box");
check(phone.oneTabRow, "phone width: the tabs stay on one row");
check(phone.sticky, "phone width: the name column stays put, on a solid background");
await page.evaluate(() => { document.querySelector(".base-view").scrollIntoView(); });
await shot("14-board-phone-light");
await page.evaluate(() => { document.querySelector(".base-scroll").scrollLeft = 300; });
await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "dark" }]);
await shot("14b-board-phone-dark-scrolled");

// Clicking a row's name opens that task.
await page.setViewport({ width: 1280, height: 860 });
await page.reload({ waitUntil: "networkidle0" });
await until(() => !!document.querySelector(".base-table td.base-name a"), 40000);
const rowPath = await page.$eval(".base-table td.base-name a", (a) => a.dataset.path);
await page.click(".base-table td.base-name a");
await until(() => !!document.querySelector(".preview h1") && !location.hash.includes("Task%20Board.md"));
check(hashPath(page.url()) === `/${ID}/${rowPath}`, `clicking a row's name opens it: ${rowPath}`);

// The .base file itself opens as its view.
await page.goto(at("Bases/Tasks.base"), { waitUntil: "networkidle0" });
check(await until(() => !!document.querySelector(".base-view .base-table"), 40000)
  && await page.$eval(".preview h1", (e) => e.textContent) === "Tasks.base", "Bases/Tasks.base opens as its table");
check(await page.evaluate(() => document.querySelector("#save-btn").hidden && document.querySelector("#mode").hidden), "and can't be edited or saved");

// 9c. Mermaid diagrams: the Guide's ```mermaid blocks are drawn, in either scheme, without widening the page.
const diagramCount = ((await realFile("Guide.md")).text.match(/^```mermaid/gm) || []).length;
const diagramsDrawn = async () => {
  for (const end = Date.now() + 30000; Date.now() < end; await wait(150)) {
    if (await page.evaluate((n) => document.querySelectorAll(".preview .mermaid-diagram svg:not([data-old])").length === n
      && !document.querySelector(".preview .diagram-error"), diagramCount).catch(() => false)) return true;
  }
  return false;
};
const markOld = () => page.evaluate(() => document.querySelectorAll(".preview .mermaid-diagram svg").forEach((svg) => { svg.dataset.old = "1"; }));
const diagramFacts = () => page.evaluate(() => {
  const boxes = [...document.querySelectorAll(".preview .mermaid-diagram")];
  return {
    pageFits: document.documentElement.scrollWidth <= innerWidth && document.querySelector("main").scrollWidth <= innerWidth,
    boxesFit: boxes.every((b) => b.getBoundingClientRect().right <= innerWidth + 0.5),
    labels: boxes.every((b) => b.querySelector("svg .nodeLabel, svg text")?.textContent.trim()),
    scrolls: boxes.some((b) => b.scrollWidth > b.clientWidth),
  };
});
const showDiagram = (n) => page.evaluate((i) => document.querySelectorAll(".preview .mermaid-diagram")[i].scrollIntoView(), n);
await page.goto(at("Guide.md"), { waitUntil: "networkidle0" });
check(await diagramsDrawn(), `the Guide's ${diagramCount} mermaid blocks are drawn as diagrams: `
  + await page.$$eval(".preview .mermaid-diagram svg", (s) => s.length));
const dDesk = await diagramFacts();
check(dDesk.pageFits && dDesk.boxesFit && dDesk.labels && !dDesk.scrolls, "desktop: the diagrams have labels and fit the page, shrunk if need be: " + JSON.stringify(dDesk));
await showDiagram(0);
await shot("16-diagrams-desktop-dark");
await markOld();
await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
check(await diagramsDrawn(), "a scheme change redraws them");
await showDiagram(diagramCount - 1);
await shot("16b-diagrams-desktop-light");
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await page.reload({ waitUntil: "networkidle0" });
check(await diagramsDrawn(), "phone width: the diagrams are drawn");
const dPhone = await diagramFacts();
check(dPhone.pageFits && dPhone.boxesFit && dPhone.scrolls, "phone width: the diagrams stay inside the page, a wide one scrolling in its box: " + JSON.stringify(dPhone));
await showDiagram(diagramCount - 1);
await shot("16c-diagrams-phone-light");
// The fold arrows on a phone: a bullet's in the bullet's place, a numbered or task item's at the start of its line.
await page.evaluate(() => document.querySelector(".note-body li.has-fold")?.scrollIntoView({ block: "start" }));
check(await page.evaluate(() => [...document.querySelectorAll(".note-body .fold")].every((b) => { const r = b.getBoundingClientRect(); return r.left >= 0 && r.width >= 18; })),
  "phone width: every fold arrow is on the page and big enough to tap");
await shot("16e-lists-phone-light");
await markOld();
await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "dark" }]);
await diagramsDrawn();
await showDiagram(diagramCount - 1);
await page.evaluate((i) => { document.querySelectorAll(".preview .mermaid-diagram")[i].scrollLeft = 400; }, diagramCount - 1);
await shot("16d-diagrams-phone-dark-scrolled");
await page.setViewport({ width: 1280, height: 860 });

// 10. Phone width.
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await page.goto(at("Notes/Inbox.md"), { waitUntil: "networkidle0" });
await page.reload({ waitUntil: "networkidle0" });
await page.waitForSelector(".preview h2");
check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "no sideways scroll at phone width");
check(await page.evaluate(() => [...document.querySelectorAll(".bar > *:not([hidden])")].every((el) => el.getBoundingClientRect().right <= innerWidth + 0.5)), "the whole bar fits at phone width");
await shot("6-inbox-phone");
await page.click("#menu-btn");
await wait(300);
await shot("7-files-phone");
await page.click("#scrim");
await page.goto(at("Home.md"), { waitUntil: "networkidle0" });
await page.waitForSelector(".embed-page .embed-body li, .embed-page .embed-body p", { timeout: 10000 }).catch(() => {});
await shot("7b-home-phone");
await page.waitForSelector(".note-body .suggest .suggest-name", { timeout: 15000 }).catch(() => {});
await page.evaluate(() => document.querySelector(".note-body .suggest")?.scrollIntoView({ block: "center" }));
await shot("7e-home-top-tasks-phone");
// A phone's browser can't show a PDF in the page: Open in a new tab and Download instead.
await page.goto(at("Attachments/An example PDF.pdf"), { waitUntil: "networkidle0" });
check(await until(() => !document.querySelector("iframe.pdf-view") && document.querySelectorAll(".empty .file-actions a[href^='blob:']").length === 2
  && document.documentElement.scrollWidth <= innerWidth), "a PDF on a phone: Open in a new tab and Download, no frame, no sideways scroll");
await shot("7c-pdf-phone");
await page.goto(at("Data/settings.json"), { waitUntil: "networkidle0" });
await page.waitForSelector(".cm-content");
check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "JSON fits a phone's width");
await shot("7d-json-phone");
await page.goto(BASE + "#/settings", { waitUntil: "networkidle0" });
check(await page.$$eval(".repo-card [name=notes], .repo-card [name=template]", (i) => i.map((x) => x.value)).then((v) => JSON.stringify(v) === JSON.stringify(["Notes", "Templates/Note.md"])),
  "Settings shows the repo's New notes folder and Note template");
await shot("8-settings-phone");
await page.setViewport({ width: 1280, height: 860 });
await page.reload({ waitUntil: "networkidle0" });
await shot("8b-settings-desktop");

// 8c. Task fields: a repo with no task setup opens with a new project's fields; saving writes them to its .commonplace.json.
await page.$eval(".repo-card summary", (el) => el.click());
await page.evaluate(() => [...document.querySelectorAll(".repo-card[open] button")].find((b) => /Task fields/.test(b.textContent)).click());
check(await until(() => document.querySelectorAll("dialog[open] .task-field:not(.head)").length === 15, 10000),
  "Task fields opens with the fifteen fields the app knows");
const fieldsOn = await page.$$eval("dialog[open] .task-field:not(.head)", (rows) => rows.map((r) => [r.textContent.includes("Reviewer"), r.querySelector("input[type=checkbox]")?.checked]));
check(fieldsOn.filter(([rev]) => rev).length === 1 && fieldsOn.every(([rev, on]) => on === !rev), "every one of them on but Reviewer, which a project turns on: " + JSON.stringify(fieldsOn));
await shot("8c-task-fields");
const putsBeforeFields = puts.length;
await page.evaluate(() => [...document.querySelectorAll("dialog[open] button")].find((b) => /Save to the repo/.test(b.textContent)).click());
check(await until(() => !document.querySelector("dialog[open]"), 10000), "saving closes it");
const markerPut = puts.slice(putsBeforeFields).find((p) => p.url === `${REPO_API}/contents/.commonplace.json`);
const saved = markerPut ? JSON.parse(markerPut.text) : null;
check(saved?.tasks?.fields?.sprint?.on === true && saved.tasks.fields.part_of.on === true && saved.tasks.fields.reviewer?.on === false && saved.tasks.fields.blocked_by?.on === true && saved.folder === FOLDER,
  "the task setup is saved in .commonplace.json at the repo's top, with the repo's settings: " + (markerPut?.text || "no PUT").replace(/\s+/g, " ").slice(0, 120));

// 8d. A task's fields as a form: with that setup, a task shows its ten fields; a change is one commit of that one line.
const formTask = "Tasks/Invite a friend.md";
await page.goto(at(formTask), { waitUntil: "networkidle0" });
check(await until(() => document.querySelectorAll(".task-form .tf-grid > .input").length === 10, 10000),
  "a task shows the setup's ten fields as a form");
check(await page.$eval("#tf-status", (s) => s.value).catch(() => null) === "To Do", "with its status picked");
check(!(await page.$$eval(".props .prop-key", (k) => k.map((x) => x.textContent))).includes("status"), "and the Properties box leaves out what the form shows");
await shot("8d-task-form");
await page.setViewport({ width: 375, height: 812 }); // not isMobile: switching it reloads the page
await wait(300);
check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && [...document.querySelectorAll(".task-form .input")].every((el) => el.getBoundingClientRect().right <= innerWidth + 0.5)),
  "the form fits at phone width");
await shot("8d-task-form-phone");
await page.setViewport({ width: 1280, height: 860 });
const putsBeforeForm = puts.length;
await page.select("#tf-type", "Bug");
check(await until(() => document.querySelector("#toast")?.textContent.includes("Type: Bug"), 10000), "changing a field saves it at once");
const formPut = puts.slice(putsBeforeForm).find((p) => p.url === contentsUrl(formTask));
check(!!formPut && formPut.body.message === "T-4: type set to Bug from Commonplace.md" && /\ntype: Bug\n/.test(formPut.text) && /\nstatus: To Do\n/.test(formPut.text),
  "one commit that adds that one line: " + formPut?.body.message);

// 8d2. Relations: a task shows them both ways (its own links, and the other tasks' links to it, the other way
// round); Add relation adds one and the x takes one out, each one commit of that one line.
const relGroups = () => page.$$eval(".relations .rel-group", (gs) => Object.fromEntries(gs.map((g) => [g.querySelector(".rel-label").textContent,
  [...g.querySelectorAll("li")].map((li) => li.textContent + (li.querySelector("button") ? " [x]" : ""))])));
check(await until(() => document.querySelectorAll(".relations .rel-group").length === 2, 15000), "a task shows its relations");
const rel4 = await relGroups();
check(JSON.stringify(rel4) === JSON.stringify({ "Blocked by": ["T-1Write the welcome noteDone [x]"], "Comes before": ["T-5Add a reading listTo Do"] }),
  "its own (which it can take out) and, the other way round, the ones another task links to it with: " + JSON.stringify(rel4));
check(!(await page.$$eval(".props .prop-key", (k) => k.map((x) => x.textContent))).includes("blocked_by") && !(await page.$("#tf-blocked_by")),
  "relations show only in their box: not in the form or the Properties box");
await shot("8d2-relations");
const putsBeforeRel = puts.length;
await page.evaluate(() => [...document.querySelectorAll(".relations button")].find((b) => /Add relation/.test(b.textContent)).click());
await page.waitForSelector("dialog[open] select");
check(JSON.stringify(await page.$$eval("dialog[open] select option", (o) => o.map((x) => x.textContent))) === '["Blocked by","Related","Comes after","Comes before"]',
  "Add relation offers the four kinds");
await page.select("dialog[open] select", "related");
await page.type("dialog[open] input", "T-4");
check(await until(() => document.querySelector("dialog[open] small")?.textContent.includes("can't be related to itself"), 5000), "a task can't be related to itself");
await page.$eval("dialog[open] input", (el) => { el.value = ""; });
await page.type("dialog[open] input", "T-2");
check(await until(() => document.querySelector("dialog[open] small")?.textContent === "Invite a friend: related Make a note template", 5000), "it says what it will add");
await shot("8d2-add-relation");
await page.evaluate(() => [...document.querySelectorAll("dialog[open] button")].find((b) => b.textContent.trim() === "Add").click());
check(await until(() => document.querySelector("#toast")?.textContent.includes("Related: Make a note template"), 10000), "Add saves it at once");
const relPut = puts.slice(putsBeforeRel).find((p) => p.url === contentsUrl(formTask));
check(!!relPut && relPut.body.message === "T-4: related set to Make a note template from Commonplace.md" && /\nrelated: \["\[\[Make a note template\]\]"\]\n/.test(relPut.text)
  && /\nblocked_by: \["\[\[Write the welcome note\]\]"\]\n/.test(relPut.text), "one commit that adds that one line, a list of links: " + relPut?.body.message);
check(await until(() => document.querySelectorAll(".relations .rel-group").length === 3, 10000), "and the box shows it");
const putsBeforeUnrel = puts.length;
await page.evaluate(() => [...document.querySelectorAll(".relations .rel-group")].find((g) => g.textContent.startsWith("Blocked by")).querySelector("button").click());
check(await until(() => document.querySelector("#toast")?.textContent.includes("Blocked by: cleared"), 10000), "the x takes one out at once");
const unrelPut = puts.slice(putsBeforeUnrel).find((p) => p.url === contentsUrl(formTask));
check(!!unrelPut && unrelPut.body.message === "T-4: blocked_by set to nothing from Commonplace.md" && /\nblocked_by: \[\]\n/.test(unrelPut.text),
  "one commit of that one line: " + unrelPut?.body.message);
await page.setViewport({ width: 375, height: 812 });
await wait(300);
check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth
  && [...document.querySelectorAll(".relations, .relations li, .relations button")].every((el) => el.getBoundingClientRect().right <= innerWidth + 0.5)),
  "the relations fit at phone width");
await shot("8d2-relations-phone");
await page.setViewport({ width: 1280, height: 860 });
// The other side: Make a note template now shows Invite a friend as related, from the change just made.
await page.goto(at("Tasks/Make a note template.md"), { waitUntil: "networkidle0" });
check(await until(() => document.querySelectorAll(".relations .rel-group").length === 1, 15000), "the other task shows the relation too");
const rel2 = await relGroups();
check(JSON.stringify(rel2) === JSON.stringify({ Related: ["T-4Invite a friendTo Do", "T-5Add a reading listTo Do"] }),
  "the other way round, and with no x, since the links are in the other tasks: " + JSON.stringify(rel2));

// 8e. A note can link to the setup: #/settings?fields opens Task fields for the repo it's in.
await page.goto(at("Set up tasks.md"), { waitUntil: "networkidle0" });
check(await until(() => !!document.querySelector('.note-body a[href="#/settings?fields"]'), 10000), "the Set up tasks page has a link to the setup");
await page.evaluate(() => document.querySelector('.note-body a[href="#/settings?fields"]')?.click());
check(await until(() => location.hash === "#/settings?fields" && document.querySelectorAll("dialog[open] .task-field:not(.head)").length === 15, 10000),
  "the Set up tasks page's link opens Task fields");
await page.evaluate(() => [...document.querySelectorAll("dialog[open] button")].find((b) => b.textContent.trim() === "Cancel")?.click());

// 8f. Parent tasks and subtasks: the example epic lists its three tasks, the parent picker refuses a loop,
// and Add subtask makes a new task under it.
const epic = "Tasks/Get set up.md";
// On the Task Board, a ```subtasks block with task: T-6 shows the epic's subtasks there, read only, naming the epic.
await page.goto(at("Task Board.md"), { waitUntil: "networkidle0" });
await until(() => document.querySelectorAll(".note-body .subtasks .st-list li").length === 3, 15000);
const boardSubs = await page.evaluate(() => {
  const box = document.querySelector(".note-body .subtasks");
  return { code: !!document.querySelector(".note-body .app-block"), of: box?.querySelector(".st-of")?.textContent ?? "",
    href: decodeURIComponent(box?.querySelector(".st-of")?.getAttribute("href") ?? ""), count: box?.querySelector(".st-count")?.textContent ?? "",
    rows: box?.querySelectorAll(".st-list li").length ?? 0, add: !!box?.querySelector("button") };
});
check(!boardSubs.code && boardSubs.of === "of T-6Get set up" && boardSubs.href.endsWith("/Tasks/Get set up.md") && boardSubs.count === "2 of 3 done"
  && boardSubs.rows === 3 && !boardSubs.add, "a ```subtasks block with task: shows that task's subtasks on another page, read only: " + JSON.stringify(boardSubs));
await page.goto(at(epic), { waitUntil: "networkidle0" });
check(await until(() => document.querySelectorAll(".subtasks .st-list li").length === 3, 15000), "the epic lists its three subtasks");
const subs = await page.evaluate(() => ({
  count: document.querySelector(".subtasks .st-count")?.textContent,
  done: document.querySelector(".subtasks .st-bar")?.getAttribute("aria-valuenow"),
  width: document.querySelector(".subtasks .st-bar > span")?.style.width,
  rows: [...document.querySelectorAll(".subtasks .st-list li")].map((li) => li.textContent),
}));
check(subs.count === "2 of 3 done" && subs.done === "2" && subs.width === "67%", "with a bar of how many are done: " + JSON.stringify(subs));
check(/^T-3.*Try the app on a phone.*In Progress$/.test(subs.rows[0] ?? ""), "the open one first, with its ID and status: " + subs.rows[0]);
check(await until(() => document.querySelectorAll(".commits .st-list li").length === 2, 15000), "the task lists the two commits in its commits property");
const commits = await page.evaluate(() => ({
  count: document.querySelector(".commits .st-count")?.textContent,
  rows: [...document.querySelectorAll(".commits .st-list li")].map((li) => li.textContent),
  href: document.querySelector(".commits .st-list a")?.getAttribute("href"),
  below: !!document.querySelector(".subtasks + .commits"),
  inProps: [...document.querySelectorAll(".props, .properties")].some((p) => /\bcommits\b/.test(p.textContent)),
}));
check(commits.count === "2 commits" && commits.below && !commits.inProps
  && commits.href === `https://github.com/${OWNER}/${REPO}/commit/1b98fa34d64a84c025611233b13b3996b5cd168e`
  && /^1b98fa3Sprints:/.test(commits.rows[0]) && /^ae4a0adParent tasks and subtasks:/.test(commits.rows[1]),
  "the newest first, linking to GitHub, below the subtasks and not again in the properties: " + JSON.stringify(commits));
check(searches.length === 0, "with no search on GitHub: " + JSON.stringify(searches));
await shot("8f-subtasks");
await page.setViewport({ width: 375, height: 812 });
await wait(300);
check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth
  && [...document.querySelectorAll(".subtasks, .subtasks button, .commits, .commits li")].every((el) => el.getBoundingClientRect().right <= innerWidth + 0.5)),
  "the subtasks and commits fit at phone width");
await shot("8f-subtasks-phone");
await page.setViewport({ width: 1280, height: 860 });
await wait(300);
const parentOptions = await page.$$eval("#tf-list-part_of option", (o) => o.map((x) => x.value));
check(parentOptions.includes("T-4 Invite a friend") && !parentOptions.some((o) => /Try the app|Get set up/.test(o)),
  "the parent picker lists tasks by ID and name, leaving out the task and the ones under it: " + JSON.stringify(parentOptions));
const putsBeforeLoop = puts.length;
const pickParent = (text) => page.$eval("#tf-part_of", (el, t) => { el.value = t; el.dispatchEvent(new Event("change")); }, text);
await pickParent("T-3");
check(await until(() => document.querySelector("#toast")?.textContent.includes("Try the app on a phone is already under Get set up"), 5000),
  "a task under it can't be its parent (picked by ID)");
await pickParent("Get set up");
check(await until(() => document.querySelector("#toast")?.textContent.includes("can't be its own parent"), 5000), "nor can the task itself");
check(puts.length === putsBeforeLoop && await page.$eval("#tf-part_of", (el) => el.value) === "", "nothing is saved, and the picker goes back");
const putsBeforeSub = puts.length;
await page.evaluate(() => [...document.querySelectorAll(".subtasks button")].find((b) => /Add subtask/.test(b.textContent)).click());
await page.waitForSelector("dialog[open] input");
await page.type("dialog[open] input", "Set up a second device");
await page.evaluate(() => [...document.querySelectorAll("dialog[open] button")].find((b) => b.textContent.trim() === "Add subtask").click());
check(await until(() => location.hash.endsWith("/Tasks/Set%20up%20a%20second%20device.md"), 10000), "Add subtask opens the new task");
const subPut = puts.slice(putsBeforeSub).find((p) => p.url === contentsUrl("Tasks/Set up a second device.md"));
check(!!subPut && /\npart_of: "?\[\[Get set up\]\]"?\n/.test(subPut.text) && /\narea: Setup\n/.test(subPut.text) && /\nstatus: To Do\n/.test(subPut.text)
  && /^---\nparent: "\[\[Task Board\]\]"\n/.test(subPut.text),
  "it's a new task under the epic, with the epic's area and place in the tree: " + JSON.stringify(subPut?.text.split("\n---")[0]));
// The epic has no sprint, so the new task goes on the next sprint (if there is one), like any new task.
const nextForNew = inboxSprints.find((x) => x.when === "next");
check(new RegExp(`\\nsprint: ${nextForNew ? `"\\[\\[${nextForNew.name}\\]\\]"` : '""'}\\n`).test(subPut?.text ?? ""),
  `a new task goes on the next sprint (${nextForNew?.name ?? "none"}): ` + JSON.stringify(subPut?.text.match(/\nsprint:.*/)?.[0]));
check(subPut?.body.message === "T-6: add Tasks/Set up a second device.md as a subtask of Get set up from Commonplace.md", "the commit says so: " + subPut?.body.message);
await page.goto(at(epic), { waitUntil: "networkidle0" });
check(await until(() => document.querySelector(".subtasks .st-count")?.textContent === "2 of 4 done", 15000), "the epic now has four subtasks");

// 8g. Sprints: a sprint's page lists its tasks by status with how much is done; the picker puts the current sprint
// first; Start the next sprint makes the next one and moves what's left, in one commit; the board shows the current one.
const realSprints = await Promise.all(["Sprints/Sprint 1.md", "Sprints/Sprint 2.md"].map(async (p) => ({ path: p, props: noteProps((await realFile(p)).text) })));
await page.goto(at("Sprints/Sprint 1.md"), { waitUntil: "networkidle0" });
await page.evaluate(() => document.querySelector("#mode").children[0].click()); // Read: Add subtask left it in Edit
check(await until(() => document.querySelectorAll(".sprint-box .sprint-group").length === 3, 15000), "a sprint's page lists its tasks by status");
const sprint1 = await page.evaluate(() => ({
  groups: [...document.querySelectorAll(".sprint-box .sprint-status")].map((g) => g.firstChild.textContent),
  done: document.querySelector(".sprint-box .sprint-done")?.textContent,
  goal: document.querySelector(".sprint-box .sprint-goal")?.textContent,
  start: !!document.querySelector(".sprint-box .st-head button"),
  points: [...document.querySelectorAll(".sprint-box .st-status")].map((x) => x.textContent),
}));
check(JSON.stringify(sprint1.groups) === '["To Do","In Progress","Done"]', "in the setup's order of statuses: " + JSON.stringify(sprint1.groups));
check(sprint1.done === "1 of 3 tasks done · 2 of 6 points" && sprint1.points.join() === "1 point,3 points,2 points" && sprint1.goal === "Goal: The notes on every device", "with how much is done, in tasks and points, and its goal: " + JSON.stringify(sprint1));
check(!sprint1.start, "only the latest sprint offers Start the next sprint");
await shot("8g-sprint");
await page.setViewport({ width: 375, height: 812 });
await wait(300);
check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.querySelector(".sprint-box").offsetWidth > 0
  && document.querySelector(".sprint-box").getBoundingClientRect().right <= innerWidth + 0.5), "the sprint's page fits at phone width");
await shot("8g-sprint-phone");
await page.setViewport({ width: 1280, height: 860 });
await page.goto(at("Tasks/Add a reading list.md"), { waitUntil: "networkidle0" });
await until(() => document.querySelectorAll("#tf-list-sprint option").length === 2, 15000);
const sprintOptions = await page.$$eval("#tf-list-sprint option", (o) => o.map((x) => x.value));
const sprintOrder = sprintChoices(sprints(realSprints, isoDate())).map((x) => x.name);
check(JSON.stringify(sprintOptions) === JSON.stringify(sprintOrder), "the sprint picker puts the current sprint first, then the next: " + JSON.stringify(sprintOptions));
await page.goto(at("Sprints/Sprint 2.md"), { waitUntil: "networkidle0" });
// The subtask added above was never saved (and went on the next sprint, Sprint 2), so read the real tree again.
await page.reload({ waitUntil: "networkidle0" });
check(await until(() => !!document.querySelector(".sprint-box .st-head button"), 15000), "the latest sprint offers Start the next sprint");
await page.evaluate(() => document.querySelector(".sprint-box .st-head button").click());
await page.waitForSelector("dialog[open] input");
const startDialog = await page.evaluate(() => ({
  name: document.querySelector("dialog[open] input").value,
  dates: [...document.querySelectorAll('dialog[open] input[type="date"]')].map((d) => d.value),
  move: [...document.querySelectorAll('dialog[open] input[type="checkbox"]')].map((b) => b.checked && b.value),
}));
check(startDialog.name === "Sprint 3" && startDialog.dates[0] >= "2026-11-30" && startDialog.move.join() === "Tasks/Add a reading list.md",
  "it suggests Sprint 3 after Sprint 2, with Sprint 2's unfinished task ticked: " + JSON.stringify(startDialog));
await shot("8g-start-sprint");
const putsBeforeSprint = puts.length;
await page.evaluate(() => [...document.querySelectorAll("dialog[open] button")].find((b) => b.textContent.trim() === "Start sprint").click());
check(await until(() => location.hash.endsWith("/Sprints/Sprint%203.md"), 15000), "Start sprint opens the new sprint");
const sprintTree = treeWrites.at(-1)?.tree ?? [];
check(sprintTree.length === 2 && sprintTree[0].path === PRE + "Sprints/Sprint 3.md" && /\nstart: "?\d{4}-\d\d-\d\d"?\nend: "?\d{4}-\d\d-\d\d"?\n/.test(sprintTree[0].content)
  && sprintTree[1].path === PRE + "Tasks/Add a reading list.md" && /\nsprint: "\[\[Sprint 3\]\]"\n/.test(sprintTree[1].content),
  "one tree with the new sprint note and the moved task: " + JSON.stringify(sprintTree.map((e) => e.path)));
check(commitWrites.at(-1)?.message === "Start Sprint 3, with 1 unfinished task from Sprint 2 from Commonplace.md" && refWrites.length === 1
  && refWrites[0].url === `${REPO_API}/git/refs/heads/${encPath(BRANCH)}` && puts.length === putsBeforeSprint,
  "one commit, the branch moved to it, and nothing else saved: " + commitWrites.at(-1)?.message);
check(await until(() => document.querySelector(".sprint-box .sprint-done")?.textContent === "0 of 1 task done · 0 of 2 points", 15000),
  "the new sprint has the moved task");
await page.goto(at("Task Board.md"), { waitUntil: "networkidle0" });
check(await until(() => {
  const v = document.querySelectorAll(".base-view")[1];
  return !!v?.querySelector('.base-tab[aria-selected="true"]') && /\d/.test(v.querySelector(".base-count")?.textContent ?? "");
}, 40000), "the Task Board shows the sprints' base too");
await page.evaluate(() => document.querySelectorAll(".base-view")[1].scrollIntoView());
await shot("8g-board-sprints");
const currentView = runView(parseBase((await realFile("Bases/Sprints.base")).text), 0, realSprints);
const currentShown = await page.evaluate(() => {
  const v = document.querySelectorAll(".base-view")[1];
  return { tab: v.querySelector('.base-tab[aria-selected="true"]')?.textContent, count: parseInt(v.querySelector(".base-count").textContent, 10) };
});
check(currentShown.tab === "Current sprint" && currentShown.count === currentView.count, "its Current sprint view shows the sprint going on today: " + JSON.stringify(currentShown));

// 10a. The inbox's ```new-tasks block: a box with its items; Add puts one in the block, and Save would commit it.
await page.goto(at("Notes/Inbox.md"), { waitUntil: "networkidle0" });
await page.waitForSelector(".note-body section.newtasks .newtasks-add input", { timeout: 15000 }).catch(() => {});
const newTasks = await page.evaluate(() => {
  const box = document.querySelector(".note-body section.newtasks");
  return {
    head: box?.querySelector(".suggest-head small")?.textContent ?? "",
    items: [...(box?.querySelectorAll(".newtasks-list li") ?? [])].map((li) => li.textContent),
    link: box?.querySelector(".newtasks-list a.wikilink")?.dataset.path ?? null,
    code: !!document.querySelector(".note-body pre code.language-new-tasks"),
  };
});
check(!newTasks.code && newTasks.head.startsWith("For Your name · 2 items") && newTasks.items.includes("Try the app on a second device")
  && newTasks.link === "Data/Reading list.csv", "the inbox's ```new-tasks block is a box with its items, links working: " + JSON.stringify(newTasks));
await page.type(".note-body section.newtasks .newtasks-add input", "An idea from the browser check");
await page.keyboard.press("Enter");
await page.waitForFunction(() => [...document.querySelectorAll(".note-body section.newtasks .newtasks-list li")].some((li) => li.textContent === "An idea from the browser check"), { timeout: 5000 }).catch(() => {});
const added = await page.evaluate(() => ({
  items: document.querySelectorAll(".note-body section.newtasks .newtasks-list li").length,
  save: !document.querySelector("#save-btn")?.disabled,
  focus: document.activeElement?.matches(".newtasks-add input") ?? false,
}));
check(added.items === 3 && added.save && added.focus, "Add puts the item in the block, the note can be saved, and the field keeps the focus: " + JSON.stringify(added));
await page.evaluate(() => document.querySelector(".note-body section.newtasks")?.scrollIntoView({ block: "center" }));
await shot("2g-inbox-new-tasks");

// 10a2. The Inbox dot: signed in as the example inboxes' person, something waits on them (the reading
// list's question, the Guide's mention), so the Inbox button and the sidebar's Inbox row show a dot. In the
// inbox, Seen on the Guide's mention folds it under Seen and saves the inbox's seen_mentions at once.
fakeLogin = "your-github-login";
await page.goto(at("Home.md"), { waitUntil: "networkidle0" });
// Only the #hash changed, so the page is reloaded for the app to ask GitHub again who is signed in.
await page.reload({ waitUntil: "networkidle0" });
await page.waitForSelector("#inbox-btn.has-dot", { timeout: 30000 }).catch(() => {});
const dot = await page.evaluate(() => ({
  button: document.querySelector("#inbox-btn")?.classList.contains("has-dot") ?? false,
  label: document.querySelector("#inbox-btn")?.getAttribute("aria-label") ?? "",
  row: !!document.querySelector("#shortcuts .row .inbox-dot"),
}));
check(dot.button && dot.label === "Inbox: something needs you" && dot.row,
  "the Inbox button and the sidebar's Inbox row show a dot when something waits on you: " + JSON.stringify(dot));
await page.evaluate(() => document.querySelector("#main").scrollTo(0, 0));
await shot("2h-inbox-dot");
// The new-tasks check above left the inbox changed: leaving kept it as a draft, which would come back.
await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("commonplace:draft:")).forEach((k) => localStorage.removeItem(k)));
await page.click("#inbox-btn");
await page.waitForFunction(() => [...document.querySelectorAll(".note-body .attention .attention-list li")].some((li) => li.textContent.includes("Mention") && li.querySelector(".attention-seen-btn")), { timeout: 20000 }).catch(() => {});
const putsBeforeSeen = puts.length;
await page.evaluate(() => [...document.querySelectorAll(".note-body .attention .attention-list li")]
  .find((li) => li.querySelector("a.suggest-name")?.textContent.startsWith("Guide") && li.querySelector(".attention-seen-btn"))
  ?.querySelector(".attention-seen-btn").click());
await page.waitForFunction((n) => document.querySelector(".attention-seen summary") && n, { timeout: 10000 }, putsBeforeSeen).catch(() => {});
await new Promise((r) => setTimeout(r, 1500));
const seenAfter = await page.evaluate(() => ({
  summary: document.querySelector(".note-body .attention .attention-seen summary")?.textContent ?? "",
  folded: [...document.querySelectorAll(".note-body .attention .attention-seen li a.suggest-name")].map((a) => a.textContent),
  head: document.querySelector(".note-body .attention .suggest-head small")?.textContent ?? "",
  toast: document.querySelector("#toast")?.textContent ?? "", dirty: !document.querySelector("#save-btn")?.disabled,
}));
const seenPut = puts.slice(putsBeforeSeen).find((p) => p.text.includes("seen_mentions:"));
check(seenAfter.summary === "Seen (1)" && seenAfter.folded.some((t) => t.startsWith("Guide")) && seenAfter.head.includes("1 seen")
  && /seen_mentions: \["Guide\.md#[0-9a-f]{8}"\]/.test(seenPut?.text ?? ""),
  "Seen folds the Guide's mention under Seen and saves seen_mentions in the inbox at once: " + JSON.stringify({ ...seenAfter, put: seenPut?.text.split("\n").slice(0, 7), puts: puts.slice(putsBeforeSeen).map((p) => p.url.split("/").pop()) }));
await page.evaluate(() => document.querySelector(".note-body .attention")?.scrollIntoView({ block: "center" }));
await shot("2i-inbox-mention-seen");
fakeLogin = null;

// 10b. A device without a token sees the first-run screen.
const fresh = await browser.createBrowserContext();
const newcomer = await fresh.newPage();
await newcomer.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await newcomer.goto(BASE, { waitUntil: "networkidle0" });
check(await newcomer.$(".welcome input[type=password]") !== null && !(await newcomer.$eval(".bar", (b) => b.offsetParent !== null)), "without a token: the first-run screen, no toolbar");
// The version in development (served under dev/) says so in its title.
const shownApp = /\/dev\/$/.test(new URL(BASE).pathname) ? `${APP} (dev)` : APP;
check(await newcomer.title() === shownApp, "the page is called " + shownApp);
await newcomer.screenshot({ path: `${OUT}/9-welcome-phone.png` });
await fresh.close();

// 10c. Read only: GitHub says this person can read the repo but not change it.
readOnlyRepo = true;
await page.setViewport({ width: 1280, height: 860 });
await page.goto(at(taskPath), { waitUntil: "networkidle0" });
await page.reload({ waitUntil: "networkidle0" });
await page.waitForSelector(".preview input.task");
check(await page.$eval("#title .badge", (b) => b.textContent === "Read only").catch(() => false), "a read-only repo says so in the toolbar");
check(await page.evaluate(() => ["#mode", "#save-btn", "#side-new"].every((s) => document.querySelector(s).hidden)), "no Edit, Save or New note there");
check(await page.$$eval(".preview input.task", (bs) => bs.length > 0 && bs.every((b) => b.disabled)), "its checkboxes can't be ticked");
await shot("10-read-only");
readOnlyRepo = false;

// 10d. A new device without an invite: after the token it's sent to add a repo, and asks GitHub about none.
const otherContext = await browser.createBrowserContext();
const other = await otherContext.newPage();
const otherAsked = [];
await other.setRequestInterception(true);
other.on("request", (req) => {
  const url = req.url();
  if (url.startsWith(API + "/") && req.method() !== "OPTIONS") otherAsked.push(url);
  if (url === `${API}/user` && req.method() === "GET") return req.respond(json(200, { login: "someone", avatar_url: "" }));
  if (url.startsWith(`${API}/user/repos`) && req.method() === "GET") return req.respond(json(200, [{ owner: { login: "someone" }, name: "plain", pushed_at: "t", permissions: { push: true } }]));
  if (url === `${API}/graphql` && req.method() === "POST") return req.respond(json(200, { data: { r0: { object: null } } }));
  if (url.startsWith(`${API}/repos/`) && req.method() === "GET") return req.respond(json(404, { message: "Not Found" }));
  req.continue();
});
await other.setViewport({ width: 1280, height: 860 });
await other.goto(BASE, { waitUntil: "networkidle0" });
await other.type(".welcome input", "not-a-real-token");
await other.click(".welcome .btn.primary");
check(await until(() => location.hash === "#/settings?add=1" && !!document.querySelector(".repo-card[open] [name=repo]"), 10000, other),
  "with no invite, connecting leads to Settings with a new repo to fill in");
check(await other.$eval(".repo-card[open] [name=owner]", (i) => i.value).catch(() => null) === "someone", "its owner starts as the signed-in login");
check(!otherAsked.some((u) => u.startsWith(`${API}/repos/`)), "the app asked GitHub about no repos: " + JSON.stringify(otherAsked));
check(otherAsked.some((u) => u.startsWith(`${API}/user/repos`)) && otherAsked.includes(`${API}/graphql`), "it looked for vaults on GitHub (one listing, one GraphQL request)");
check(!(await other.$eval("#toast", (t) => t.classList.contains("error")).catch(() => false)), "with no error shown");
await other.screenshot({ path: `${OUT}/12-new-device-settings.png` });
await other.goto(BASE + "#/", { waitUntil: "networkidle0" });
check(await other.$eval(".empty h2", (e) => e.textContent === "No notes repo yet").catch(() => false), "and the start page says how to add one");
check(await storedRepos(other).then((r) => r == null || (Array.isArray(r) && r.length === 0)), "the device has no repos");
await other.screenshot({ path: `${OUT}/12b-new-device-empty.png` });
await otherContext.close();

// 10d2. A new device without an invite, with a vault on GitHub: a repo with a .commonplace.json is added by itself.
const foundContext = await browser.createBrowserContext();
const found = await foundContext.newPage();
await found.setRequestInterception(true);
found.on("request", (req) => {
  const url = req.url();
  if (url === `${API}/user` && req.method() === "GET") return req.respond(json(200, { login: "someone", avatar_url: "" }));
  if (url.startsWith(`${API}/user/repos`) && req.method() === "GET") {
    return req.respond(json(200, [{ owner: { login: OWNER }, name: REPO, default_branch: BRANCH, pushed_at: "t", permissions: { push: true } }]));
  }
  if (url === `${API}/graphql` && req.method() === "POST") {
    const marker = { label: "Found vault", folder: FOLDER, home: "Home.md", inbox: "Notes/Inbox.md", vault: true };
    return req.respond(json(200, { data: { r0: { object: { text: JSON.stringify(marker) } } } }));
  }
  req.continue();
});
await found.setViewport({ width: 1280, height: 860 });
await found.goto(BASE, { waitUntil: "networkidle0" });
await found.type(".welcome input", "not-a-real-token");
await found.click(".welcome .btn.primary");
check(await until(() => !location.hash.startsWith("#/settings") && (localStorage.getItem("commonplace:repos") || "").includes("Found vault"), 10000, found),
  "a vault with a .commonplace.json is found and added when a new device connects");
const foundRepos = await storedRepos(found);
check(foundRepos?.length === 1 && foundRepos[0].label === "Found vault" && foundRepos[0].folder === FOLDER && foundRepos[0].branch === BRANCH && foundRepos[0].vault === true,
  "with the settings in the file: " + JSON.stringify(foundRepos));
await found.screenshot({ path: `${OUT}/12c-new-device-found-vault.png` });
await foundContext.close();

// 10e. A device set up by an older version: its notes-app: settings move to commonplace:, vault settings get notes and template.
const oldContext = await browser.createBrowserContext();
const old = await oldContext.newPage();
await old.setRequestInterception(true); // passes everything on; it also lets a mocked GitHub answer this page
old.on("request", (req) => req.continue());
await old.setViewport({ width: 1280, height: 860 });
await old.goto(BASE, { waitUntil: "networkidle0" });
const oldRepo = { id: "old", label: "Old settings", owner: OWNER, repo: REPO, branch: BRANCH, folder: FOLDER, vault: true, inbox: "Notes/Inbox.md", inboxes: "Notes/Inboxes", home: "Home.md" };
await old.evaluate((t, r) => {
  localStorage.clear();
  localStorage.setItem("notes-app:token", JSON.stringify(t));
  localStorage.setItem("notes-app:repos", JSON.stringify([r]));
  localStorage.setItem("notes-app:draft:old:Home.md", JSON.stringify({ text: "x", sha: "y", at: 0 }));
}, token, oldRepo);
await old.goto(BASE + "#/", { waitUntil: "networkidle0" });
await old.reload({ waitUntil: "networkidle0" });
const moved = await old.evaluate(() => Object.fromEntries(Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)])));
check(!Object.keys(moved).some((k) => k.startsWith("notes-app:")) && moved["commonplace:token"] === JSON.stringify(token) && "commonplace:draft:old:Home.md" in moved,
  "an older device's token, repos and drafts move to commonplace: once");
const upgraded = JSON.parse(moved["commonplace:repos"] || "[]")[0];
check(upgraded?.notes === "Notes" && upgraded?.template === "Templates/Note.md", "its vault repo gets the New notes folder and template it used to imply");
check(await until(() => location.hash.startsWith("#/old/") && !!document.querySelector(".preview h1"), 20000, old), "and it opens its notes as before");
await oldContext.close();

// 11. Service worker registered.
check(await page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())), "service worker registered");

log("PUT requests intercepted (none reached GitHub):", puts.length);
log("page errors:", errors.length ? "\n  " + errors.join("\n  ") : "none");
await browser.close();

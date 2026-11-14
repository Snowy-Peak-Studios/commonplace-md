// End-to-end check of Commonplace.md in Chrome against the example vault on GitHub (reads only).
// Every PUT to GitHub is intercepted and answered here, so nothing is written.
// See tests/e2e/README.md for how to run it.
import puppeteer from "puppeteer-core";
import { fillTemplate, isoDate } from "../../src/vault.js";
import { parseCsv } from "../../src/csv.js";
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
let putMode = "ok";
let fakeHead = null; // answer "the branch's latest commit" with this sha, as if someone else had pushed
let readOnlyRepo = false; // answer GitHub's "can this person push?" with no

const CSV_PATH = "Data/Test table.csv";
const CSV_TEXT = 'Name,Price,Note\nApples,3,\nPears,5,"the best, by far"\n';
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
const page = await browser.newPage();
page.on("dialog", (d) => d.accept());
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
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
  // No vaults found by themselves: the check sees only the example vault, whatever else the token can open.
  if (req.method() === "GET" && url.startsWith(`${API}/user/repos`)) return req.respond(json(200, []));
  if (fakeHead && req.method() === "GET" && url.startsWith(`${REPO_API}/commits/`)) {
    return req.respond({ status: 200, contentType: "text/plain", body: fakeHead,
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Expose-Headers": "ETag", ETag: `"${fakeHead}"` } });
  }
  if (readOnlyRepo && req.method() === "GET" && url === REPO_API) {
    return req.respond(json(200, { full_name: `${OWNER}/${REPO}`, permissions: { pull: true, push: false, admin: false } }));
  }
  // A CSV file added to the example vault's tree, served from here.
  if (url.startsWith(`${REPO_API}/git/trees/`)) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } });
    const data = await res.json();
    data.tree.push({ path: PRE + CSV_PATH, type: "blob", sha: "csvsha" });
    return req.respond(json(200, data));
  }
  // A note "created" by the New note check: its PUT was answered here, so its GET is too.
  const created = puts.find((p) => !p.body.sha && p.url === url.split("?")[0]);
  if (created && req.method() === "GET") return req.respond(json(200, { sha: "fake-new", size: created.text.length, content: b64(created.text) }));
  if (url.split("?")[0] === contentsUrl(CSV_PATH)) return req.respond(json(200, { sha: "csvsha", size: CSV_TEXT.length, content: b64(CSV_TEXT) }));
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
check(treeCount === realFiles.length + 1, `tree lists the example vault: ${treeCount} files (${realFiles.length} on GitHub, plus the test CSV)`);
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
await shot("2-inbox-desktop");

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
check(free0[0]?.name === "T-4 Invite a friend", "the High one comes first: " + free0[0]?.name);
check(!free0.some((s) => /Try the app|Write the welcome|Make a note/.test(s.name)), "no taken or done task is suggested as free: " + JSON.stringify(free0.map((s) => s.name)));
check(free0.every((s) => s.claim), "each free one has a Claim button");
// Whether each task can be started now: a chip, its reason in the tooltip and on a tap.
const stateChips = await page.$$eval(".suggest > .suggest-list > li", (li) => li.map((x) => {
  const chip = x.querySelector(".chip.state");
  return chip ? { text: chip.textContent, title: chip.title } : null;
}));
check(stateChips.length === rows0.length && stateChips.every((c) => c?.text === "Ready" && c.title.startsWith("Ready to start")),
  "every task shows whether it's ready, with the reason as a tooltip: " + JSON.stringify(stateChips));
await page.click(".suggest > .suggest-list > li .chip.state");
await page.waitForFunction(() => document.querySelector("#toast.show")?.textContent.includes("Ready to start"), { timeout: 5000 }).catch(() => {});
check(await page.$eval("#toast", (t) => t.classList.contains("show") && t.textContent.includes("Ready to start")), "tapping it says why (for phones, which have no tooltips)");
const putsBefore = puts.length;
await page.evaluate(() => [...document.querySelectorAll(".suggest > .suggest-list > li")].find((li) => li.textContent.includes("Invite a friend"))
  ?.querySelectorAll("button").forEach((b) => { if (b.textContent.includes("Claim")) b.click(); }));
await page.waitForSelector("dialog.modal[open] .btn.primary");
await page.click("dialog.modal .btn.primary");
await page.waitForFunction((n) => document.querySelector("#toast.show")?.textContent.includes("Claimed"), { timeout: 15000 }).catch(() => {});
const claim = puts.length > putsBefore ? puts.at(-1) : null;
check(claim?.url === contentsUrl("Tasks/Invite a friend.md"), "Claim saves the task: " + claim?.url);
check(/^status: In Progress$/m.test(claim?.text ?? "") && /^assignee: Your name$/m.test(claim?.text ?? ""), "its status is In Progress and its assignee the inbox's owner");
check(claim?.body.message?.startsWith("T-4: claimed by Your name"), "the commit says who claimed it: " + claim?.body.message);
await page.waitForFunction(() => [...document.querySelectorAll(".suggest-list li")].some((li) => li.querySelector(".chip.claimed") && li.textContent.includes("Invite a friend")), { timeout: 10000 }).catch(() => {});
const rows1 = await boxRows();
check(rows1.find((r) => r.name === "T-4 Invite a friend")?.claimed === "Claimed" && rows1[0].name === "T-4 Invite a friend",
  "the claimed task stays, at the top (High), marked Claimed: " + JSON.stringify(rows1));
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
const putsBeforeWait = puts.length;
await page.evaluate(() => [...document.querySelectorAll(".suggest-list li")].find((li) => li.textContent.includes("Add a reading list"))
  ?.querySelectorAll("button").forEach((b) => { if (b.textContent === "Not now") b.click(); }));
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
// The claim was never saved, so read the real tree again for the checks below.
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
await shot("2b-guide-desktop");

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
const tabNamesNow = () => page.$$eval(".base-view .base-tab", (b) => b.map((x) => x.textContent));
const pickTab = async (name) => {
  await page.evaluate((n) => [...document.querySelectorAll(".base-view .base-tab")].find((b) => b.textContent === n).click(), name);
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
const groupLabels = await page.$$eval(".base-table tr.base-group .base-group-label", (g) => g.map((x) => x.firstChild.textContent));
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
  const tabs = [...document.querySelectorAll(".base-tab")];
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
check(await until(() => document.querySelectorAll("dialog[open] .task-field:not(.head)").length === 10, 10000),
  "Task fields opens with the ten fields a new project gets");
check(await page.$$eval("dialog[open] .task-field:not(.head) input[type=checkbox]", (c) => c.every((x) => x.checked)), "every one of them on");
await shot("8c-task-fields");
const putsBeforeFields = puts.length;
await page.evaluate(() => [...document.querySelectorAll("dialog[open] button")].find((b) => /Save to the repo/.test(b.textContent)).click());
check(await until(() => !document.querySelector("dialog[open]"), 10000), "saving closes it");
const markerPut = puts.slice(putsBeforeFields).find((p) => p.url === `${REPO_API}/contents/.commonplace.json`);
const saved = markerPut ? JSON.parse(markerPut.text) : null;
check(saved?.tasks?.fields?.sprint?.on === true && saved.tasks.fields.part_of.on === true && saved.folder === FOLDER,
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

// 8e. A note can link to the setup: #/settings?fields opens Task fields for the repo it's in.
await page.goto(at("Set up tasks.md"), { waitUntil: "networkidle0" });
check(await until(() => !!document.querySelector('.note-body a[href="#/settings?fields"]'), 10000), "the Set up tasks page has a link to the setup");
await page.evaluate(() => document.querySelector('.note-body a[href="#/settings?fields"]')?.click());
check(await until(() => location.hash === "#/settings?fields" && document.querySelectorAll("dialog[open] .task-field:not(.head)").length === 10, 10000),
  "the Set up tasks page's link opens Task fields");
await page.evaluate(() => [...document.querySelectorAll("dialog[open] button")].find((b) => b.textContent.trim() === "Cancel")?.click());

// 10b. A device without a token sees the first-run screen.
const fresh = await browser.createBrowserContext();
const newcomer = await fresh.newPage();
await newcomer.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await newcomer.goto(BASE, { waitUntil: "networkidle0" });
check(await newcomer.$(".welcome input[type=password]") !== null && !(await newcomer.$eval(".bar", (b) => b.offsetParent !== null)), "without a token: the first-run screen, no toolbar");
check(await newcomer.title() === APP, "the page is called " + APP);
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

import puppeteer from "puppeteer-core";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
const BASE = process.env.BASE || "http://127.0.0.1:8765/", OUT = process.argv[2];
if (!OUT) throw Error("Pass an output directory");
fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, args: ["--no-first-run", "--no-default-browser-check"] });
const page = await browser.newPage(); await page.setBypassServiceWorker(true);
const errors = [], requests = [], writes = [];
page.on("pageerror", e => errors.push(e.message));
const sha = text => createHash("sha1").update(`blob ${Buffer.byteLength(text)}\0${text}`).digest("hex");
const note = (stage, category, kind, minutes, extra = "") => `---\nstage: ${stage}\ncategory: ${category}\nkind: ${kind}\n${minutes == null ? "" : `work_time: ${minutes}\n`}${extra}---\n# Example task\n`;
const marker = { tasks: { folder: "Work", fields: { status: { prop: "stage", values: ["Open", "Testing", "Cancelled", "Shipped"] }, area: { prop: "category" }, type: { prop: "kind" } } } };
const docs = {
  ".commonplace.json": JSON.stringify(marker),
  "Board.md": "# AI planning\n\n```ai-work-time\ngroup: area-type\n```\n",
  "Area.md": "# Areas\n\n```ai-work-time\ngroup: area\n```\n",
  "Type.md": "# Types\n\n```ai-work-time\ngroup: type\n```\n",
  "Plain.md": "# No chart here\n",
  "Invalid.md": "# Invalid chart\n\n```ai-work-time\ngroup: person\n```\n",
  "Work/Open.md": note("Open", "Setup", "Task", null, "estimate: 7\n"),
  "Work/No history.md": note("Open", "Sharing", "Bug"),
  "Work/One sample.md": note("Open", "Docs", "Task"),
  "Work/First.md": note("Shipped", "Setup", "Task", 10, "assignee: Human Reviewer\n"),
  "Work/Second.md": note("Shipped", "Setup", "Task", 30),
  "Work/Other.md": note("Shipped", "Docs", "Task", 5),
  "Work/Cancelled.md": note("Cancelled", "Setup", "Task", 900),
  "Work/Testing.md": note("Testing", "Setup", "Task", 900),
  "Work/Bad.md": note("Shipped", "Setup", "Task", "false"),
  "Work/Epic.md": note("Shipped", "Setup", "Epic", 900),
  "Other/Not a task.md": note("Shipped", "Setup", "Task", 900),
};
const json = (data, status = 200) => ({ status, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify(data) });
await page.setRequestInterception(true);
page.on("request", async r => { try {
  const u = new URL(r.url());
  if (u.origin !== "https://api.github.com") return r.continue();
  requests.push(u.pathname);
  if (r.method() === "OPTIONS") return r.respond({ status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Authorization,Content-Type,Accept,X-GitHub-Api-Version" } });
  if (r.method() !== "GET" && u.pathname !== "/graphql") { writes.push(u.pathname); return r.respond(json({ message: "Writes blocked" }, 403)); }
  const b = r.postData() ? JSON.parse(r.postData()) : {};
  if (u.pathname === "/user") return r.respond(json({ login: "reader-example" }));
  if (u.pathname === "/user/repos") return r.respond(json([]));
  if (u.pathname === "/graphql") {
    if (b.query.includes("defaultBranchRef")) return r.respond(json({ data: { repository: { defaultBranchRef: { name: "main" }, object: { text: JSON.stringify(marker), oid: sha(JSON.stringify(marker)) } } } }));
    const repository = {};
    for (const m of b.query.matchAll(/(b\d+): object\(oid: "([a-f0-9]+)"\)/g)) { const text = Object.values(docs).find(t => sha(t) === m[2]); repository[m[1]] = text == null ? null : { text }; }
    return r.respond(json({ data: { repository } }));
  }
  if (u.pathname.includes("/commits/")) return r.respond({ status: 200, contentType: "text/plain", body: "main" });
  if (u.pathname.includes("/git/trees/")) return r.respond(json({ tree: Object.entries(docs).map(([path, text]) => ({ path, type: "blob", sha: sha(text), size: Buffer.byteLength(text) })), truncated: false }));
  if (u.pathname.includes("/contents/")) { const text = docs[decodeURIComponent(u.pathname.split("/contents/")[1])]; return r.respond(text == null ? json({ message: "Missing" }, 404) : json({ content: Buffer.from(text).toString("base64"), sha: sha(text) })); }
  if (/^\/repos\/[^/]+\/[^/]+$/.test(u.pathname)) return r.respond(json({ permissions: { push: false } }));
  return r.respond(json({ message: "Unexpected request" }, 404));
} catch (e) { errors.push(e.message); if (!r.isInterceptResolutionHandled()) await r.abort(); } });
const go = async (id, path) => { await page.goto(BASE + `#/${id}/${encodeURIComponent(path).replace(/%2F/g, "/")}`, { waitUntil: "networkidle0" }); };
try {
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(BASE, { waitUntil: "networkidle0" });
  await page.evaluate(async docs => {
    const { LocalSource } = await import("./src/local.js"); localStorage.clear(); const local = new LocalSource();
    const repo = { id: "history-local", label: "Local history", local: "browser", owner: "", repo: "", branch: "", home: "Board.md", notes: "Work", inbox: "", inboxes: "", folder: "" };
    await local.create(repo, { seed: Object.entries(docs).map(([path, text]) => ({ path, bytes: new TextEncoder().encode(text) })) });
    const decoy = { ...repo, id: "unselected", label: "Other vault" };
    await local.create(decoy, { seed: [{ path: "Work/Other.md", bytes: new TextEncoder().encode("---\nstatus: Done\narea: Setup\ntype: Task\nwork_time: 99999\n---\n# Other\n") }] });
    localStorage.setItem("commonplace:repos", JSON.stringify([repo, decoy])); localStorage.setItem("commonplace:discovery", JSON.stringify({ at: Date.now() }));
  }, docs);
  await go("history-local", "Board.md"); await page.reload({ waitUntil: "networkidle0" });
  await page.waitForSelector(".ai-time-chart");
  let text = await page.$eval(".ai-time-chart", e => e.textContent);
  assert(text.includes("Setup · Task20 min average · 2 tasks")); assert(text.includes("10 min–30 min")); assert(!text.includes("900")); assert(!text.includes("99999")); assert.equal(requests.length, 0);
  console.log("PASS local no-token chart uses only completed valid AI records in this vault and custom task fields");
  await go("history-local", "Work/Open.md"); await page.waitForSelector(".ai-time-estimate");
  text = await page.$eval(".ai-time-estimate", e => e.textContent); assert(text.includes("20 min average")); assert(text.includes("2 completed tasks")); assert.equal(await page.$eval("#tf-estimate", e => e.value), "7");
  console.log("PASS task estimate uses matching Area and Type and preserves the manual estimate");
  for (const [name, width, scheme] of [["desktop-light", 1280, "light"], ["desktop-dark", 1280, "dark"], ["phone-light", 390, "light"], ["phone-dark", 390, "dark"]]) {
    await page.setViewport({ width, height: 840 }); if (width < 700) { await page.evaluate(() => document.getElementById("side-close").click()); await page.waitForFunction(() => document.getElementById("side").getBoundingClientRect().right <= 1); } await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: scheme }]);
    await page.$eval(".ai-time-estimate", e => e.scrollIntoView({ block: "center" }));
    assert(await page.$eval(".ai-time-estimate", e => e.scrollWidth <= e.clientWidth + 1));
    await page.screenshot({ path: `${OUT}/estimate-${name}.png` });
    await go("history-local", "Board.md"); await page.waitForSelector(".ai-time-chart"); await page.$eval(".ai-time-chart", e => e.scrollIntoView({ block: "center" }));
    assert(await page.$eval(".ai-time-chart", e => e.scrollWidth <= e.clientWidth + 1)); await page.screenshot({ path: `${OUT}/chart-${name}.png` }); await go("history-local", "Work/Open.md");
  }
  console.log("PASS desktop/phone and light/dark chart and task estimate layouts fit");
  await go("history-local", "Work/One sample.md"); await page.waitForSelector(".ai-time-estimate"); assert((await page.$eval(".ai-time-estimate", e => e.textContent)).includes("provisional: one sample"));
  await go("history-local", "Work/No history.md"); await page.waitForSelector(".ai-time-estimate"); assert((await page.$eval(".ai-time-estimate", e => e.textContent)).includes("No completed AI tasks"));
  await go("history-local", "Work/First.md"); assert.equal(await page.$(".ai-time-estimate"), null);
  await go("history-local", "Plain.md"); assert.equal(await page.$(".ai-time-chart"), null);
  for (const path of ["Area.md", "Type.md"]) { await go("history-local", path); await page.waitForSelector(".ai-time-chart"); }
  await go("history-local", "Invalid.md"); assert((await page.$eval(".ai-time-block", e => e.textContent)).includes("Use group:"));
  assert.equal(requests.length, 0);
  console.log("PASS sparse/no history, completed task, absent block, broad grouping and invalid grouping states");
  await page.evaluate(() => {
    const repo = { id: "remote", label: "Read-only history", owner: "example-owner", repo: "example-notes", branch: "main", folder: "", home: "Board.md", inbox: "", inboxes: "", notes: "Work" };
    localStorage.setItem("commonplace:repos", JSON.stringify([repo])); localStorage.setItem("commonplace:token", JSON.stringify("fixture-read-token")); localStorage.setItem("commonplace:user", JSON.stringify({ login: "reader-example" }));
  });
  await page.reload({ waitUntil: "networkidle0" }); await go("remote", "Work/Open.md"); await page.waitForSelector(".ai-time-estimate");
  assert((await page.$eval(".ai-time-estimate", e => e.textContent)).includes("20 min average")); assert.equal(await page.$(".task-form"), null);
  await go("remote", "Board.md"); await page.waitForSelector(".ai-time-chart"); assert((await page.$eval(".ai-time-chart", e => e.textContent)).includes("2 tasks"));
  assert.equal(writes.length, 0); assert.deepEqual(errors, []);
  console.log("PASS read-only GitHub chart/estimate work without writes or AI requests");
} catch (e) { console.log(errors); console.log(await page.evaluate(() => document.body.innerText)); await page.screenshot({ path: `${OUT}/failure.png` }); throw e; }
finally { await browser.close(); }

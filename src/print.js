// A print-only copy keeps expanded sections and print controls out of the live note.
let active = null;

export function clearPrintView() {
  if (!active) return;
  active.root.remove();
  document.title = active.title;
  active = null;
}


/** Keep marker and style references inside each SVG, even when the live note has the same diagram. */
function isolateSvgIds(root) {
  root.querySelectorAll("svg").forEach((svg, index) => {
    const ids = new Map();
    [svg, ...svg.querySelectorAll("[id]")].filter(el => el.id).forEach(el => { ids.set(el.id, "print-" + index + "-" + el.id); el.id = "print-" + index + "-" + el.id; });
    const references = value => value.replace(/#([\w-]+)/g, (match, id) => ids.has(id) ? "#" + ids.get(id) : match);
    [svg, ...svg.querySelectorAll("*")].forEach(el => {
      for (const attr of [...el.attributes]) if (attr.name !== "id") el.setAttribute(attr.name, references(attr.value));
      if (el.tagName.toLowerCase() === "style") el.textContent = references(el.textContent);
    });
  });
}

/** Copy the rendered note, including unsaved preview text, without changing the note or its folds. */
export function createPrintView(preview, title) {
  clearPrintView();
  const root = preview.cloneNode(true);
  root.id = "print-note";
  root.style.display = "none";
  root.querySelectorAll("img").forEach(image => { image.loading = "eager"; });
  root.querySelectorAll("details").forEach(el => { el.open = true; });
  root.querySelectorAll(".folded").forEach(el => el.classList.remove("folded"));
  root.querySelectorAll("form, button, textarea, .cm-editor, .newtasks-tools, .board-edit").forEach(el => el.remove());
  root.querySelectorAll("input, select").forEach(el => {
    if (el.type === "checkbox") {
      const mark = document.createElement("span");
      mark.className = "print-checkbox";
      mark.textContent = el.checked ? "☑" : "☐";
      el.replaceWith(mark);
    } else {
      const value = document.createElement("span");
      value.className = "print-field";
      value.textContent = el.tagName === "SELECT" ? el.selectedOptions[0]?.textContent ?? el.value : el.value;
      el.replaceWith(value);
    }
  });
  isolateSvgIds(root);
  active = { root, title: document.title };
  document.title = title;
  document.body.append(root);
  return root;
}

/** Wait for the real render jobs rather than printing loading skeletons or incomplete embeds. */
async function ready(preview, isCurrent) {
  const deadline = Date.now() + 15000;
  while ([...preview.querySelectorAll(".sk, img:not([src]), .mermaid-diagram:not(.drawn):not(:has(.diagram-error))")].some(el => !el.closest("form, .cm-editor"))) {
    if (!isCurrent()) throw Error("The page changed. Export the current page again.");
    if (Date.now() > deadline) throw Error("The page is still loading. Wait for it to finish, then export again.");
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  await document.fonts?.ready;
  if (!isCurrent()) throw Error("The page changed. Export the current page again.");
}

export async function printNote({ preview, title, isCurrent, drawDiagram, print = () => window.print() }) {
  if (active) return;
  if (typeof window.print !== "function") throw Error("Open this page in your browser, then choose Share or the browser menu, Print, and Save as PDF.");
  await ready(preview, isCurrent);
  const root = createPrintView(preview, title);
  try {
    await Promise.all([...root.querySelectorAll(".mermaid-diagram[data-diagram-source]")].map(async el => {
      try { el.innerHTML = await drawDiagram(el.dataset.diagramSource); }
      catch { /* A diagram failure keeps the already rendered SVG or visible source/error text. */ }
    }));
    isolateSvgIds(root);
    await Promise.all([...root.querySelectorAll("img")].map(async image => {
      let timer;
      try {
        // A broken image prints as it shows on the page (its alt text), not as a failed export.
        await Promise.race([image.decode().catch(() => {}), new Promise((_, reject) => { timer = setTimeout(() => reject(Error("An image is still loading. Try exporting again.")), 10000); })]);
      } finally { clearTimeout(timer); }
    }));
    if (!isCurrent()) throw Error("The page changed. Export the current page again.");
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    print();
  } catch (error) { clearPrintView(); throw error; }
  // afterprint also fires when the dialog is cancelled. Mobile print sheets can return before closing.
}

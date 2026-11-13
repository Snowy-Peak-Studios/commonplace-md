// SVG icons (Lucide), built once and cloned.

import { iconNodes } from "../vendor/vendor.js";

const NS = "http://www.w3.org/2000/svg";
const cache = new Map();

function build([tag, attrs, children = []]) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  for (const child of children) el.append(build(child));
  return el;
}

/** An icon as an <svg> element; its size and colour come from CSS (`.icon`). */
export function icon(name, cls = "") {
  if (!cache.has(name)) {
    const svg = build(iconNodes[name] || iconNodes.blank);
    svg.removeAttribute("width");
    svg.removeAttribute("height");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    cache.set(name, svg);
  }
  const svg = cache.get(name).cloneNode(true);
  svg.setAttribute("class", `icon${cls ? " " + cls : ""}`);
  return svg;
}

/** Puts an icon at the start of every element under `root` that has `data-icon`. */
export function fillIcons(root) {
  for (const el of root.querySelectorAll("[data-icon]")) {
    if (el.querySelector(":scope > svg.icon")) continue;
    el.prepend(icon(el.dataset.icon));
  }
}

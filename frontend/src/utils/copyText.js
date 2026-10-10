const BLOCK_TAGS = new Set(["P", "DIV", "SECTION", "H1", "H2", "H3", "H4", "H5", "H6", "UL", "OL", "PRE"]);

/** Serialize Markdown DOM without depending on the layout of a detached clone. */
export function extractCopyText(root) {
  if (!root) return "";
  function read(node) {
    if (node.nodeType === 3) {
      const text = node.textContent || "";
      // React Markdown inserts formatting newlines between block elements.
      // Block serializers supply their own separators; retain inline spaces.
      return !text.trim() && text.includes("\n") && BLOCK_TAGS.has(node.parentElement?.tagName) ? "" : text;
    }
    if (node.nodeType !== 1) return "";
    if (node.hasAttribute("data-copy-ignore") || node.hasAttribute("hidden") || node.getAttribute("aria-hidden") === "true") return "";
    if (node.hasAttribute("data-copy-code")) return `\n${node.getAttribute("data-copy-code")}\n`;
    if (node.classList.contains("katex")) {
      return node.querySelector('annotation[encoding="application/x-tex"]')?.textContent || "";
    }
    if (node.tagName === "BR") return "\n";
    if (node.tagName === "HR") return "\n\n";
    if (node.tagName === "TABLE") {
      return "\n" + [...node.querySelectorAll("tr")].map((row) =>
        [...row.children].map((cell) => readChildren(cell).trim().replace(/\s+/g, " ")).join("\t")
      ).join("\n") + "\n\n";
    }
    const text = readChildren(node);
    if (node.tagName === "LI") {
      const parent = node.parentElement;
      const start = Number(parent?.getAttribute("start") || 1);
      const prefix = parent?.tagName === "OL" ? `${start + [...parent.children].indexOf(node)}. ` : "• ";
      return `${prefix}${text.trim()}\n`;
    }
    if (node.tagName === "BLOCKQUOTE") return "\n" + text.trim().split("\n").map((line) => `> ${line}`).join("\n") + "\n\n";
    return BLOCK_TAGS.has(node.tagName) ? `\n${text}\n\n` : text;
  }
  function readChildren(node) { return [...node.childNodes].map(read).join(""); }
  return readChildren(root).replace(/\u00a0/g, " ").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

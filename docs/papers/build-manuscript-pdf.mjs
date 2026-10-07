import { readFileSync, writeFileSync } from "node:fs";
const dir = "C:/Users/think/Project_v2/Deers-Rock/docs/papers";
const md = readFileSync(`${dir}/jamia-dr-submission.md`, "utf8").split(/\r?\n/);
const svgs = [1, 2, 3, 4].map(n => {
  const names = { 1: "figure-1-architecture", 2: "figure-2-handler-pipeline", 3: "figure-3-calendar-modifiers", 4: "figure-4-per-seed-los" };
  return readFileSync(`${dir}/figures/${names[n]}.svg`, "utf8").replace(/<\?xml[^>]*\?>/, "");
});
let mermaidIdx = 0;
const out = [];
const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const inline = s => esc(s)
  .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
  .replace(/`([^`]+)`/g, "<code>$1</code>")
  .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
  .replace(/_(.+?)_/g, "<em>$1</em>");
let i = 0;
while (i < md.length) {
  const line = md[i];
  if (line.trim().startsWith("```")) {
    const lang = line.trim().slice(3).trim();
    const buf = [];
    i++;
    while (i < md.length && !md[i].trim().startsWith("```")) { buf.push(md[i]); i++; }
    i++;
    if (lang === "mermaid" && mermaidIdx < svgs.length) { out.push(`<div class="fig">${svgs[mermaidIdx]}</div>`); mermaidIdx++; }
    else out.push(`<pre><code>${esc(buf.join("\n"))}</code></pre>`);
    continue;
  }
  const h = line.match(/^(#{1,6})\s+(.*)$/);
  if (h) { out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); i++; continue; }
  if (/^\s*\|.*\|\s*$/.test(line)) {
    const rows = [];
    while (i < md.length && /^\s*\|.*\|\s*$/.test(md[i])) { rows.push(md[i]); i++; }
    let html = "<table>";
    rows.forEach((r, idx) => {
      if (/^\s*\|[\s:|-]+\|\s*$/.test(r)) return;
      const cells = r.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(c => inline(c.trim()));
      const tag = idx === 0 ? "th" : "td";
      html += "<tr>" + cells.map(c => `<${tag}>${c}</${tag}>`).join("") + "</tr>";
    });
    out.push(html + "</table>");
    continue;
  }
  if (line.trim().startsWith(">")) {
    const buf = [];
    while (i < md.length && md[i].trim().startsWith(">")) { buf.push(md[i].trim().replace(/^>\s?/, "")); i++; }
    out.push(`<blockquote>${inline(buf.join(" "))}</blockquote>`);
    continue;
  }
  if (/^\s*[-*]\s+/.test(line)) {
    const buf = [];
    while (i < md.length && /^\s*[-*]\s+/.test(md[i])) { buf.push(md[i].replace(/^\s*[-*]\s+/, "")); i++; }
    out.push("<ul>" + buf.map(b => `<li>${inline(b)}</li>`).join("") + "</ul>");
    continue;
  }
  if (/^\s*\d+\.\s+/.test(line)) {
    const buf = [];
    while (i < md.length && /^\s*\d+\.\s+/.test(md[i])) { buf.push(md[i].replace(/^\s*\d+\.\s+/, "")); i++; }
    out.push("<ol>" + buf.map(b => `<li>${inline(b)}</li>`).join("") + "</ol>");
    continue;
  }
  if (line.trim() === "") { i++; continue; }
  out.push(`<p>${inline(line)}</p>`);
  i++;
}
const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Deers Rock</title>
<style>
body{font-family:Georgia,'Times New Roman',serif;font-size:11pt;line-height:1.45;max-width:19cm;margin:1.5cm auto;color:#111}
h1{font-size:16pt;text-align:center;margin-bottom:0.2em} h2{font-size:13pt;margin-top:1.3em;border-bottom:1px solid #ccc;padding-bottom:2px}
h3{font-size:12pt} h4{font-size:11pt;font-style:italic}
table{border-collapse:collapse;margin:0.6em 0;font-size:9.5pt} th,td{border:1px solid #999;padding:3px 6px;text-align:left;vertical-align:top}
th{background:#eef4fb} pre{background:#f6f6f6;padding:6px;font-size:9pt;overflow-x:auto}
code{font-family:Consolas,monospace;font-size:9.5pt;background:#f2f2f2;padding:0 2px}
blockquote{border-left:3px solid #2c7bb6;margin:0.6em 0;padding:3px 10px;color:#333;background:#f7fafd}
.fig{margin:1em 0;text-align:center;page-break-inside:avoid} .fig svg{max-width:100%;height:auto}
@page{size:A4;margin:18mm}
</style></head><body>${out.join("\n")}</body></html>`;
writeFileSync(`${dir}/_submission-build.html`, html);
console.log("HTML written; mermaid figures embedded:", mermaidIdx);

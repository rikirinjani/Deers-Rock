import { readFileSync, writeFileSync, existsSync } from 'fs';
import { marked } from 'marked';
import { execSync } from 'child_process';
import { resolve } from 'path';

const mdPath = resolve('docs/papers/deers-rock-softwarex.md');
const htmlPath = resolve('docs/papers/deers-rock-softwarex.html');
const pdfPath = resolve('docs/papers/deers-rock-softwarex.pdf');

const md = readFileSync(mdPath, 'utf-8');
const bodyHtml = marked(md);

const style = `
body{font-family:"Times New Roman",Times,serif;font-size:11pt;line-height:1.5;margin:0.9in}
h1{font-size:16pt;text-align:center}
h2{font-size:13pt;margin-top:1em}
h3{font-size:11pt;margin-top:0.8em}
p{margin:0.4em 0;text-align:justify}
strong{font-weight:bold}
em{font-style:italic}
ul,ol{margin:0.4em 0;padding-left:2em}
li{margin:0.15em 0}
pre{background:#f4f4f4;padding:0.5em;font-size:9pt;line-height:1.2;overflow-x:auto}
code{font-family:"Courier New",monospace;font-size:9pt;background:#f4f4f4;padding:0.2em}
hr{border:none;border-top:1px solid #ccc;margin:1em 0}
img{max-width:100%;height:auto;display:block;margin:1em auto}
table{border-collapse:collapse;width:100%;margin:1em 0;font-size:10pt}
th,td{border:1px solid #999;padding:4px 8px;text-align:left}
th{background:#eee}
blockquote{border-left:3px solid #ccc;margin:0.5em 0;padding:0.2em 1em;color:#555}
`;

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${style}</style></head><body>${bodyHtml}</body></html>`;
writeFileSync(htmlPath, html, 'utf-8');
console.log(`HTML written: ${htmlPath}`);

const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];

let chromePath = chromePaths.find(p => existsSync(p));
if (!chromePath) {
  console.log('Chrome/Edge not found. PDF skipped.');
  process.exit(0);
}

const absHtmlPath = resolve(htmlPath);
const htmlFileUrl = 'file:///' + absHtmlPath.replace(/\\/g, '/');

const pdfAbsPath = resolve(pdfPath);

execSync(
  `"${chromePath}" --headless --disable-gpu --no-sandbox --print-to-pdf="${pdfAbsPath}" "${htmlFileUrl}"`,
  { timeout: 30000, stdio: 'pipe' }
);

console.log(`PDF written: ${pdfPath}`);

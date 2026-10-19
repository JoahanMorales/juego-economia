// Every color comes from public/css/tokens.css (docs/DESIGN.md · Never 6).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const PUBLIC = path.join(__dirname, '..', 'public');
const TOKENS = path.join(PUBLIC, 'css', 'tokens.css');
const IDEA_COLORS = ['#170C12', '#26131D', '#EDC24F', '#FF6A3D', '#5CC57A', '#EF5B5B'];
const COLOR = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/g;

function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return files(p);
    return /\.(css|html|js)$/.test(e.name) ? [p] : [];
  });
}

// The parts of a file where a color literal could style something.
function styleText(file, src) {
  if (file.endsWith('.css')) return src;
  if (file.endsWith('.html')) {
    const blocks = [...src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
    const attrs = [...src.matchAll(/\sstyle="([^"]*)"/gi)].map((m) => m[1]);
    const scripts = [...src.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => quoted(m[1]));
    return [...blocks, ...attrs, ...scripts].join('\n');
  }
  return quoted(src);
}
const quoted = (js) => [...js.matchAll(/(['"`])((?:\\.|(?!\1).)*)\1/g)].map((m) => m[2]).join('\n');

test('tokens.css defines every IDEA §3.3 color', () => {
  const tokens = fs.readFileSync(TOKENS, 'utf8').toUpperCase();
  for (const c of IDEA_COLORS) assert.ok(tokens.includes(c), `tokens.css is missing ${c}`);
});

test('no color literal outside tokens.css', () => {
  const offenders = [];
  for (const f of files(PUBLIC)) {
    if (f === TOKENS) continue;
    const hits = styleText(f, fs.readFileSync(f, 'utf8')).match(COLOR);
    if (hits) offenders.push(`${path.relative(PUBLIC, f)}: ${[...new Set(hits)].join(' ')}`);
  }
  assert.deepStrictEqual(offenders, [], `use a var(--token) from tokens.css instead:\n${offenders.join('\n')}`);
});

test('the detector catches what it must and ignores anchors', () => {
  assert.match('a { color: #fff; }', COLOR);
  assert.match('x.style.color = "rgb(1, 2, 3)"', COLOR);
  assert.doesNotMatch(quoted('location.hash = "#jugar"'), COLOR);
  assert.match(quoted('el.style.background = "#EDC24F"'), COLOR);
});

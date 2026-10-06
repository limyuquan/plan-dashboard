import { Marked } from 'marked'

export type Theme = 'dark' | 'light'

// Markdown plans are rendered into the same kind of self-contained page an
// agent would have written by hand, so a pane treats them like any other plan.
// Unlike those, this one follows the dashboard's theme, because we draw it.
const PALETTE: Record<Theme, string> = {
  dark: `
    color-scheme: dark;
    --bg: #282c34; --text: #e9e9ec; --dim: #9da5b4; --line: #3a3f4b;
    --accent: #b49df0; --code: #e8b48f; --block: #2f343e; --chip: #353b45;
    --strong: #ffffff; --pre-text: #d3d3db; --quote: #4b5263; --head: #2f343e;
    --zebra: #2b3038; --select: #4b3f72;`,
  light: `
    color-scheme: light;
    --bg: #ffffff; --text: #1c1c20; --dim: #63636c; --line: #e2e2e7;
    --accent: #6741c4; --code: #a2522c; --block: #f7f7f9; --chip: #f0f0f3;
    --strong: #000000; --pre-text: #2c2c33; --quote: #d5d5dc; --head: #f2f2f5;
    --zebra: #fafafb; --select: #e5ddf8;`,
}

const STYLE = `
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 30px 32px 90px;
    background: var(--bg);
    color: var(--text);
    font: 14px/1.65 ui-sans-serif, -apple-system, "SF Pro Text", system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .md { max-width: 76ch; margin: 0 auto; }
  ::selection { background: var(--select); }

  h1, h2, h3, h4, h5, h6 { line-height: 1.3; font-weight: 600; margin: 1.9em 0 0.6em; }
  h1 { font-size: 23px; margin-top: 0; padding-bottom: 10px; border-bottom: 1px solid var(--line); }
  h2 { font-size: 18px; padding-bottom: 6px; border-bottom: 1px solid var(--line); }
  h3 { font-size: 15px; }
  h4, h5, h6 { font-size: 13.5px; color: var(--dim); }

  p, ul, ol, blockquote, pre, table { margin: 0.85em 0; }
  a { color: var(--accent); text-decoration: none; }
  a:hover { text-decoration: underline; }
  strong { color: var(--strong); font-weight: 600; }
  hr { border: none; border-top: 1px solid var(--line); margin: 2em 0; }
  img { max-width: 100%; border-radius: 6px; }

  ul, ol { padding-left: 24px; }
  li { margin: 0.3em 0; }
  li::marker { color: var(--dim); }
  /* Checklists read better without a bullet in front of the box. */
  li:has(> input[type="checkbox"]) { list-style: none; margin-left: -20px; }
  input[type="checkbox"] { margin-right: 7px; accent-color: var(--accent); }

  code {
    font-family: ui-monospace, "SF Mono", Menlo, monospace;
    font-size: 0.88em;
    background: var(--chip);
    color: var(--code);
    padding: 1px 5px;
    border-radius: 4px;
  }
  pre {
    background: var(--block);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 13px 15px;
    overflow-x: auto;
  }
  pre code { background: none; color: var(--pre-text); padding: 0; font-size: 0.85em; line-height: 1.55; }

  blockquote {
    border-left: 3px solid var(--quote);
    padding-left: 15px;
    color: var(--dim);
  }
  blockquote > :first-child { margin-top: 0; }
  blockquote > :last-child { margin-bottom: 0; }

  /* A wide table scrolls on its own rather than stretching a narrow pane. */
  table { display: block; width: max-content; max-width: 100%; overflow-x: auto; border-collapse: collapse; }
  th, td { border: 1px solid var(--line); padding: 7px 11px; text-align: left; vertical-align: top; }
  th { background: var(--head); font-weight: 600; }
  tbody tr:nth-child(even) { background: var(--zebra); }
`

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;' }
const escapeHtml = (s: string) => s.replace(/[&<>]/g, (c) => ESCAPES[c])

// GitHub-style anchors, so a table of contents inside a plan still jumps.
function slugger() {
  const seen = new Map<string, number>()
  return (text: string) => {
    const base = text
      .toLowerCase()
      .replace(/<[^>]+>/g, '')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
    const n = seen.get(base) ?? 0
    seen.set(base, n + 1)
    return n ? `${base}-${n}` : base
  }
}

export function renderMarkdown(source: string, title: string, theme: Theme): string {
  const slug = slugger()
  const md = new Marked({
    gfm: true,
    async: false,
    renderer: {
      heading({ tokens, depth }) {
        const text = this.parser.parseInline(tokens)
        return `<h${depth} id="${slug(text)}">${text}</h${depth}>\n`
      },
    },
  })
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>:root {${PALETTE[theme]}
}${STYLE}</style>
</head>
<body><article class="md">
${md.parse(source) as string}
</article></body>
</html>`
}

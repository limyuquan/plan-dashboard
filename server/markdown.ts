import { Marked } from 'marked'

export type Theme = 'dark' | 'light'

// Markdown plans are rendered into the same kind of self-contained page an
// agent would have written by hand, so a pane treats them like any other plan.
// Unlike those, this one follows the dashboard's theme, because we draw it.
const PALETTE: Record<Theme, string> = {
  dark: `
    color-scheme: dark;
    --bg: #151517; --text: #e4e4e7; --dim: #a3a3a3; --line: rgb(255 255 255 / 0.1);
    --accent: #a78bfa; --code: #ececf0; --chip: rgb(255 255 255 / 0.11); --block: #1e1e21;
    --pre-text: #d4d4d8; --strong: #ffffff; --quote: rgb(255 255 255 / 0.18); --head: #1e1e21;
    --zebra: rgb(255 255 255 / 0.03); --select: rgb(167 139 250 / 0.3);`,
  light: `
    color-scheme: light;
    --bg: #fcfcfc; --text: #27272a; --dim: #65656e; --line: rgb(0 0 0 / 0.1);
    --accent: #6d4fd6; --code: #27272a; --chip: rgb(0 0 0 / 0.06); --block: #f4f4f5;
    --pre-text: #3f3f46; --strong: #000000; --quote: rgb(0 0 0 / 0.16); --head: #f4f4f5;
    --zebra: rgb(0 0 0 / 0.02); --select: rgb(109 79 214 / 0.2);`,
}

const STYLE = `
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 40px 36px 120px;
    background: var(--bg);
    color: var(--text);
    font: 15px/1.65 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .md { max-width: 68ch; margin: 0 auto; }
  ::selection { background: var(--select); }

  h1, h2, h3, h4, h5, h6 { line-height: 1.25; font-weight: 600; margin: 1.8em 0 0.6em; }
  h1 { font-size: 26px; margin-top: 0; padding-bottom: 10px; border-bottom: 1px solid var(--line); }
  h2 { font-size: 19px; padding-bottom: 6px; border-bottom: 1px solid var(--line); }
  h3 { font-size: 16px; }
  h4, h5, h6 { font-size: 14px; color: var(--dim); }

  p, ul, ol, blockquote, pre, table { margin: 0.8em 0; }
  a { color: var(--accent); text-decoration: none; }
  a:hover { text-decoration: underline; }
  strong { color: var(--strong); font-weight: 600; }
  hr { border: none; border-top: 1px solid var(--line); margin: 2em 0; }
  img { max-width: 100%; border-radius: 8px; }

  ul, ol { padding-left: 24px; }
  li { margin: 0.3em 0; }
  li::marker { color: var(--dim); }
  /* Checklists read better without a bullet in front of the box. */
  li:has(> input[type="checkbox"]) { list-style: none; margin-left: -20px; }
  input[type="checkbox"] { margin-right: 7px; accent-color: var(--accent); }

  code {
    font-family: ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 13px;
    background: var(--chip);
    color: var(--code);
    padding: 1px 5px;
    border-radius: 4px;
  }
  pre {
    background: var(--block);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 14px 16px;
    overflow-x: auto;
  }
  pre code { background: none; color: var(--pre-text); padding: 0; font-size: 13px; line-height: 1.55; }

  blockquote {
    border-left: 2px solid var(--quote);
    padding-left: 14px;
    color: var(--dim);
  }
  blockquote > :first-child { margin-top: 0; }
  blockquote > :last-child { margin-bottom: 0; }

  /* A wide table scrolls on its own rather than stretching a narrow pane. */
  table { display: block; width: max-content; max-width: 100%; overflow-x: auto; border-collapse: collapse; }
  th, td { border: 1px solid var(--line); padding: 6px 10px; text-align: left; vertical-align: top; }
  th { background: var(--head); font-weight: 500; }
  tbody tr:nth-child(even) { background: var(--zebra); }
`

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;' }
const escapeHtml = (s: string) => s.replace(/[&<>]/g, (c) => ESCAPES[c])

// GitHub-style anchors, so a table of contents inside a plan still jumps.
export function slugger() {
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

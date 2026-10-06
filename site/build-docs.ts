// Builds the docs site into site/docs/ from the Markdown pages in docs/:
//   - docs/nav.json         the groups and the order of the pages
//   - docs/<slug>.md         one page; its first "# " line is the title and
//                            the paragraph after it the description
// Each page becomes site/docs/<slug>/index.html, plus site/docs/<slug>.md for
// "Copy Markdown" (and agents fetching pages as .md), and site/docs/search.json feeds search.
// Links between pages are written as "other-page.md" so they also work on
// GitHub; they become site links here.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Marked, type Tokens } from 'marked'
import { slugger } from '../server/markdown'

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = path.join(repo, 'docs')
const out = path.join(repo, 'site', 'docs')
const SITE = 'https://limyuquan.github.io/planner'
const REPO = 'https://github.com/limyuquan/planner'

type Nav = { group: string; pages: string[] }[]
type Heading = { depth: number; id: string; text: string }
type Page = { slug: string; group: string; title: string; description: string; markdown: string }

const escapeHtml = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
const plain = (s: string) => s.replace(/<[^>]+>/g, '').replace(/[`*_]/g, '')

export function readPages(): Page[] {
  const nav: Nav = JSON.parse(fs.readFileSync(path.join(src, 'nav.json'), 'utf8'))
  return nav.flatMap(({ group, pages }) =>
    pages.map((slug) => {
      const markdown = fs.readFileSync(path.join(src, `${slug}.md`), 'utf8').trim()
      const title = markdown.match(/^# (.+)$/m)?.[1] ?? slug
      const description = markdown.split(/\n\n+/)[1]?.replace(/\n/g, ' ') ?? ''
      return { slug, group, title, description, markdown }
    }),
  )
}

// Renders a page's Markdown, collecting its headings for "On this page".
function render(page: Page, assets: Set<string>) {
  const slug = slugger()
  const headings: Heading[] = []
  const md = new Marked({
    gfm: true,
    async: false,
    renderer: {
      heading({ tokens, depth }) {
        const html = this.parser.parseInline(tokens)
        if (depth === 1) return ''
        const id = slug(html)
        if (depth <= 3) headings.push({ depth, id, text: plain(html) })
        return `<h${depth} id="${id}"><a class="anchor" href="#${id}">${html}</a></h${depth}>\n`
      },
      link({ href, tokens }) {
        const text = this.parser.parseInline(tokens)
        const page = href.match(/^([\w-]+)\.md(#.*)?$/)
        if (page) return `<a href="../${page[1]}/${page[2] ?? ''}">${text}</a>`
        const external = /^https?:/.test(href)
        return `<a href="${href}"${external ? ' target="_blank" rel="noopener"' : ''}>${text}</a>`
      },
      image({ href, text }) {
        if (/^https?:/.test(href)) return `<img src="${href}" alt="${escapeHtml(text)}" loading="lazy">`
        const file = path.basename(href)
        assets.add(path.resolve(src, href))
        return `<figure><img src="../_assets/${file}" alt="${escapeHtml(text)}" loading="lazy"></figure>`
      },
      code({ text, lang }) {
        return `<div class="code" data-lang="${escapeHtml(lang ?? '')}"><button class="code-copy" type="button">Copy</button><pre><code>${escapeHtml(text)}</code></pre></div>\n`
      },
      table(token: Tokens.Table) {
        const cell = (c: Tokens.TableCell) => this.parser.parseInline(c.tokens)
        const head = token.header.map((c) => `<th>${cell(c)}</th>`).join('')
        const rows = token.rows.map((r) => `<tr>${r.map((c) => `<td>${cell(c)}</td>`).join('')}</tr>`).join('')
        return `<div class="table"><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>\n`
      },
    },
  })
  // The title and description are drawn by the page header.
  const body = page.markdown.split(/\n\n+/).slice(2).join('\n\n')
  return { html: md.parse(body) as string, headings }
}

function navHtml(pages: Page[], current: string) {
  const groups = [...new Set(pages.map((p) => p.group))]
  return groups
    .map(
      (group) =>
        `<div class="nav-group"><p class="nav-title">${group}</p>${pages
          .filter((p) => p.group === group)
          .map(
            (p) =>
              `<a href="../${p.slug}/"${p.slug === current ? ' class="active" aria-current="page"' : ''}>${p.title}</a>`,
          )
          .join('')}</div>`,
    )
    .join('')
}

function pageHtml(page: Page, pages: Page[], html: string, headings: Heading[]) {
  const at = pages.indexOf(page)
  const prev = pages[at - 1]
  const next = pages[at + 1]
  const mdUrl = `${SITE}/docs/${page.slug}.md`
  const ask = encodeURIComponent(`Read ${mdUrl} so I can ask questions about Planner.`)
  const toc = headings.map((h) => `<a href="#${h.id}" data-depth="${h.depth}">${escapeHtml(h.text)}</a>`).join('')
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(page.title)} — Planner docs</title>
<meta name="description" content="${escapeHtml(page.description)}">
<meta property="og:title" content="${escapeHtml(page.title)} — Planner docs">
<meta property="og:description" content="${escapeHtml(page.description)}">
<meta property="og:image" content="${SITE}/media/og.png">
<link rel="alternate" type="text/markdown" href="../${page.slug}.md">
<link rel="icon" href="../../favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../docs.css">
</head>
<body>
<header class="top">
  <a class="brand" href="../../"><img src="../../favicon.svg" alt="" width="18" height="18">Planner</a>
  <span class="slash">/</span><a class="brand-docs" href="../">Docs</a>
  <button class="menu" type="button" aria-label="Menu">☰</button>
  <div class="search">
    <input type="search" placeholder="Search docs" aria-label="Search docs" autocomplete="off">
    <kbd>/</kbd>
    <div class="results" hidden></div>
  </div>
  <nav class="top-links">
    <a href="../../">Website</a>
    <a href="../../llms.txt">llms.txt</a>
    <a href="${REPO}">GitHub</a>
  </nav>
</header>
<div class="layout">
  <aside class="sidenav">${navHtml(pages, page.slug)}</aside>
  <main class="content">
    <article>
      <div class="page-head">
        <p class="crumb">${page.group}</p>
        <div class="copy-page">
          <button class="copy-md" type="button" data-md="../${page.slug}.md">Copy Markdown</button>
          <button class="copy-more" type="button" aria-label="More ways to use this page">▾</button>
          <div class="copy-menu" hidden>
            <button type="button" class="copy-md" data-md="../${page.slug}.md">Copy Markdown<small>For pasting into an agent</small></button>
            <a href="https://chatgpt.com/?q=${ask}" target="_blank" rel="noopener">Open in ChatGPT<small>Ask about this page</small></a>
            <a href="https://claude.ai/new?q=${ask}" target="_blank" rel="noopener">Open in Claude<small>Ask about this page</small></a>
            <a href="../../llms-full.txt" target="_blank">All docs for agents<small>llms-full.txt</small></a>
          </div>
        </div>
      </div>
      <h1>${escapeHtml(page.title)}</h1>
      <p class="lede">${escapeHtml(page.description).replace(/`([^`]+)`/g, '<code>$1</code>')}</p>
      ${html}
    </article>
    <nav class="pager">
      ${prev ? `<a class="prev" href="../${prev.slug}/"><small>Previous</small>${prev.title}</a>` : '<span></span>'}
      ${next ? `<a class="next" href="../${next.slug}/"><small>Next</small>${next.title}</a>` : '<span></span>'}
    </nav>
    <footer class="page-foot">
      <a href="${REPO}/edit/main/docs/${page.slug}.md">Edit this page on GitHub</a>
      <a href="${REPO}/issues/new/choose">Something wrong? Open an issue</a>
    </footer>
  </main>
  <aside class="toc">${headings.length ? `<p class="nav-title">On this page</p>${toc}` : ''}</aside>
</div>
<script src="../docs.js"></script>
</body>
</html>
`
}

function build() {
  const pages = readPages()
  fs.rmSync(out, { recursive: true, force: true })
  fs.mkdirSync(path.join(out, '_assets'), { recursive: true })
  const assets = new Set<string>()
  const index: {
    slug: string
    title: string
    group: string
    sections: { id: string; text: string; body: string }[]
  }[] = []

  for (const page of pages) {
    const { html, headings } = render(page, assets)
    fs.mkdirSync(path.join(out, page.slug), { recursive: true })
    fs.writeFileSync(path.join(out, page.slug, 'index.html'), pageHtml(page, pages, html, headings))
    fs.writeFileSync(path.join(out, `${page.slug}.md`), `${page.markdown}\n`)
    // Search covers each section's text, so a hit can jump to its heading.
    const parts = page.markdown.split(/^#{2,3} /m)
    index.push({
      slug: page.slug,
      title: page.title,
      group: page.group,
      sections: parts.map((part, i) => {
        const [first, ...rest] = part.split('\n')
        const text = i === 0 ? page.title : first.trim()
        return {
          id: i === 0 ? '' : (headings[i - 1]?.id ?? ''),
          text,
          body: plain(rest.join(' ')).replace(/\s+/g, ' ').slice(0, 600),
        }
      }),
    })
  }
  for (const file of assets) fs.copyFileSync(file, path.join(out, '_assets', path.basename(file)))
  fs.writeFileSync(path.join(out, 'search.json'), JSON.stringify(index))
  fs.copyFileSync(path.join(repo, 'site', 'docs-src', 'docs.css'), path.join(out, 'docs.css'))
  fs.copyFileSync(path.join(repo, 'site', 'docs-src', 'docs.js'), path.join(out, 'docs.js'))
  fs.writeFileSync(
    path.join(out, 'index.html'),
    `<!doctype html><meta charset="utf-8"><title>Planner docs</title><meta http-equiv="refresh" content="0; url=${pages[0].slug}/"><link rel="canonical" href="${pages[0].slug}/">`,
  )
  console.log(`built ${pages.length} docs pages into site/docs (${assets.size} images)`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) build()

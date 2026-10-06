// The docs pages' behaviour: copy buttons, the copy-page menu, "On this
// page" following the scroll, search, and the menu on small screens.
;(() => {
  const flash = (button, text) => {
    const was = button.firstChild.textContent
    button.firstChild.textContent = text
    setTimeout(() => (button.firstChild.textContent = was), 1400)
  }

  // Code blocks.
  document.querySelectorAll('.code-copy').forEach((button) =>
    button.addEventListener('click', async () => {
      await navigator.clipboard.writeText(button.parentElement.querySelector('code').textContent)
      flash(button, 'Copied')
    }),
  )

  // Copy the whole page as Markdown, for pasting into an agent.
  const menu = document.querySelector('.copy-menu')
  document.querySelectorAll('.copy-md').forEach((button) =>
    button.addEventListener('click', async () => {
      const md = await fetch(button.dataset.md).then((r) => r.text())
      await navigator.clipboard.writeText(md)
      menu.hidden = true
      flash(document.querySelector('.copy-page > .copy-md'), 'Copied')
    }),
  )
  document.querySelector('.copy-more')?.addEventListener('click', (e) => {
    e.stopPropagation()
    menu.hidden = !menu.hidden
  })
  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target)) menu.hidden = true
  })

  // "On this page" marks the section you are reading.
  const links = [...document.querySelectorAll('.toc a')]
  const heads = links.map((a) => document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean)
  const mark = () => {
    let current = heads[0]
    for (const h of heads) if (h.getBoundingClientRect().top < 120) current = h
    links.forEach((a) => a.classList.toggle('on', current && a.getAttribute('href') === `#${current.id}`))
  }
  addEventListener('scroll', mark, { passive: true })
  mark()

  // Small screens: the navigation opens over the page.
  document.querySelector('.menu')?.addEventListener('click', () => document.body.classList.toggle('nav-open'))

  // Search every page's sections; "/" jumps to the box.
  const input = document.querySelector('.search input')
  const box = document.querySelector('.results')
  let index = null
  let at = 0
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
  const words = (q) => q.toLowerCase().split(/\s+/).filter(Boolean)
  const marked = (text, want) =>
    esc(text).replace(
      new RegExp(`(${want.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi'),
      '<mark>$1</mark>',
    )

  async function show() {
    const want = words(input.value)
    if (!want.length) return (box.hidden = true)
    index ??= await fetch('../search.json').then((r) => r.json())
    const hits = []
    for (const page of index) {
      for (const s of page.sections) {
        const hay = `${page.title} ${s.text} ${s.body}`.toLowerCase()
        if (!want.every((w) => hay.includes(w))) continue
        const inTitle = want.filter((w) => `${page.title} ${s.text}`.toLowerCase().includes(w)).length
        const first = s.body.toLowerCase().indexOf(want[0])
        const snippet = first >= 0 ? s.body.slice(Math.max(0, first - 30), first + 90) : s.body.slice(0, 120)
        hits.push({
          href: `../${page.slug}/${s.id ? `#${s.id}` : ''}`,
          title: s.id ? `${page.title} › ${s.text}` : page.title,
          snippet,
          inTitle,
        })
      }
    }
    hits.sort((a, b) => b.inTitle - a.inTitle)
    at = 0
    box.innerHTML = hits.length
      ? hits
          .slice(0, 8)
          .map(
            (h, i) =>
              `<a href="${h.href}"${i === 0 ? ' class="on"' : ''}><b>${marked(h.title, want)}</b><span>${marked(h.snippet, want)}</span></a>`,
          )
          .join('')
      : '<p>Nothing found</p>'
    box.hidden = false
  }
  input.addEventListener('input', show)
  input.addEventListener('keydown', (e) => {
    const items = [...box.querySelectorAll('a')]
    if (e.key === 'Escape') return ((box.hidden = true), input.blur())
    if (!items.length) return
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      at = (at + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length
      items.forEach((a, i) => a.classList.toggle('on', i === at))
    }
    if (e.key === 'Enter') location.href = items[at].href
  })
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search')) box.hidden = true
  })
  addEventListener('keydown', (e) => {
    if (e.key === '/' && !e.target.closest('input, textarea')) {
      e.preventDefault()
      input.focus()
    }
  })
})()

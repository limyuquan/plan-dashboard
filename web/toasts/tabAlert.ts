// A plan can arrive while this tab is in the background, so the tab itself has
// to say so: the title gets a count and the favicon gets a dot, until you come
// back and look.

const BASE_TITLE = document.title

const svg = (dot: boolean) =>
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">` +
      `<rect width="32" height="32" rx="7" fill="#17171c"/>` +
      `<g fill="#9a9aa4"><rect x="7" y="9" width="15" height="3" rx="1.5"/>` +
      `<rect x="7" y="15" width="15" height="3" rx="1.5"/>` +
      `<rect x="7" y="21" width="9" height="3" rx="1.5"/></g>` +
      (dot ? `<circle cx="24" cy="8" r="7" fill="#8b5cf6" stroke="#0b0b0d" stroke-width="2"/>` : '') +
      `</svg>`,
  )

function paint(pending: number) {
  document.title = pending ? `(${pending}) New plan — ${BASE_TITLE}` : BASE_TITLE
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.append(link)
  }
  link.href = svg(pending > 0)
}

let pending = 0
// Hidden covers another tab; unfocused covers another window on top of this one.
const away = () => document.hidden || !document.hasFocus()

const clear = () => {
  if (away() || !pending) return
  pending = 0
  paint(pending)
}
document.addEventListener('visibilitychange', clear)
window.addEventListener('focus', clear)

// Nothing to catch up on if they were looking when it landed.
export function flagNewPlan() {
  if (!away()) return
  pending++
  paint(pending)
}

paint(0)

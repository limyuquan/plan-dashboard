import type { Doc } from '../../shared/types'
import { api } from '../api'
import { findPane } from '../layout/model'
import { docParam, docPathFromParam, wsKey, wsParam } from '../../shared/keys'
import { firstFolder, getState, setState, useStore } from './store'
import { pushToast } from './toasts'
import { currentLayout, enter, firstLanding, openDoc, openInWorkspace } from './workspaces'

// Docs are linked by workspace and file name, never by title: a title has
// spaces and punctuation, two files can share one, and editing a doc changes it.
//   ?ws=<task>[/<folder>]&plan=<file>   a doc in a workspace
//   ?ws=<task>[/<folder>]               just the workspace
//   ?doc=<path>                         any other file, opened where you are: relative
//                                       to the docs root, or absolute on this machine
// Workspace names leave out the status folder, so links survive settling.
export type Link = { ws: string; plan: string; doc: string }

export function linkIn(search: string): Link {
  const params = new URLSearchParams(search)
  const get = (name: string) => params.get(name)?.trim() ?? ''
  return { ws: get('ws'), plan: get('plan'), doc: get('doc') }
}

// The link the page was opened with, followed once the tree has loaded. Until
// then the address bar is left alone, so the link is not overwritten.
const opened = linkIn(location.search)
let pending: Link | null = opened.ws || opened.doc ? opened : null
export const hasPendingLink = () => pending !== null

export function followPendingLink() {
  const link = pending
  pending = null
  if (link) void followLink(link)
}

// Matches the file name, forgiving a missing extension ("plan" finds
// plan.html before plan.md, the order the sidebar lists them in).
export function resolvePlan(docs: Doc[], plan: string): Doc | null {
  const want = plan.toLowerCase()
  return (
    docs.find((d) => d.file.toLowerCase() === want) ??
    docs.find((d) => d.file.toLowerCase().replace(/\.[^.]+$/, '') === want) ??
    null
  )
}

// Learns about a doc the tree does not list, so tabs can show its title.
export async function describe(path: string): Promise<Doc | null> {
  const known = getState().docs.get(path)
  if (known) return known
  try {
    const doc = await api.doc(path)
    setState((s) => ({ docs: new Map(s.docs).set(doc.path, doc) }))
    return doc
  } catch {
    pushToast({ text: 'No document at that path', detail: path })
    return null
  }
}

export async function followLink(link: Link) {
  const { tree, workspaces, current } = getState()
  const { plan } = link
  const doc = link.doc && docPathFromParam(link.doc, firstFolder())
  const ws = link.ws && wsKey(link.ws, firstFolder())
  if (doc) {
    const found = await describe(doc)
    if (!found) return
    if (found.ws) return openInWorkspace(found.path)
    if (!current) enter(firstLanding(tree))
    return openDoc(found.path)
  }
  const space = workspaces.get(ws)
  if (!space) {
    pushToast({ text: 'No workspace by that name', detail: link.ws })
    if (!workspaces.has(current)) enter(firstLanding(tree))
    return
  }
  const found = plan ? resolvePlan(space.docs, plan) : null
  if (plan && !found) pushToast({ text: 'No plan by that name', detail: `${plan} in ${link.ws}` })
  if (found) openInWorkspace(found.path)
  else enter(ws)
}

// A link clicked inside a doc: another doc (relative, absolute path on this
// machine, or our own /docs/ URL), or a dashboard link.
export async function followHref(href: string) {
  const url = new URL(href, location.href)
  if (
    url.origin === location.origin &&
    url.pathname === '/' &&
    (url.searchParams.has('ws') || url.searchParams.has('doc'))
  ) {
    return followLink(linkIn(url.search))
  }
  // Anything else is a path: relative to the docs root under /docs/, or an
  // absolute path on this machine (which the server maps into the root).
  const pathname = decodeURIComponent(url.pathname)
  const path =
    url.origin === location.origin && pathname.startsWith('/docs/') ? pathname.slice('/docs/'.length) : pathname
  const found = await describe(path)
  if (found) openDoc(found.path)
}

// The address bar always says where you are, so it can be copied and sent.
// It replaces rather than pushes: the panes are not a history to walk back.
function writeUrl() {
  const { current, focus, docs } = getState()
  if (!current) return
  const first = firstFolder()
  const params = new URLSearchParams({ ws: wsParam(current, first) })
  const active = findPane(currentLayout(), focus)?.active
  if (active) {
    const doc = docs.get(active)
    if (doc?.ws === current) params.set('plan', doc.file)
    else params.set('doc', docParam(active, first))
  }
  // Slashes and folder colons stay readable, so the link can be read and typed as well as pasted.
  const next = `${location.pathname}?${params.toString().replace(/%2F/gi, '/').replace(/%3A/gi, ':')}`
  if (next !== location.pathname + location.search) history.replaceState(null, '', next)
}

export function syncAddressBar() {
  return useStore.subscribe((now, before) => {
    if (pending) return
    if (now.current !== before.current || now.focus !== before.focus || now.layouts !== before.layouts) writeUrl()
  })
}

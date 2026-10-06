// How docs and workspaces are named across several docs folders:
//   - doc path       "<folder>/<path inside it>"      app-a/active/my-task/plans/plan.html
//   - workspace key  "<folder>:<task>[/<sub-folder>]"  app-a:my-task/phase-1-setup
//
// Links leave the folder out for the first folder, so a dashboard with one
// folder has the same links it always had:
//   ?ws=my-task/phase-1-setup          first folder
//   ?ws=app-b:my-task/phase-1-setup    any other folder
//   ?doc=notes/a.md   ?doc=app-b:notes/a.md   ?doc=/an/absolute/path.md

export const docPath = (folder: string, rel: string) => `${folder}/${rel}`

export function splitDocPath(path: string): { folder: string; rel: string } {
  const at = path.indexOf('/')
  return at < 0 ? { folder: path, rel: '' } : { folder: path.slice(0, at), rel: path.slice(at + 1) }
}

export const taskKey = (folder: string, task: string) => `${folder}:${task}`

// The task a workspace key belongs to: "app-a:my-task/phase-1" -> "app-a:my-task".
export const taskOfKey = (key: string) => key.split('/')[0]

export function wsParam(key: string, first: string): string {
  return key.startsWith(`${first}:`) ? key.slice(first.length + 1) : key
}

export function wsKey(param: string, first: string): string {
  return param.includes(':') ? param : `${first}:${param}`
}

export function docParam(path: string, first: string): string {
  const { folder, rel } = splitDocPath(path)
  return folder === first ? rel : `${folder}:${rel}`
}

// Absolute paths are left for the server, which knows where each folder is.
export function docPathFromParam(param: string, first: string): string {
  if (/^(\/|~|file:)/.test(param)) return param
  const colon = param.indexOf(':')
  return colon > 0 ? docPath(param.slice(0, colon), param.slice(colon + 1)) : docPath(first, param)
}

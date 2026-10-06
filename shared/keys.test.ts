import { describe, expect, it } from 'vitest'
import { docParam, docPathFromParam, wsKey, wsParam } from './keys'

describe('links name the folder only when it is not the first', () => {
  it('workspaces', () => {
    expect(wsParam('main:my-task/phase-1', 'main')).toBe('my-task/phase-1')
    expect(wsParam('app-b:my-task', 'main')).toBe('app-b:my-task')
    expect(wsKey('my-task/phase-1', 'main')).toBe('main:my-task/phase-1')
    expect(wsKey('app-b:my-task', 'main')).toBe('app-b:my-task')
  })
  it('docs, leaving absolute paths for the server', () => {
    expect(docParam('main/notes/a.md', 'main')).toBe('notes/a.md')
    expect(docParam('app-b/notes/a.md', 'main')).toBe('app-b:notes/a.md')
    expect(docPathFromParam('notes/a.md', 'main')).toBe('main/notes/a.md')
    expect(docPathFromParam('app-b:notes/a.md', 'main')).toBe('app-b/notes/a.md')
    expect(docPathFromParam('/home/me/notes/a.md', 'main')).toBe('/home/me/notes/a.md')
  })
})

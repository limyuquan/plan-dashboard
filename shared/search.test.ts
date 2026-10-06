import { expect, it } from 'vitest'
import { searchDocs, textOf } from './search'
import type { Doc } from './types'

const doc = (title: string): Doc => ({ path: `d/${title}.html`, file: `${title}.html`, kind: 'plan', title, ws: '' })

it('reads the text of HTML without tags, scripts or styles', () => {
  const html =
    '<html><head><title>T</title><style>p{}</style></head><body><p>Hello&nbsp;<b>world</b></p><script>x()</script></body></html>'
  expect(textOf(html, 'a.html')).toBe('Hello world')
})

it('needs every word, and ranks words in the title first, then the most mentions', () => {
  const entries = [
    { doc: doc('Notes'), text: 'cache keys cache keys cache' },
    { doc: doc('Cache plan'), text: 'how the keys are stored' },
    { doc: doc('Other'), text: 'cache only' },
  ]
  expect(searchDocs(entries, 'cache keys').map((h) => h.doc.title)).toEqual(['Cache plan', 'Notes'])
})

it('quotes the text around the first match', () => {
  const text = `${'a '.repeat(80)}the needle is here ${'b '.repeat(80)}`
  const [hit] = searchDocs([{ doc: doc('X'), text }], 'needle')
  expect(hit.snippet).toMatch(/^….*the needle is here.*…$/)
})

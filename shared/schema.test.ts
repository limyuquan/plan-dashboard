import fs from 'node:fs'
import path from 'node:path'
import { expect, it } from 'vitest'
import { configJsonSchema } from './schema'

it('the committed schema matches the config rules (run "npm run schema" to update it)', () => {
  const file = path.join(import.meta.dirname, '..', 'schema', 'config.schema.json')
  expect(JSON.parse(fs.readFileSync(file, 'utf8'))).toEqual(JSON.parse(JSON.stringify(configJsonSchema())))
})

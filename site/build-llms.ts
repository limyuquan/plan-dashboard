// Builds site/llms-full.txt: every doc an agent might need, in one plain file,
// made from the files themselves so it can never drift from them:
//   - llms.txt (the index), then every docs page in order, without images
//   - the full text of each agent skill
//   - the config JSON schema
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { configJsonSchema } from '../shared/schema'
import { readPages } from './build-docs'

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel: string) => fs.readFileSync(path.join(repo, rel), 'utf8').trim()

// Images mean nothing in plain text; their alt text is kept where it says something.
const withoutImages = (md: string) =>
  md
    .split('\n')
    .filter((line) => !/^\s*(!\[[^\]]*\]\([^)]*\)|<p[^>]*>\s*<img)/.test(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')

const skills = fs
  .readdirSync(path.join(repo, 'skills'))
  .filter((name) => fs.existsSync(path.join(repo, 'skills', name, 'SKILL.md')))
  .sort()

const parts = [
  read('site/llms.txt'),
  '---',
  ...readPages().map((page) => withoutImages(page.markdown)),
  '---',
  '# Agent skills, in full',
  "Each is a folder with a SKILL.md that Claude Code, Codex and similar agents read. Copy a folder into the agent's skills directory (for example ~/.claude/skills/) to use it.",
  ...skills.map((name) => `## skills/${name}/SKILL.md\n\n${read(`skills/${name}/SKILL.md`)}`),
  '---',
  '# Config JSON schema',
  'Also printed by `planner config schema`.',
  '```json\n' + JSON.stringify(configJsonSchema(), null, 2) + '\n```',
]

fs.writeFileSync(path.join(repo, 'site/llms-full.txt'), `${parts.join('\n\n')}\n`)
console.log(`wrote site/llms-full.txt (${skills.length} skills)`)

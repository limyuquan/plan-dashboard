// Starts a built Planner for the browser tests on its own port, with its own
// home folder, so nothing touches the real config:
//   node e2e/serve.mjs <port> demo    a fresh copy of examples/demo-docs
//   node e2e/serve.mjs <port> empty   no docs folder yet (the first-run screen)
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { e2eHome } from './paths.mjs'

const [port, mode] = process.argv.slice(2)
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const home = e2eHome(port)

fs.rmSync(home, { recursive: true, force: true })
fs.mkdirSync(path.join(home, '.config', 'planner'), { recursive: true })
if (mode === 'demo') fs.cpSync(path.join(repo, 'examples', 'demo-docs'), path.join(home, 'plans'), { recursive: true })
const config = mode === 'demo' ? { folders: [{ name: 'plans', path: path.join(home, 'plans') }] } : {}
fs.writeFileSync(path.join(home, '.config', 'planner', 'config.json'), JSON.stringify(config))

const child = spawn(process.execPath, [path.join(repo, 'dist', 'cli.js'), '--port', port, '--no-open'], {
  env: { ...process.env, HOME: home, XDG_CONFIG_HOME: path.join(home, '.config') },
  stdio: 'inherit',
})
process.on('SIGTERM', () => child.kill())
child.on('exit', (code) => process.exit(code ?? 0))

#!/usr/bin/env node
import { execFile, spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { z } from 'zod'
import { configSchema, nameForPath, type Config, type DocsFolder } from '../shared/config'
import { startServer } from './app'
import { ConfigStore, defaultConfigPath, expandHome, homeRelative, readConfigFile, writeConfigFile } from './config'
import { checkConfig } from './routes/config'
import { scanAll } from './scan'

const HELP = `Planner — read your coding agents' plans in split panes

Usage:
  planner [options]                 start Planner
  planner open <link>               show a link in the Planner tab you already have open

  planner config path               print where the config file is
  planner config show               print the config file
  planner config check              check the config and print what each folder holds
  planner config add <folder>       add a docs folder (--name to name it)
  planner config remove <name>      remove a docs folder
  planner config schema             print the config's JSON schema

Options:
  --root <folder>     docs folder for this run only; repeat for several
  --port <number>     port for this run only (default 4173)
  --config <file>     config file (default ${homeRelative(defaultConfigPath())})
  --name <name>       with "config add": the folder's name in links and the sidebar
  --no-open           do not open a browser tab on start
  -h, --help          show this help

<link> is a Planner URL or just its query, e.g. '?ws=my-task/phase-1-setup&plan=plan.html'.`

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    root: { type: 'string', multiple: true },
    port: { type: 'string' },
    config: { type: 'string' },
    name: { type: 'string' },
    'no-open': { type: 'boolean' },
    dev: { type: 'boolean' },
    help: { type: 'boolean', short: 'h' },
  },
})

const configFile = path.resolve(expandHome(values.config ?? defaultConfigPath()))

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}

// Folders given with --root, named after their last path segment.
function rootFolders(roots: string[]): DocsFolder[] {
  const folders: DocsFolder[] = []
  for (const root of roots) {
    const abs = path.resolve(expandHome(root))
    folders.push({ name: uniqueName(nameForPath(abs), folders), path: abs })
  }
  return folders
}

function uniqueName(base: string, taken: DocsFolder[]) {
  let name = base
  for (let n = 2; taken.some((f) => f.name === name); n++) name = `${base}-${n}`
  return name
}

function openBrowser(url: string) {
  const [cmd, args] =
    process.platform === 'darwin'
      ? ['open', [url]]
      : process.platform === 'win32'
        ? ['cmd', ['/c', 'start', '', url]]
        : ['xdg-open', [url]]
  spawn(cmd, args, { stdio: 'ignore', detached: true }).unref()
}

// Chrome on macOS: bring the tab already showing Planner to the front, the
// one thing the page cannot do for itself.
function focusChromeTab(base: string) {
  if (process.platform !== 'darwin') return
  const script = `
    if application "Google Chrome" is running then
      tell application "Google Chrome"
        repeat with w in windows
          set i to 0
          repeat with t in tabs of w
            set i to i + 1
            if URL of t starts with "${base}" then
              set active tab index of w to i
              set index of w to 1
              activate
              return
            end if
          end repeat
        end repeat
      end tell
    end if`
  execFile('osascript', ['-e', script], () => {})
}

const answering = (base: string) =>
  fetch(base).then(
    (r) => r.ok,
    () => false,
  )

async function openLink(link: string, config: ConfigStore) {
  const query = link.includes('?') ? link.slice(link.indexOf('?') + 1) : link
  const base = `http://localhost:${config.current.port}`

  // Nothing running: start Planner in the background and wait for it.
  if (!(await answering(base))) {
    const args = [...process.execArgv, process.argv[1], '--no-open', '--config', configFile]
    for (const root of values.root ?? []) args.push('--root', root)
    if (values.port) args.push('--port', values.port)
    spawn(process.execPath, args, { stdio: 'ignore', detached: true }).unref()
    for (let i = 0; i < 40 && !(await answering(base)); i++) await new Promise((r) => setTimeout(r, 250))
  }

  const reply = await fetch(`${base}/api/open?${query}`).then((r) => r.json() as Promise<{ listeners?: number }>)
  if (!reply.listeners) {
    openBrowser(`${base}/?${query}`)
    console.log('opened a Planner tab')
  } else {
    focusChromeTab(base)
    console.log('showed it in your Planner tab')
  }
}

// What each folder holds under the config, the same as the settings preview.
async function report(config: Config): Promise<boolean> {
  let ok = true
  for (const f of (await scanAll(config)).folders) {
    console.log(`\n${f.name}  ${f.label}`)
    if (f.problem) {
      ok = false
      console.log(`  ✗ ${f.problem}`)
      continue
    }
    const kinds = Object.entries(f.byKind)
      .map(([k, n]) => `${n} ${k}`)
      .join(', ')
    console.log(`  ${f.tasks} tasks, ${f.phases} phases, ${f.docs} docs${kinds ? ` (${kinds})` : ''}`)
    if (!f.tasks) {
      console.log('  ! no tasks found with this layout. If task folders sit directly in this folder, give it')
      console.log('    "statusFolders": null; if a task keeps its plans in its own folder, "plansFolder": "".')
    }
    if (f.unnumbered.length) console.log(`  folders not matching the phase pattern: ${f.unnumbered.join(', ')}`)
    const skipped = Object.entries(f.skipped)
    if (skipped.length) console.log(`  left out (type not listed): ${skipped.map(([e, n]) => `${n} .${e}`).join(', ')}`)
  }
  return ok
}

async function readOrFail(): Promise<Config> {
  const read = await readConfigFile(configFile)
  if ('error' in read) fail(`${configFile} has an error:\n${read.error}`)
  return read.config
}

async function configCommand(action: string | undefined, arg: string | undefined) {
  if (action === 'path') return console.log(configFile)
  if (action === 'schema') return console.log(JSON.stringify(z.toJSONSchema(configSchema, { io: 'input' }), null, 2))
  if (action === 'show') {
    if (!fs.existsSync(configFile)) fail(`${configFile} does not exist yet; "planner config add <folder>" creates it`)
    return console.log(fs.readFileSync(configFile, 'utf8').trimEnd())
  }
  if (action === 'check') {
    const config = await readOrFail()
    const checked = checkConfig(config)
    if ('error' in checked) fail(`✗ ${checked.error}`)
    console.log(`✓ ${configFile} is valid`)
    if (!(await report(config))) process.exit(1)
    return
  }
  if (action === 'add') {
    if (!arg) fail('usage: planner config add <folder> [--name <name>]')
    const abs = path.resolve(expandHome(arg))
    if (!fs.statSync(abs, { throwIfNoEntry: false })?.isDirectory()) fail(`${abs} is not a folder`)
    const config = await readOrFail()
    if (config.folders.some((f) => path.resolve(expandHome(f.path)) === abs)) fail(`${abs} is already a docs folder`)
    const name = values.name ?? uniqueName(nameForPath(abs), config.folders)
    const next = { ...config, folders: [...config.folders, { name, path: homeRelative(abs) }] }
    const checked = checkConfig(next)
    if ('error' in checked) fail(`✗ ${checked.error}`)
    await writeConfigFile(configFile, checked.config)
    console.log(`✓ added "${name}" (${homeRelative(abs)}) to ${configFile}`)
    await report(checked.config)
    return
  }
  if (action === 'remove') {
    const config = await readOrFail()
    if (!config.folders.some((f) => f.name === arg)) fail(`no docs folder named "${arg}"`)
    await writeConfigFile(configFile, { ...config, folders: config.folders.filter((f) => f.name !== arg) })
    return console.log(`✓ removed "${arg}"`)
  }
  fail(`unknown config command: ${action ?? '(none)'}\n\n${HELP}`)
}

async function main() {
  if (values.help) return console.log(HELP)
  const [command, ...rest] = positionals
  if (command === 'config') return configCommand(rest[0], rest[1])

  const config = new ConfigStore(configFile, {
    ...(values.root?.length && { folders: rootFolders(values.root) }),
    ...(values.port && { port: Number(values.port) }),
  })
  await config.load()

  if (command === 'open') {
    if (!rest[0]) fail('usage: planner open <link>')
    return openLink(rest[0], config)
  }
  if (command) fail(`unknown command: ${command}\n\n${HELP}`)

  const { url } = await startServer(config, { dev: !!values.dev })
  console.log(`Planner on ${url}`)
  if (config.problem)
    console.log(`${configFile} has an error, using the defaults until it is fixed:\n${config.problem}`)
  const folders = config.folders
  if (!folders.length)
    console.log('no docs folder yet: choose one in the browser, or run "planner config add <folder>"')
  for (const f of folders) console.log(`reading ${f.folder.name}: ${f.root ?? `${f.folder.path} (missing)`}`)
  if (!values['no-open'] && !values.dev) openBrowser(url)
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)))

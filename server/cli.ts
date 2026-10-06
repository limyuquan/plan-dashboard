#!/usr/bin/env node
import { execFile, spawn } from 'node:child_process'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { startServer } from './app'
import { ConfigStore, defaultConfigPath, expandHome } from './config'

const HELP = `plan-dashboard — read a folder of plans in split panes

Usage:
  plan-dashboard [options]            start the dashboard
  plan-dashboard open <link>          show a link in the dashboard tab you already have open

Options:
  --root <folder>     docs folder for this run (otherwise the one in your config)
  --port <number>     port for this run (default 4173)
  --config <file>     config file (default ${defaultConfigPath()})
  --no-open           do not open a browser tab on start
  -h, --help          show this help

<link> is a dashboard URL or just its query, e.g. '?ws=my-task/phase-1-setup&plan=plan.html'.`

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    root: { type: 'string' },
    port: { type: 'string' },
    config: { type: 'string' },
    'no-open': { type: 'boolean' },
    dev: { type: 'boolean' },
    help: { type: 'boolean', short: 'h' },
  },
})

function openBrowser(url: string) {
  const [cmd, args] =
    process.platform === 'darwin'
      ? ['open', [url]]
      : process.platform === 'win32'
        ? ['cmd', ['/c', 'start', '', url]]
        : ['xdg-open', [url]]
  spawn(cmd, args, { stdio: 'ignore', detached: true }).unref()
}

// Chrome on macOS: bring the tab already showing the dashboard to the front,
// the one thing the page cannot do for itself.
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

  // Nothing running: start a dashboard in the background and wait for it.
  if (!(await answering(base))) {
    const args = [...process.execArgv, process.argv[1], '--no-open', '--config', config.file]
    if (values.root) args.push('--root', values.root)
    if (values.port) args.push('--port', values.port)
    spawn(process.execPath, args, { stdio: 'ignore', detached: true }).unref()
    for (let i = 0; i < 40 && !(await answering(base)); i++) await new Promise((r) => setTimeout(r, 250))
  }

  const reply = await fetch(`${base}/api/open?${query}`).then((r) => r.json() as Promise<{ listeners?: number }>)
  if (!reply.listeners) {
    openBrowser(`${base}/?${query}`)
    console.log('opened a dashboard tab')
  } else {
    focusChromeTab(base)
    console.log('showed it in your dashboard tab')
  }
}

async function main() {
  if (values.help) return console.log(HELP)
  const config = new ConfigStore(path.resolve(expandHome(values.config ?? defaultConfigPath())), {
    ...(values.root && { root: path.resolve(expandHome(values.root)) }),
    ...(values.port && { port: Number(values.port) }),
  })
  await config.load()

  if (positionals[0] === 'open') {
    if (!positionals[1]) throw new Error('usage: plan-dashboard open <link>')
    return openLink(positionals[1], config)
  }
  if (positionals.length) throw new Error(`unknown command: ${positionals[0]}\n\n${HELP}`)

  const { url, root } = await startServer(config, { dev: !!values.dev })
  console.log(`plan-dashboard on ${url}`)
  console.log(root ? `reading ${root}` : 'no docs folder yet — choose one in the browser')
  if (!values['no-open'] && !values.dev) openBrowser(url)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})

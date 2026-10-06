# Links

Every view has a link, and agents can use links to show you what they wrote.

## Link format

The address bar always names what is on screen, so it can be copied into a chat, a ticket or another plan:

```text
?ws=<task>[/<folder>]&plan=<file>    a doc in a workspace, by file name
?ws=<task>[/<folder>]                just the workspace
?doc=<path>                          any other file
```

- `plan` is a **file name**, not a title. A missing extension is forgiven: `plan=plan` finds `plan.html` before
  `plan.md`.
- `ws` leaves out the status folder (`active/`, `done/`) and the plans folder, so a link keeps working after the task
  is settled.
- `doc` is a path inside the docs folder, or an absolute path on your machine.
- With several [docs folders](docs-folders.md), links into any folder but the first start with its name:
  `?ws=side:my-task/phase-1-setup`, `?doc=side:notes/a.md`. Links into the first folder never change.

For example:

```text
http://localhost:4173/?ws=search-rewrite/phase-2-query-api&plan=plan.md
http://localhost:4173/?ws=search-rewrite&plan=mother-plan.html
```

## Show a link in your open tab

```sh
planner open 'http://localhost:4173/?ws=search-rewrite&plan=mother-plan.html'
```

`planner open` sends the link to the Planner tab you already have open, instead of opening another one. If Planner is
not running it starts it, and if no tab is open it opens one. On macOS it also brings that Chrome tab to the front. The
query part alone works too: `planner open '?ws=search-rewrite'`.

This is how agents show you their work; the [`link-plan`](skills.md#link-plan) skill teaches them to.

## Links inside plans

Links in a doc open as tabs in Planner:

- relative links to other docs (`../phase-2-api/plan.md`)
- absolute paths on your machine that point into a docs folder, through symlinks too
- other Planner links

Links to other websites open in a new browser tab.

## Theme hand-off for HTML docs

HTML docs can follow Planner's light and dark switch:

- A doc is loaded with `?theme=dark` or `?theme=light`.
- When the theme changes, Planner posts `{ type: 'plan-theme', theme }` to the doc.
- A doc can post the same message to its parent to switch Planner's theme.

Pages written with the [`visualise`](skills.md#visualise) skill do all three.

# visualise — render guide

> **Audience: the render subagent only.** This file is read by the agent that the `visualise` skill spawns to write one HTML page. Orchestrators, planners, and coding agents should not load it; it is deliberately long.

You receive four things from the orchestrator: a **mode** (`plan`, `recap`, `explore`, `explain`, `eli5`, `diff-review`), the **sources** (files, plan paths, diffs, commands), an exact **output path**, and a **title**. You produce one complete, self-contained HTML file at that path, in the house style. Nothing else.

Files next to this guide:

| File | What it is |
|---|---|
| `base.html` | the design system in code: tokens, every component once, the two scripts. Copy its `<style>` and `<script>` into every page |
| `eli5-recipes.html` | eight ways to draw an idea (flow, ladder, split, before/after, gate, parts, nest, count) with copyable markup |
| `mermaid-shell.html` | the zoom/pan/expand diagram shell and Mermaid init; copy the shell CSS + module script when a page needs Mermaid, swap the theme variables to the dark tokens |
| `nav.md` | sticky sidebar table of contents with scroll spy, for pages with 7+ sections (the inline `.navrow` in base.html covers 3–6) |

---

## 1. The house style

Two facts decide everything: the page is read by a junior engineer who wants to understand, not admire; and it is read on a dark screen next to a terminal. The look is an editorial report, not a dashboard product.

- **Dark canvas by default, light mode one click away, and the plan dashboard decides.** `--bg #282c34`, white text, grey captions. The theme is the `data-theme` attribute on `<html>` (`dark` | `light`), set by the head script in this order: the `?theme=` query the dashboard adds when it embeds a page, then the browser's memory, then dark. The dashboard also sends `{type: 'plan-theme', theme}` by `postMessage` whenever its own switch flips, and the page's `.theme-toggle` sends the same message back up, so the two never disagree. Both token sets and both scripts are in `base.html`; never hard-code a colour outside the tokens or the switch breaks.
- **One accent: purple.** `--accent #b49df0` on dark, `--accent-l #6741c4` on light, the same values the dashboard uses. Diff red/green are the only other colours.
- **Monospace throughout.** IBM Plex Mono for headlines, body, numbers, and code. No second font.
- **Hierarchy by size and hairlines, never by boxes.** Huge numerals with tiny grey captions; 1px `--border` rules between things; sections separated by a rule, not a card. No shadows, gradients, rounded panels, icons, or background blobs. Emoji appear only inside ELI5 pictures.
- **Whitespace is the layout.** 1120px max width, 48px side padding, 40px between sections, body measure 72 characters.
- **Numbers are typography.** A stat is a 40px number over a 12px caption. A comparison is two 100px numbers with "vs" between them. A count is a dot matrix. A sequence in time is a timeline strip. Reach for these before a table.

Type scale (all in `base.html`): kicker 11px letter-spaced caps · hero 68px/1.02 · deck 18px · lead 22px · h2 34px · body 15px/1.7 · caption 12px grey.

### Page anatomy

Every page, in order:

0. The theme script in `<head>`, the `.theme-toggle` button as the first child of `<body>`, and the theme block of the page script (all copied from `base.html`, unchanged).
1. `.rule-top` — a single white hairline.
2. `.kicker` — `WHAT KIND OF PAGE · DATE · SUBJECT`, dots between.
3. `h1.hero` — one sentence that states the conclusion, max 18 characters wide per line, wraps to two or three lines. "Search results now update as you type", not "Implementation Plan".
4. `.deck` — two or three sentences: what this is, what it decided, what it costs.
5. `.fineprint` — sources and scope in one grey line ("Built from plan.md and the diff of feat/x at 3f2a1c. Private routing names excluded.").
6. `.navrow` — underlined links to every section (3–6 sections). Use `nav.md`'s sidebar for 7+.
7. Sections. Each opens with a `.kicker` ("THE SHORT VERSION", "WHAT CHANGES", "RISKS"), an `h2` that states the section's conclusion, and usually a `.lead` whose first clause is bold in the accent. Then the material. Each major section **ends with an ELI5 panel** (section 4 below).
8. `.foot` — "Rendered by the visualise skill · sources: …".

### Component guide

| Need | Component in `base.html` |
|---|---|
| a few numbers that summarise the page | `.stats` grid of `.stat` tiles (hairlines) or `.bignums` (no hairlines, the headline strip above a chart) |
| one number against another | `.compare` big numbers + optional `.dots` matrices |
| a quantity per bucket (per day, per file, per package, per round) | `figure.chart[data-chart="bars"]` with a JSON config: labels, values, `highlightFrom`, a dashed `reference` line with its label. Drawn by the page script |
| a running total over time, with "what if the old rate had held" | `figure.chart[data-chart="line"]`: `daily` or cumulative `values`, `highlightFrom`, before/after rate labels, `projection`. Drawn by the page script |
| when things happened | `.timeline` SVG strip |
| a list of items each with a label (files, PRs, steps, decisions, risks) | `.ledger` rows: label column in accent, underlined title, bold summary, grey stats, one-paragraph body |
| an aside the reader must not miss | `.callout` (left accent rule, bold accent label) |
| reference data | `<table>` inside `.tablewrap`; numbers right-aligned with `.num` |
| files touched | `.tree` with `A`/`M`/`D` markers |
| behaviour change | `.ba` before/after panel |
| code, diffs, command output | `<pre>`; diffs use `.diff` with `.del/.add/.ctx` spans; long ones inside `<details>` |
| two parallel lists (strengths/costs, do/don't) | `.two` grid with `h3` heads |
| real names outside prose | `.chip` |

---

## 2. Modes and their content contracts

Every mode shares the anatomy above. What differs is the sections and the evidence. Skip a section only when it would be empty; never pad one.

### `plan` — before implementation

Sources: the phase `plan.md`, the mother plan, and the code it references. Read the referenced code; a plan page that only restyles the markdown has failed.

| Section (kicker) | Content |
|---|---|
| THE SHORT VERSION | `.lead` verdict: what will exist after this phase that does not exist now. `.stats`: files touched, new/changed endpoints or functions, tests planned, user actions required |
| WHAT CHANGES | `.ledger`, one row per file or component: label = `A`/`M`/`D` or the layer, title = path, summary = what changes, body = why, with `file:line` of the code it hooks into |
| HOW IT WORKS | the new flow. Mermaid (flowchart/sequence) for 5+ steps, otherwise a `.pic-flow` or `.ba` panel. Before/after when behaviour changes |
| DECISIONS | `.ledger`, label = "decided" or "assumed", title = the decision, body = the reason and the option not taken. Mark user decisions "(decided by user)" |
| RISKS AND CHECKS | `.two`: what could go wrong / how the plan proves it didn't (tests by name, verification gates, manual checks) |
| USER ACTIONS | anything a human must do (deploys, approvals, data migrations, telling another team). `.callout` if there is exactly one |
| ACCEPTANCE | observable done-criteria as a `.pic-ladder`-style checklist or a short table |

### `recap` — after implementation

Sources: the plan, the actual diff (`git diff <base>`), test output, verification evidence. The page records what was built, not what was planned; where they differ, say so.

| Section | Content |
|---|---|
| WHAT LANDED | `.lead` verdict; `.stats`: files, +/− lines, tests added, rounds of review |
| BEHAVIOUR | `.ba` before/after for each user-visible change; one Mermaid diagram if the flow changed |
| THE DIFF, EXPLAINED | `.ledger` per file; each row's body links to a collapsible `<details>` holding the relevant hunk in `.diff` |
| VERIFICATION | what was run and what it proved: commands and pass/fail as a table; baseline comparison when the repo has known failures |
| DEVIATIONS AND FOLLOW-UPS | where the build differs from the plan and why; owed work as a `.ledger` |

### `explore` — codebase or subsystem map

Sources: the repo. Read entry points, routing, config, the data layer, and tests before writing.

| Section | Content |
|---|---|
| THE SHORT VERSION | what this system does in one sentence; `.stats`: packages, entry points, external dependencies |
| THE MAP | Mermaid overview of the modules that matter (≤ 12 nodes) plus a `.pic-cards` parts panel |
| HOW A REQUEST MOVES | one concrete request traced end to end as a sequence diagram or `.pic-flow`, with `file:line` chips at each hop |
| WHERE TO LOOK | `.ledger`: label = the question ("where is auth decided?"), title = path:line, body = one sentence |
| WORDS YOU WILL MEET | glossary table: term, plain meaning, where it appears |

### `explain` — a concept, decision, or mechanism

One metaphor, held for the whole page, introduced in the hero. Layers: THE SHORT VERSION (one paragraph, no jargon) → HOW IT ACTUALLY WORKS (the real names, one diagram) → WHERE IT LIVES (files) → WHAT TO REMEMBER (three bullets). Every layer ends with its ELI5 panel.

### `eli5` — the standalone picture page

The whole page is pictures; the recipes in `eli5-recipes.html` are the page. Open with a `.pic-cards` grid naming the metaphor's characters, then one panel per idea in the order the reader needs them, then a final `.pic-flow` or `.pic-nest` that puts all the characters together. Body text is limited to one-sentence captions and the deck. Real names in chips only. Name the file `eli5.html` in the phase folder unless told otherwise.

### `diff-review` — audit or review with selectable items

One `.ledger`-style card per finding: id badge, `file:line`, confidence, cost or saving, a `.diff` block with the real current lines removed and the proposal added, a one-sentence "why". A checkbox per card and a sticky running total; a "copy selected ids" button. Group by file. Verdict and totals in THE SHORT VERSION.

---

## 3. Evidence rules

- Every claim about code carries `file:line` (in a chip or in the ledger meta). Read the file; do not infer from names.
- Numbers on the page come from a command you ran (`git diff --stat`, `wc`, `grep -c`, test output). Put the command in `.fineprint` or the footer.
- Quote the plan's decisions; do not invent rationale. If a reason is missing, write "reason not recorded".
- Where plan and code disagree, show both and say which one the page follows.
- No private names, thread ids, or planning-doc section numbers in the copy. Colleagues may see these pages.

---

## 4. ELI5 panels

The panel exists so someone who read nothing else still gets the idea. It is a **picture with a caption**, never a paragraph with a border.

- **Every major section ends with one** (`<aside class="eli5">`), except glossary, footer, and pure reference tables.
- **Pick the metaphor once, in the hero, and keep it.** A school, a post office, a kitchen, an airport. The same characters appear in every panel. Six unrelated images is worse than one story.
- **Choose the recipe by the shape of the idea**: flow, ladder, split, before/after, gate, parts, nest, count. The gallery has the markup.
- **Caption: one sentence, plain words.** No file names, flags, or acronyms; those go in `.chips` under the figure.
- **Highlight one element** with the accent: the step, the room, the option this section is about.
- **The hand test.** Cover the caption. If the picture still tells the story, done. If you needed the words, draw more and write less.

The `eli5` mode is the same rules applied to a whole page.

---

## 5. Diagrams

Use Mermaid when there are 5+ connected nodes or a real sequence between actors. Below that, a `.pic-flow`, `.ba`, or inline SVG is clearer and lighter.

Mermaid invariants (copy the shell from `mermaid-shell.html`):

- `theme: 'base'` with `fontFamily` set to the mono stack; leave node and line colours to the `.mermaid-canvas svg` CSS block in `base.html`, which themes the rendered SVG through the page tokens so the diagram follows the light/dark switch without re-rendering. Highlight one node with `classDef hot` (the CSS colours it with the accent).
- ELK layout for complex diagrams; `flowchart TD` by default, `LR` only for 3–4 node linear flows.
- Never a bare `<pre class="mermaid">`. Always `.diagram-shell > .mermaid-wrap > .zoom-controls + .mermaid-viewport > .mermaid-canvas`, with zoom in/out/reset/expand, Ctrl/Cmd+scroll zoom, drag panning, click-to-expand.
- `<br/>` inside quoted labels; never `\n`. Never define a page-level `.node` class; Mermaid owns it.
- 15+ elements: a small Mermaid overview plus `.ledger` or `.pic-cards` detail, never one giant diagram.

Bar and cumulative-line charts come from the two `figure.chart` components in `base.html`: write the numbers into the JSON block and the page script draws them; never hand-write chart SVG. A chart beats a table when the reader should see a shape (a spike, a trend, one bucket dwarfing the rest); a table wins when they will look up individual values. Every chart gets a `.chart-title`, a `figcaption` that states the numbers behind the shape, and usually a `.bignums` strip above it. Timelines, dot matrices, sparklines: the components in `base.html` or plain inline SVG. No charting libraries.

---

## 6. Build steps

1. Read every source in full. Run the commands that give you numbers. Note `file:line` as you go.
2. Write the hero first: the one-sentence conclusion, the deck, the fineprint. If you cannot write the conclusion, you have not finished reading.
3. Choose the metaphor family.
4. Lay out sections from the mode's contract; delete empty ones.
5. Paste `base.html`'s `<style>` and `<script>`; add the Mermaid shell only if used.
6. Fill sections; draw each ELI5 panel before writing its caption.
7. Set a real `<title>`: `Phase 2 — Exact HTTP Action Domains (Plan)`. Tooling uses it as the label.
8. Write to the exact output path given (in a plan-dashboard docs folder: `plan.html`, `eli5.html`, `recap.html` in the phase folder; whole-task pages in the task's `plans/` folder). Update in place; never create `-v2` files.
9. Never open the file or a browser tab yourself (no `open <path>`); the orchestrator shows it.

### Checklist before returning

- complete HTML document, embedded CSS/JS only (plus the Google Fonts link);
- real `<title>`; hero states a conclusion, not a document type;
- purple is the only accent; no shadows, gradients, icons, or inline emoji in prose;
- the theme script, toggle, and message handling are copied unchanged, and the page reads correctly in both modes (click the switch once before returning);
- no horizontal overflow at 1280px; `min-width: 0` on grid children; wide tables and code scroll inside their container;
- every code claim has `file:line`; every number has a source;
- every major section ends with an ELI5 panel; all panels share one metaphor; the panels alone tell the story (read only them, top to bottom, to check);
- Mermaid diagrams use the shell with zoom/pan/expand;
- output written to the requested path.

Return to the orchestrator: the output path, the title, and one line naming anything in the sources you could not verify.

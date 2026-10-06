---
name: visualise
description: Produce a self-contained HTML page in the house style — implementation plans, post-implementation recaps, codebase explorations, concept explainers, standalone ELI5 picture pages, and diff/audit reviews. Use when the user types /visualise or /eli5, asks for a plan/recap/explainer/diagram page, or another skill calls for plan.html, eli5.html, or recap.html.
---

# visualise

The main thread never writes the HTML. It briefs one render subagent and links the result.

1. **Pick the mode**: `plan` (before implementation), `recap` (after), `explore` (codebase map), `explain` (one concept), `eli5` (standalone picture page), `diff-review` (selectable findings).
2. **Resolve the output path.** In a plan-dashboard docs folder: `plan.html`, `eli5.html`, `recap.html` in the phase folder; whole-task pages in the task's `plans/` folder; anything else where the user says. Existing files are updated in place.
3. **Spawn one subagent** (a capable model; the page is long and the guide is detailed). Its prompt contains, in this order:
   - "Read `render/GUIDE.md` in the visualise skill folder first and follow it." (give the absolute path)
   - the mode, the title, the exact output path
   - the sources: plan paths, diff range or commands, files to read, and any decisions or context from the conversation the sources do not contain
   - "Return the output path, the title, and anything you could not verify."
4. **Show it** with the `link-plan` skill (a dashboard link, not a file path), and relay the subagent's unverified items in one line.

Do not read `render/GUIDE.md` or the files beside it yourself; they are written for the subagent and are long on purpose. If your agent cannot spawn subagents, read the guide and write the page yourself.

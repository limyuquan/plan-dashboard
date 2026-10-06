---
name: link-plan
description: Show the user a markdown or HTML plan in Planner instead of giving them a file path. Use whenever you point the user at a plan, recap, ELI5, explainer, or any other doc in the docs folder.
---

# link-plan

Send the doc to the dashboard tab the user already has open — a clicked link would open yet another tab:

```bash
planner open '<url>'
```

It starts the dashboard if it is down, and opens a tab only when no dashboard is running. Put the same URL in your message too, so it can be reopened later.

Files sitting directly in a phase folder, a task's plans folder, or an extra folder like `research/` are named by workspace and **file name**, never by title. Leave out the status folder (`active/`, `done/`) and the plans folder, so the link survives the task being settled:

```text
http://localhost:4173/?ws=<task-folder>[/<phase-folder>]&plan=<file>
http://localhost:4173/?ws=search-rewrite/phase-2-query-api&plan=plan.md
http://localhost:4173/?ws=search-rewrite&plan=mother-plan.html
```

Anything else is not listed in the sidebar, so name it by its path under the docs folder (or its absolute path):

```text
http://localhost:4173/?doc=<path-under-the-docs-folder>
http://localhost:4173/?doc=notes/meeting-2026-01-12.md
```

Use the port from the user's dashboard if it is not the default 4173.

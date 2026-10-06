---
name: planner-setup
description: Set up or change Planner's config for the user — add the folders their plans live in and match Planner's layout rules to how those folders are organised. Use when the user asks to install, set up or configure Planner, add or remove a docs folder, or says Planner is not showing their plans.
---

# planner-setup

Planner reads one or more docs folders and shows the plans in them. Its config is one JSON file; the `planner config` commands read, change and check it, so you never have to guess whether an edit worked.

```bash
planner config path            # where the config file is
planner config show            # the whole file
planner config add <folder>    # add a docs folder (--name <name> to choose its name)
planner config remove <name>   # remove one
planner config check           # validate, then print what each folder holds
planner config schema          # the JSON schema, with a description of every key
```

If `planner` is not installed: `git clone https://github.com/limyuquan/planner && cd planner && npm install && npm run build && npm link`.

## Steps

1. **Find the folders.** Ask the user where their agents write plans, or look for them (`docs/`, `plans/`, `.agents/docs/`, `.claude/docs/` in their projects). Each project's folder becomes one docs folder; do not merge projects into one.
2. **Look at how each folder is organised** before configuring it: list two or three levels (`find <folder> -maxdepth 3 -type d | head -40`) and note:
   - are tasks inside status folders like `active/` and `done/`, or directly in the folder?
   - does each task keep its plans in a sub-folder like `plans/`, or in the task folder itself?
   - how are phase folders named (`phase-1-setup`, `01-setup`, `step-1`…)?
   - which file types are the plans (`html`, `md`, `pdf`…)?
3. **Add each folder** with `planner config add <folder> --name <short-name>`. Names are lowercase with dashes (`my-app`) and appear in the sidebar and in links.
4. **Match the layout.** The defaults expect `active/` and `done/` status folders, a `plans/` folder per task, and `phase-<n>-<name>` phase folders. Where a folder differs, edit the config file and put the differing keys **on that folder's entry** (they override the shared ones for that folder only):

   ```json
   { "name": "my-app", "path": "~/code/my-app/docs/plans", "statusFolders": null, "plansFolder": "", "phasePattern": "^(?<num>\\d+)-(?<slug>.+)$" }
   ```

   - `statusFolders`: `{"active": "...", "done": "..."}`, or `null` when tasks sit directly in the folder
   - `plansFolder`: the sub-folder of a task holding its plans, or `""` for the task folder itself
   - `phasePattern`: a regular expression with a `(?<num>...)` group, and optionally `(?<slug>...)`
   - `fileTypes`: extensions without the dot

   Change a shared key at the top level only when every folder uses the same convention.
5. **Check, and fix until it matches.** Run `planner config check`. For each folder it prints tasks, phases and docs, phase folders the pattern misses, and file types it leaves out. Compare with what you saw in step 2; a folder with `0 tasks` almost always has the wrong `statusFolders` or `plansFolder`. Repeat until every folder finds what is really there. The command exits non-zero while anything is wrong.
6. **Show the user.** A running Planner picks up the change by itself. Start it if needed (`planner`), then show a plan with `planner open '<link>'` (see the `link-plan` skill for link shapes) and tell them which folders you added and what each one holds.

## Rules

- Never delete or move the user's plan files; only the config changes.
- Keep `~` in paths under the home folder, so the config can move between machines.
- Do not change `docTypes` (badge names and colours) unless the user asks.
- If `planner config check` reports an error in the file, fix that first; until then Planner keeps using the last valid settings.

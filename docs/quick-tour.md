# Quick tour

Five minutes on the demo folder: open a phase, split panes, catch a new plan, and search.

The quickest way to see Planner is the live demo on the [website](https://limyuquan.github.io/planner/), which runs the
real app in your browser. To run it yourself, start Planner on the demo folder from a clone (see
[Run from source](installation.md#run-from-source)):

```sh
node dist/cli.js --root examples/demo-docs
```

## 1. Open a phase

The sidebar lists tasks; click **Planner V1** to see its phases. Hover **Phase 2** and click **Open** to make it your
workspace: its plan, ELI5 and recap open side by side, one pane each.

## 2. Arrange the panes

- Drag the recap's tab onto the **bottom edge** of the ELI5 pane. Only that pane splits; the plan keeps its width.
- Drag the divider between panes to resize them.
- Click a tab and press `Option` + `→` to send it to the next pane.

Planner remembers this arrangement for Phase 2. Hover the phase and click its circular arrow to lay it out from scratch again.

## 3. Catch a new plan

Write a file into a phase folder, as an agent would:

```sh
echo '# Phase 3 recap' > examples/demo-docs/active/planner-v1/plans/phase-3-settings/recap.md
```

A notification names the task and phase; **Workspace** opens it. Edit the file and the open tab reloads in place.

## 4. Search

Type `tokenised` in the search box. Planner finds it inside the Search Rewrite plan; opening the result shows the plan at
that word.

## 5. Settle a finished task

Hover a task and click `settle`: its folder moves from `active/` to `done/`, and any open tabs follow. **Undo** brings it
back.

Next: [Reading plans](reading-plans.md) covers everything the panes and sidebar do.

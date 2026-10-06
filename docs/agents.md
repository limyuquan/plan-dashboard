# Working with agents

Planner is built to sit between you and your coding agents: they write plans as files, set Planner up, and show you
what they wrote. These docs are written for them as much as for you.

## Set Planner up with an agent

Give your agent the [`planner-setup`](skills.md#planner-setup) skill, then ask it to set Planner up. It finds the folders
your plans live in, works out how each one is organised, writes the config with `planner config add`, and runs
`planner config check` until every folder shows what is really there.

Without the skill, an agent can do the same from the [command line](command-line.md#config): every config change it
makes is checked, and `planner config check` exits non-zero until the config is right.

## Let agents show you their work

Instead of pasting a file path, an agent can run:

```sh
planner open '?ws=my-task/phase-2-api&plan=plan'
```

The plan appears in the Planner tab you already have open. The [`link-plan`](skills.md#link-plan) skill tells agents
how to build these links.

## Have agents write better plans

The [`visualise`](skills.md#visualise) skill has an agent write a plan, recap, codebase map, explainer, ELI5 page or
review as one self-contained HTML page in a consistent, readable style, saved where Planner picks it up.

## Docs for agents

- **Copy page.** Every page of these docs has a **Copy page** button that copies it as Markdown, ready to paste into
  an agent, and a **View as Markdown** link to the raw file.
- **llms.txt.** [`/llms.txt`](https://limyuquan.github.io/planner/llms.txt) is a short index of Planner for agents,
  and [`/llms-full.txt`](https://limyuquan.github.io/planner/llms-full.txt) is every page of these docs, every skill and
  the config schema in one file.
- **Schema.** The config's [JSON schema](https://raw.githubusercontent.com/limyuquan/planner/main/schema/config.schema.json)
  describes every key.
- **HTTP API.** A running Planner has a small [local API](http-api.md) for scripts and agents.

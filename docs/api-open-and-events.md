# Open and events

Show the user a doc, and follow what happens in the docs folders as it happens.

## `GET /api/open`

Shows a [link](links.md) in the Planner tab the user already has open, as if they had followed it. This is what
`planner open` calls. Give `ws` (with an optional `plan`) or `doc`.

### Query

| Parameter | Required      | Meaning                                                                                                     |
| --------- | ------------- | ----------------------------------------------------------------------------------------------------------- |
| `ws`      | `ws` or `doc` | A workspace, as links name it: `my-task/phase-1-setup`, or `side:my-task` for a folder other than the first |
| `plan`    | no            | A file name in that workspace; the extension may be left out                                                |
| `doc`     | `ws` or `doc` | Any doc: a path inside the first folder, `<folder>:<path>`, or an absolute path                             |

```sh
curl -s 'http://localhost:4173/api/open?ws=search-rewrite&plan=mother-plan'
```

### Response

```json
{ "ok": true, "listeners": 1 }
```

`listeners` is how many Planner tabs heard it. `0` means none is open: open the link in a browser instead (`planner
open` does this for you).

### Errors

| Status | When                   | Body                            |
| ------ | ---------------------- | ------------------------------- |
| `400`  | Neither `ws` nor `doc` | `{ "error": "need ws or doc" }` |

A name that matches nothing is not an error here: the tab shows the user a notification instead.

## `GET /api/events`

A [server-sent events](https://developer.mozilla.org/docs/Web/API/Server-sent_events) stream of what changes. Each
message's `data` is one JSON [`ServerEvent`](http-api.md#data-shapes):

<!-- include: shared/types.ts#ServerEvent -->

| Event     | When                                                                                             |
| --------- | ------------------------------------------------------------------------------------------------ |
| `tree`    | Anything in a docs folder or the config changed; fetch [`/api/tree`](api-tree-and-docs.md) again |
| `added`   | A new doc appeared, with where it sits; collections with `notify: false` stay quiet              |
| `changed` | A listed doc's file was edited                                                                   |
| `open`    | Something asked to show a link, through `/api/open`                                              |

Writes are batched: events arrive about half a second after files stop changing, so a page written in several chunks is
announced once.

```sh
curl -sN http://localhost:4173/api/events
```

### Example

An agent writes a recap, edits it, then shows the task:

```text
retry: 1000

data: {"type":"tree"}

data: {"type":"added","doc":{"path":"plans/active/search-rewrite/plans/phase-2-query-api/recap.md","file":"recap.md","kind":"md","title":"New recap","ws":"plans:search-rewrite/phase-2-query-api"},"place":{"task":"search rewrite","phase":"Phase 2 · query api"}}

data: {"type":"tree"}

data: {"type":"changed","path":"plans/active/search-rewrite/plans/phase-2-query-api/recap.md"}

data: {"type":"open","ws":"search-rewrite","plan":"","doc":""}
```

### Recipe

Print each new plan's title as it lands:

```sh
curl -sN http://localhost:4173/api/events | while read -r line; do
  case "$line" in data:*'"type":"added"'*) echo "${line#data: }" | jq -r '.doc.title' ;; esac
done
```

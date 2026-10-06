# Search

Find docs by what they say, not only by their names.

## `GET /api/search`

Every listed doc whose title or text holds **every** word of the query. HTML is searched without its tags, scripts and
styles. Docs with more of the words in their title come first, then those that mention them most. Each result has a
snippet of text around the first match.

### Query

| Parameter | Required | Meaning                                                            |
| --------- | -------- | ------------------------------------------------------------------ |
| `q`       | yes      | Words to find, case-insensitive. Under two characters returns `[]` |

```sh
curl -s 'http://localhost:4173/api/search?q=tokenised%20search'
```

### Response

At most 40 [`SearchHit`](http-api.md#data-shapes)s, best first:

<!-- include: shared/search.ts#SearchHit -->

### Example

```json
[
  {
    "doc": {
      "path": "plans/active/search-rewrite/plans/phase-1-index-schema/plan.html",
      "file": "plan.html",
      "kind": "plan",
      "title": "Phase 1 — Index schema",
      "ws": "plans:search-rewrite/phase-1-index-schema"
    },
    "snippet": "…heading anchor. Fields doc_id , anchor , title body , tokenised for full-text search updated_at , for incremental rebuilds Rebuilds A change to a documen…",
    "hits": 2
  }
]
```

`hits` counts how often the words appear in the doc's text.

### Recipes

Titles of every plan that mentions rate limits:

```sh
curl -s 'http://localhost:4173/api/search?q=rate%20limit' | jq -r '.[].doc.title'
```

Search, then show the best match to the user:

```sh
best=$(curl -s 'http://localhost:4173/api/search?q=rate%20limit' | jq -r '.[0].doc | "?ws=\(.ws)&plan=\(.file)"')
planner open "$best"
```

A doc's `ws` works as it is in a link, folder name included, for any docs folder.

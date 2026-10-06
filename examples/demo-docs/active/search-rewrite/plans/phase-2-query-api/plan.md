# Phase 2 — Query API

`GET /search?q=<text>&limit=<n>` returns matching sections, best first.

## Request

| Parameter | Meaning | Default |
|---|---|---|
| `q` | what to look for | required |
| `limit` | most results to return | 20 |

## Response

```json
{ "results": [{ "doc_id": "a1", "anchor": "rebuilds", "title": "Rebuilds", "score": 0.82 }] }
```

## Open questions

- [x] Do we page results? No; `limit` is enough for the search box.
- [ ] Should drafts be searchable by their authors?

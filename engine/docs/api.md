# CPM Engine API (v1.0.0)

Public surface
- C++ header: `engine/include/cpm_api.h` — `ProjectInput` and `ProjectResult` types.
- JSON Schema: `engine/api/schema.json` — authoritative input validation schema.

Example JSON input

```json
{
  "tasks": [ { "id": "A", "duration": 5 }, { "id": "B", "duration": 3 } ],
  "dependencies": [ { "from": "A", "to": "B" } ]
}
```

Example JSON result (abbreviated)

```json
{
  "result": {
    "projectDuration": 8,
    "criticalPath": ["A","B"],
    "tasks": [ { "id": "A", "earliest_start": 0, "earliest_finish": 5, "latest_start": 0, "latest_finish": 5, "float_time": 0 } ]
  }
}
```

Notes
- The engine accepts `tasks` and `dependencies` only; all example and integration code should adhere to the schema.

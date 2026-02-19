# Tools Analytics API

## Purpose
Provide analytics for a specific tool: usage trend, notable wins/losses, and switching activity.

## Endpoint
`GET /api/tools/analytics?toolId=<tool_id>&toolName=<optional>`

### Query Params
- `toolId` (required): Tool identifier.
- `toolName` (optional): Tool display name (used for labeling).

## Response Shape
```json
{
  "tool_id": "string",
  "tool_name": "string",
  "usage": [
    { "date": "Oct 25", "count": 72 }
  ],
  "wins": [
    { "domain": "brand-123.com", "note": "Adopted for attribution layering" }
  ],
  "losses": [
    { "domain": "shop-456.com", "note": "Migrated to bundled suite" }
  ],
  "switches": [
    {
      "domain": "store-789.com",
      "from_tool": "Legacy Suite",
      "to_tool": "Selected Tool",
      "change_date": "Oct 25"
    }
  ],
  "data_source": "bigquery",
  "dataAvailable": true
}
```

## Current Data Source
- BigQuery-backed aggregations in `web/src/lib/bigquery.ts`, returned from `web/src/app/api/tools/analytics/route.ts`.
- The API sets `dataAvailable=false` when it returns an empty usage timeline.

## Future BigQuery Inputs (planned)
- Tool usage snapshots over time (daily/weekly rollups).
- Store-level tool change events to calculate wins/losses and switch paths.

## Notes for Agents
- The UI expects `usage`, `wins`, `losses`, and `switches` arrays; do not omit fields.
- `data_source` should be `mock` or `bigquery`.

# API Service Contract

## Purpose
Next.js application serving the Shopify Intelligence API endpoints. All data access is read-only from BigQuery. Frontend lives separately in `frontend/`.

> **Schema Details:** See [SCHEMA.md](./SCHEMA.md) for exact column-level dependencies on upstream tables, severity impact matrix, and what breaks the API.

## Deployment
Cloud Run Service (not Job) -- always-on with autoscaling (0-3 instances).

## API Routes
All API routes are thin BigQuery query wrappers in TypeScript.

| Route | Method | Description |
|-------|--------|-------------|
| `/api/stats` | GET | Homepage statistics |
| `/api/stores` | GET | Store search (Typesense + BQ fallback) |
| `/api/stores/[domain]` | GET | Store detail |
| `/api/tools` | GET | Tool listing with analytics |
| `/api/tools/[toolId]` | GET | Tool detail with adoption data |
| `/api/compare` | GET | Store comparison |
| `/api/similar` | GET | Similar stores |
| `/api/co-occurrence` | GET | Tool co-occurrence data |
| `/api/alerts` | GET/POST | Alert subscriptions |

## BigQuery Tables

### Reads From (ALL READ-ONLY)
| Table | Purpose |
|-------|---------|
| `store_search_cache` | Primary serving layer for all store queries |
| `technology_detections` | Tool analytics, adoption trends |
| `store_snapshots` | Historical data, change tracking |
| `change_events` | Store change feed |
| `stores` | Domain lookups, metadata |
| `store_authority` | Authority scores for ranking |
| `pixel_detections` | Pixel analytics |
| `app_detections` | App analytics |

### Writes To
| Table | Operation | Notes |
|-------|-----------|-------|
| `store_alerts` | INSERT/DELETE | User alert subscriptions only |

## External Services
| Service | Purpose |
|---------|---------|
| Typesense | Fast text search with BQ fallback |
| Google OAuth | User authentication |

## Environment Variables
| Var | Required | Notes |
|-----|----------|-------|
| `GOOGLE_APPLICATION_CREDENTIALS` | Yes | BQ service account |
| `TYPESENSE_HOST` | Yes | Typesense server |
| `TYPESENSE_API_KEY` | Yes | Typesense auth |
| `NEXTAUTH_SECRET` | Yes | Session encryption |
| `GOOGLE_CLIENT_ID` | Yes | OAuth |
| `GOOGLE_CLIENT_SECRET` | Yes | OAuth |

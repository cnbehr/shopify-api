# API Service - BigQuery Schema Contract

> **Owner:** API Service
> **Dataset:** `shopify_intelligence`
> **Last Updated:** 2026-02-19

## Overview

The API service is **almost entirely read-only**. It reads from enrichment-owned tables (primarily via the denormalized `store_search_cache`) and owns only one table: `store_alerts` for user subscriptions.

---

## Tables I Own (Write)

### `store_alerts` — User Alert Subscriptions

**Operations:** INSERT (create alert), DELETE (remove alert)
**No consumers outside API.**

| Column | Type | Description |
|--------|------|-------------|
| `alert_id` | STRING | PK |
| `email` | STRING | User email |
| `domain` | STRING | Store domain to watch |
| `created_at` | TIMESTAMP | Subscription time |
| `last_checked` | TIMESTAMP | Last check time |
| `is_active` | BOOL | Active flag |

> This table is fully self-contained. No other service reads from it. Schema changes here have zero external impact.

---

## Tables I Read (Consume) — Column-Level Dependencies

### From Enrichment Service

#### `store_search_cache` — Primary Serving Layer

**Used in:** `src/lib/bigquery.ts` (store search, detail, comparison)
**This is the API's most critical dependency.**

**Columns I depend on:**

| Column | Type | API Usage |
|--------|------|-----------|
| `store_id` | STRING | Store identification |
| `domain` | STRING | Primary lookup key |
| `normalized_domain` | STRING | Domain normalization |
| `page_title` | STRING | Store display name |
| `meta_description` | STRING | Store description |
| `primary_category` | STRING | Category filter/display |
| `secondary_category` | STRING | Subcategory display |
| `category_confidence` | FLOAT64 | Category confidence |
| `composite_rank_score` | FLOAT64 | Sorting by rank |
| `ranking_model_version` | STRING | Ranking metadata |
| `pr_rank` | INT64 | PageRank display |
| `backlink_count` | INT64 | Backlink count display |
| `significance_score` | FLOAT64 | Significance sorting |
| `source_storefront_score` | FLOAT64 | Storefront score display |
| `percentile_rank` | STRING | Percentile display |
| `last_snapshot_date` | DATE | Freshness indicator |
| `current_http_status` | INT64 | Store availability |
| `app_count` | INT64 | Tool count display |
| `pixel_count` | INT64 | Pixel count display |
| `product_count` | INT64 | Product count display |
| `price_min` | FLOAT64 | Price range display |
| `price_max` | FLOAT64 | Price range display |
| `price_avg` | FLOAT64 | Average price display |
| `in_stock_products` | INT64 | Stock display |
| `out_of_stock_products` | INT64 | Stock display |
| `tools` | ARRAY\<STRING\> | Tool list filter/display |
| `pixels` | ARRAY\<STRING\> | Pixel list filter/display |
| `theme_name` | STRING | Theme display |
| `is_shopify_plus` | BOOL | Plus badge |
| `page_builder` | STRING | Page builder display |
| `announcement_bar_text` | STRING | Announcement display |
| `entry_offer_type` | STRING | Offer type display |
| `entry_offer_value` | STRING | Offer value display |
| `positioning_claim` | STRING | Positioning display |
| `free_shipping_threshold` | FLOAT64 | Shipping display |
| `offers_free_shipping` | BOOL | Shipping filter |
| `guarantee_type` | STRING | Guarantee display |
| `bundle_count` | INT64 | Bundle display |
| `has_subscription` | BOOL | Subscription filter |
| `subscription_type` | STRING | Subscription display |
| `landing_page_count` | INT64 | LP count display |
| `refund_window_days` | INT64 | Refund policy display |
| `store_currency` | STRING | Currency display |
| `deep_enrichment` | BOOL | Deep enrichment badge |
| `sitemap_product_count` | INT64 | Sitemap count display |
| `sitemap_page_count` | INT64 | Sitemap count display |
| `instagram_url` | STRING | Social link display |
| `tiktok_url` | STRING | Social link display |
| `facebook_url` | STRING | Social link display |
| `twitter_url` | STRING | Social link display |
| `youtube_url` | STRING | Social link display |
| `pinterest_url` | STRING | Social link display |
| `linkedin_url` | STRING | Social link display |
| `acquisition_score` | FLOAT64 | Score display |
| `retention_score` | FLOAT64 | Score display |
| `optimization_score` | FLOAT64 | Score display |
| `scale_score` | FLOAT64 | Score display |

> **If ANY of these columns are renamed or removed from `cache_refresh.py`, the API breaks.** This is the single most important contract in the system.

---

#### `detections` — Unified Detection Table (Apps, Pixels, Technology)

**Used in:** `src/lib/bigquery.ts`, `src/app/api/tools/[toolId]/changes/route.ts`

| Column | Type | API Usage |
|--------|------|-----------|
| `detection_type` | STRING | Filter by `app`, `pixel`, or `technology` |
| `entity_id` | STRING | Tool/pixel identification (aliased as `tool_id`) |
| `entity_name` | STRING | Tool display name (aliased as `tool_name`) |
| `entity_category` | STRING | Tool category (aliased as `tool_category`) |
| `domain` | STRING | Store lookup |
| `snapshot_date` | DATE | Time filtering |

---

#### `store_snapshots` — Historical Data

**Used in:** `src/lib/bigquery.ts`

| Column | Type | API Usage |
|--------|------|-----------|
| `http_status` | INT64 | Status display |
| `snapshot_date` | DATE | Timeline |
| `enrichment_tier` | STRING | Tier display |
| `created_at` | TIMESTAMP | Timestamp display |
| `error_message` | STRING | Error display |
| `deep_enrichment` | BOOL | Deep enrichment flag |
| `theme_name` | STRING | Theme display |
| `is_shopify_plus` | BOOL | Plus detection |
| `announcement_bar_text` | STRING | Announcement display |
| `guarantee_type` | STRING | Guarantee display |
| `entry_offer_type` | STRING | Offer display |
| `positioning_claim` | STRING | Positioning display |
| `landing_page_count` | INT64 | LP count |
| `has_bundle_products` | BOOL | Bundle flag |
| `subscription_type` | STRING | Subscription display |
| `page_builder` | STRING | Page builder display |

---

#### `store_changes` — Unified Change Feed (Product + Store Scope)

**Used in:** `src/lib/bigquery.ts`, `src/app/api/tools/[toolId]/changes/route.ts`, `src/app/api/monitor/changes-summary/route.ts`, `src/app/api/stores/[domain]/changes/route.ts`

| Column | Type | API Usage |
|--------|------|-----------|
| `change_id` | STRING | Change identification |
| `domain` | STRING | Store lookup |
| `change_scope` | STRING | Filter by `product` or `store` |
| `change_date` | DATE | Time filtering |
| `change_type` | STRING | Change type display |
| `change_category` | STRING | Category filtering |
| `change_description` | STRING | Description display |
| `old_value` | STRING | Before value |
| `new_value` | STRING | After value |
| `severity` | STRING | Severity filtering |
| `significance_score` | FLOAT64 | Importance ranking |
| `entity_name` | STRING | Entity display |
| `entity_id` | STRING | Entity lookup |

---

#### `store_similarity` — Similar Stores

**Used in:** `src/lib/bigquery.ts`

| Column | Type | API Usage |
|--------|------|-----------|
| `domain` | STRING | Source store |
| `similar_domain` | STRING | Similar store |
| `similarity_score` | FLOAT64 | Similarity ranking |
| `embedding_similarity` | FLOAT64 | Embedding score |
| `tech_overlap` | FLOAT64 | Tech overlap score |
| `category_match` | BOOL | Category match flag |
| `shared_tools` | ARRAY\<STRING\> | Shared tool list |
| `shared_tool_count` | INT64 | Shared tool count |

---

#### `store_screenshots` — Store Screenshots

**Used in:** `src/lib/bigquery.ts`

| Column | Type | API Usage |
|--------|------|-----------|
| `gcs_path` | STRING | Screenshot URL |
| `width` | INT64 | Image dimensions |
| `domain` | STRING | Store lookup |
| `created_at` | TIMESTAMP | Timestamp |

---

### From Discovery Service

#### `stores` — Store Metadata

**Used in:** `src/lib/bigquery.ts`, `src/app/api/monitor/freshness/route.ts`

| Column | Type | API Usage |
|--------|------|-----------|
| `is_active` | BOOL | Active store filtering |
| `last_deep_enriched_at` | TIMESTAMP | Freshness monitoring |

---

### Views I Read (Enrichment-Owned)

| View | Usage |
|------|-------|
| `tool_usage_daily` | Tool adoption trend charts (`tool_id`, `tool_name`, `tool_category`, `snapshot_date`, `store_count`) |
| `tool_wins_losses_daily` | Tool wins/losses charts (`tool_id`, `change_date`, `wins`, `losses`, `win_domains`, `loss_domains`) |
| `tool_switch_events` | Tool migration analysis (`from_tool_id`, `to_tool_id`, `from_tool_name`, `to_tool_name`, `change_date`, `domain`) |

---

### Enrichment Internal Tables the API Reads

#### `enrichment_queue` — Monitor Dashboard

**Used in:** `src/lib/bigquery.ts`, `src/app/api/monitor/job-runs/route.ts`

| Column | Type | API Usage |
|--------|------|-----------|
| `status` | STRING | Queue status display |
| `reason` | STRING | Queue reason display |
| `started_at` | TIMESTAMP | Job timing |
| `completed_at` | TIMESTAMP | Job timing |
| `scheduled_at` | TIMESTAMP | Schedule display |

---

## External Services

| Service | Purpose | Fallback |
|---------|---------|----------|
| Typesense | Fast text search | Falls back to BQ `store_search_cache` |
| Google OAuth | User authentication | N/A |

---

## Impact Summary — What Breaks the API

| Severity | Scenario |
|----------|----------|
| **P0 — Total outage** | `store_search_cache` missing or schema change in core columns |
| **P1 — Feature broken** | `detections` column rename (`entity_id`, `entity_name`, `entity_category`) → tool pages break |
| **P1 — Feature broken** | `store_changes` column rename → change feed breaks |
| **P2 — Degraded** | `store_snapshots` column rename → store detail view partial failure |
| **P2 — Degraded** | `store_similarity` missing → similar stores returns empty |
| **P3 — Minor** | `enrichment_queue` changes → monitor dashboard only |
| **P3 — Minor** | `stores` column changes → freshness monitor only |

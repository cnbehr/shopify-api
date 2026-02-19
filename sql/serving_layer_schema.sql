-- Shopify Intelligence Platform - Serving Layer Schema
-- Purpose: Fast, denormalized tables/views for UI search + tool analytics.
--
-- NOTE: This file is REFERENCE ONLY. The authoritative table creation is
-- performed by scripts/refresh_search_cache.py, which drops and recreates
-- store_search_cache on each full refresh. BigQuery does not allow changing
-- clustering via CREATE OR REPLACE, so the Python script handles the
-- drop+create cycle. Edits to the cache schema should be made in
-- refresh_search_cache.py and mirrored here for documentation.

-- ============================================================================
-- STORE SEARCH CACHE
-- ============================================================================

-- Denormalized table for fast store search + detail retrieval.
-- Refresh via scheduled query or after enrichment runs.
CREATE TABLE IF NOT EXISTS `shopify_intelligence.store_search_cache` (
  store_id STRING NOT NULL,
  domain STRING NOT NULL,
  normalized_domain STRING,

  page_title STRING,
  meta_description STRING,

  primary_category STRING,
  secondary_category STRING,
  category_confidence FLOAT64,

  backlink_count INT64,
  referring_domains_count INT64,
  significance_score FLOAT64,
  composite_rank_score FLOAT64,
  ranking_model_version STRING,
  ranking_signal_meta JSON,
  source_tranco_rank INT64,
  source_umbrella_rank INT64,
  source_majestic_rank INT64,
  source_cloudflare_rank INT64,
  source_cloudflare_bucket STRING,
  source_crux_bucket STRING,
  source_backlink_score FLOAT64,
  source_openpagerank_score FLOAT64,
  source_pr_score FLOAT64,
  source_storefront_score FLOAT64,
  storefront_score FLOAT64,
  pr_rank INT64,
  percentile_rank STRING,

  last_snapshot_date DATE,
  current_http_status INT64,

  app_count INT64,
  pixel_count INT64,
  product_count INT64,
  price_min FLOAT64,
  price_max FLOAT64,
  price_avg FLOAT64,
  in_stock_products INT64,
  out_of_stock_products INT64,

  tools ARRAY<STRING>,
  pixels ARRAY<STRING>,

  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
CLUSTER BY domain, primary_category, pr_rank;

-- Deep enrichment columns (added for store detail deep intelligence display)
ALTER TABLE `shopify_intelligence.store_search_cache` ADD COLUMN IF NOT EXISTS theme_name STRING;
ALTER TABLE `shopify_intelligence.store_search_cache` ADD COLUMN IF NOT EXISTS is_shopify_plus BOOL;
ALTER TABLE `shopify_intelligence.store_search_cache` ADD COLUMN IF NOT EXISTS page_builder STRING;
ALTER TABLE `shopify_intelligence.store_search_cache` ADD COLUMN IF NOT EXISTS announcement_bar_text STRING;
ALTER TABLE `shopify_intelligence.store_search_cache` ADD COLUMN IF NOT EXISTS entry_offer_type STRING;
ALTER TABLE `shopify_intelligence.store_search_cache` ADD COLUMN IF NOT EXISTS entry_offer_value STRING;
ALTER TABLE `shopify_intelligence.store_search_cache` ADD COLUMN IF NOT EXISTS positioning_claim STRING;
ALTER TABLE `shopify_intelligence.store_search_cache` ADD COLUMN IF NOT EXISTS free_shipping_threshold FLOAT64;
ALTER TABLE `shopify_intelligence.store_search_cache` ADD COLUMN IF NOT EXISTS offers_free_shipping BOOL;
ALTER TABLE `shopify_intelligence.store_search_cache` ADD COLUMN IF NOT EXISTS guarantee_type STRING;
ALTER TABLE `shopify_intelligence.store_search_cache` ADD COLUMN IF NOT EXISTS bundle_count INT64;
ALTER TABLE `shopify_intelligence.store_search_cache` ADD COLUMN IF NOT EXISTS has_subscription BOOL;
ALTER TABLE `shopify_intelligence.store_search_cache` ADD COLUMN IF NOT EXISTS subscription_type STRING;
ALTER TABLE `shopify_intelligence.store_search_cache` ADD COLUMN IF NOT EXISTS landing_page_count INT64;
ALTER TABLE `shopify_intelligence.store_search_cache` ADD COLUMN IF NOT EXISTS refund_window_days INT64;
ALTER TABLE `shopify_intelligence.store_search_cache` ADD COLUMN IF NOT EXISTS store_currency STRING;
ALTER TABLE `shopify_intelligence.store_search_cache` ADD COLUMN IF NOT EXISTS deep_enrichment BOOL;
ALTER TABLE `shopify_intelligence.store_search_cache` ADD COLUMN IF NOT EXISTS composite_rank_score FLOAT64;
ALTER TABLE `shopify_intelligence.store_search_cache` ADD COLUMN IF NOT EXISTS ranking_model_version STRING;
ALTER TABLE `shopify_intelligence.store_search_cache` ADD COLUMN IF NOT EXISTS ranking_signal_meta JSON;
ALTER TABLE `shopify_intelligence.store_search_cache` ADD COLUMN IF NOT EXISTS source_tranco_rank INT64;
ALTER TABLE `shopify_intelligence.store_search_cache` ADD COLUMN IF NOT EXISTS source_umbrella_rank INT64;
ALTER TABLE `shopify_intelligence.store_search_cache` ADD COLUMN IF NOT EXISTS source_majestic_rank INT64;
ALTER TABLE `shopify_intelligence.store_search_cache` ADD COLUMN IF NOT EXISTS source_cloudflare_rank INT64;
ALTER TABLE `shopify_intelligence.store_search_cache` ADD COLUMN IF NOT EXISTS source_cloudflare_bucket STRING;
ALTER TABLE `shopify_intelligence.store_search_cache` ADD COLUMN IF NOT EXISTS source_crux_bucket STRING;
ALTER TABLE `shopify_intelligence.store_search_cache` ADD COLUMN IF NOT EXISTS source_backlink_score FLOAT64;
ALTER TABLE `shopify_intelligence.store_search_cache` ADD COLUMN IF NOT EXISTS source_openpagerank_score FLOAT64;
ALTER TABLE `shopify_intelligence.store_search_cache` ADD COLUMN IF NOT EXISTS source_pr_score FLOAT64;
ALTER TABLE `shopify_intelligence.store_search_cache` ADD COLUMN IF NOT EXISTS source_storefront_score FLOAT64;
ALTER TABLE `shopify_intelligence.store_search_cache` ADD COLUMN IF NOT EXISTS storefront_score FLOAT64;

-- Stable view for UI queries (points to the cache table).
CREATE OR REPLACE VIEW `shopify_intelligence.store_search_latest` AS
SELECT *
FROM `shopify_intelligence.store_search_cache`;

-- Refresh query (reference only — see scripts/refresh_search_cache.py for authoritative version)
-- Includes deep enrichment fields from store_snapshots.
-- NOTE: CREATE OR REPLACE TABLE cannot change clustering in BigQuery.
-- refresh_search_cache.py handles this by DROP + CREATE TABLE ... CLUSTER BY.
CREATE OR REPLACE TABLE `shopify_intelligence.store_search_cache` AS
WITH latest AS (
  SELECT
    store_id,
    domain,
    REGEXP_REPLACE(LOWER(domain), r'^www\\.', '') as normalized_domain,
    last_snapshot_date,
    current_http_status,
    app_count,
    pixel_count,
    product_count,
    price_min,
    price_max,
    price_avg,
    in_stock_products,
    out_of_stock_products,
    page_title,
    meta_description
  FROM `shopify_intelligence.store_latest`
),
deep AS (
  SELECT * FROM (
    SELECT
      domain,
      REGEXP_REPLACE(LOWER(domain), r'^www\\.', '') as normalized_domain,
      theme_name,
      is_shopify_plus,
      page_builder,
      announcement_bar_text,
      entry_offer_type,
      entry_offer_value,
      positioning_claim,
      free_shipping_threshold,
      offers_free_shipping,
      guarantee_type,
      bundle_count,
      has_subscription,
      subscription_type,
      landing_page_count,
      refund_window_days,
      store_currency,
      deep_enrichment,
      ROW_NUMBER() OVER (PARTITION BY domain ORDER BY snapshot_date DESC, created_at DESC) as rn
    FROM `shopify_intelligence.store_snapshots`
    WHERE deep_enrichment = TRUE AND http_status = 200
  )
  WHERE rn = 1
),
products AS (
  SELECT * FROM (
    SELECT domain,
      REGEXP_REPLACE(LOWER(domain), r'^www\\.', '') as normalized_domain,
      product_count, price_min, price_max, price_avg,
      in_stock_products, out_of_stock_products,
      ROW_NUMBER() OVER (
        PARTITION BY domain
        ORDER BY IF(product_count > 0, 0, 1), snapshot_date DESC, created_at DESC
      ) as rn
    FROM `shopify_intelligence.store_snapshots`
    WHERE http_status = 200 AND snapshot_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
  ) WHERE rn = 1
),
apps AS (
  SELECT
    store_id,
    ARRAY_AGG(DISTINCT entity_name ORDER BY entity_name LIMIT 30) as tools
  FROM `shopify_intelligence.detections`
  WHERE detection_type = 'app'
    AND snapshot_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
  GROUP BY store_id
),
pixels AS (
  SELECT
    store_id,
    ARRAY_AGG(DISTINCT entity_name ORDER BY entity_name LIMIT 20) as pixels
  FROM `shopify_intelligence.detections`
  WHERE detection_type = 'pixel'
    AND snapshot_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
  GROUP BY store_id
),
-- store_backlinks has actual backlink_count and referring_domains_count
-- (from Common Crawl edge analysis via analyze_backlinks.py)
backlinks AS (
  SELECT domain, backlink_count, referring_domains_count
  FROM `shopify_intelligence.store_backlinks`
),
ranking_signals AS (
  SELECT
    domain,
    composite_rank_score,
    ranking_model_version,
    ranking_signal_meta,
    source_tranco_rank,
    source_umbrella_rank,
    source_majestic_rank,
    source_cloudflare_rank,
    source_cloudflare_bucket,
    source_crux_bucket,
    source_backlink_score,
    source_openpagerank_score,
    source_pr_score,
    source_storefront_score,
    storefront_score
  FROM `shopify_intelligence.store_ranking_signals_latest`
)
SELECT
  l.store_id,
  l.domain,
  l.normalized_domain,
  l.page_title,
  l.meta_description,
  c.primary_category,
  c.secondary_category,
  c.confidence_score as category_confidence,
  -- Actual backlink/referring domain counts from store_backlinks
  COALESCE(bl.backlink_count, 0) as backlink_count,
  COALESCE(bl.referring_domains_count, 0) as referring_domains_count,
  -- Significance score from PageRank (store_authority)
  COALESCE(auth.pagerank * 1e9, 0) as significance_score,
  COALESCE(rs.composite_rank_score, 0) as composite_rank_score,
  rs.ranking_model_version,
  rs.ranking_signal_meta,
  rs.source_tranco_rank,
  rs.source_umbrella_rank,
  rs.source_majestic_rank,
  rs.source_cloudflare_rank,
  rs.source_cloudflare_bucket,
  rs.source_crux_bucket,
    rs.source_backlink_score,
    rs.source_openpagerank_score,
    rs.source_pr_score,
    rs.source_storefront_score,
    rs.storefront_score,
  auth.pr_rank,
  CASE
    WHEN auth.pr_rank <= 1000 THEN 'Top 0.001%'
    WHEN auth.pr_rank <= 10000 THEN 'Top 0.01%'
    WHEN auth.pr_rank <= 100000 THEN 'Top 0.1%'
    WHEN auth.pr_rank <= 1000000 THEN 'Top 1%'
    WHEN auth.pr_rank <= 10000000 THEN 'Top 10%'
    ELSE 'Standard'
  END as percentile_rank,
  l.last_snapshot_date,
  l.current_http_status,
  l.app_count,
  l.pixel_count,
  COALESCE(prod.product_count, l.product_count) as product_count,
  COALESCE(prod.price_min, l.price_min) as price_min,
  COALESCE(prod.price_max, l.price_max) as price_max,
  COALESCE(prod.price_avg, l.price_avg) as price_avg,
  COALESCE(prod.in_stock_products, l.in_stock_products) as in_stock_products,
  COALESCE(prod.out_of_stock_products, l.out_of_stock_products) as out_of_stock_products,
  a.tools,
  p.pixels,
  -- Deep enrichment fields
  d.theme_name,
  d.is_shopify_plus,
  d.page_builder,
  d.announcement_bar_text,
  d.entry_offer_type,
  d.entry_offer_value,
  d.positioning_claim,
  d.free_shipping_threshold,
  d.offers_free_shipping,
  d.guarantee_type,
  d.bundle_count,
  d.has_subscription,
  d.subscription_type,
  d.landing_page_count,
  d.refund_window_days,
  d.store_currency,
  d.deep_enrichment,
  CURRENT_TIMESTAMP() as updated_at
FROM latest l
LEFT JOIN `shopify_intelligence.store_authority_latest` auth
  ON l.normalized_domain = auth.domain
LEFT JOIN `shopify_intelligence.store_backlinks` bl
  ON l.normalized_domain = bl.domain
LEFT JOIN ranking_signals rs
  ON l.normalized_domain = rs.domain
LEFT JOIN `shopify_intelligence.store_categories_latest` c
  ON l.normalized_domain = REGEXP_REPLACE(LOWER(c.domain), r'^www\\.', '')
LEFT JOIN products prod
  ON l.normalized_domain = prod.normalized_domain
LEFT JOIN apps a
  ON l.store_id = a.store_id
LEFT JOIN pixels p
  ON l.store_id = p.store_id
LEFT JOIN deep d
  ON l.normalized_domain = d.normalized_domain;

-- ============================================================================
-- TOOL ANALYTICS VIEWS
-- ============================================================================

-- Daily tool usage (store count per tool — apps + pixels).
CREATE OR REPLACE VIEW `shopify_intelligence.tool_usage_daily` AS
SELECT
  entity_id as tool_id,
  entity_name as tool_name,
  entity_category as tool_category,
  snapshot_date,
  COUNT(DISTINCT domain) as store_count
FROM `shopify_intelligence.detections`
WHERE detection_type IN ('app', 'pixel')
GROUP BY entity_id, entity_name, entity_category, snapshot_date;

-- Tool change events derived from store_changes (app + pixel adds/removals).
CREATE OR REPLACE VIEW `shopify_intelligence.tool_change_events` AS
SELECT
  change_id,
  domain,
  change_date,
  -- Normalize pixel change types to match app convention for downstream views
  CASE change_type
    WHEN 'pixel_added' THEN 'app_added'
    WHEN 'pixel_removed' THEN 'app_removed'
    ELSE change_type
  END as change_type,
  entity_id as tool_id,
  entity_name as tool_name,
  previous_snapshot_date,
  current_snapshot_date,
  detected_at
FROM `shopify_intelligence.store_changes`
WHERE change_category = 'tech_stack'
  AND change_scope = 'product'
  AND change_type IN ('app_added', 'app_removed', 'pixel_added', 'pixel_removed', 'tool_added', 'tool_removed');

-- Daily wins/losses per tool.
CREATE OR REPLACE VIEW `shopify_intelligence.tool_wins_losses_daily` AS
SELECT
  tool_id,
  tool_name,
  change_date,
  COUNTIF(change_type = 'app_added') as wins,
  COUNTIF(change_type = 'app_removed') as losses,
  ARRAY_AGG(IF(change_type = 'app_added', domain, NULL) IGNORE NULLS LIMIT 50) as win_domains,
  ARRAY_AGG(IF(change_type = 'app_removed', domain, NULL) IGNORE NULLS LIMIT 50) as loss_domains
FROM `shopify_intelligence.tool_change_events`
GROUP BY tool_id, tool_name, change_date;

-- Tool switches: app removed then another app added within 14 days for same store.
CREATE OR REPLACE VIEW `shopify_intelligence.tool_switch_events` AS
WITH removals AS (
  SELECT domain, tool_id, tool_name, change_date
  FROM `shopify_intelligence.tool_change_events`
  WHERE change_type = 'app_removed'
),
additions AS (
  SELECT domain, tool_id, tool_name, change_date
  FROM `shopify_intelligence.tool_change_events`
  WHERE change_type = 'app_added'
)
SELECT
  r.domain,
  r.tool_id as from_tool_id,
  r.tool_name as from_tool_name,
  a.tool_id as to_tool_id,
  a.tool_name as to_tool_name,
  a.change_date as change_date,
  DATE_DIFF(a.change_date, r.change_date, DAY) as switch_lag_days
FROM removals r
JOIN additions a
  ON r.domain = a.domain
  AND a.change_date BETWEEN r.change_date AND DATE_ADD(r.change_date, INTERVAL 14 DAY);

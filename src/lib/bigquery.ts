import { BigQuery } from '@google-cloud/bigquery';

const bigquery = new BigQuery({
  projectId: 'shopifydb',
});

const DATASET = 'shopify_intelligence';

export interface Tool {
  tool_id: string;
  tool_name: string;
  category: string;
  store_count: number;
}

export interface Store {
  domain: string;
  page_title: string;
  meta_description?: string;
  product_count?: number;
  price_min?: number;
  price_max?: number;
  price_avg?: number;
  primary_category: string;
  secondary_category?: string;
  category_confidence?: number;
  composite_rank_score: number;
  ranking_model_version?: string | null;
  pr_rank_position: number;
  source_storefront_score?: number;
  referring_domains_count?: number;
  significance_score: number;
  pr_rank: number | null;
  percentile_rank?: string | null;
  tools: Array<{ app_name?: string; app_category?: string } | string>;
  // Deep enrichment fields
  theme_name?: string;
  is_shopify_plus?: boolean;
  page_builder?: string;
  announcement_bar_text?: string;
  entry_offer_type?: string;
  entry_offer_value?: string;
  positioning_claim?: string;
  free_shipping_threshold?: number;
  offers_free_shipping?: boolean;
  guarantee_type?: string;
  bundle_count?: number;
  has_subscription?: boolean;
  subscription_type?: string;
  landing_page_count?: number;
  refund_window_days?: number;
  store_currency?: string;
  deep_enrichment?: boolean;
  // Product intelligence
  in_stock_products?: number;
  out_of_stock_products?: number;
  sitemap_product_count?: number;
  sitemap_page_count?: number;
  // Social links
  instagram_url?: string;
  tiktok_url?: string;
  facebook_url?: string;
  twitter_url?: string;
  youtube_url?: string;
  pinterest_url?: string;
  linkedin_url?: string;
  // Sophistication breakdown
  acquisition_score?: number;
  retention_score?: number;
  optimization_score?: number;
  scale_score?: number;
}

export interface Alert {
  alert_id: string;
  email: string;
  domain: string;
  created_at: string;
  last_checked: string;
}

export interface QueueStatusRow {
  status: string;
  count: number;
}

export interface RecentHttpStats {
  total: number;
  ok_200: number;
  blocked: number;
  inactive: number;
  null_status: number;
}

export interface ErrorBreakdownRow {
  error_message: string;
  count: number;
}

export interface ThroughputRow {
  minute: string;
  total: number;
  ok_200: number;
  blocked: number;
}

export interface MonitorSnapshot {
  queue_status: QueueStatusRow[];
  recent_http: RecentHttpStats;
  error_breakdown: ErrorBreakdownRow[];
  throughput: ThroughputRow[];
  generated_at: string;
}

export interface PlatformStats {
  store_count: number;
  tool_count: number;
}

// Get all tools with store counts — uses tool_usage_daily serving view
export async function getTools(search?: string, category?: string): Promise<Tool[]> {
  let query = `
    WITH all_tools AS (
      SELECT entity_id as tool_id, entity_name as tool_name, entity_category as tool_category, snapshot_date, domain
      FROM \`shopifydb.${DATASET}.detections\`
      WHERE detection_type IN ('app', 'pixel')
    )
    SELECT
      tool_id,
      tool_name,
      tool_category as category,
      COUNT(DISTINCT domain) as store_count
    FROM all_tools
    WHERE snapshot_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
  `;

  const params: Record<string, string> = {};

  if (search) {
    query += ` AND LOWER(tool_name) LIKE LOWER(@search)`;
    params.search = `%${search}%`;
  }

  if (category) {
    query += ` AND tool_category = @category`;
    params.category = category;
  }

  query += ` GROUP BY tool_id, tool_name, category ORDER BY store_count DESC LIMIT 100`;

  const [rows] = await bigquery.query({ query, params });
  return rows as Tool[];
}

// Get top stores for a tool — uses store_search_cache for pre-joined data
export async function getStoresForTool(toolId: string, limit: number = 50): Promise<Store[]> {
  const query = `
    SELECT
      sc.domain,
      sc.page_title,
      COALESCE(sc.primary_category, 'Uncategorized') as primary_category,
      COALESCE(sc.composite_rank_score, 0) as composite_rank_score,
      sc.ranking_model_version,
      COALESCE(sc.pr_rank, 999999999) as pr_rank_position,
      COALESCE(sc.significance_score, 0) as significance_score,
      sc.pr_rank,
      ARRAY_CONCAT(COALESCE(sc.tools, []), COALESCE(sc.pixels, [])) as tools
    FROM \`shopifydb.${DATASET}.store_search_cache\` sc
    WHERE EXISTS (
      SELECT 1 FROM \`shopifydb.${DATASET}.detections\` d
      WHERE d.domain = sc.domain
        AND d.entity_id = @toolId
        AND d.snapshot_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
    )
    ORDER BY COALESCE(sc.composite_rank_score, 0) DESC, COALESCE(sc.pr_rank, 999999999) ASC NULLS LAST
    LIMIT @limit
  `;

  const [rows] = await bigquery.query({
    query,
    params: { toolId, limit }
  });
  return rows as Store[];
}

// Search stores — uses store_search_cache for pre-joined data
export async function searchStores(search: string, category?: string): Promise<Store[]> {
  let query = `
    SELECT
      domain,
      page_title,
      COALESCE(primary_category, 'Uncategorized') as primary_category,
      COALESCE(composite_rank_score, 0) as composite_rank_score,
      ranking_model_version,
      COALESCE(pr_rank, 999999999) as pr_rank_position,
      COALESCE(significance_score, 0) as significance_score,
      COALESCE(source_storefront_score, 0) as source_storefront_score,
      pr_rank,
      ARRAY_CONCAT(COALESCE(tools, []), COALESCE(pixels, [])) as tools
    FROM \`shopifydb.${DATASET}.store_search_cache\`
    WHERE (LOWER(domain) LIKE LOWER(@search) OR LOWER(page_title) LIKE LOWER(@search))
  `;

  const params: Record<string, string | number> = { search: `%${search}%` };

  if (category) {
    query += ` AND primary_category = @category`;
    params.category = category;
  }

  query += ` ORDER BY COALESCE(composite_rank_score, 0) DESC, COALESCE(pr_rank, 999999999) ASC NULLS LAST LIMIT 50`;

  const [rows] = await bigquery.query({ query, params });
  return rows as Store[];
}

// Get store details — uses store_search_cache for the main record
export async function getStoreDetails(domain: string): Promise<Store | null> {
  // Try both with and without www. prefix since DB may store either form
  const domainVariants = [domain];
  if (domain.startsWith('www.')) {
    domainVariants.push(domain.slice(4));
  } else {
    domainVariants.push('www.' + domain);
  }

  const storeQuery = `
    SELECT
      domain,
      page_title,
      meta_description,
      product_count,
      price_min,
      price_max,
      price_avg,
      COALESCE(primary_category, 'Uncategorized') as primary_category,
      secondary_category,
      category_confidence,
      COALESCE(composite_rank_score, 0) as composite_rank_score,
      ranking_model_version,
      COALESCE(pr_rank, 999999999) as pr_rank_position,
      COALESCE(backlink_count, 0) as referring_domains_count,
      COALESCE(significance_score, 0) as significance_score,
      COALESCE(source_storefront_score, 0) as source_storefront_score,
      pr_rank,
      percentile_rank,
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
      in_stock_products,
      out_of_stock_products,
      sitemap_product_count,
      sitemap_page_count,
      instagram_url, tiktok_url, facebook_url, twitter_url,
      youtube_url, pinterest_url, linkedin_url,
      COALESCE(acquisition_score, 0) as acquisition_score,
      COALESCE(retention_score, 0) as retention_score,
      COALESCE(optimization_score, 0) as optimization_score,
      COALESCE(scale_score, 0) as scale_score
    FROM \`shopifydb.${DATASET}.store_search_cache\`
    WHERE domain IN UNNEST(@domains)
    LIMIT 1
  `;

  const [storeRows] = await bigquery.query({ query: storeQuery, params: { domains: domainVariants } });
  if (!storeRows[0]) return null;

  const matchedDomain = (storeRows[0] as any).domain;

  // Get tools (apps + pixels combined)
  const toolsQuery = `
    SELECT tool_name, tool_category FROM (
      SELECT DISTINCT entity_name as tool_name, entity_category as tool_category
      FROM \`shopifydb.${DATASET}.detections\`
      WHERE domain = @domain
      AND entity_name IS NOT NULL
      AND detection_type IN ('app', 'pixel')
    )
    ORDER BY tool_category, tool_name
  `;

  const [toolRows] = await bigquery.query({ query: toolsQuery, params: { domain: matchedDomain } });

  const store = storeRows[0] as any;
  store.tools = toolRows.map((t: any) => ({
    app_name: t.tool_name,
    app_category: t.tool_category
  }));

  return store as Store;
}

// Create alert subscription
export async function createAlert(email: string, domain: string): Promise<string> {
  const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const query = `
    INSERT INTO \`shopifydb.${DATASET}.store_alerts\`
    (alert_id, email, domain, created_at, is_active)
    VALUES (@alertId, @email, @domain, CURRENT_TIMESTAMP(), TRUE)
  `;

  await bigquery.query({ query, params: { alertId, email, domain } });
  return alertId;
}

// Get alerts for email
export async function getAlerts(email: string): Promise<Alert[]> {
  const query = `
    SELECT alert_id, email, domain, created_at, last_checked
    FROM \`shopifydb.${DATASET}.store_alerts\`
    WHERE email = @email AND is_active = TRUE
    ORDER BY created_at DESC
  `;

  const [rows] = await bigquery.query({ query, params: { email } });
  return rows as Alert[];
}

// Delete alert
export async function deleteAlert(alertId: string): Promise<void> {
  const query = `
    UPDATE \`shopifydb.${DATASET}.store_alerts\`
    SET is_active = FALSE
    WHERE alert_id = @alertId
  `;

  await bigquery.query({ query, params: { alertId } });
}

// Get tool categories — uses tool_usage_daily serving view
export async function getToolCategories(): Promise<string[]> {
  const query = `
    SELECT DISTINCT tool_category as category
    FROM \`shopifydb.${DATASET}.tool_usage_daily\`
    WHERE snapshot_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
    ORDER BY category
  `;

  const [rows] = await bigquery.query({ query });
  return rows.map((r: { category: string }) => r.category);
}

// Get store categories — uses store_search_cache
export async function getStoreCategories(): Promise<string[]> {
  const query = `
    SELECT DISTINCT primary_category as category
    FROM \`shopifydb.${DATASET}.store_search_cache\`
    WHERE primary_category IS NOT NULL
    ORDER BY category
  `;

  const [rows] = await bigquery.query({ query });
  return rows.map((r: { category: string }) => r.category);
}

export async function getMonitoringSnapshot(): Promise<MonitorSnapshot> {
  const queueQuery = `
    SELECT status, COUNT(*) as count
    FROM \`shopifydb.${DATASET}.enrichment_queue\`
    WHERE DATE(scheduled_at) = CURRENT_DATE()
    GROUP BY status
    ORDER BY count DESC
  `;

  const recentHttpQuery = `
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN http_status = 200 THEN 1 ELSE 0 END) as ok_200,
      SUM(CASE WHEN http_status IN (403, 429, 503) THEN 1 ELSE 0 END) as blocked,
      SUM(CASE WHEN http_status IN (404, 410, 451) THEN 1 ELSE 0 END) as inactive,
      SUM(CASE WHEN http_status IS NULL THEN 1 ELSE 0 END) as null_status
    FROM \`shopifydb.${DATASET}.store_snapshots\`
    WHERE snapshot_date = CURRENT_DATE()
      AND enrichment_tier = 'http'
      AND created_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 60 MINUTE)
  `;

  const errorBreakdownQuery = `
    SELECT
      COALESCE(error_message, '(none)') as error_message,
      COUNT(*) as count
    FROM \`shopifydb.${DATASET}.store_snapshots\`
    WHERE snapshot_date = CURRENT_DATE()
      AND enrichment_tier = 'http'
      AND created_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 60 MINUTE)
    GROUP BY error_message
    ORDER BY count DESC
    LIMIT 8
  `;

  const throughputQuery = `
    SELECT
      FORMAT_TIMESTAMP('%H:%M', TIMESTAMP_TRUNC(created_at, MINUTE)) as minute,
      COUNT(*) as total,
      SUM(CASE WHEN http_status = 200 THEN 1 ELSE 0 END) as ok_200,
      SUM(CASE WHEN http_status IN (403, 429, 503) THEN 1 ELSE 0 END) as blocked
    FROM \`shopifydb.${DATASET}.store_snapshots\`
    WHERE snapshot_date = CURRENT_DATE()
      AND enrichment_tier = 'http'
      AND created_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 60 MINUTE)
    GROUP BY minute
    ORDER BY minute
  `;

  const [queueRows, recentHttpRows, errorRows, throughputRows] = await Promise.all([
    bigquery.query({ query: queueQuery }).then(([rows]) => rows as QueueStatusRow[]),
    bigquery.query({ query: recentHttpQuery }).then(([rows]) => rows as RecentHttpStats[]),
    bigquery.query({ query: errorBreakdownQuery }).then(([rows]) => rows as ErrorBreakdownRow[]),
    bigquery.query({ query: throughputQuery }).then(([rows]) => rows as ThroughputRow[]),
  ]);

  const recentHttp = recentHttpRows[0] || {
    total: 0,
    ok_200: 0,
    blocked: 0,
    inactive: 0,
    null_status: 0,
  };

  return {
    queue_status: queueRows,
    recent_http: recentHttp,
    error_breakdown: errorRows,
    throughput: throughputRows,
    generated_at: new Date().toISOString(),
  };
}

// Tool analytics — uses serving layer views
export async function getToolUsageTimeline(toolId: string) {
  const query = `
    WITH all_detections AS (
      SELECT entity_id as tool_id, snapshot_date, domain FROM \`shopifydb.${DATASET}.detections\`
      WHERE detection_type IN ('app', 'pixel')
    )
    SELECT
      FORMAT_DATE('%b %y', snapshot_date) as date,
      COUNT(DISTINCT domain) as count
    FROM all_detections
    WHERE tool_id = @toolId
    GROUP BY date, snapshot_date
    ORDER BY snapshot_date
    LIMIT 90
  `;

  const [rows] = await bigquery.query({ query, params: { toolId } });
  return rows as Array<{ date: string; count: number }>;
}

export async function getToolWinsLosses(toolId: string) {
  try {
    const query = `
      SELECT
        change_date,
        wins,
        losses,
        win_domains,
        loss_domains
      FROM \`shopifydb.${DATASET}.tool_wins_losses_daily\`
      WHERE tool_id = @toolId
      ORDER BY change_date DESC
      LIMIT 30
    `;

    const [rows] = await bigquery.query({ query, params: { toolId } });
    return rows as Array<{
      change_date: string;
      wins: number;
      losses: number;
      win_domains: string[];
      loss_domains: string[];
    }>;
  } catch {
    // View may not exist yet — return empty
    return [];
  }
}

export async function getToolSwitchEvents(toolId: string) {
  try {
    const query = `
      SELECT
        domain,
        from_tool_name as from_tool,
        to_tool_name as to_tool,
        FORMAT_DATE('%b %d, %Y', change_date) as change_date
      FROM \`shopifydb.${DATASET}.tool_switch_events\`
      WHERE from_tool_id = @toolId OR to_tool_id = @toolId
      ORDER BY change_date DESC
      LIMIT 20
    `;

    const [rows] = await bigquery.query({ query, params: { toolId } });
    return rows as Array<{
      domain: string;
      from_tool: string;
      to_tool: string;
      change_date: string;
    }>;
  } catch {
    // View may not exist yet — return empty
    return [];
  }
}

// Leaderboard — top stores by significance_score
export async function getLeaderboard(
  tab: 'authority' | 'category' | 'tools' = 'authority',
  category?: string,
  limit: number = 50
): Promise<Store[]> {
  let query = `
    WITH ranked AS (
      SELECT
        domain,
        page_title,
        COALESCE(primary_category, 'Uncategorized') as primary_category,
        COALESCE(composite_rank_score, 0) as composite_rank_score,
        ranking_model_version,
        COALESCE(source_storefront_score, 0) as source_storefront_score,
        COALESCE(pr_rank, 999999999) as pr_rank_position,
        COALESCE(significance_score, 0) as significance_score,
        pr_rank,
        percentile_rank,
        COALESCE(backlink_count, 0) as referring_domains_count,
        ARRAY_CONCAT(COALESCE(tools, []), COALESCE(pixels, [])) as tools,
        ROW_NUMBER() OVER (
          PARTITION BY normalized_domain
          ORDER BY COALESCE(composite_rank_score, 0) DESC, COALESCE(pr_rank, 999999999) ASC
        ) as dedupe_rank
      FROM \`shopifydb.${DATASET}.store_search_cache\`
      WHERE significance_score > 0
    )
    SELECT
      domain,
      page_title,
      primary_category,
      composite_rank_score,
      ranking_model_version,
      source_storefront_score,
      pr_rank_position,
      significance_score,
      pr_rank,
      percentile_rank,
      referring_domains_count,
      tools
    FROM ranked
  `;

  const params: Record<string, string | number> = { limit };
  const whereClauses: string[] = ['dedupe_rank = 1'];

  if (category) {
    whereClauses.push(`primary_category = @category`);
    params.category = category;
  }

  query += ` WHERE ${whereClauses.join(' AND ')}`;

  if (tab === 'tools') {
    query += ` ORDER BY ARRAY_LENGTH(tools) DESC, COALESCE(composite_rank_score, 0) DESC, COALESCE(pr_rank, 999999999) ASC`;
  } else {
    query += ` ORDER BY COALESCE(composite_rank_score, 0) DESC, COALESCE(pr_rank, 999999999) ASC`;
  }

  query += ` LIMIT @limit`;

  const [rows] = await bigquery.query({ query, params });
  return rows as Store[];
}

// Stack builder — find stores that use ALL specified tools
export async function getStoresByStack(toolIds: string[], limit: number = 50): Promise<Store[]> {
  if (toolIds.length === 0) return [];

  const toolPlaceholders = toolIds.map((_, i) => `@tool${i}`).join(', ');
  const params: Record<string, string | number> = { limit, toolCount: toolIds.length };
  toolIds.forEach((id, i) => { params[`tool${i}`] = id; });

  const query = `
    WITH all_detections AS (
      SELECT domain, entity_id as tool_id, snapshot_date FROM \`shopifydb.${DATASET}.detections\`
      WHERE detection_type IN ('app', 'pixel')
    ),
    matching_stores AS (
      SELECT domain, COUNT(DISTINCT tool_id) as matched_tools
      FROM all_detections
      WHERE tool_id IN (${toolPlaceholders})
        AND snapshot_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
      GROUP BY domain
      HAVING matched_tools = @toolCount
    )
    SELECT
      sc.domain,
      sc.page_title,
      COALESCE(sc.primary_category, 'Uncategorized') as primary_category,
      COALESCE(sc.composite_rank_score, 0) as composite_rank_score,
      sc.ranking_model_version,
      COALESCE(sc.source_storefront_score, 0) as source_storefront_score,
      COALESCE(sc.pr_rank, 999999999) as pr_rank_position,
      COALESCE(sc.significance_score, 0) as significance_score,
      sc.pr_rank,
      sc.percentile_rank,
      ARRAY_CONCAT(COALESCE(sc.tools, []), COALESCE(sc.pixels, [])) as tools
    FROM matching_stores ms
    JOIN \`shopifydb.${DATASET}.store_search_cache\` sc ON sc.domain = ms.domain
    ORDER BY COALESCE(sc.composite_rank_score, 0) DESC, COALESCE(sc.pr_rank, 999999999) ASC
    LIMIT @limit
  `;

  const [rows] = await bigquery.query({ query, params });
  return rows as Store[];
}

// Compare stores — get details for multiple domains
export async function getStoresForComparison(domains: string[]): Promise<Store[]> {
  if (domains.length === 0) return [];

  const results = await Promise.all(domains.map(d => getStoreDetails(d)));
  return results.filter(Boolean) as Store[];
}

// Tool co-occurrence — tools frequently seen alongside a given tool
export interface CooccurrenceTool {
  tool_id: string;
  tool_name: string;
  tool_category: string;
  co_count: number;
}

export async function getToolCooccurrence(toolId: string, limit: number = 15): Promise<CooccurrenceTool[]> {
  const query = `
    WITH all_detections AS (
      SELECT domain, entity_id as tool_id, entity_name as tool_name, entity_category as tool_category, snapshot_date
      FROM \`shopifydb.${DATASET}.detections\`
      WHERE detection_type IN ('app', 'pixel')
    ),
    stores_with_tool AS (
      SELECT DISTINCT domain
      FROM all_detections
      WHERE tool_id = @toolId
        AND snapshot_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
    )
    SELECT
      a.tool_id,
      a.tool_name,
      COALESCE(a.tool_category, 'Other') as tool_category,
      COUNT(DISTINCT a.domain) as co_count
    FROM all_detections a
    JOIN stores_with_tool s ON a.domain = s.domain
    WHERE a.tool_id != @toolId
      AND a.snapshot_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
    GROUP BY a.tool_id, a.tool_name, a.tool_category
    ORDER BY co_count DESC
    LIMIT @limit
  `;

  const [rows] = await bigquery.query({ query, params: { toolId, limit } });
  return rows as CooccurrenceTool[];
}

// Similar stores — reads from pre-computed store_similarity table
export interface SimilarStore {
  domain: string;
  similar_domain: string;
  similarity_score: number;
  embedding_similarity: number;
  tech_overlap: number;
  category_match: boolean;
  shared_tools: string[];
  shared_tool_count: number;
  page_title?: string;
  primary_category?: string;
  significance_score?: number;
  percentile_rank?: string | null;
}

export async function getSimilarStores(domain: string, limit: number = 10): Promise<SimilarStore[]> {
  const query = `
    SELECT
      ss.domain,
      ss.similar_domain,
      ss.similarity_score,
      ss.embedding_similarity,
      ss.tech_overlap,
      ss.category_match,
      ss.shared_tools,
      ss.shared_tool_count,
      sc.page_title,
      COALESCE(sc.primary_category, 'Uncategorized') as primary_category,
      COALESCE(sc.significance_score, 0) as significance_score,
      sc.percentile_rank
    FROM \`shopifydb.${DATASET}.store_similarity\` ss
    LEFT JOIN \`shopifydb.${DATASET}.store_search_cache\` sc
      ON ss.similar_domain = sc.domain
    WHERE ss.domain = @domain
    ORDER BY ss.similarity_score DESC
    LIMIT @limit
  `;

  const [rows] = await bigquery.query({ query, params: { domain, limit } });
  return rows as SimilarStore[];
}

// Platform stats for homepage
export async function getPlatformStats(): Promise<PlatformStats> {
  const query = `
    SELECT
      (SELECT COUNT(DISTINCT domain) FROM \`shopifydb.${DATASET}.store_search_cache\`) as store_count,
      (SELECT COUNT(DISTINCT tool_id) FROM \`shopifydb.${DATASET}.tool_usage_daily\`
       WHERE snapshot_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)) as tool_count
  `;

  const [rows] = await bigquery.query({ query });
  const row = rows[0] as any;
  return {
    store_count: Number(row?.store_count ?? 0),
    tool_count: Number(row?.tool_count ?? 0),
  };
}

// Explore scatter — top stores for the "Every Store at Once" visualization
export interface ExploreStore {
  domain: string;
  primary_category: string;
  significance_score: number;
  product_count: number;
  price_avg: number;
  tool_count: number;
}

export async function getExploreStores(limit: number = 8000): Promise<ExploreStore[]> {
  const query = `
    SELECT
      domain,
      COALESCE(primary_category, 'Uncategorized') as primary_category,
      COALESCE(significance_score, 0) as significance_score,
      COALESCE(product_count, 0) as product_count,
      COALESCE(price_avg, 0) as price_avg,
      ARRAY_LENGTH(ARRAY_CONCAT(COALESCE(tools, []), COALESCE(pixels, []))) as tool_count
    FROM \`shopifydb.${DATASET}.store_search_cache\`
    WHERE significance_score > 0
    ORDER BY significance_score DESC
    LIMIT @limit
  `;

  const [rows] = await bigquery.query({ query, params: { limit } });
  return rows as ExploreStore[];
}

export interface EnrichmentDailyRow {
  snapshot_date: string;
  deep_count: number;
  basic_count: number;
  total_count: number;
  success_count: number;
  failed_count: number;
}

export interface EnrichmentFeatureCoverage {
  total_deep: number;
  has_theme: number;
  shopify_plus: number;
  has_announcement: number;
  has_guarantee: number;
  has_entry_offer: number;
  has_positioning: number;
  has_landing_pages: number;
  has_bundles: number;
  has_subscriptions: number;
  has_page_builder: number;
}

export interface EnrichmentThroughputRow {
  hour: string;
  deep: number;
  basic: number;
  total: number;
}

export interface EnrichmentStatus {
  daily: EnrichmentDailyRow[];
  feature_coverage: EnrichmentFeatureCoverage;
  total_active: number;
  throughput: EnrichmentThroughputRow[];
  generated_at: string;
}

export async function getEnrichmentStatus(): Promise<EnrichmentStatus> {
  const dailyQuery = `
    SELECT
      CAST(snapshot_date AS STRING) as snapshot_date,
      COUNTIF(deep_enrichment = TRUE) as deep_count,
      COUNTIF(deep_enrichment IS NULL OR deep_enrichment = FALSE) as basic_count,
      COUNT(*) as total_count,
      COUNTIF(http_status = 200) as success_count,
      COUNTIF(http_status != 200 OR http_status IS NULL) as failed_count
    FROM \`shopifydb.${DATASET}.store_snapshots\`
    WHERE snapshot_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
    GROUP BY snapshot_date
    ORDER BY snapshot_date DESC
  `;

  const featureCoverageQuery = `
    SELECT
      COUNTIF(deep_enrichment = TRUE) as total_deep,
      COUNTIF(theme_name IS NOT NULL) as has_theme,
      COUNTIF(is_shopify_plus = TRUE) as shopify_plus,
      COUNTIF(announcement_bar_text IS NOT NULL) as has_announcement,
      COUNTIF(guarantee_type IS NOT NULL) as has_guarantee,
      COUNTIF(entry_offer_type IS NOT NULL) as has_entry_offer,
      COUNTIF(positioning_claim IS NOT NULL) as has_positioning,
      COUNTIF(landing_page_count > 0) as has_landing_pages,
      COUNTIF(has_bundle_products = TRUE) as has_bundles,
      COUNTIF(subscription_type IS NOT NULL) as has_subscriptions,
      COUNTIF(page_builder IS NOT NULL) as has_page_builder
    FROM \`shopifydb.${DATASET}.store_snapshots\`
    WHERE snapshot_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
      AND deep_enrichment = TRUE AND http_status = 200
  `;

  const totalActiveQuery = `
    SELECT COUNT(*) as total_active
    FROM \`shopifydb.${DATASET}.stores\`
    WHERE is_active = TRUE
  `;

  const throughputQuery = `
    SELECT
      FORMAT_TIMESTAMP('%m/%d %H:00', TIMESTAMP_TRUNC(created_at, HOUR)) as hour,
      COUNTIF(deep_enrichment = TRUE) as deep,
      COUNTIF(deep_enrichment IS NULL OR deep_enrichment = FALSE) as basic,
      COUNT(*) as total
    FROM \`shopifydb.${DATASET}.store_snapshots\`
    WHERE snapshot_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
      AND created_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
    GROUP BY hour
    ORDER BY hour
  `;

  const [dailyRows, featureRows, activeRows, throughputRows] = await Promise.all([
    bigquery.query({ query: dailyQuery }).then(([rows]) => rows as EnrichmentDailyRow[]),
    bigquery.query({ query: featureCoverageQuery }).then(([rows]) => rows as EnrichmentFeatureCoverage[]),
    bigquery.query({ query: totalActiveQuery }).then(([rows]) => rows as Array<{ total_active: number }>),
    bigquery.query({ query: throughputQuery }).then(([rows]) => rows as EnrichmentThroughputRow[]),
  ]);

  const featureCoverage = featureRows[0] || {
    total_deep: 0, has_theme: 0, shopify_plus: 0, has_announcement: 0,
    has_guarantee: 0, has_entry_offer: 0, has_positioning: 0,
    has_landing_pages: 0, has_bundles: 0, has_subscriptions: 0, has_page_builder: 0,
  };

  return {
    daily: dailyRows,
    feature_coverage: featureCoverage,
    total_active: Number(activeRows[0]?.total_active ?? 0),
    throughput: throughputRows,
    generated_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Dashboard: Activity Feed
// ---------------------------------------------------------------------------
export interface ActivityFeedItem {
  change_id: string;
  domain: string;
  change_date: string;
  change_type: string;
  change_category: string;
  change_description: string;
  old_value: string | null;
  new_value: string | null;
  severity: string;
}

export async function getActivityFeed(limit: number = 20): Promise<ActivityFeedItem[]> {
  const query = `
    SELECT
      change_id,
      domain,
      CAST(change_date AS STRING) as change_date,
      change_type,
      COALESCE(change_category, 'other') as change_category,
      COALESCE(change_description, '') as change_description,
      old_value,
      new_value,
      COALESCE(severity, 'low') as severity
    FROM \`shopifydb.${DATASET}.store_changes\`
    WHERE change_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
    ORDER BY change_date DESC
    LIMIT @limit
  `;

  const [rows] = await bigquery.query({ query, params: { limit } });
  return rows as ActivityFeedItem[];
}

// ---------------------------------------------------------------------------
// Dashboard: Trending Tools
// ---------------------------------------------------------------------------
export interface TrendingTool {
  tool_id: string;
  tool_name: string;
  tool_category: string;
  current_count: number;
  prior_count: number;
  growth_rate: number;
  net_wins: number;
}

export async function getTrendingTools(days: number = 7): Promise<{ rising: TrendingTool[]; declining: TrendingTool[] }> {
  const query = `
    WITH current_period AS (
      SELECT tool_id, tool_name, tool_category, SUM(store_count) as current_count
      FROM \`shopifydb.${DATASET}.tool_usage_daily\`
      WHERE snapshot_date >= DATE_SUB(CURRENT_DATE(), INTERVAL @days DAY)
      GROUP BY tool_id, tool_name, tool_category
    ),
    prior_period AS (
      SELECT tool_id, SUM(store_count) as prior_count
      FROM \`shopifydb.${DATASET}.tool_usage_daily\`
      WHERE snapshot_date >= DATE_SUB(CURRENT_DATE(), INTERVAL @double_days DAY)
        AND snapshot_date < DATE_SUB(CURRENT_DATE(), INTERVAL @days DAY)
      GROUP BY tool_id
    )
    SELECT
      c.tool_id, c.tool_name, c.tool_category,
      c.current_count,
      COALESCE(p.prior_count, 0) as prior_count,
      SAFE_DIVIDE(c.current_count - COALESCE(p.prior_count, 0), GREATEST(p.prior_count, 1)) as growth_rate,
      0 as net_wins
    FROM current_period c
    LEFT JOIN prior_period p ON c.tool_id = p.tool_id
    WHERE c.current_count > 10
    ORDER BY growth_rate DESC
  `;

  const [rows] = await bigquery.query({
    query,
    params: { days, double_days: days * 2 },
  });

  const all = rows as TrendingTool[];
  return {
    rising: all.filter(t => t.growth_rate > 0).slice(0, 5),
    declining: all.filter(t => t.growth_rate < 0).sort((a, b) => a.growth_rate - b.growth_rate).slice(0, 5),
  };
}

// ---------------------------------------------------------------------------
// Dashboard: Category Spotlight
// ---------------------------------------------------------------------------
export interface CategorySpotlight {
  primary_category: string;
  store_count: number;
  avg_authority: number;
  avg_price: number;
  top_tools: string[];
}

export async function getCategorySpotlight(): Promise<CategorySpotlight[]> {
  const query = `
    WITH cat_stats AS (
      SELECT
        primary_category,
        COUNT(*) as store_count,
        AVG(significance_score) as avg_authority,
        AVG(price_avg) as avg_price
      FROM \`shopifydb.${DATASET}.store_search_cache\`
      WHERE primary_category IS NOT NULL
      GROUP BY primary_category
      HAVING store_count >= 10
    ),
    cat_tools AS (
      SELECT
        sc.primary_category,
        tool,
        COUNT(*) as cnt
      FROM \`shopifydb.${DATASET}.store_search_cache\` sc,
        UNNEST(ARRAY_CONCAT(COALESCE(sc.tools, []), COALESCE(sc.pixels, []))) as tool
      WHERE sc.primary_category IS NOT NULL
      GROUP BY sc.primary_category, tool
    ),
    ranked_tools AS (
      SELECT primary_category, tool, cnt,
        ROW_NUMBER() OVER (PARTITION BY primary_category ORDER BY cnt DESC) as rn
      FROM cat_tools
    )
    SELECT
      cs.primary_category,
      cs.store_count,
      ROUND(cs.avg_authority, 2) as avg_authority,
      ROUND(cs.avg_price, 2) as avg_price,
      ARRAY_AGG(rt.tool IGNORE NULLS ORDER BY rt.rn LIMIT 3) as top_tools
    FROM cat_stats cs
    LEFT JOIN ranked_tools rt ON cs.primary_category = rt.primary_category AND rt.rn <= 3
    GROUP BY cs.primary_category, cs.store_count, cs.avg_authority, cs.avg_price
    ORDER BY cs.store_count DESC
    LIMIT 20
  `;

  const [rows] = await bigquery.query({ query });
  return rows as CategorySpotlight[];
}

// ---------------------------------------------------------------------------
// Dashboard: Watchlist Summary
// ---------------------------------------------------------------------------
export interface WatchlistAlert {
  domain: string;
  recent_changes_count: number;
  latest_change: string | null;
}

export async function getWatchlistSummary(email: string): Promise<WatchlistAlert[]> {
  const alerts = await getAlerts(email);
  if (alerts.length === 0) return [];

  const domains = alerts.map(a => a.domain);

  const query = `
    SELECT
      domain,
      COUNT(*) as recent_changes_count,
      MAX(CAST(change_date AS STRING)) as latest_change
    FROM \`shopifydb.${DATASET}.store_changes\`
    WHERE domain IN UNNEST(@domains)
      AND change_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
    GROUP BY domain
  `;

  const [rows] = await bigquery.query({ query, params: { domains } });
  return rows as WatchlistAlert[];
}

// ---------------------------------------------------------------------------
// Category Benchmark
// ---------------------------------------------------------------------------
export interface CategoryBenchmarkData {
  overview: {
    store_count: number;
    avg_authority: number;
    avg_price: number;
    avg_products: number;
    shopify_plus_count: number;
    free_shipping_pct: number;
    avg_free_shipping_threshold: number;
  };
  top_stores: Store[];
  tool_adoption: Array<{
    tool_name: string;
    category_rate: number;
    market_rate: number;
  }>;
  typical_stack: Array<{
    tool_a: string;
    tool_b: string;
    pair_count: number;
  }>;
}

export async function getCategoryBenchmark(category: string): Promise<CategoryBenchmarkData> {
  const overviewQuery = `
    SELECT
      COUNT(*) as store_count,
      ROUND(AVG(significance_score), 2) as avg_authority,
      ROUND(AVG(price_avg), 2) as avg_price,
      ROUND(AVG(product_count), 0) as avg_products,
      COUNTIF(is_shopify_plus = TRUE) as shopify_plus_count,
      ROUND(SAFE_DIVIDE(COUNTIF(offers_free_shipping = TRUE), COUNT(*)) * 100, 1) as free_shipping_pct,
      ROUND(AVG(IF(free_shipping_threshold > 0, free_shipping_threshold, NULL)), 2) as avg_free_shipping_threshold
    FROM \`shopifydb.${DATASET}.store_search_cache\`
    WHERE primary_category = @category
  `;

  const topStoresQuery = `
    SELECT
      domain, page_title,
      COALESCE(primary_category, 'Uncategorized') as primary_category,
      COALESCE(pr_rank, 999999999) as pr_rank_position,
      COALESCE(significance_score, 0) as significance_score,
      pr_rank, percentile_rank,
      ARRAY_CONCAT(COALESCE(tools, []), COALESCE(pixels, [])) as tools
    FROM \`shopifydb.${DATASET}.store_search_cache\`
    WHERE primary_category = @category AND significance_score > 0
    ORDER BY significance_score DESC
    LIMIT 20
  `;

  const toolAdoptionQuery = `
    WITH cat_stores AS (
      SELECT domain FROM \`shopifydb.${DATASET}.store_search_cache\` WHERE primary_category = @category
    ),
    cat_total AS (SELECT COUNT(*) as n FROM cat_stores),
    market_total AS (SELECT COUNT(*) as n FROM \`shopifydb.${DATASET}.store_search_cache\`),
    all_tools AS (
      SELECT domain, entity_name as tool_name FROM \`shopifydb.${DATASET}.detections\`
      WHERE snapshot_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
        AND detection_type IN ('app', 'pixel')
    ),
    cat_adoption AS (
      SELECT t.tool_name, COUNT(DISTINCT t.domain) as cat_count
      FROM all_tools t JOIN cat_stores cs ON t.domain = cs.domain
      GROUP BY t.tool_name
    ),
    market_adoption AS (
      SELECT tool_name, COUNT(DISTINCT domain) as market_count
      FROM all_tools GROUP BY tool_name
    )
    SELECT
      ca.tool_name,
      ROUND(SAFE_DIVIDE(ca.cat_count, ct.n) * 100, 1) as category_rate,
      ROUND(SAFE_DIVIDE(ma.market_count, mt.n) * 100, 1) as market_rate
    FROM cat_adoption ca
    CROSS JOIN cat_total ct
    JOIN market_adoption ma ON ca.tool_name = ma.tool_name
    CROSS JOIN market_total mt
    WHERE ca.cat_count >= 3
    ORDER BY ca.cat_count DESC
    LIMIT 20
  `;

  const typicalStackQuery = `
    WITH cat_tools AS (
      SELECT sc.domain, tool
      FROM \`shopifydb.${DATASET}.store_search_cache\` sc,
        UNNEST(ARRAY_CONCAT(COALESCE(sc.tools, []), COALESCE(sc.pixels, []))) as tool
      WHERE sc.primary_category = @category
    )
    SELECT a.tool as tool_a, b.tool as tool_b, COUNT(DISTINCT a.domain) as pair_count
    FROM cat_tools a JOIN cat_tools b ON a.domain = b.domain AND a.tool < b.tool
    GROUP BY tool_a, tool_b
    HAVING pair_count >= 5
    ORDER BY pair_count DESC
    LIMIT 15
  `;

  const params = { category };

  const [overviewRows, topStoreRows, adoptionRows, stackRows] = await Promise.all([
    bigquery.query({ query: overviewQuery, params }).then(([r]) => r),
    bigquery.query({ query: topStoresQuery, params }).then(([r]) => r as Store[]),
    bigquery.query({ query: toolAdoptionQuery, params }).then(([r]) => r),
    bigquery.query({ query: typicalStackQuery, params }).then(([r]) => r),
  ]);

  const ov = overviewRows[0] as any || {};

  return {
    overview: {
      store_count: Number(ov.store_count ?? 0),
      avg_authority: Number(ov.avg_authority ?? 0),
      avg_price: Number(ov.avg_price ?? 0),
      avg_products: Number(ov.avg_products ?? 0),
      shopify_plus_count: Number(ov.shopify_plus_count ?? 0),
      free_shipping_pct: Number(ov.free_shipping_pct ?? 0),
      avg_free_shipping_threshold: Number(ov.avg_free_shipping_threshold ?? 0),
    },
    top_stores: topStoreRows,
    tool_adoption: adoptionRows as CategoryBenchmarkData['tool_adoption'],
    typical_stack: stackRows as CategoryBenchmarkData['typical_stack'],
  };
}

// ---------------------------------------------------------------------------
// Store Screenshots
// ---------------------------------------------------------------------------
export interface StoreScreenshot {
  desktop_url?: string;
  mobile_url?: string;
}

export async function getStoreScreenshots(domain: string): Promise<StoreScreenshot> {
  const query = `
    SELECT gcs_path, width
    FROM \`shopifydb.${DATASET}.store_screenshots\`
    WHERE domain = @domain
    ORDER BY created_at DESC
    LIMIT 2
  `;

  const [rows] = await bigquery.query({ query, params: { domain } });

  const result: StoreScreenshot = {};
  for (const row of rows as Array<{ gcs_path: string; width: number }>) {
    const publicUrl = row.gcs_path
      .replace('gs://shopify-intelligence-assets/', 'https://storage.googleapis.com/shopify-intelligence-assets/');
    if (row.width >= 1200) {
      result.desktop_url = publicUrl;
    } else {
      result.mobile_url = publicUrl;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Store Category Benchmarks (store vs category average)
// ---------------------------------------------------------------------------
export interface StoreBenchmark {
  avg_free_shipping_threshold: number;
  avg_product_count: number;
  avg_price: number;
  pct_subscription: number;
  pct_bundles: number;
  pct_plus: number;
  avg_tool_count: number;
}

export async function getStoreBenchmarks(category: string): Promise<StoreBenchmark> {
  const query = `
    SELECT
      ROUND(AVG(IF(free_shipping_threshold > 0, free_shipping_threshold, NULL)), 2) as avg_free_shipping_threshold,
      ROUND(AVG(product_count), 0) as avg_product_count,
      ROUND(AVG(price_avg), 2) as avg_price,
      ROUND(SAFE_DIVIDE(COUNTIF(has_subscription = TRUE), COUNT(*)) * 100, 1) as pct_subscription,
      ROUND(SAFE_DIVIDE(COUNTIF(bundle_count > 0), COUNT(*)) * 100, 1) as pct_bundles,
      ROUND(SAFE_DIVIDE(COUNTIF(is_shopify_plus = TRUE), COUNT(*)) * 100, 1) as pct_plus,
      ROUND(AVG(ARRAY_LENGTH(ARRAY_CONCAT(COALESCE(tools, []), COALESCE(pixels, [])))), 1) as avg_tool_count
    FROM \`shopifydb.${DATASET}.store_search_cache\`
    WHERE primary_category = @category
  `;

  const [rows] = await bigquery.query({ query, params: { category } });
  const r = rows[0] as any || {};
  return {
    avg_free_shipping_threshold: Number(r.avg_free_shipping_threshold ?? 0),
    avg_product_count: Number(r.avg_product_count ?? 0),
    avg_price: Number(r.avg_price ?? 0),
    pct_subscription: Number(r.pct_subscription ?? 0),
    pct_bundles: Number(r.pct_bundles ?? 0),
    pct_plus: Number(r.pct_plus ?? 0),
    avg_tool_count: Number(r.avg_tool_count ?? 0),
  };
}

// ---------------------------------------------------------------------------
// Tool Trend Sparklines
// ---------------------------------------------------------------------------
export interface ToolTrend {
  tool_id: string;
  sparkline: number[];
  direction: 'up' | 'down' | 'flat';
}

export async function getToolTrends(): Promise<ToolTrend[]> {
  const query = `
    SELECT
      tool_id,
      ARRAY_AGG(store_count ORDER BY snapshot_date) as sparkline
    FROM \`shopifydb.${DATASET}.tool_usage_daily\`
    WHERE snapshot_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
    GROUP BY tool_id
    HAVING ARRAY_LENGTH(sparkline) >= 5
  `;

  const [rows] = await bigquery.query({ query });
  return (rows as Array<{ tool_id: string; sparkline: number[] }>).map(r => {
    const s = r.sparkline;
    const recent = s.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const older = s.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
    const direction = recent > older * 1.05 ? 'up' : recent < older * 0.95 ? 'down' : 'flat';
    return { tool_id: r.tool_id, sparkline: s, direction };
  });
}

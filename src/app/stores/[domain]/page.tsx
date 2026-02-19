'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { SkeletonCard, DataCollecting } from '@/components/Skeleton';
import { PriceRangeBar } from '@/components/PriceRangeBar';
import { StockRatio } from '@/components/StockRatio';
import { StoreScreenshots } from '@/components/StoreScreenshots';
import { SocialLinksRow } from '@/components/SocialLinksRow';
import { SophisticationRadar } from '@/components/SophisticationRadar';
import { CategoryBenchmarks } from '@/components/CategoryBenchmarks';

interface Store {
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
  pr_rank_position: number;
  referring_domains_count?: number;
  significance_score: number;
  percentile_rank?: string | null;
  tools: any[];
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
  // Sophistication
  acquisition_score?: number;
  retention_score?: number;
  optimization_score?: number;
  scale_score?: number;
}

interface StoreChange {
  change_id: string;
  change_date: string;
  change_type: string;
  change_category: string;
  change_description: string;
  old_value: string | null;
  new_value: string | null;
  severity: string;
  source_table: string;
}

interface SimilarStore {
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

function getRankBadge(rank: string | null | undefined) {
  if (!rank) return { label: 'Unranked', className: 'badge-low' };
  if (rank.includes('0.001') || rank.includes('0.01')) return { label: rank, className: 'badge-elite' };
  if (rank.includes('0.1') || rank.includes('Top 1%')) return { label: rank, className: 'badge-high' };
  if (rank.includes('Top 10%')) return { label: rank, className: 'badge-good' };
  return { label: rank, className: 'badge-mid' };
}

function SimilarityBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 70
    ? 'from-[var(--success)] to-[var(--cyan)]'
    : pct >= 40
      ? 'from-[var(--accent)] to-[var(--purple)]'
      : 'from-[var(--warning)] to-[var(--danger)]';

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-medium text-[var(--muted)] tabular-nums w-8 text-right">
        {pct}%
      </span>
    </div>
  );
}

function SimilarStoreCard({ item }: { item: SimilarStore }) {
  return (
    <Link
      href={`/stores/${encodeURIComponent(item.similar_domain)}`}
      className="surface-card p-4 min-w-[260px] flex-shrink-0 group transition-all hover:border-[var(--accent)] hover:shadow-[var(--shadow-glow)]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-[var(--ink-strong)] truncate group-hover:text-[var(--accent-strong)] transition-colors">
            {item.similar_domain}
          </h4>
          {item.page_title && (
            <p className="text-xs text-[var(--muted)] truncate mt-0.5">{item.page_title}</p>
          )}
        </div>
        {item.category_match && (
          <span className="pill-success text-[9px] flex-shrink-0">Same cat</span>
        )}
      </div>

      <div className="mt-3">
        <SimilarityBar score={item.similarity_score} />
      </div>

      <div className="mt-3 flex items-center gap-3">
        {item.primary_category && (
          <span className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
            {item.primary_category}
          </span>
        )}
        {item.shared_tool_count > 0 && (
          <span className="text-[10px] text-[var(--accent-strong)]">
            {item.shared_tool_count} shared tool{item.shared_tool_count !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {item.shared_tools && item.shared_tools.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {item.shared_tools.slice(0, 4).map((tool) => (
            <span
              key={tool}
              className="rounded bg-[rgba(255,255,255,0.04)] border border-[var(--border)] px-1.5 py-0.5 text-[10px] text-[var(--muted)]"
            >
              {tool}
            </span>
          ))}
          {item.shared_tools.length > 4 && (
            <span className="text-[10px] text-[var(--muted)] px-1">
              +{item.shared_tools.length - 4}
            </span>
          )}
        </div>
      )}
    </Link>
  );
}

function SimilarStoresRow({ title, stores, accent }: { title: string; stores: SimilarStore[]; accent: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = 300;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  if (stores.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-[var(--ink-strong)] flex items-center gap-2">
          <span className={`inline-block w-2 h-2 rounded-full ${accent}`} />
          {title}
          <span className="text-xs font-normal text-[var(--muted)]">({stores.length})</span>
        </h4>
        <div className="flex gap-1">
          <button
            onClick={() => scroll('left')}
            className="btn-ghost p-1.5 rounded-lg"
            aria-label="Scroll left"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            onClick={() => scroll('right')}
            className="btn-ghost p-1.5 rounded-lg"
            aria-label="Scroll right"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {stores.map((s) => (
          <div key={s.similar_domain} style={{ scrollSnapAlign: 'start' }}>
            <SimilarStoreCard item={s} />
          </div>
        ))}
      </div>
    </div>
  );
}

function severityBadge(severity: string) {
  switch (severity) {
    case 'critical': return 'bg-red-500/15 text-red-400 border-red-500/30';
    case 'high': return 'bg-orange-500/15 text-orange-400 border-orange-500/30';
    case 'medium': return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30';
    default: return 'bg-[rgba(255,255,255,0.06)] text-[var(--muted)] border-[var(--border)]';
  }
}

function groupChangesByDate(changes: StoreChange[]): Record<string, StoreChange[]> {
  const groups: Record<string, StoreChange[]> = {};
  for (const c of changes) {
    const dateStr = typeof c.change_date === 'object' ? (c.change_date as any).value : String(c.change_date);
    if (!groups[dateStr]) groups[dateStr] = [];
    groups[dateStr].push(c);
  }
  return groups;
}

function RecentChangesSection({ domain }: { domain: string }) {
  const [changes, setChanges] = useState<StoreChange[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/stores/${encodeURIComponent(domain)}/changes`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to fetch');
        return r.json();
      })
      .then(data => {
        setChanges(data.changes || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [domain]);

  const grouped = groupChangesByDate(changes);
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="mt-4 surface-panel p-6 fade-rise-delay">
      <h3 className="text-lg font-semibold mb-4">Recent changes</h3>
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-16 rounded-xl" />
          ))}
        </div>
      ) : changes.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm text-[var(--muted)]">No changes detected yet</p>
        </div>
      ) : (
        <div className="space-y-5">
          {dates.map(date => (
            <div key={date}>
              <div className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-2">
                {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
              <div className="space-y-2">
                {grouped[date].map(change => (
                  <div
                    key={change.change_id}
                    className="surface-muted p-3 flex items-start gap-3"
                  >
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold flex-shrink-0 mt-0.5 ${severityBadge(change.severity)}`}>
                      {change.severity}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-[var(--ink)]">
                        {change.change_description || change.change_type.replace(/_/g, ' ')}
                      </div>
                      {(change.old_value || change.new_value) && (
                        <div className="mt-1 text-xs text-[var(--muted)] flex items-center gap-2">
                          {change.old_value && <span className="line-through">{change.old_value}</span>}
                          {change.old_value && change.new_value && <span>&rarr;</span>}
                          {change.new_value && <span className="text-[var(--ink)]">{change.new_value}</span>}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-[var(--muted)] flex-shrink-0">
                      {change.change_category}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function StoreDetailPage() {
  const params = useParams();
  const domain = params.domain as string;
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [similar, setSimilar] = useState<SimilarStore[]>([]);
  const [similarLoading, setSimilarLoading] = useState(true);
  const [similarAvailable, setSimilarAvailable] = useState(true);

  useEffect(() => {
    if (!domain) return;
    setLoading(true);
    fetch(`/api/stores?domain=${encodeURIComponent(domain)}`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to fetch');
        return r.json();
      })
      .then(data => {
        if (data.store) {
          setStore(data.store);
        } else {
          setError('Store not found');
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load store details');
        setLoading(false);
      });
  }, [domain]);

  useEffect(() => {
    if (!domain) return;
    setSimilarLoading(true);
    fetch(`/api/stores/similar?domain=${encodeURIComponent(domain)}&limit=20`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to fetch');
        return r.json();
      })
      .then(data => {
        if (data.dataAvailable === false) {
          setSimilarAvailable(false);
        } else {
          setSimilar(data.similar || []);
          setSimilarAvailable(true);
        }
        setSimilarLoading(false);
      })
      .catch(() => {
        setSimilarAvailable(false);
        setSimilarLoading(false);
      });
  }, [domain]);

  // Partition similar stores into rows
  const mostSimilar = similar.slice(0, 10);
  const sameTechStack = similar
    .filter(s => s.shared_tool_count >= 3)
    .sort((a, b) => b.tech_overlap - a.tech_overlap)
    .slice(0, 10);
  const sameCategory = similar
    .filter(s => s.category_match)
    .sort((a, b) => b.similarity_score - a.similarity_score)
    .slice(0, 10);

  return (
    <AppShell>
      <div className="fade-rise">
        <Link href="/stores" className="btn-ghost mb-4 inline-flex text-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
          Back to search
        </Link>

        {loading ? (
          <div className="space-y-4">
            <div className="skeleton h-10 w-64 rounded-xl" />
            <div className="skeleton h-5 w-96 rounded-lg" />
            <div className="grid gap-3 md:grid-cols-4 mt-6">
              {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          </div>
        ) : error ? (
          <div className="surface-panel p-8 text-center">
            <p className="text-[var(--muted)]">{error}</p>
          </div>
        ) : store ? (
          <>
            <div className="surface-panel p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <span className="pill">Store profile</span>
                  <h2 className="mt-3 text-3xl font-bold">{store.domain}</h2>
                  <p className="mt-2 text-[var(--muted)]">{store.page_title}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {store.deep_enrichment && (
                    <span className="pill-purple text-[10px]">Deep enriched</span>
                  )}
                  {store.is_shopify_plus && (
                    <span className="pill-success text-[10px]">Shopify Plus</span>
                  )}
                  {store.percentile_rank !== undefined && (
                    <span className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
                      getRankBadge(store.percentile_rank).className
                    }`}>
                      {getRankBadge(store.percentile_rank).label}
                    </span>
                  )}
                </div>
              </div>

              {store.meta_description && (
                <p className="mt-4 text-sm text-[var(--muted)] leading-relaxed">{store.meta_description}</p>
              )}

              <SocialLinksRow
                instagram={store.instagram_url}
                tiktok={store.tiktok_url}
                facebook={store.facebook_url}
                twitter={store.twitter_url}
                youtube={store.youtube_url}
                pinterest={store.pinterest_url}
                linkedin={store.linkedin_url}
              />

              <StoreScreenshots domain={domain} />

              <div className="mt-6 grid gap-3 md:grid-cols-4">
                <div className="surface-muted p-4">
                  <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Composite Rank</div>
                  <div className="mt-2 text-2xl font-bold text-[var(--ink-strong)]">
                    {Number(store.composite_rank_score ?? 0).toFixed(3)}
                  </div>
                  <div className="text-xs text-[var(--muted)]">
                    {store.referring_domains_count?.toLocaleString() || 0} referring domains
                  </div>
                </div>

                <div className="surface-muted p-4">
                  <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Authority</div>
                  <div className="mt-2 text-2xl font-bold text-[var(--ink-strong)]">
                    {(store.significance_score ?? 0).toFixed(1)}
                  </div>
                  <div className="text-xs text-[var(--muted)]">
                    {store.percentile_rank || 'Unranked'}
                  </div>
                </div>

                <div className="surface-muted p-4">
                  <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Category</div>
                  <div className="mt-2 text-lg font-semibold text-[var(--ink-strong)]">
                    {store.primary_category}
                  </div>
                  {store.secondary_category && (
                    <div className="text-xs text-[var(--muted)]">
                      {store.secondary_category}
                    </div>
                  )}
                </div>

                <div className="surface-muted p-4">
                  <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Products</div>
                  <div className="mt-2 text-2xl font-bold text-[var(--ink-strong)]">
                    {store.product_count?.toLocaleString() || 'N/A'}
                  </div>
                  {store.price_avg && (
                    <div className="text-xs text-[var(--muted)]">
                      Avg: ${store.price_avg.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Product Intelligence */}
            {((store.product_count && store.product_count > 0) || store.price_min !== undefined) && (
              <div className="mt-4 surface-panel p-6 fade-rise-delay">
                <h3 className="text-lg font-semibold mb-4">Product intelligence</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {store.price_min !== undefined && store.price_avg !== undefined && store.price_max !== undefined && (
                    <div className="surface-muted p-4">
                      <PriceRangeBar
                        min={store.price_min}
                        avg={store.price_avg}
                        max={store.price_max}
                        currency={store.store_currency === 'USD' ? '$' : store.store_currency ? `${store.store_currency} ` : '$'}
                      />
                    </div>
                  )}
                  {store.in_stock_products !== undefined && store.out_of_stock_products !== undefined && (
                    <div className="surface-muted p-4">
                      <StockRatio
                        inStock={store.in_stock_products}
                        outOfStock={store.out_of_stock_products}
                      />
                    </div>
                  )}
                </div>
                {store.deep_enrichment && (store.sitemap_product_count !== undefined || store.sitemap_page_count !== undefined) && (
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {store.sitemap_product_count !== undefined && (
                      <div className="surface-muted p-4">
                        <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Sitemap products</div>
                        <div className="mt-2 text-2xl font-bold text-[var(--ink-strong)]">
                          {store.sitemap_product_count.toLocaleString()}
                        </div>
                        <div className="text-xs text-[var(--muted)]">from sitemap.xml</div>
                      </div>
                    )}
                    {store.sitemap_page_count !== undefined && (
                      <div className="surface-muted p-4">
                        <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Sitemap pages</div>
                        <div className="mt-2 text-2xl font-bold text-[var(--ink-strong)]">
                          {store.sitemap_page_count.toLocaleString()}
                        </div>
                        <div className="text-xs text-[var(--muted)]">total indexed pages</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
              <div className="surface-panel p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Tech stack</h3>
                  <span className="rounded-full bg-[var(--panel-muted)] border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--muted)]">
                    {store.tools?.length || 0} tools
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {store.tools?.length > 0 ? (
                    store.tools.map((tool: any, idx: number) => (
                      <span
                        key={idx}
                        className="rounded-lg border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-1.5 text-sm text-[var(--ink)]"
                      >
                        {typeof tool === 'string' ? tool : tool.app_name}
                        {tool.app_category && (
                          <span className="text-[var(--muted)] ml-1 text-xs">({tool.app_category})</span>
                        )}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-[var(--muted)] py-4">No tools detected for this store.</p>
                  )}
                </div>
              </div>

              <div className="surface-panel p-6">
                <h3 className="text-lg font-semibold">Monitor this store</h3>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Set an alert to get notified when this store changes tools, pricing, or inventory.
                </p>
                <Link
                  href={`/alerts?domain=${store.domain}`}
                  className="btn-primary mt-4 w-full"
                >
                  Set up alert
                </Link>
              </div>
            </div>

            {/* Deep Intelligence Sections */}
            {store.deep_enrichment && (
              <div className="mt-4 space-y-4 fade-rise-delay">
                {/* Theme & Platform */}
                <div className="surface-panel p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-lg font-semibold">Theme &amp; platform</h3>
                    <span className="pill-purple text-[10px]">Deep enriched</span>
                    {store.is_shopify_plus && (
                      <span className="pill-success text-[10px]">Shopify Plus</span>
                    )}
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    {store.theme_name && (
                      <div className="surface-muted p-4">
                        <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Theme</div>
                        <div className="mt-2 text-lg font-semibold text-[var(--ink-strong)]">{store.theme_name}</div>
                      </div>
                    )}
                    {store.page_builder && (
                      <div className="surface-muted p-4">
                        <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Page builder</div>
                        <div className="mt-2 text-lg font-semibold text-[var(--ink-strong)]">{store.page_builder}</div>
                      </div>
                    )}
                    {store.store_currency && (
                      <div className="surface-muted p-4">
                        <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Currency</div>
                        <div className="mt-2 text-lg font-semibold text-[var(--ink-strong)]">{store.store_currency}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Marketing & Funnel */}
                {(store.announcement_bar_text || store.entry_offer_type || store.positioning_claim) && (
                  <div className="surface-panel p-6">
                    <h3 className="text-lg font-semibold mb-4">Marketing &amp; funnel</h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      {store.announcement_bar_text && (
                        <div className="surface-muted p-4">
                          <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Announcement bar</div>
                          <div className="mt-2 text-sm text-[var(--ink)] leading-relaxed">{store.announcement_bar_text}</div>
                        </div>
                      )}
                      {store.entry_offer_type && (
                        <div className="surface-muted p-4">
                          <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Entry offer</div>
                          <div className="mt-2 flex items-center gap-2">
                            <span className="pill text-[10px]">{store.entry_offer_type.replace(/_/g, ' ')}</span>
                            {store.entry_offer_value && (
                              <span className="text-sm font-semibold text-[var(--ink-strong)]">{store.entry_offer_value}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    {store.positioning_claim && (
                      <div className="mt-3 surface-muted p-4 border-l-2 border-[var(--purple)]">
                        <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)] mb-2">Positioning</div>
                        <p className="text-sm text-[var(--ink)] italic leading-relaxed">&ldquo;{store.positioning_claim}&rdquo;</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Commerce Intelligence */}
                {(store.guarantee_type || store.offers_free_shipping !== undefined || store.bundle_count || store.has_subscription || store.refund_window_days) && (
                  <div className="surface-panel p-6">
                    <h3 className="text-lg font-semibold mb-4">Commerce intelligence</h3>
                    <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
                      {store.guarantee_type && (
                        <div className="surface-muted p-4">
                          <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Guarantee</div>
                          <div className="mt-2 text-sm font-semibold text-[var(--ink-strong)]">{store.guarantee_type.replace(/_/g, ' ')}</div>
                        </div>
                      )}
                      <div className="surface-muted p-4">
                        <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Free shipping</div>
                        <div className="mt-2 text-sm font-semibold text-[var(--ink-strong)]">
                          {store.offers_free_shipping
                            ? store.free_shipping_threshold
                              ? `Over $${store.free_shipping_threshold}`
                              : 'Yes'
                            : 'No'}
                        </div>
                      </div>
                      {(store.bundle_count !== undefined && store.bundle_count !== null && store.bundle_count > 0) && (
                        <div className="surface-muted p-4">
                          <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Bundles</div>
                          <div className="mt-2 text-lg font-bold text-[var(--ink-strong)]">{store.bundle_count}</div>
                        </div>
                      )}
                      {store.has_subscription && (
                        <div className="surface-muted p-4">
                          <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Subscriptions</div>
                          <div className="mt-2 text-sm font-semibold text-[var(--ink-strong)]">
                            {store.subscription_type ? store.subscription_type.replace(/_/g, ' ') : 'Yes'}
                          </div>
                        </div>
                      )}
                      {store.refund_window_days && (
                        <div className="surface-muted p-4">
                          <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Refund window</div>
                          <div className="mt-2 text-sm font-semibold text-[var(--ink-strong)]">{store.refund_window_days} days</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Site Structure */}
                {(store.landing_page_count !== undefined && store.landing_page_count !== null && store.landing_page_count > 0) && (
                  <div className="surface-panel p-6">
                    <h3 className="text-lg font-semibold mb-4">Site structure</h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="surface-muted p-4">
                        <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Landing pages</div>
                        <div className="mt-2 text-2xl font-bold text-[var(--ink-strong)]">{store.landing_page_count}</div>
                      </div>
                      {store.product_count != null && (
                        <div className="surface-muted p-4">
                          <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Products</div>
                          <div className="mt-2 text-2xl font-bold text-[var(--ink-strong)]">{store.product_count.toLocaleString()}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Store Sophistication */}
                {(store.acquisition_score || store.retention_score || store.optimization_score || store.scale_score) && (
                  <div className="surface-panel p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <h3 className="text-lg font-semibold">Store sophistication</h3>
                      <span className="pill-cyan text-[10px]">Score breakdown</span>
                    </div>
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="flex items-center justify-center">
                        <SophisticationRadar
                          acquisition={store.acquisition_score ?? 0}
                          retention={store.retention_score ?? 0}
                          optimization={store.optimization_score ?? 0}
                          scale={store.scale_score ?? 0}
                        />
                      </div>
                      <CategoryBenchmarks
                        category={store.primary_category}
                        storeValues={{
                          product_count: store.product_count,
                          price_avg: store.price_avg,
                          tool_count: store.tools?.length ?? 0,
                          has_subscription: store.has_subscription,
                          bundle_count: store.bundle_count,
                          is_shopify_plus: store.is_shopify_plus,
                          free_shipping_threshold: store.free_shipping_threshold,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Recent Changes Section */}
            <RecentChangesSection domain={domain} />

            {/* Similar Stores Section */}
            <div className="mt-4 surface-panel p-6 fade-rise-delay">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold">Similar stores</h3>
                {!similarLoading && similarAvailable && similar.length > 0 && (
                  <span className="pill-purple text-[10px]">
                    AI-powered
                  </span>
                )}
              </div>

              {similarLoading ? (
                <div className="grid gap-3 md:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
              ) : !similarAvailable ? (
                <DataCollecting message="Computing similarities..." />
              ) : similar.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-[var(--muted)]">No similar stores found yet.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <SimilarStoresRow
                    title="Most Similar"
                    stores={mostSimilar}
                    accent="bg-[var(--accent)]"
                  />
                  <SimilarStoresRow
                    title="Same Tech Stack"
                    stores={sameTechStack}
                    accent="bg-[var(--purple)]"
                  />
                  <SimilarStoresRow
                    title="Same Category"
                    stores={sameCategory}
                    accent="bg-[var(--success)]"
                  />
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}

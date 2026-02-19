'use client';

import { useEffect, useRef, useState } from 'react';
import Nav from '@/components/Nav';
import * as PIXI from 'pixi.js';

// ── Types ──────────────────────────────────────────────────────────
interface StorePoint {
  d: string; // domain
  c: string; // category
  s: number; // significance_score
  p: number; // product_count
  a: number; // avg_price
  t: number; // tool_count
  x: number; // normalized 0-1
  y: number; // normalized 0-1
}

interface ExploreData {
  stores: StorePoint[];
  colors: Record<string, string>;
  total: number;
}

// ── Constants ──────────────────────────────────────────────────────
const WORLD_W = 6000;
const WORLD_H = 4000;
const BG_COLOR = 0x0a0a0f;
const GRID_COLOR = 0x1a1a24;
const MIN_ZOOM = 0.15;
const MAX_ZOOM = 4;

// Authority → font size mapping
function fontSize(score: number, maxScore: number): number {
  const t = Math.pow(score / Math.max(maxScore, 1), 0.4);
  return Math.round(8 + t * 24); // 8-32px
}

function hexToNumber(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

// ── Simple Quadtree ────────────────────────────────────────────────
interface QTNode {
  idx: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

class Quadtree {
  private nodes: QTNode[] = [];
  private bounds: { x: number; y: number; w: number; h: number };

  constructor(x: number, y: number, w: number, h: number) {
    this.bounds = { x, y, w, h };
  }

  insert(node: QTNode) {
    this.nodes.push(node);
  }

  query(rx: number, ry: number, rw: number, rh: number): QTNode[] {
    const results: QTNode[] = [];
    for (const n of this.nodes) {
      if (n.x + n.w > rx && n.x < rx + rw && n.y + n.h > ry && n.y < ry + rh) {
        results.push(n);
      }
    }
    return results;
  }

  queryPoint(px: number, py: number): QTNode | null {
    // Return topmost (last inserted) matching node
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const n = this.nodes[i];
      if (px >= n.x && px <= n.x + n.w && py >= n.y && py <= n.y + n.h) {
        return n;
      }
    }
    return null;
  }
}

// ── Authority badge ────────────────────────────────────────────────
function authorityBadge(score: number): { label: string; cls: string } {
  if (score >= 80) return { label: 'Elite', cls: 'badge-elite' };
  if (score >= 60) return { label: 'High', cls: 'badge-high' };
  if (score >= 40) return { label: 'Good', cls: 'badge-good' };
  if (score >= 20) return { label: 'Mid', cls: 'badge-mid' };
  return { label: 'Low', cls: 'badge-low' };
}

// ── Component ──────────────────────────────────────────────────────
export default function ExplorePage() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const worldRef = useRef<PIXI.Container | null>(null);
  const textsRef = useRef<PIXI.Text[]>([]);
  const dataRef = useRef<StorePoint[]>([]);
  const colorsRef = useRef<Record<string, string>>({});
  const qtRef = useRef<Quadtree | null>(null);
  const maxScoreRef = useRef(1);

  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<{
    store: StorePoint;
    x: number;
    y: number;
  } | null>(null);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [storeCount, setStoreCount] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [legendOpen, setLegendOpen] = useState(true);

  // Track view transform
  const transformRef = useRef({ x: 0, y: 0, scale: 1 });

  // ── Fetch data ─────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/explore?limit=8000')
      .then(r => r.json())
      .then((data: ExploreData) => {
        if (!data.stores || data.stores.length === 0) {
          setLoading(false);
          return;
        }
        dataRef.current = data.stores;
        colorsRef.current = data.colors || {};
        setStoreCount(data.total || data.stores.length);
        maxScoreRef.current = Math.max(...data.stores.map(s => s.s), 1);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // ── Init Pixi.js ───────────────────────────────────────────────
  useEffect(() => {
    if (loading || !canvasRef.current || dataRef.current.length === 0) return;

    const container = canvasRef.current;
    const app = new PIXI.Application({
      width: container.clientWidth,
      height: container.clientHeight,
      backgroundColor: BG_COLOR,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });
    appRef.current = app;
    container.appendChild(app.view as HTMLCanvasElement);

    // World container (will be transformed for pan/zoom)
    const world = new PIXI.Container();
    worldRef.current = world;
    app.stage.addChild(world);

    // Draw subtle grid
    const grid = new PIXI.Graphics();
    grid.lineStyle(1, GRID_COLOR, 0.3);
    for (let x = 0; x <= WORLD_W; x += 200) {
      grid.moveTo(x, 0);
      grid.lineTo(x, WORLD_H);
    }
    for (let y = 0; y <= WORLD_H; y += 200) {
      grid.moveTo(0, y);
      grid.lineTo(WORLD_W, y);
    }
    world.addChild(grid);

    // Place stores
    const stores = dataRef.current;
    const colors = colorsRef.current;
    const maxScore = maxScoreRef.current;
    const qt = new Quadtree(0, 0, WORLD_W, WORLD_H);
    const texts: PIXI.Text[] = [];

    for (let i = 0; i < stores.length; i++) {
      const s = stores[i];
      const size = fontSize(s.s, maxScore);
      const colorHex = colors[s.c] || '#6b7280';

      const text = new PIXI.Text(s.d.replace(/\.myshopify\.com$/, ''), {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: size,
        fill: hexToNumber(colorHex),
        fontWeight: s.s > maxScore * 0.5 ? 'bold' : 'normal',
      });

      text.x = s.x * WORLD_W;
      text.y = s.y * WORLD_H;
      text.alpha = 0;
      text.cursor = 'pointer';

      world.addChild(text);
      texts.push(text);

      qt.insert({
        idx: i,
        x: text.x,
        y: text.y,
        w: text.width,
        h: text.height,
      });
    }

    textsRef.current = texts;
    qtRef.current = qt;

    // Fade-in animation
    let fadeProgress = 0;
    const fadeIn = () => {
      fadeProgress += 0.03;
      if (fadeProgress >= 1) {
        texts.forEach(t => { t.alpha = 1; });
        return;
      }
      texts.forEach((t, i) => {
        const delay = (i / texts.length) * 0.3;
        const localProgress = Math.max(0, fadeProgress - delay) / (1 - delay);
        t.alpha = Math.min(1, localProgress);
      });
      requestAnimationFrame(fadeIn);
    };
    requestAnimationFrame(fadeIn);

    // Center the view
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const initScale = Math.min(cw / WORLD_W, ch / WORLD_H) * 0.9;
    world.scale.set(initScale);
    world.x = (cw - WORLD_W * initScale) / 2;
    world.y = (ch - WORLD_H * initScale) / 2;
    transformRef.current = { x: world.x, y: world.y, scale: initScale };
    setZoomLevel(initScale);

    // LOD: show/hide labels based on zoom
    const updateLOD = () => {
      const scale = world.scale.x;
      const vx = -world.x / scale;
      const vy = -world.y / scale;
      const vw = cw / scale;
      const vh = ch / scale;

      for (let i = 0; i < texts.length; i++) {
        const t = texts[i];
        const s = stores[i];

        // Viewport culling
        const inView = t.x + t.width > vx && t.x < vx + vw && t.y + t.height > vy && t.y < vy + vh;

        if (!inView) {
          t.visible = false;
          continue;
        }

        // LOD: at low zoom only show high-authority stores
        const effectiveSize = fontSize(s.s, maxScore) * scale;
        t.visible = effectiveSize > 4; // Hide if text would be < 4px
      }
    };

    updateLOD();

    // ── Pan & Zoom ─────────────────────────────────────────────
    let isDragging = false;
    let dragStart = { x: 0, y: 0 };
    let worldStart = { x: 0, y: 0 };

    const canvas = app.view as HTMLCanvasElement;

    canvas.addEventListener('pointerdown', (e: PointerEvent) => {
      isDragging = true;
      dragStart = { x: e.clientX, y: e.clientY };
      worldStart = { x: world.x, y: world.y };
      canvas.style.cursor = 'grabbing';
    });

    canvas.addEventListener('pointermove', (e: PointerEvent) => {
      if (isDragging) {
        world.x = worldStart.x + (e.clientX - dragStart.x);
        world.y = worldStart.y + (e.clientY - dragStart.y);
        transformRef.current = { x: world.x, y: world.y, scale: world.scale.x };
        updateLOD();
        setTooltip(null);
      } else {
        // Hit-test for hover
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * (app.renderer.resolution || 1);
        const my = (e.clientY - rect.top) * (app.renderer.resolution || 1);
        const worldX = (mx / (app.renderer.resolution || 1) - world.x) / world.scale.x;
        const worldY = (my / (app.renderer.resolution || 1) - world.y) / world.scale.y;

        const hit = qt.queryPoint(worldX, worldY);
        if (hit) {
          const store = stores[hit.idx];
          canvas.style.cursor = 'pointer';
          // Highlight
          texts.forEach((t, i) => {
            t.alpha = i === hit.idx ? 1 : 0.4;
          });
          setTooltip({
            store,
            x: e.clientX,
            y: e.clientY,
          });
        } else {
          canvas.style.cursor = 'grab';
          texts.forEach(t => { if (t.visible) t.alpha = 1; });
          setTooltip(null);
        }
      }
    });

    canvas.addEventListener('pointerup', () => {
      isDragging = false;
      canvas.style.cursor = 'grab';
    });

    canvas.addEventListener('pointerleave', () => {
      isDragging = false;
      canvas.style.cursor = 'grab';
      texts.forEach(t => { if (t.visible) t.alpha = 1; });
      setTooltip(null);
    });

    // Click to navigate
    canvas.addEventListener('click', (e: MouseEvent) => {
      if (Math.abs(e.clientX - dragStart.x) > 5 || Math.abs(e.clientY - dragStart.y) > 5) return;
      const rect = canvas.getBoundingClientRect();
      const worldX = ((e.clientX - rect.left) - world.x) / world.scale.x;
      const worldY = ((e.clientY - rect.top) - world.y) / world.scale.y;
      const hit = qt.queryPoint(worldX, worldY);
      if (hit) {
        window.location.href = `/stores/${stores[hit.idx].d}`;
      }
    });

    // Wheel zoom
    canvas.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const oldScale = world.scale.x;
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, oldScale * zoomFactor));

      // Zoom toward cursor
      world.x = mouseX - (mouseX - world.x) * (newScale / oldScale);
      world.y = mouseY - (mouseY - world.y) * (newScale / oldScale);
      world.scale.set(newScale);

      transformRef.current = { x: world.x, y: world.y, scale: newScale };
      setZoomLevel(newScale);
      updateLOD();
    }, { passive: false });

    // Resize
    const onResize = () => {
      app.renderer.resize(container.clientWidth, container.clientHeight);
      updateLOD();
    };
    window.addEventListener('resize', onResize);

    canvas.style.cursor = 'grab';

    return () => {
      window.removeEventListener('resize', onResize);
      app.destroy(true, { children: true, texture: true });
    };
  }, [loading]);

  // ── Search highlight ───────────────────────────────────────────
  useEffect(() => {
    if (!textsRef.current.length || !dataRef.current.length) return;
    const texts = textsRef.current;
    const stores = dataRef.current;
    const q = search.toLowerCase().trim();

    if (!q) {
      texts.forEach(t => { if (t.visible) t.alpha = 1; });
      return;
    }

    let matchIdx = -1;
    for (let i = 0; i < stores.length; i++) {
      const match = stores[i].d.toLowerCase().includes(q);
      texts[i].alpha = match ? 1 : 0.1;
      if (match && matchIdx === -1) matchIdx = i;
    }

    // Pan to first match
    if (matchIdx >= 0 && worldRef.current && appRef.current) {
      const world = worldRef.current;
      const text = texts[matchIdx];
      const cw = appRef.current.renderer.width / (appRef.current.renderer.resolution || 1);
      const ch = appRef.current.renderer.height / (appRef.current.renderer.resolution || 1);
      const targetScale = 1.5;
      world.scale.set(targetScale);
      world.x = cw / 2 - text.x * targetScale;
      world.y = ch / 2 - text.y * targetScale;
      transformRef.current = { x: world.x, y: world.y, scale: targetScale };
      setZoomLevel(targetScale);
    }
  }, [search]);

  // ── Keyboard shortcut ──────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && !searchOpen) {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setSearch('');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [searchOpen]);

  const badge = tooltip ? authorityBadge(tooltip.store.s) : null;

  return (
    <main className="h-screen flex flex-col" style={{ background: '#0a0a0f' }}>
      <Nav />

      {/* Canvas area - fills remaining space */}
      <div className="relative flex-1 overflow-hidden">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="relative mb-6">
                <div className="h-20 w-20 mx-auto rounded-2xl bg-gradient-to-br from-[var(--accent-soft)] to-[var(--purple-soft)] flex items-center justify-center animate-pulse">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-strong)" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10"/>
                    <circle cx="12" cy="12" r="4"/>
                    <path d="M12 2v4"/><path d="M12 18v4"/>
                    <path d="M2 12h4"/><path d="M18 12h4"/>
                  </svg>
                </div>
              </div>
              <p className="text-sm text-[var(--muted)]">Loading store universe...</p>
              <div className="mt-3 flex justify-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-pulse" style={{ animationDelay: '0.2s' }} />
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-pulse" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Pixi canvas */}
            <div ref={canvasRef} className="absolute inset-0" />

            {/* Top-left: Store count + zoom */}
            <div
              className="absolute top-4 left-4 px-4 py-2.5 rounded-xl"
              style={{
                background: 'rgba(17, 17, 24, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                backdropFilter: 'blur(20px)',
              }}
            >
              <div className="flex items-center gap-3">
                <div>
                  <span className="text-xs uppercase tracking-widest text-[var(--muted)]">Stores</span>
                  <p className="text-lg font-bold text-[var(--ink-strong)]">{(storeCount || 0).toLocaleString()}</p>
                </div>
                <div className="h-8 w-px bg-[var(--border)]" />
                <div>
                  <span className="text-xs uppercase tracking-widest text-[var(--muted)]">Zoom</span>
                  <p className="text-lg font-bold text-[var(--ink-strong)]">{(zoomLevel * 100).toFixed(0)}%</p>
                </div>
              </div>
            </div>

            {/* Search overlay */}
            {searchOpen && (
              <div
                className="absolute top-4 left-1/2 -translate-x-1/2 w-96 max-w-[calc(100vw-2rem)]"
                style={{
                  background: 'rgba(17, 17, 24, 0.9)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '14px',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 16px 48px -16px rgba(0, 0, 0, 0.6)',
                }}
              >
                <div className="flex items-center gap-2 px-4 py-3">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                  </svg>
                  <input
                    autoFocus
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search stores..."
                    className="flex-1 bg-transparent text-sm text-[var(--ink)] outline-none placeholder:text-[var(--muted)]"
                  />
                  <kbd className="text-[10px] text-[var(--muted)] bg-[rgba(255,255,255,0.05)] px-1.5 py-0.5 rounded">ESC</kbd>
                </div>
              </div>
            )}

            {/* Search button (when closed) */}
            {!searchOpen && (
              <button
                onClick={() => setSearchOpen(true)}
                className="absolute top-4 right-4 flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
                style={{
                  background: 'rgba(17, 17, 24, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  backdropFilter: 'blur(20px)',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                Search
                <kbd className="text-[10px] bg-[rgba(255,255,255,0.05)] px-1.5 py-0.5 rounded">/</kbd>
              </button>
            )}

            {/* Tooltip */}
            {tooltip && badge && (
              <div
                className="pointer-events-none absolute z-50"
                style={{
                  left: tooltip.x + 16,
                  top: tooltip.y - 8,
                  background: 'rgba(17, 17, 24, 0.92)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 16px 48px -16px rgba(0, 0, 0, 0.6)',
                  padding: '12px 16px',
                  maxWidth: '280px',
                }}
              >
                <p className="text-sm font-semibold text-[var(--ink-strong)]">{tooltip.store.d}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: colorsRef.current[tooltip.store.c] || '#6b7280' }}
                  />
                  <span className="text-xs text-[var(--muted)]">{tooltip.store.c}</span>
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-[var(--muted)]">
                  <span>{tooltip.store.t} tools</span>
                  <span>{tooltip.store.p} products</span>
                  {tooltip.store.a > 0 && <span>${tooltip.store.a.toFixed(0)} avg</span>}
                </div>
                <div className="mt-2">
                  <span
                    className={`inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${badge.cls}`}
                  >
                    {badge.label} authority
                  </span>
                </div>
              </div>
            )}

            {/* Category legend */}
            <div className="absolute bottom-4 left-4">
              <button
                onClick={() => setLegendOpen(!legendOpen)}
                className="flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-[var(--ink)] transition-colors mb-2"
              >
                <svg
                  width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  style={{ transform: legendOpen ? 'rotate(0)' : 'rotate(-90deg)', transition: 'transform 0.2s' }}
                >
                  <path d="m6 9 6 6 6-6"/>
                </svg>
                Categories
              </button>
              {legendOpen && (
                <div
                  className="grid grid-cols-2 gap-x-4 gap-y-1 p-3 rounded-xl"
                  style={{
                    background: 'rgba(17, 17, 24, 0.85)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    backdropFilter: 'blur(20px)',
                  }}
                >
                  {Object.entries(colorsRef.current).map(([cat, color]) => (
                    <div key={cat} className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: color }} />
                      <span className="text-[10px] text-[var(--muted)] truncate">{cat}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Minimap */}
            <Minimap
              worldW={WORLD_W}
              worldH={WORLD_H}
              transform={transformRef.current}
              canvasW={canvasRef.current?.clientWidth || 800}
              canvasH={canvasRef.current?.clientHeight || 600}
              stores={dataRef.current}
              colors={colorsRef.current}
              zoomLevel={zoomLevel}
            />

            {/* Axis labels */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-6 text-[10px] uppercase tracking-widest text-[var(--muted)]">
              <span>Mass Market</span>
              <svg width="40" height="1"><line x1="0" y1="0" x2="40" y2="0" stroke="var(--muted)" strokeWidth="1" /></svg>
              <span>Avg Price</span>
              <svg width="40" height="1"><line x1="0" y1="0" x2="40" y2="0" stroke="var(--muted)" strokeWidth="1" /></svg>
              <span>Luxury</span>
            </div>
            <div
              className="absolute top-1/2 right-4 -translate-y-1/2 flex flex-col items-center gap-4 text-[10px] uppercase tracking-widest text-[var(--muted)]"
              style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
            >
              <span>Digital</span>
              <span>↕</span>
              <span>Physical</span>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

// ── Minimap Component ──────────────────────────────────────────────
function Minimap({
  worldW, worldH, transform, canvasW, canvasH, stores, colors, zoomLevel,
}: {
  worldW: number;
  worldH: number;
  transform: { x: number; y: number; scale: number };
  canvasW: number;
  canvasH: number;
  stores: StorePoint[];
  colors: Record<string, string>;
  zoomLevel: number;
}) {
  const mmW = 140;
  const mmH = Math.round(mmW * (worldH / worldW));
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || stores.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, mmW, mmH);

    // Background
    ctx.fillStyle = 'rgba(17, 17, 24, 0.9)';
    ctx.fillRect(0, 0, mmW, mmH);

    // Draw store dots
    for (const s of stores) {
      ctx.fillStyle = colors[s.c] || '#6b7280';
      ctx.globalAlpha = 0.5;
      ctx.fillRect(s.x * mmW, s.y * mmH, 1, 1);
    }
    ctx.globalAlpha = 1;

    // Viewport rect
    const scale = transform.scale;
    const vx = -transform.x / scale;
    const vy = -transform.y / scale;
    const vw = canvasW / scale;
    const vh = canvasH / scale;

    ctx.strokeStyle = 'rgba(59, 130, 246, 0.7)';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      (vx / worldW) * mmW,
      (vy / worldH) * mmH,
      (vw / worldW) * mmW,
      (vh / worldH) * mmH,
    );
  }, [transform, stores, colors, zoomLevel, worldW, worldH, canvasW, canvasH]);

  return (
    <div
      className="absolute bottom-4 right-4 rounded-lg overflow-hidden"
      style={{
        border: '1px solid rgba(255, 255, 255, 0.06)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <canvas ref={canvasRef} width={mmW} height={mmH} />
    </div>
  );
}

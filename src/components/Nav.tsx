'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import UserMenu from './UserMenu';

const links = [
  { href: '/tools', label: 'Tools' },
  { href: '/stores', label: 'Stores' },
  { href: '/categories', label: 'Categories' },
  { href: '/explore', label: 'Explore' },
  { href: '/leaderboards', label: 'Leaderboards' },
  { href: '/stack-builder', label: 'Stack Builder' },
  { href: '/compare', label: 'Compare' },
  { href: '/alerts', label: 'Alerts' },
  { href: '/enrichment', label: 'Enrichment' },
  { href: '/monitor', label: 'Monitor' },
];

export default function Nav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg)]/70 backdrop-blur-xl">
      <div className="mx-auto w-full max-w-7xl px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3 group">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--purple)] text-white text-sm font-bold shadow-lg shadow-blue-500/20">
              SI
            </span>
            <div className="hidden sm:block">
              <div className="text-sm font-semibold text-[var(--ink-strong)] group-hover:text-[var(--accent-strong)] transition-colors">
                Shopify Intelligence
              </div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                Competitive Intel
              </div>
            </div>
          </Link>

          <div className="hidden items-center gap-1 rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-1 md:flex">
            {links.map((link) => {
              const active = pathname === link.href || pathname?.startsWith(link.href + '/');
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative px-3.5 py-1.5 text-sm font-medium transition-all duration-200 rounded-lg ${
                    active
                      ? 'text-[var(--ink-strong)] bg-[rgba(255,255,255,0.08)]'
                      : 'text-[var(--muted)] hover:text-[var(--ink)]'
                  }`}
                >
                  {active && (
                    <span className="absolute inset-x-3 -bottom-[13px] h-px bg-[var(--accent)]" />
                  )}
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex">
              <UserMenu />
            </div>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden flex flex-col gap-1.5 p-2 rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition-colors"
              aria-label="Toggle menu" aria-expanded={mobileOpen}
            >
              <span className={`block h-0.5 w-5 rounded-full bg-[var(--ink)] transition-all duration-200 ${mobileOpen ? 'rotate-45 translate-y-2' : ''}`} />
              <span className={`block h-0.5 w-5 rounded-full bg-[var(--ink)] transition-all duration-200 ${mobileOpen ? 'opacity-0' : ''}`} />
              <span className={`block h-0.5 w-5 rounded-full bg-[var(--ink)] transition-all duration-200 ${mobileOpen ? '-rotate-45 -translate-y-2' : ''}`} />
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="mt-3 pb-3 md:hidden border-t border-[var(--border)] pt-3 space-y-1 fade-rise">
            {links.map((link) => {
              const active = pathname === link.href || pathname?.startsWith(link.href + '/');
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? 'text-[var(--ink-strong)] bg-[var(--accent-soft)]'
                      : 'text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[rgba(255,255,255,0.03)]'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <div className="pt-2 border-t border-[var(--border)]">
              <UserMenu />
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

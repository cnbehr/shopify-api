'use client';

import { useState, useEffect } from 'react';

interface ScreenshotData {
  desktop_url?: string;
  mobile_url?: string;
}

export function StoreScreenshots({ domain }: { domain: string }) {
  const [data, setData] = useState<ScreenshotData | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/stores/${encodeURIComponent(domain)}/screenshots`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => setData(null));
  }, [domain]);

  if (!data || (!data.desktop_url && !data.mobile_url)) return null;

  return (
    <>
      <div className="mt-5 flex gap-4">
        {data.desktop_url && (
          <button
            onClick={() => setExpanded(expanded === 'desktop' ? null : 'desktop')}
            className="flex-[7] min-w-0 surface-muted overflow-hidden rounded-xl border border-[var(--border)] transition-all hover:border-[var(--accent)]"
          >
            <img
              src={data.desktop_url}
              alt={`${domain} desktop screenshot`}
              loading="lazy"
              className="w-full h-auto object-cover"
            />
          </button>
        )}
        {data.mobile_url && (
          <button
            onClick={() => setExpanded(expanded === 'mobile' ? null : 'mobile')}
            className="flex-[3] min-w-0 surface-muted overflow-hidden rounded-xl border border-[var(--border)] transition-all hover:border-[var(--accent)]"
          >
            <img
              src={data.mobile_url}
              alt={`${domain} mobile screenshot`}
              loading="lazy"
              className="w-full h-auto object-cover"
            />
          </button>
        )}
      </div>

      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-8"
          onClick={() => setExpanded(null)}
        >
          <img
            src={expanded === 'desktop' ? data.desktop_url : data.mobile_url}
            alt={`${domain} ${expanded} screenshot`}
            className="max-h-full max-w-full rounded-xl border border-[var(--border)] shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

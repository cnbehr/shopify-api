'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import AppShell from '@/components/AppShell';

interface Alert {
  alert_id: string;
  email: string;
  domain: string;
  created_at: string;
  last_checked: string;
}

function AlertsContent() {
  const searchParams = useSearchParams();
  const domainParam = searchParams.get('domain');

  const [email, setEmail] = useState('');
  const [domain, setDomain] = useState(domainParam || '');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [lookupEmail, setLookupEmail] = useState('');

  useEffect(() => {
    if (domainParam) {
      setDomain(domainParam);
    }
  }, [domainParam]);

  async function createAlert() {
    if (!email || !domain) {
      setMessage('Please enter both email and domain');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, domain }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(`Alert created! You'll be notified when ${domain} changes.`);
        setDomain('');
        if (lookupEmail === email) {
          fetchAlerts();
        }
      } else {
        setMessage(data.error || 'Failed to create alert');
      }
    } catch (error) {
      setMessage('Error creating alert');
    }

    setLoading(false);
  }

  async function fetchAlerts() {
    if (!lookupEmail) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/alerts?email=${encodeURIComponent(lookupEmail)}`);
      if (!res.ok) throw new Error('Failed to fetch alerts');
      const data = await res.json();
      setAlerts(data.alerts || []);
    } catch {
      setMessage('Failed to load alerts');
    } finally {
      setLoading(false);
    }
  }

  async function deleteAlert(alertId: string) {
    try {
      const res = await fetch(`/api/alerts?alertId=${alertId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      await fetchAlerts();
    } catch {
      setMessage('Failed to delete alert');
    }
  }

  return (
    <div className="fade-rise">
      <div>
        <span className="pill-cyan pill">Automation</span>
        <h2 className="mt-3 text-3xl font-bold">Store alerts</h2>
        <p className="mt-2 text-[var(--muted)]">
          Monitor competitive moves and get notified when stores change tools, pricing, or inventory.
        </p>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="surface-panel p-6">
          <h3 className="text-lg font-semibold">Create new alert</h3>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Set alerts for the stores you want to keep a close eye on.
          </p>

          <div className="mt-5 space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-[0.15em] text-[var(--muted)] mb-2">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-[0.15em] text-[var(--muted)] mb-2">Store domain</label>
              <input
                type="text"
                placeholder="example.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="input"
              />
            </div>

            <button
              onClick={createAlert}
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Creating...' : 'Create alert'}
            </button>

            {message && (
              <p className={`text-sm ${message.includes('created') || message.includes('notified') ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                {message}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="surface-panel p-6">
            <h3 className="text-lg font-semibold">Your alerts</h3>
            <div className="mt-4 flex gap-3">
              <input
                type="email"
                placeholder="Enter your email"
                value={lookupEmail}
                onChange={(e) => setLookupEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchAlerts()}
                className="input"
              />
              <button
                onClick={fetchAlerts}
                disabled={loading}
                className="btn-secondary whitespace-nowrap"
              >
                Look up
              </button>
            </div>

            {alerts.length > 0 ? (
              <div className="mt-4 space-y-2">
                {alerts.map(alert => (
                  <div
                    key={alert.alert_id}
                    className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-3"
                  >
                    <div>
                      <Link
                        href={`/stores/${alert.domain}`}
                        className="font-semibold text-[var(--accent-strong)] hover:underline text-sm"
                      >
                        {alert.domain}
                      </Link>
                      <div className="text-xs text-[var(--muted)]">
                        Created: {new Date(alert.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteAlert(alert.alert_id)}
                      className="btn-ghost text-[var(--danger)] text-sm"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            ) : lookupEmail ? (
              <p className="mt-4 text-sm text-[var(--muted)]">No alerts found for this email.</p>
            ) : (
              <p className="mt-4 text-sm text-[var(--muted)]">Enter your email to view existing alerts.</p>
            )}
          </div>

          <div className="surface-muted p-5">
            <h4 className="text-sm font-semibold text-[var(--ink)]">How alerts work</h4>
            <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
              <li className="flex gap-2">
                <span className="text-[var(--accent)]">&bull;</span>
                Stores are monitored daily for stack changes.
              </li>
              <li className="flex gap-2">
                <span className="text-[var(--accent)]">&bull;</span>
                Alerts trigger on meaningful tool, pricing, and inventory updates.
              </li>
              <li className="flex gap-2">
                <span className="text-[var(--accent)]">&bull;</span>
                High-value stores receive priority checks.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AlertsPage() {
  return (
    <AppShell>
      <Suspense fallback={
        <div className="space-y-4">
          <div className="skeleton h-8 w-48" />
          <div className="skeleton h-4 w-72" />
          <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr] mt-8">
            <div className="skeleton h-64 rounded-2xl" />
            <div className="skeleton h-64 rounded-2xl" />
          </div>
        </div>
      }>
        <AlertsContent />
      </Suspense>
    </AppShell>
  );
}

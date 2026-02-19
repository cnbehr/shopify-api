'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="skeleton h-8 w-32 rounded-lg" />
      </div>
    );
  }

  if (status === 'authenticated') return null;

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'var(--bg)' }}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-500/5 blur-3xl" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-purple-500/5 blur-3xl" />
      </div>

      <div className="relative mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-6 py-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <span className="pill">Welcome back</span>
          <h1 className="text-4xl font-bold leading-tight md:text-5xl">
            <span className="gradient-text">Shopify Intelligence</span>
          </h1>
          <p className="text-lg text-[var(--muted)] leading-relaxed">
            Competitive intelligence for DTC brands. Access store analytics, tool insights, and change alerts in one workspace.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="surface-muted p-4">
              <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Coverage</div>
              <div className="mt-2 text-2xl font-bold text-[var(--ink-strong)]">846K+ stores</div>
            </div>
            <div className="surface-muted p-4">
              <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Signals</div>
              <div className="mt-2 text-2xl font-bold text-[var(--ink-strong)]">Daily monitoring</div>
            </div>
          </div>
        </div>

        <div className="surface-panel p-8">
          <div className="space-y-3">
            <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Secure access</div>
            <h2 className="text-2xl font-bold">Sign in to continue</h2>
            <p className="text-sm text-[var(--muted)]">Use your Google account to access the platform.</p>
          </div>

          <button
            onClick={() => signIn('google', { callbackUrl: '/' })}
            className="btn-secondary mt-8 w-full justify-center"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span className="font-semibold">Continue with Google</span>
          </button>

          <div className="mt-8 rounded-xl border border-dashed border-[var(--border)] bg-[var(--panel-muted)] p-4 text-sm text-[var(--muted)]">
            You will be redirected to Google to authenticate securely.
          </div>
        </div>
      </div>
    </div>
  );
}

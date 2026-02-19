'use client';

import { useSession, signOut } from 'next-auth/react';

export default function UserMenu() {
  const { data: session } = useSession();

  if (!session?.user) {
    return (
      <a href="/login" className="btn-ghost text-sm text-[var(--accent-strong)]">
        Sign in
      </a>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-1.5">
      <span className="text-sm text-[var(--muted)] truncate max-w-[160px]">
        {session.user.email || 'User'}
      </span>
      <button
        onClick={() => signOut({ callbackUrl: '/login' })}
        className="btn-ghost text-sm"
      >
        Sign out
      </button>
    </div>
  );
}

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getWatchlistSummary } from '@/lib/bigquery';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ alerts: [] });
    }
    const alerts = await getWatchlistSummary(session.user.email);
    return NextResponse.json({ alerts });
  } catch (error) {
    console.error('Watchlist error:', error);
    return NextResponse.json({ alerts: [] }, { status: 500 });
  }
}

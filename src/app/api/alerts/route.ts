import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createAlert, getAlerts, deleteAlert } from '@/lib/bigquery';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const alerts = await getAlerts(session.user.email);
    return NextResponse.json({ alerts });
  } catch (error) {
    console.error('Alerts GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { domain } = body;

    if (!domain) {
      return NextResponse.json(
        { error: 'Domain required' },
        { status: 400 }
      );
    }

    const alertId = await createAlert(session.user.email, domain);
    return NextResponse.json({ alertId, success: true });
  } catch (error) {
    console.error('Alerts POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create alert' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const alertId = searchParams.get('alertId');

  if (!alertId) {
    return NextResponse.json({ error: 'Alert ID required' }, { status: 400 });
  }

  try {
    // Verify the alert belongs to the session user before deleting
    const userAlerts = await getAlerts(session.user.email);
    const ownsAlert = userAlerts.some((a) => a.alert_id === alertId);
    if (!ownsAlert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    await deleteAlert(alertId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Alerts DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete alert' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { notificationCache } from '@/lib/notification-cache';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.userId as string;
    const unreadCount = await notificationCache.getUnreadCount(userId);

    return NextResponse.json({ unread: unreadCount });
  } catch (error) {
    console.error('Fetch notification count error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

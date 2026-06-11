import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiCache } from '@/lib/cache';
import { notificationCache } from '@/lib/notification-cache';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.userId as string;
    const notifications = await notificationCache.getRecentNotifications(userId);

    return NextResponse.json(notifications);
  } catch (error) {
    console.error('Fetch notifications error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.userId as string;
    const body = await req.json();
    const { id, all } = body;

    if (all) {
      await prisma.notification.updateMany({
        where: {
          userId
        },
        data: {
          isRead: true
        }
      });
      // Synchronize Redis Cache immediately
      await notificationCache.onNotificationMarkedRead(userId, '', true);
    } else if (id) {
      await prisma.notification.update({
        where: {
          id,
          userId
        },
        data: {
          isRead: true
        }
      });
      // Synchronize Redis Cache immediately
      await notificationCache.onNotificationMarkedRead(userId, id, false);
    }

    // Clear downstream apiCache notifications helper
    apiCache.invalidateNotifications(userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update notifications error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiCache } from '@/lib/cache';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '5');
    const userId = session.userId as string;
    const cacheKey = `dashboard:projects:${userId}:${limit}`;

    const formattedProjects = await apiCache.get(cacheKey, 60, async () => {
      const recentProjects = await prisma.project.findMany({
        where: {
          members: {
            some: { userId }
          }
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        include: {
          _count: {
            select: {
              tasks: true
            }
          },
          tasks: {
            select: {
              state: true
            }
          }
        }
      });

      return recentProjects.map(p => {
        const totalTasks = p._count.tasks;
        const completedTasks = p.tasks.filter(t => t.state === 'DONE').length;
        const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        const formatEnum = (str: string) => {
          if (!str) return '';
          return str.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        };

        return {
          id: p.id,
          name: p.name,
          identifier: p.identifier,
          status: formatEnum(p.status) || 'Draft',
          health: formatEnum(p.health) || 'Healthy',
          completionPercent: progressPercent,
          updatedAt: p.updatedAt
        };
      });
    });

    return NextResponse.json(formattedProjects);
  } catch (error) {
    console.error('Fetch recent projects error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

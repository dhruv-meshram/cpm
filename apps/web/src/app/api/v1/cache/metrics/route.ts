import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { queryCache } from '@/lib/query-cache';
import { projectOverviewCache } from '@/lib/project-overview-cache';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'reset') {
      queryCache.resetMetrics();
      projectOverviewCache.resetMetrics();
      return NextResponse.json({ success: true, message: 'Metrics reset successfully' });
    }

    const queryMetrics = queryCache.getMetrics();
    const overviewMetrics = projectOverviewCache.getMetrics();

    return NextResponse.json({
      queryCache: {
        hits: queryMetrics.hits,
        misses: queryMetrics.misses,
        invalidations: queryMetrics.invalidations,
        recalculations: queryMetrics.recalculations,
        averageResponseTimeMs: queryMetrics.hits + queryMetrics.misses > 0
          ? Math.round(queryMetrics.totalResponseTime / (queryMetrics.hits + queryMetrics.misses))
          : 0,
        hitRate: queryMetrics.hits + queryMetrics.misses > 0
          ? Number(((queryMetrics.hits / (queryMetrics.hits + queryMetrics.misses)) * 100).toFixed(2))
          : 0
      },
      projectOverviewCache: {
        hits: overviewMetrics.hits,
        misses: overviewMetrics.misses,
        invalidations: overviewMetrics.invalidations,
        averageResponseTimeMs: overviewMetrics.hits + overviewMetrics.misses > 0
          ? Math.round(overviewMetrics.totalResponseTime / (overviewMetrics.hits + overviewMetrics.misses))
          : 0,
        hitRate: overviewMetrics.hits + overviewMetrics.misses > 0
          ? Number(((overviewMetrics.hits / (overviewMetrics.hits + overviewMetrics.misses)) * 100).toFixed(2))
          : 0
      }
    });
  } catch (error) {
    console.error('Fetch cache metrics error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

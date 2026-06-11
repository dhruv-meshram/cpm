import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { queryCache } from '@/lib/query-cache';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const groupBy = searchParams.get('groupBy') || 'status';

    let data;
    switch (groupBy) {
      case 'status':
        data = await queryCache.getTaskStatsByStatus();
        break;
      case 'priority':
        data = await queryCache.getTaskStatsByPriority();
        break;
      case 'assignee':
        data = await queryCache.getTaskStatsByAssignee();
        break;
      case 'department':
        data = await queryCache.getTaskStatsByDepartment();
        break;
      case 'project':
        data = await queryCache.getTaskStatsByProject();
        break;
      default:
        return NextResponse.json({ error: `Invalid groupBy parameter: ${groupBy}` }, { status: 400 });
    }

    return NextResponse.json({ groupBy, data });
  } catch (error) {
    console.error('Fetch task stats query error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

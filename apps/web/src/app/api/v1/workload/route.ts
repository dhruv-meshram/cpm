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
    const userId = searchParams.get('userId');

    let data;
    if (userId) {
      data = await queryCache.getUserWorkload(userId);
    } else {
      data = await queryCache.getTeamWorkload();
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Fetch workload query error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

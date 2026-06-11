import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { queryCache } from '@/lib/query-cache';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await queryCache.getApprovalStats();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Fetch approval stats query error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

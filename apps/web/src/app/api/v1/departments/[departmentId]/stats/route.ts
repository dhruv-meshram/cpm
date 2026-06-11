import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { queryCache } from '@/lib/query-cache';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, props: { params: Promise<{ departmentId: string }> }) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { departmentId } = await props.params;

    // Verify department exists and user belongs to its project
    const department = await prisma.department.findUnique({
      where: { id: departmentId },
      select: { projectId: true }
    });

    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: department.projectId, userId: session.userId as string } }
    });

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'summary';

    let data;
    if (type === 'workload') {
      data = await queryCache.getDepartmentWorkload(departmentId);
    } else {
      data = await queryCache.getDepartmentStats(departmentId);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Fetch department stats query error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

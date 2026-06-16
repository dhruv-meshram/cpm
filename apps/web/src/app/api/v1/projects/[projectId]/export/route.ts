import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;

    // Validate access
    const isMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId: session.userId as string }
      }
    });

    if (!isMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch project
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Fetch tasks
    const tasks = await prisma.task.findMany({
      where: { projectId, deletedAt: null },
      include: {
        taskCustomValues: true
      },
      orderBy: { createdAt: 'asc' }
    });

    // Fetch dependencies
    const dependencies = await prisma.dependency.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' }
    });

    const escapeXml = (unsafe: string | null | undefined): string => {
      if (!unsafe) return '';
      return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
          case '<': return '&lt;';
          case '>': return '&gt;';
          case '&': return '&amp;';
          case '\'': return '&apos;';
          case '"': return '&quot;';
          default: return c;
        }
      });
    };

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<CPMProject>\n`;
    xml += `  <ProjectInfo>\n`;
    xml += `    <ID>${escapeXml(project.id)}</ID>\n`;
    xml += `    <Name>${escapeXml(project.name)}</Name>\n`;
    xml += `  </ProjectInfo>\n`;
    
    xml += `  <Tasks>\n`;
    for (const t of tasks) {
      const isCriticalVal = t.taskCustomValues.find(v => v.key === 'Critical');
      const isCritical = isCriticalVal ? (isCriticalVal.value === 'true' || isCriticalVal.value === true) : false;

      xml += `    <Task>\n`;
      xml += `      <ID>${escapeXml(t.id)}</ID>\n`;
      xml += `      <Title>${escapeXml(t.title)}</Title>\n`;
      xml += `      <Description>${escapeXml(t.description)}</Description>\n`;
      xml += `      <Duration>${t.duration}</Duration>\n`;
      xml += `      <StartDate>${t.startDate ? t.startDate.toISOString() : ''}</StartDate>\n`;
      xml += `      <EndDate>${t.endDate ? t.endDate.toISOString() : ''}</EndDate>\n`;
      xml += `      <State>${escapeXml(t.state)}</State>\n`;
      xml += `      <ParentID>${t.parentTaskId ? escapeXml(t.parentTaskId) : ''}</ParentID>\n`;
      xml += `      <IsCritical>${isCritical ? 'true' : 'false'}</IsCritical>\n`;
      xml += `    </Task>\n`;
    }
    xml += `  </Tasks>\n`;

    xml += `  <Dependencies>\n`;
    for (const d of dependencies) {
      xml += `    <Dependency>\n`;
      xml += `      <PredecessorID>${escapeXml(d.predecessorTaskId)}</PredecessorID>\n`;
      xml += `      <SuccessorID>${escapeXml(d.successorTaskId)}</SuccessorID>\n`;
      xml += `      <Type>${escapeXml(d.dependencyType)}</Type>\n`;
      xml += `      <Lag>${d.lag}</Lag>\n`;
      xml += `    </Dependency>\n`;
    }
    xml += `  </Dependencies>\n`;
    xml += `</CPMProject>\n`;

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Content-Disposition': `attachment; filename="${project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-cpm.xml"`
      }
    });

  } catch (error) {
    console.error('Export project error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

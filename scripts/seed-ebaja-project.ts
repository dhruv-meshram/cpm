import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { parseProjectLibreXML, transformProjectLibreData } from '../apps/web/src/lib/projectlibre/parser';

const prisma = new PrismaClient();

async function run() {
  console.log('Starting eBAJA Project Seed Process...');

  // 1. Locate user
  const email = 'test123@gmail.com';
  const user = await prisma.user.findUnique({
    where: { email },
    include: { workspaceMemberships: { include: { workspace: true } } }
  });

  if (!user) {
    console.error(`Validation Failed: User with email ${email} not found.`);
    process.exit(1);
  }
  
  let workspaceId = user.workspaceMemberships.find(m => m.role === 'OWNER')?.workspaceId;
  if (!workspaceId && user.workspaceMemberships.length > 0) {
    workspaceId = user.workspaceMemberships[0].workspaceId;
  }
  
  if (!workspaceId) {
     console.error('Validation Failed: User does not belong to any workspace.');
     process.exit(1);
  }

  // 2. Parse XML
  const xmlPath = path.join(process.cwd(), 'ebaja-cpm.xml');
  if (!fs.existsSync(xmlPath)) {
    console.error(`Validation Failed: XML file not found at ${xmlPath}`);
    process.exit(1);
  }

  const xmlContent = fs.readFileSync(xmlPath, 'utf-8');
  const parsed = parseProjectLibreXML(xmlContent);
  
  if (!parsed.success || !parsed.data) {
    console.error('Validation Failed: XML parsing error:', parsed.error);
    process.exit(1);
  }

  // 3. Build normalized task tree
  const transformed = transformProjectLibreData(parsed.data);
  
  if (transformed.tasks.length === 0) {
     console.error('Validation Failed: No tasks discovered in XML.');
     process.exit(1);
  }

  // 4. Create project
  const projectName = "eBAJA 2027";
  const count = await prisma.project.count({ where: { workspaceId } });
  const identifier = `EBAJA-${count + 1}`;

  const project = await prisma.project.create({
    data: {
      name: projectName,
      identifier,
      workspaceId,
      description: 'Imported from ProjectLibre export (ebaja-cpm.xml)',
      status: 'DRAFT',
      health: 'HEALTHY',
      ownerId: user.id,
      members: {
        create: { userId: user.id, role: 'OWNER' }
      }
    }
  });

  // 5. Insert tasks
  const idMap = new Map<string, string>();
  for (const t of transformed.tasks) {
     idMap.set(t.id, randomUUID());
  }

  const tasksToInsert = transformed.tasks.map(t => ({
    id: idMap.get(t.id)!,
    projectId: project.id,
    title: t.name,
    description: '',
    duration: t.durationHours > 0 ? t.durationHours / 24 : 1, // Store as days
    estimatedDays: t.durationHours > 0 ? t.durationHours / 24 : 1,
    startDate: t.start ? new Date(t.start.endsWith('Z') || t.start.includes('+') ? t.start : t.start + 'Z') : null,
    endDate: t.finish ? new Date(t.finish.endsWith('Z') || t.finish.includes('+') ? t.finish : t.finish + 'Z') : null,
    state: 'TODO' as any,
    isDraft: false,
    parentTaskId: t.parentId ? idMap.get(t.parentId)! : null
  }));

  await prisma.task.createMany({ data: tasksToInsert });

  // 5.1 Insert custom values for critical tasks
  const criticalCustomValues = transformed.tasks
    .filter(t => t.isCritical)
    .map(t => ({
      id: randomUUID(),
      taskId: idMap.get(t.id)!,
      key: 'Critical',
      value: true as any
    }));

  if (criticalCustomValues.length > 0) {
    await prisma.taskCustomValue.createMany({ data: criticalCustomValues });
    console.log(`Inserted ${criticalCustomValues.length} critical status markers.`);
  }

  // 6. Rebuild dependency graph
  const dependenciesToInsert = [];
  const existingEdges = new Set<string>();

  for (const t of transformed.tasks) {
    for (const d of t.dependencies) {
      const predId = idMap.get(d.predecessorId);
      const succId = idMap.get(t.id);
      
      if (!predId) {
         console.warn(`Warning: Orphan dependency reference from Task ${t.name} to missing predecessor ID ${d.predecessorId}`);
         continue;
      }
      
      const depTypeMap: Record<number, string> = { 1: 'FS', 2: 'FF', 3: 'SS', 4: 'SF' };
      const depType = depTypeMap[d.type] || 'FS';
      
      const edgeKey = `${predId}-${succId}-${depType}`;
      if (existingEdges.has(edgeKey)) continue;
      existingEdges.add(edgeKey);

      dependenciesToInsert.push({
        id: randomUUID(),
        projectId: project.id,
        predecessorTaskId: predId,
        successorTaskId: succId,
        dependencyType: depType as any,
        lag: 0
      });
    }
  }

  if (dependenciesToInsert.length > 0) {
    await prisma.dependency.createMany({ data: dependenciesToInsert });
  }

  // 7. Print import summary
  console.log(`\nImported Project: ${projectName}\n`);
  console.log(`Tasks Imported: ${transformed.metrics.tasksToImport}`);
  console.log(`Tasks Skipped: ${transformed.metrics.ignoredNodes.length}`);
  console.log(`Dependencies Imported: ${dependenciesToInsert.length}`);
  console.log(`Milestones Imported: ${transformed.metrics.milestoneCount}\n`);

  console.log('Skipped Nodes:');
  for (const node of transformed.metrics.ignoredNodes) {
    console.log(`* ${node}`);
  }

  console.log('\nImport Completed Successfully');

  await prisma.$disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

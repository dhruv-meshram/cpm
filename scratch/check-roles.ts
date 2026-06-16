import { prisma } from '../apps/web/src/lib/prisma';

async function main() {
  const projectId = 'cmqgxdo6g0001x69ol93hozsk';
  const taskId = 'aabcb149-9815-479f-adb0-035d51c8789e';

  console.log('--- Project Members ---');
  const members = await prisma.projectMember.findMany({
    where: { projectId },
    include: { user: true }
  });
  console.log(JSON.stringify(members, null, 2));

  console.log('--- Task Details ---');
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      assignees: {
        include: { user: true }
      },
      departments: true
    }
  });
  console.log(JSON.stringify(task, null, 2));
}

main().catch(console.error);

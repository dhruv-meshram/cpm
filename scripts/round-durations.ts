import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const tasks = await prisma.task.findMany();
  for (const task of tasks) {
    const dur = Math.round(Number(task.duration));
    if (Number(task.duration) !== dur) {
      await prisma.task.update({
        where: { id: task.id },
        data: {
          duration: dur,
          estimatedDays: dur
        }
      });
    }
  }
  console.log('Task durations rounded to integers.');
}

run().catch(console.error).finally(() => prisma.$disconnect());

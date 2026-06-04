import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const p = await prisma.cPMSnapshot.findFirst({ orderBy: { calculationTime: 'desc' } });
  console.log(JSON.stringify(p, null, 2));
}

run().catch(console.error);

import { PrismaClient } from '@prisma/client';
import { hash } from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const email = 'test123@gmail.com';
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    console.log('User already exists');
    return;
  }

  const passwordHash = await hash('Password123!');
  const user = await prisma.user.create({
    data: {
      name: 'testuser',
      email,
      passwordHash,
    },
  });

  const workspace = await prisma.workspace.create({
    data: {
      name: 'Personal Workspace',
      slug: `personal-${user.id}`,
      members: {
        create: { userId: user.id, role: 'OWNER' }
      }
    }
  });

  console.log('Created user and workspace successfully:', user.id, workspace.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

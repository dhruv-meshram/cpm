import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prismaClient: PrismaClient | undefined;
}

const prismaClient = globalThis.__prismaClient ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prismaClient = prismaClient;
}

export { prismaClient };

export async function runTransaction<T>(fn: (prisma: PrismaClient) => Promise<T>) {
  return prismaClient.$transaction(fn as any);
}

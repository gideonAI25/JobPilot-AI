import 'server-only';
import { PrismaClient } from '@prisma/client';

/**
 * JobPilot AI Prisma Client Singleton
 *
 * In Next.js development mode, hot-module-reloading can instantiate
 * multiple PrismaClient instances leading to connection exhaustion or SQLite locks.
 * We attach the client instance to `globalThis` in development to ensure a single
 * shared instance across reloads.
 *
 * The import 'server-only' guarantees that any accidental client-side import
 * is caught at build-time.
 */

const prismaClientSingleton = () => {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['error', 'warn']
        : ['error'],
  });
};

declare const globalThis: {
  prismaGlobal?: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}

export default prisma;

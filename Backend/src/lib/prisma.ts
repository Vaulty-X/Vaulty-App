/**
 * Shared Prisma Client singleton.
 *
 * No `prisma/schema.prisma` exists in this repo yet, so this file (and
 * any module importing `@prisma/client`) requires one to be added and
 * `prisma generate` to be run before `npm run build` / `npm test` will
 * pick up real Prisma types. Centralizing the client here means that,
 * once the schema exists, every module reuses a single connection pool
 * instead of instantiating its own `PrismaClient`.
 */

import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient = global.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

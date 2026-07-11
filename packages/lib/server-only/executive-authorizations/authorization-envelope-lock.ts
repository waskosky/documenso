import { prisma } from '@documenso/prisma';
import { Prisma } from '@prisma/client';

export type AuthorizationEnvelopeLockTransaction = Pick<Prisma.TransactionClient, '$executeRaw'>;

type AuthorizationEnvelopeLockPrismaClient = {
  $transaction: <T>(
    operation: (transaction: AuthorizationEnvelopeLockTransaction) => Promise<T>,
    options: { maxWait: number; timeout: number },
  ) => Promise<T>;
};

const AUTHORIZATION_ENVELOPE_LOCK_MAX_WAIT = 10_000;
const AUTHORIZATION_ENVELOPE_LOCK_TIMEOUT = 120_000;

export const acquireAuthorizationEnvelopeLock = async ({
  authorizationId,
  teamId,
  transaction,
}: {
  authorizationId: string;
  teamId: number;
  transaction: AuthorizationEnvelopeLockTransaction;
}) => {
  const lockKey = `executive-authorization-envelope:${teamId}:${authorizationId}`;

  await transaction.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`);
};

export const withAuthorizationEnvelopeLock = async <T>({
  authorizationId,
  operation,
  prismaClient = prisma as unknown as AuthorizationEnvelopeLockPrismaClient,
  teamId,
}: {
  authorizationId: string;
  operation: () => Promise<T>;
  prismaClient?: AuthorizationEnvelopeLockPrismaClient;
  teamId: number;
}) => {
  return await prismaClient.$transaction(
    async (transaction) => {
      await acquireAuthorizationEnvelopeLock({ authorizationId, teamId, transaction });

      return await operation();
    },
    {
      maxWait: AUTHORIZATION_ENVELOPE_LOCK_MAX_WAIT,
      timeout: AUTHORIZATION_ENVELOPE_LOCK_TIMEOUT,
    },
  );
};

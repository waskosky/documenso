import { prisma } from '@documenso/prisma';

export const listExecutiveAuthorizations = async ({ teamId }: { teamId: number }) =>
  await prisma.executiveAuthorization.findMany({
    include: {
      envelope: {
        select: {
          id: true,
          secondaryId: true,
          status: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    where: {
      teamId,
    },
  });

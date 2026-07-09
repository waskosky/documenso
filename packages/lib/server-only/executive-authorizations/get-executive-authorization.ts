import { prisma } from '@documenso/prisma';

export const getExecutiveAuthorization = async ({ id, teamId }: { id: string; teamId: number }) =>
  await prisma.executiveAuthorization.findFirst({
    include: {
      createdByUser: {
        select: {
          email: true,
          id: true,
          name: true,
        },
      },
      envelope: {
        select: {
          id: true,
          secondaryId: true,
          status: true,
          title: true,
        },
      },
    },
    where: {
      id,
      teamId,
    },
  });

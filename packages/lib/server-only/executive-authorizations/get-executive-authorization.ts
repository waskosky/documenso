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
          completedAt: true,
          envelopeItems: {
            orderBy: {
              order: 'asc',
            },
            select: {
              envelopeId: true,
              id: true,
              order: true,
              title: true,
            },
          },
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

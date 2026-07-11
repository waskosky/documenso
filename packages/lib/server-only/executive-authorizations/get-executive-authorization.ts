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
          externalId: true,
          formValues: true,
          envelopeItems: {
            orderBy: {
              order: 'asc',
            },
            select: {
              envelopeId: true,
              documentDataId: true,
              id: true,
              order: true,
              title: true,
            },
          },
          id: true,
          recipients: {
            orderBy: {
              signingOrder: 'asc',
            },
            select: {
              email: true,
              fields: {
                select: {
                  envelopeItemId: true,
                  height: true,
                  page: true,
                  positionX: true,
                  positionY: true,
                  type: true,
                  width: true,
                },
              },
              name: true,
              role: true,
              signingOrder: true,
            },
          },
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

import { createHash } from 'node:crypto';

export const buildAuthorizationProfileRevision = ({
  id,
  templateVersion,
  updatedAt,
}: {
  id: string;
  templateVersion?: number;
  updatedAt?: Date;
}) => {
  if (!(updatedAt instanceof Date) || !Number.isInteger(templateVersion)) {
    throw new Error('Authorization profile revision is unavailable.');
  }

  return createHash('sha256')
    .update(`${id}:${templateVersion}:${updatedAt.toISOString()}`)
    .digest('hex');
};

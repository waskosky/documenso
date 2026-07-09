import type { AuthorizationSigner } from './types';

export const normalizeAuthorizationSigners = (value: unknown): AuthorizationSigner[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((signer, index): AuthorizationSigner | null => {
      if (!signer || typeof signer !== 'object') {
        return null;
      }

      const data = signer as Record<string, unknown>;

      return {
        email: typeof data.email === 'string' ? data.email : '',
        name: typeof data.name === 'string' ? data.name : 'Unnamed signer',
        recipientId: typeof data.recipientId === 'number' ? data.recipientId : undefined,
        role: typeof data.role === 'string' ? data.role : 'Signer',
        sendStatus: typeof data.sendStatus === 'string' ? data.sendStatus : undefined,
        signedAt:
          typeof data.signedAt === 'string' || data.signedAt === null ? data.signedAt : undefined,
        signingOrder: typeof data.signingOrder === 'number' ? data.signingOrder : index + 1,
        signingUrl: typeof data.signingUrl === 'string' ? data.signingUrl : undefined,
        status: typeof data.status === 'string' ? data.status : undefined,
      };
    })
    .filter((signer): signer is AuthorizationSigner => Boolean(signer));
};

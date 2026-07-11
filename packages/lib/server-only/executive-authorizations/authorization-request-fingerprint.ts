import { createHash } from 'node:crypto';

type ExecutiveAuthorizationRequestFingerprintInput = {
  notes?: string | null;
  payload: unknown;
  templateKey: string;
  templateVersion: number;
};

const canonicalizeJson = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => canonicalizeJson(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
        .map(([key, item]) => [key, canonicalizeJson(item)]),
    );
  }

  return value;
};

export const buildExecutiveAuthorizationRequestFingerprint = (input: ExecutiveAuthorizationRequestFingerprintInput) =>
  createHash('sha256')
    .update(
      JSON.stringify(
        canonicalizeJson({
          notes: input.notes ?? null,
          payload: input.payload,
          templateKey: input.templateKey,
          templateVersion: input.templateVersion,
        }),
      ),
    )
    .digest('hex');

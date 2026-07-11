import { findDuplicateAuthorizationSignerEmail } from './signer-email';
import { getAuthorizationTemplate } from './templates';
import type { AuthorizationSigner, AuthorizationTemplateKey } from './types';

const normalizeRole = (value: string) => value.trim().toLowerCase();

export const validateAuthorizationTemplateSigners = ({
  signers,
  templateKey,
  templateVersion,
}: {
  signers: AuthorizationSigner[];
  templateKey: AuthorizationTemplateKey;
  templateVersion?: number;
}) => {
  const template = getAuthorizationTemplate(templateKey, templateVersion);
  const configuredRoles = template.signing.signerRoles;
  const allowedRoles = new Map(
    configuredRoles.flatMap((role) => [
      [normalizeRole(role.key), role] as const,
      [normalizeRole(role.label), role] as const,
    ]),
  );

  signers.forEach((signer, index) => {
    if (!signer.name.trim()) {
      throw new Error(`Signer ${index + 1} is missing a name.`);
    }

    if (!signer.email.trim()) {
      throw new Error(`Signer "${signer.name}" is missing an email address.`);
    }

    if (!allowedRoles.has(normalizeRole(signer.role))) {
      throw new Error(`Unexpected signer role "${signer.role}" for template "${template.label}".`);
    }
  });

  const duplicateEmail = findDuplicateAuthorizationSignerEmail(
    signers.map((signer) => signer.email),
  );

  if (duplicateEmail) {
    throw new Error(
      `Each signer must have a unique email address. Duplicate: "${duplicateEmail}".`,
    );
  }

  for (const role of configuredRoles) {
    const roleCount = signers.filter((signer) => {
      const signerRole = normalizeRole(signer.role);

      return signerRole === normalizeRole(role.key) || signerRole === normalizeRole(role.label);
    }).length;
    const exceedsMaximum = role.maxCount !== undefined && roleCount > role.maxCount;

    if (roleCount < role.minCount || exceedsMaximum) {
      if (role.maxCount === role.minCount) {
        throw new Error(`Template requires exactly ${role.minCount} ${role.label} signers.`);
      }

      throw new Error(`Template requires at least ${role.minCount} ${role.label} signers.`);
    }
  }

  return signers;
};

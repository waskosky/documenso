export const normalizeAuthorizationSignerEmail = (email: string) => email.trim().toLowerCase();

export const findDuplicateAuthorizationSignerEmail = (emails: string[]) => {
  const normalizedEmails = new Set<string>();

  for (const email of emails) {
    const normalizedEmail = normalizeAuthorizationSignerEmail(email);

    if (!normalizedEmail) {
      continue;
    }

    if (normalizedEmails.has(normalizedEmail)) {
      return email.trim();
    }

    normalizedEmails.add(normalizedEmail);
  }

  return null;
};

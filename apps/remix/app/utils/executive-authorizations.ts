const signerSlots = [0, 1, 2];

const getString = (formData: FormData, key: string) => String(formData.get(key) ?? '').trim();

const getList = (formData: FormData, key: string) =>
  getString(formData, key)
    .split('\n')
    .map((value) => value.trim())
    .filter(Boolean);

export const buildBoardAuthorizationInputFromFormData = (formData: FormData) => {
  const directors = signerSlots
    .map((index) => ({
      email: getString(formData, `directorEmail-${index}`),
      name: getString(formData, `directorName-${index}`),
      presence: getString(formData, `directorPresence-${index}`) || 'Consented',
      vote: getString(formData, `directorVote-${index}`) || 'For',
    }))
    .filter((director) => director.name || director.email);

  return {
    notes: getString(formData, 'notes'),
    payload: {
      actionDate: getString(formData, 'actionDate'),
      actionTitle: getString(formData, 'actionTitle'),
      authorizedOfficerName: getString(formData, 'authorizedOfficerName'),
      authorizedOfficerTitle: getString(formData, 'authorizedOfficerTitle'),
      companyLegalName: getString(formData, 'companyLegalName'),
      consentMethod: getString(formData, 'consentMethod'),
      directors,
      entityType: getString(formData, 'entityType'),
      investorCondition: getString(formData, 'investorCondition'),
      jurisdiction: getString(formData, 'jurisdiction'),
      matterDescription: getString(formData, 'matterDescription'),
      materialsReviewed: getList(formData, 'materialsReviewed'),
      resolutionDisposition: getString(formData, 'resolutionDisposition'),
      resolutionTerms: getString(formData, 'resolutionTerms'),
      secretaryName: getString(formData, 'secretaryName'),
    },
    templateKey: 'board_resolution_secretary_certificate' as const,
  };
};

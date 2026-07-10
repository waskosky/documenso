const authorizationDateFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
  year: 'numeric',
});

const authorizationDateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  month: 'short',
  timeZone: 'UTC',
  timeZoneName: 'short',
  year: 'numeric',
});

export const formatAuthorizationDate = (isoDate: string | null | undefined) => {
  if (!isoDate) {
    return null;
  }

  return authorizationDateFormatter.format(new Date(isoDate));
};

export const formatAuthorizationDateTime = (isoDate: string | null | undefined) => {
  if (!isoDate) {
    return null;
  }

  return authorizationDateTimeFormatter.format(new Date(isoDate));
};

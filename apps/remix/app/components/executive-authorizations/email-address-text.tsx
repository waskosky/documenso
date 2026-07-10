export const EmailAddressText = ({ className, email }: { className?: string; email: string }) => {
  const atIndex = email.indexOf('@');

  if (atIndex <= 0 || atIndex === email.length - 1) {
    return <span className={className}>{email}</span>;
  }

  const localPart = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);

  return (
    <span className={className}>
      <span>{localPart}</span>
      <span>@</span>
      <span>{domain}</span>
    </span>
  );
};

const EMAIL_RE =
  /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

function isValidEmail(email: string): boolean {
  const at = email.indexOf('@');
  if (at <= 0) return false;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (!local || !domain.includes('.')) return false;
  if (local.startsWith('.') || local.endsWith('.')) return false;
  if (domain.startsWith('.') || domain.endsWith('.')) return false;
  return /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email);
}

/** Corrige artefatos comuns de extração de PDF antes da validação. */
export function sanitizeImportEmail(
  raw: string | null | undefined,
): string | null {
  if (!raw?.trim()) return null;

  let email = raw.trim().toLowerCase().replace(/[;,]+$/, '');
  const at = email.indexOf('@');
  if (at <= 0) return null;

  let local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (!domain.includes('.')) return null;

  local = local.replace(/^\.+|\.+$/g, '').replace(/\.{2,}/g, '.');
  if (!local) return null;

  email = `${local}@${domain}`;
  return isValidEmail(email) ? email : null;
}

export function extractSanitizedEmails(text: string): string[] {
  const raw = text.match(EMAIL_RE) ?? [];
  const valid: string[] = [];
  for (const match of raw) {
    const email = sanitizeImportEmail(match);
    if (!email || email.includes('nao informado')) continue;
    if (!valid.includes(email)) valid.push(email);
  }
  return valid;
}

export function maskEmailsInText(text: string): {
  masked: string;
  emails: string[];
} {
  const emails: string[] = [];
  const masked = text.replace(EMAIL_RE, (match) => {
    const email = sanitizeImportEmail(match) ?? match.toLowerCase().replace(/[;,]+$/, '');
    const idx = emails.length;
    emails.push(email);
    return ` __EMAIL_${idx}__ `;
  });
  return { masked, emails };
}

export function restoreEmailsInText(text: string, emails: string[]): string {
  return text.replace(/__EMAIL_(\d+)__/g, (_, index) => {
    const email = emails[Number(index)];
    return email ? ` ${email} ` : ' ';
  });
}

/**
 * Garante o nono dígito em celulares brasileiros (DDD + 8 dígitos iniciando em 6–9).
 * Fixos e números já com 9 dígitos após o DDD permanecem inalterados.
 */
export function ensureBrazilMobileNinthDigit(
  raw: string | null | undefined,
): string {
  if (!raw?.trim()) return '';

  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';

  let local = digits;
  const hasCountryCode = local.startsWith('55') && local.length >= 12;
  if (hasCountryCode) {
    local = local.slice(2);
  }

  if (local.length === 10) {
    const ddd = local.slice(0, 2);
    const subscriber = local.slice(2);
    if (/^[6-9]/.test(subscriber)) {
      const withNine = `${ddd}9${subscriber}`;
      return hasCountryCode ? `55${withNine}` : withNine;
    }
  }

  return digits;
}

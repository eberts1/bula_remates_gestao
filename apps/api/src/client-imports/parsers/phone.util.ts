/** Limite alinhado ao schema/DTO (z.string().max(30)). */
export const MAX_PHONE_DIGITS = 30;

const BR_SEGMENT_LENGTHS = [13, 12, 11, 10] as const;

function isPlausibleBrPhone(digits: string): boolean {
  if (digits.length < 10 || digits.length > 13) return false;
  const local =
    digits.length >= 12 && digits.startsWith('55')
      ? digits.slice(2)
      : digits;
  if (local.length < 10 || local.length > 11) return false;
  const ddd = Number(local.slice(0, 2));
  return ddd >= 11 && ddd <= 99;
}

/** Quando a célula traz vários números colados, usa o primeiro segmento válido. */
function firstPlausibleSegment(digits: string): string | null {
  for (const len of BR_SEGMENT_LENGTHS) {
    if (digits.length < len) continue;
    const head = digits.slice(0, len);
    if (isPlausibleBrPhone(head)) return head;
  }
  return null;
}

export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 8) return null;
  if (digits.length <= MAX_PHONE_DIGITS) return digits;

  const first = firstPlausibleSegment(digits);
  if (first) return first;

  return digits.slice(0, MAX_PHONE_DIGITS);
}

/** Separa vários telefones na mesma célula (ex.: " (66) 9999 / (66) 8888 "). */
export function splitPhonesFromCell(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];

  const parts = raw
    .split(/\s*\/\s*|[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (parts.length <= 1) {
    const single = normalizePhone(raw);
    return single ? [single] : [];
  }

  const phones: string[] = [];
  for (const part of parts) {
    const normalized = normalizePhone(part);
    if (normalized && !phones.includes(normalized)) {
      phones.push(normalized);
    }
  }
  return phones;
}

export function extractPhonesFromTail(line: string): {
  remainder: string;
  phones: string[];
} {
  const phones: string[] = [];
  let remainder = line.trim();
  const phonePattern =
    /\((\d{2})\)\s*([\d\s\-]+)|(?:^|\s)(\d{2})[\s\-]?(\d{4,5}[\-\s]?\d{4})/g;

  const matches: Array<{ index: number; len: number; formatted: string }> = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(phonePattern.source, 'g');
  while ((m = re.exec(remainder)) !== null) {
    const digits = (m[1] || m[3] || '') + (m[2] || m[4] || '').replace(/\D/g, '');
    if (digits.length >= 10) {
      matches.push({
        index: m.index,
        len: m[0].length,
        formatted: digits,
      });
    }
  }

  if (matches.length === 0) {
    const bare = remainder.match(/(\d{10,11})\s*$/);
    if (bare) {
      phones.push(bare[1]);
      remainder = remainder.slice(0, -bare[0].length).trim();
    }
    return { remainder, phones };
  }

  const lastStart = matches[matches.length - 1].index;
  for (const match of matches) {
    if (match.index >= lastStart - 5) {
      phones.push(match.formatted);
    }
  }

  remainder = remainder.slice(0, matches[0].index).trim();
  return { remainder, phones };
}

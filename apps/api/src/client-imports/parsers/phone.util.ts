export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 8) return null;
  return digits;
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

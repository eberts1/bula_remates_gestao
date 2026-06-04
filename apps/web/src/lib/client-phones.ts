const OTHER_PHONES_LINE = /^Outros telefones:\s*(.+)$/i;

/** Separa telefones extras (importação) do restante das observações. */
export function splitNotesAndExtraPhones(notes: string | null): {
  notesWithoutPhones: string;
  extraPhones: string[];
} {
  if (!notes?.trim()) {
    return { notesWithoutPhones: '', extraPhones: [] };
  }

  const extraPhones: string[] = [];
  const rest: string[] = [];

  for (const line of notes.split('\n')) {
    const match = line.trim().match(OTHER_PHONES_LINE);
    if (match) {
      extraPhones.push(
        ...match[1]
          .split(/[,;]+/)
          .map((s) => s.trim())
          .filter(Boolean),
      );
    } else {
      rest.push(line);
    }
  }

  return {
    notesWithoutPhones: rest.join('\n').trim(),
    extraPhones,
  };
}

export function parseExtraPhonesInput(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Reúne telefones do cadastro (cliente, propriedades, notas) sem duplicar. */
export function collectClientPhones(input: {
  phone: string | null;
  properties: Array<{ phone?: string | null }>;
  notes: string | null;
}): { phone: string; phone2: string; extraPhones: string } {
  const seen = new Set<string>();
  const ordered: string[] = [];

  const push = (value: string | null | undefined) => {
    const v = value?.trim();
    if (!v || seen.has(v)) return;
    seen.add(v);
    ordered.push(v);
  };

  push(input.phone);
  for (const p of input.properties) push(p.phone ?? null);

  const { extraPhones: fromNotes } = splitNotesAndExtraPhones(input.notes);
  for (const p of fromNotes) push(p);

  return {
    phone: ordered[0] ?? '',
    phone2: ordered[1] ?? '',
    extraPhones: ordered.slice(2).join('\n'),
  };
}

export function mergeNotesWithExtraPhones(
  baseNotes: string,
  extraPhones: string[],
): string {
  const lines = baseNotes
    .split('\n')
    .filter((l) => !OTHER_PHONES_LINE.test(l.trim()));

  const unique = [...new Set(extraPhones.map((p) => p.trim()).filter(Boolean))];
  if (unique.length > 0) {
    lines.push(`Outros telefones: ${unique.join(', ')}`);
  }

  return lines.join('\n').trim();
}

/** Distribui telefones ao salvar: cliente, 1ª propriedade e observações. */
export function distributePhonesForSave<T extends { phone?: string }>(input: {
  phone: string;
  phone2: string;
  extraPhones: string;
  properties: T[];
  adminNotes: string;
}): {
  clientPhone: string | undefined;
  properties: T[];
  notes: string | undefined;
} {
  const all = [
    input.phone.trim(),
    input.phone2.trim(),
    ...parseExtraPhonesInput(input.extraPhones),
  ].filter(Boolean);

  const unique = [...new Set(all)];
  const clientPhone = unique[0] || undefined;
  const propertyPhone = unique[1] || undefined;
  const extras = unique.slice(2);

  const properties = input.properties.map((p, i) =>
    i === 0 && propertyPhone ? { ...p, phone: propertyPhone } : p,
  );

  const notes = mergeNotesWithExtraPhones(input.adminNotes, extras);

  return {
    clientPhone,
    properties,
    notes: notes || undefined,
  };
}

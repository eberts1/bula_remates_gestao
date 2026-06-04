import { Prisma } from '@prisma/client';

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

/** Condições Prisma para busca textual (nome, e-mail, fazenda, cidade/UF, etc.). */
export function buildClientTextSearchConditions(
  q: string,
): Prisma.ClientWhereInput[] {
  const trimmed = q.trim();
  if (!trimmed) return [];

  const conditions: Prisma.ClientWhereInput[] = [
    { name: { contains: trimmed, mode: 'insensitive' } },
    { email: { contains: trimmed, mode: 'insensitive' } },
    { document: { contains: trimmed, mode: 'insensitive' } },
    { phone: { contains: trimmed, mode: 'insensitive' } },
    { legacyCode: { contains: trimmed, mode: 'insensitive' } },
    {
      properties: {
        some: {
          OR: [
            { farmName: { contains: trimmed, mode: 'insensitive' } },
            { city: { contains: trimmed, mode: 'insensitive' } },
            { state: { contains: trimmed, mode: 'insensitive' } },
            { phone: { contains: trimmed, mode: 'insensitive' } },
          ],
        },
      },
    },
  ];

  const digits = digitsOnly(trimmed);
  if (digits.length >= 3) {
    conditions.push({ document: { contains: digits } });
    conditions.push({ phone: { contains: digits } });
    conditions.push({
      properties: { some: { phone: { contains: digits } } },
    });
  }

  const cityUf = trimmed.match(/^(.+?)\s*[\/\-]\s*([a-zA-Z]{2})$/);
  if (cityUf) {
    const cityPart = cityUf[1].trim();
    const uf = cityUf[2].toUpperCase();
    if (cityPart) {
      conditions.push({
        properties: {
          some: {
            city: { contains: cityPart, mode: 'insensitive' },
            state: { equals: uf },
          },
        },
      });
    } else {
      conditions.push({
        properties: { some: { state: { equals: uf } } },
      });
    }
  }

  if (/^[a-zA-Z]{2}$/.test(trimmed)) {
    conditions.push({
      properties: { some: { state: { equals: trimmed.toUpperCase() } } },
    });
  }

  return conditions;
}

/** SQL: telefones/documentos com máscara ainda encontram busca só com dígitos. */
export function buildDigitSearchSql(
  tenantId: string,
  q: string,
): { sql: Prisma.Sql } | null {
  const digits = digitsOnly(q);
  if (digits.length < 2) return null;

  const isDddOnly = digits.length === 2;
  const phoneMatch = isDddOnly
    ? Prisma.sql`(
        regexp_replace(COALESCE(c.phone, ''), '[^0-9]', '', 'g') ~ ${`^(55)?${digits}`}
        OR regexp_replace(COALESCE(p.phone, ''), '[^0-9]', '', 'g') ~ ${`^(55)?${digits}`}
      )`
    : Prisma.sql`(
        regexp_replace(COALESCE(c.phone, ''), '[^0-9]', '', 'g') LIKE ${`%${digits}%`}
        OR regexp_replace(COALESCE(c.document, ''), '[^0-9]', '', 'g') LIKE ${`%${digits}%`}
        OR regexp_replace(COALESCE(p.phone, ''), '[^0-9]', '', 'g') LIKE ${`%${digits}%`}
      )`;

  return {
    sql: Prisma.sql`
      SELECT DISTINCT c.id
      FROM clients c
      LEFT JOIN client_properties p
        ON p.client_id = c.id AND p.tenant_id = c.tenant_id
      WHERE c.tenant_id = ${tenantId}::uuid
        AND c.deleted_at IS NULL
        AND ${phoneMatch}
    `,
  };
}

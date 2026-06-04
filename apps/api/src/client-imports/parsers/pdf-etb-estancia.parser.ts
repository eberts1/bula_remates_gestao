// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (
  buffer: Buffer,
) => Promise<{ text: string }>;

import type { ParseFileResult, ParsedImportRow } from './import-parser.types';
import {
  canonicalizeCity,
  findCitySuffixInWords,
  getEtbGluedCityNames,
} from './city-from-words.util';
import { extractPhonesFromTail, normalizePhone } from './phone.util';

const BRAZILIAN_STATES = new Set([
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]);

const UF_PATTERN =
  /\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\s*$/i;

/** Só FAZENDA/SÍTIO separam o nome; AGROPECUARIA no nome da empresa não conta. */
const PROPERTY_START = /\b(FAZENDA|SITIO|SÍTIO|SITIO)\b/i;

const PROPERTY_PREFIX =
  /^(FAZENDA|SITIO|SÍTIO|SITIO|AGROPECUARIA|AGROPECUÁRIA|AGROSB|AGROP\.|EST\s)/i;

const PROPERTY_LINE = PROPERTY_PREFIX;

const COMPANY_SUFFIX = /\b(S\.A\.|S\/A|LTDA\.?|ME|EIRELI|LIMITADA)\b/i;

/** Código ETB: `24.074` ou 4–6 dígitos — evita `15:37:47` virar código 15. */
const CODE_PREFIX = /^\s*((?:\d{1,3}\.\d{3})|\d{4,6})\s*(.*)$/;

const SKIP_LINE =
  /^(ESTANCIA BAHIA|LISTAGEM DE CLIENTES|Página \d|CÓDIGO\s*NOME|DADOS DA\(S\) FAZENDA|TELEFONES?\s*EMAIL|SISTEMA DE LEILÕES|-- \d+ of|\d+\s+Registros:|^\d{1,2}\/\d{2}\/\d{4}|^\/?\d{1,2}\/\d{2,4}$|^\d{1,2}:\d{2}|^:\d{2}:\d{2})/i;

const EMAIL_RE =
  /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

const UF_LIST = Array.from(BRAZILIAN_STATES).join('|');

export function normalizeLegacyCode(code: string): string {
  return code.replace(/\D/g, '');
}

export function detectEtbPdfText(text: string): boolean {
  const t = text.slice(0, 4000).toUpperCase();
  return (
    t.includes('ESTANCIA BAHIA') &&
    t.includes('LISTAGEM DE CLIENTES') &&
    (t.includes('CÓDIGO') || t.includes('CODIGO'))
  );
}

export function formatPropertyLabel(prop: {
  farmName: string;
  city: string;
  state: string;
}): string {
  const farm = prop.farmName.trim();
  const city = prop.city.trim();
  const uf = prop.state.trim();
  if (!farm || farm === '—') return city && uf ? `${city} ${uf}` : '—';
  if (!city || city === '—') return `${farm} ${uf}`.trim();
  return `${farm} - ${city} ${uf}`.trim();
}

const FARM_TO_CITY_GLUE = [
  ['JESUS', 'RIO'],
  ['JESUS', 'XINGUARA'],
  ['BOM', 'JESUS'],
  ['NOVA', 'PLANALTO'],
  ['PLANALTO', 'XINGUARA'],
  ['SANTA', 'ANA'],
  ['ANA', 'REDENCAO'],
  ['JN', 'OURILANDIA'],
  ['SERENO', 'CUMARU'],
  ['VALE', 'SERENO'],
  ['VALE', 'VERDE'],
  ['NOVA', 'VIDA'],
  ['ESPIRITO', 'SANTO'],
  ['PORTO', 'RICO'],
  ['ELDORADO', 'XINGUARA'],
  ['CEDRO', 'MARABA'],
  ['BARBARA', 'XINGUARA'],
  ['UBERABA', 'MG'],
  ['SANTA', 'FE'],
  ['SANTA', 'MARIA'],
  ['SANTA', 'LUZIA'],
  ['SAO', 'PEDRO'],
  ['SAO', 'FELIX'],
  ['SAO', 'DOMINGOS'],
  ['SONHO', 'MEU'],
  ['BOA', 'ESPERANCA'],
  ['BOA', 'SORTE'],
  ['PORTO', 'ESTRELA'],
  ['NOSSA', 'SENHORA'],
];

function normalizeEtbLine(line: string): string {
  let t = line.trim();
  if (!t) return t;

  t = t.replace(/^(\d{1,3}\.\d{3}|\d{4,6})/, '$1 ');
  t = t.replace(/(LTDA\.?|S\/A)(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ])/gi, '$1 ');
  // ME só após espaço (sufixo societário) — não quebra REPARTIMENTO, DEUSANTANA etc.
  t = t.replace(/(?<=\s)(ME|EIRELI|LIMITADA)(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ])/gi, '$1 ');
  t = t.replace(
    /([A-ZÁÉÍÓÚÂÊÔÃÕÇ]{3,})(FAZENDA|SITIO|SÍTIO|SITIO|AGROPECUARIA|AGROPECUÁRIA)/gi,
    '$1 $2',
  );
  t = t.replace(/\)(?=\()/g, ') ');
  t = t.replace(/(\d)\(/g, '$1 (');

  for (const [a, b] of FARM_TO_CITY_GLUE) {
    // Evita BOA+SORTE colar em SORTENOVO (BOA SORTE NOVO)
    const boundary = a === 'BOA' && b === 'SORTE' ? '(?!NOVO)' : '';
    t = t.replace(new RegExp(`${a}(${b})${boundary}`, 'gi'), `${a} $1`);
  }

  // UF colado ao fim (ex.: REPARTIMENTOPA, ARAGUAIAPA) — antes de separar cidades
  t = t.replace(
    new RegExp(`([A-ZÁÉÍÓÚÂÊÔÃÕÇ]{4,})(${UF_LIST})$`, 'gi'),
    '$1 $2',
  );
  t = t.replace(/DEUSANTANA/gi, 'DEUS SANTANA');
  t = t.replace(/SANTAANAREDENCAO/gi, 'SANTA ANA REDENCAO');

  const citiesSorted = getEtbGluedCityNames();
  for (const city of citiesSorted) {
    const esc = city.replace(/\s+/g, '\\s+');
    t = t.replace(new RegExp(`(${esc})\\s*(${UF_LIST})$`, 'gi'), '$1 $2');
    // Exige espaço antes do trecho da fazenda — evita SORTENOVO → SORTE + NOVO REPARTIMENTO
    t = t.replace(
      new RegExp(`(\\s)([A-Z]{2,14})(${esc})(?=\\s+${UF_LIST}$)`, 'gi'),
      '$1$2 $3',
    );
  }

  t = t.replace(
    new RegExp(`([A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇ\\s]{0,40})(${UF_LIST})$`, 'gi'),
    '$1 $2',
  );
  // Após separar UF: "SORTENOVO REPARTIMENTO" → fazenda SORTE + cidade NOVO REPARTIMENTO
  t = t.replace(/SORTENOVO(?=\s+REPARTIMENTO)/gi, 'SORTE NOVO');
  t = t.replace(/\bREPARTIME\s+NTO\b/gi, 'REPARTIMENTO');

  t = t.replace(/MEUFAZENDA/gi, 'MEU FAZENDA ');
  t = t.replace(/MEIOFAZENDA/gi, 'MEIO FAZENDA ');
  t = t.replace(
    new RegExp(
      `\\b(FAZENDA|SITIO|SÍTIO|SITIO)\\s+([A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇ\\s]*?)\\s+\\1\\s+(${UF_LIST})$`,
      'gi',
    ),
    '$1 $2 $3',
  );
  t = t.replace(/(FAZENDA|SITIO|SÍTIO|SITIO)/gi, ' $1 ');
  return t.replace(/\s+/g, ' ').trim();
}

function cleanLines(text: string): string[] {
  return text
    .split(/\n+/)
    .map((l) => normalizeEtbLine(l))
    .filter((l) => l.length > 3 && !SKIP_LINE.test(l));
}

function extractEmails(text: string): string[] {
  const raw = text.match(EMAIL_RE) ?? [];
  const valid: string[] = [];
  for (const e of raw) {
    const lower = e.toLowerCase().replace(/[;,]+$/, '');
    if (lower.length < 6 || lower.includes('nao informado')) continue;
    if (!valid.includes(lower)) valid.push(lower);
  }
  return valid;
}

function extractContactTail(line: string): {
  body: string;
  phones: string[];
  emails: string[];
  phoneDisplay: string;
} {
  const emails = extractEmails(line);
  let body = line;
  for (const e of emails) {
    body = body.replace(new RegExp(e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), ' ');
  }
  body = body.replace(/;portal\d*/gi, ' ').trim();

  const spaced = body.replace(/\)(?=\d|\()/g, ') ');
  const { remainder, phones: tailPhones } = extractPhonesFromTail(spaced);
  body = remainder;

  const phoneDisplayParts: string[] = [];
  const phoneMatches = line.match(/\(\d{2}\)\s*[\d\s\-]+/g) ?? [];
  for (const m of phoneMatches) {
    phoneDisplayParts.push(m.trim());
  }

  const phones = [...tailPhones];
  for (const m of phoneMatches) {
    const n = normalizePhone(m);
    if (n && !phones.includes(n)) phones.push(n);
  }

  return {
    body: body.replace(/\s+/g, ' ').trim(),
    phones,
    emails,
    phoneDisplay: phoneDisplayParts.join(' '),
  };
}

function findPropertyStart(text: string): number {
  const m = text.match(PROPERTY_START);
  return m?.index ?? -1;
}

function inferCityPartCount(parts: string[], state: string): number {
  if (parts.length <= 1) return 1;

  const ibge = findCitySuffixInWords(parts, state);
  if (ibge) return ibge.cityPartCount;

  const w = parts.map((p) => p.toUpperCase());

  if (parts.length >= 3 && w[parts.length - 2] === 'DO') {
    const doTail = w[parts.length - 1] ?? '';
    if (
      ['NORTE', 'SUL', 'ESTE', 'OESTE', 'ARAGUAIA', 'PARA', 'TOCANTINS', 'CARAJAS', 'CARAJÁS'].includes(
        doTail,
      )
    ) {
      return Math.min(3, parts.length - 1);
    }
  }

  let best = 1;
  let bestScore = 0;
  for (let cityParts = 1; cityParts <= Math.min(4, parts.length - 1); cityParts++) {
    const farmRest = parts.slice(0, -cityParts);
    if (farmRest.length === 0) continue;
    const cityCandidate = parts.slice(-cityParts).join(' ');
    if (/\b(FAZENDA|SITIO|SÍTIO)\b/i.test(cityCandidate)) continue;

    let score = cityParts;
    if (farmRest.length >= 2) score += 10;
    if (farmRest.length === 1 && farmRest[0].length <= 4) score += 5;

    if (score > bestScore) {
      bestScore = score;
      best = cityParts;
    }
  }
  return best;
}

function parseFarmLine(line: string): {
  farmName: string;
  city: string;
  state: string;
} | null {
  // Linhas já passaram por normalizeEtbLine em cleanLines; re-normalizar quebra REPARTIMENTO etc.
  let norm = line.replace(/\s*-\s*INATIVO/i, ' INATIVO').replace(/\s+/g, ' ').trim();
  norm = norm.replace(
    new RegExp(
      `\\b(FAZENDA|SITIO|SÍTIO|SITIO)\\s+([A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇ\\s]*?)\\s+\\1\\s+(${UF_LIST})$`,
      'gi',
    ),
    '$1 $2 $3',
  );
  const stateMatch = norm.match(UF_PATTERN);
  if (!stateMatch) return null;

  const state = stateMatch[1].toUpperCase();
  if (!BRAZILIAN_STATES.has(state)) return null;

  let beforeState = norm.slice(0, stateMatch.index).trim();

  const prefixMatch = beforeState.match(PROPERTY_PREFIX);
  let farmKeyword = 'FAZENDA';
  let afterKeyword = beforeState;

  if (prefixMatch?.index === 0) {
    farmKeyword = prefixMatch[0].trim();
    afterKeyword = beforeState.slice(prefixMatch[0].length).trim();
  } else {
    const farmMatch = beforeState.match(PROPERTY_START);
    if (!farmMatch || farmMatch.index === undefined) return null;
    farmKeyword = (farmMatch[0] ?? 'FAZENDA').trim();
    afterKeyword = beforeState.slice(farmMatch.index + farmMatch[0].length).trim();
  }
  const parts = afterKeyword.split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { farmName: farmKeyword, city: '', state };
  }

  const ibgeMatch = findCitySuffixInWords(parts, state);
  const cityParts = ibgeMatch?.cityPartCount ?? inferCityPartCount(parts, state);
  const rawCity = ibgeMatch?.cityName ?? parts.slice(-cityParts).join(' ');
  const farmRest = parts.slice(0, -cityParts).join(' ');
  const farmName = farmRest
    ? `${farmKeyword} ${farmRest}`.replace(/\s+/g, ' ').trim()
    : farmKeyword;

  const city = canonicalizeCity(rawCity.trim(), state) || '—';

  return {
    farmName,
    city,
    state,
  };
}

function isContactOnlyLine(line: string): boolean {
  const trimmed = line.trim();
  if (/^\(?\d{2}\)?/.test(trimmed) || EMAIL_RE.test(trimmed)) return true;
  if (/^(ni|nao informado)$/i.test(trimmed)) return true;
  return false;
}

function looksLikePropertyLine(body: string): boolean {
  if (PROPERTY_LINE.test(body)) return true;
  if (CODE_PREFIX.test(body)) return false;
  return UF_PATTERN.test(body) && body.split(/\s+/).length >= 2;
}

function extractCompanyName(firstBody: string): {
  name: string;
  remainder: string;
} | null {
  const match = firstBody.match(
    /^((?:AGROSB\s+)?(?:AGROPECUARIA\s+)?[\wÀ-Ú.\s]+?(?:(?:S\.A\.|S\/A|LTDA\.?|EIRELI|LIMITADA)|\sME\b))\.?\s*/i,
  );
  if (!match) return null;
  const name = match[1].replace(/\s+/g, ' ').trim();
  const remainder = firstBody.slice(match[0].length).trim();
  return { name, remainder };
}

interface EtbBlock {
  code: string;
  codeDisplay: string;
  lines: string[];
}

function groupBlocks(lines: string[]): EtbBlock[] {
  const blocks: EtbBlock[] = [];
  let current: EtbBlock | null = null;

  for (const line of lines) {
    const codeMatch = line.match(CODE_PREFIX);
    if (codeMatch && codeMatch[2]?.trim()) {
      if (current) blocks.push(current);
      current = {
        code: normalizeLegacyCode(codeMatch[1]),
        codeDisplay: codeMatch[1],
        lines: [codeMatch[2].trim()],
      };
      continue;
    }
    if (current) current.lines.push(line);
  }
  if (current) blocks.push(current);
  return blocks;
}

function isGarbageBlockName(name: string): boolean {
  const n = name.trim();
  if (n.length < 3) return true;
  if (/^[\d:/.\s-]+$/.test(n)) return true;
  if (/^LISTAGEM DE CLIENT/i.test(n)) return true;
  return false;
}

function parseBlock(block: EtbBlock, rowIndex: number): ParsedImportRow | null {
  const warnings: string[] = [];
  const groupKey = block.code;

  let name = '';
  const farmRawLines: string[] = [];
  const allPhones: string[] = [];
  const allEmails: string[] = [];

  const processLine = (line: string, isFirst: boolean) => {
    const contact = extractContactTail(line);
    for (const p of contact.phones) {
      if (!allPhones.includes(p)) allPhones.push(p);
    }
    for (const e of contact.emails) {
      if (!allEmails.includes(e)) allEmails.push(e);
    }

    if (isContactOnlyLine(line) && !contact.body) return;

    const body = contact.body || line;
    const propStart = findPropertyStart(body);

    if (isFirst) {
      const company = extractCompanyName(body);
      if (company) {
        name = company.name;
        if (company.remainder) farmRawLines.push(company.remainder);
        return;
      }
      if (propStart >= 0) {
        name = body.slice(0, propStart).trim();
        const farmPart = body.slice(propStart).trim();
        if (farmPart) farmRawLines.push(farmPart);
      } else if (body) {
        name = body;
      }
      return;
    }

    if (looksLikePropertyLine(body)) {
      farmRawLines.push(body);
    } else if (body.length > 2 && !name) {
      name = body;
    }
  };

  block.lines.forEach((line, i) => processLine(line, i === 0));

  name = name.replace(/\s+/g, ' ').trim();
  const propInName = findPropertyStart(name);
  if (propInName > 0) {
    const trailingFarm = name.slice(propInName).trim();
    name = name.slice(0, propInName).trim();
    if (trailingFarm) farmRawLines.unshift(trailingFarm);
  }

  const mergedFarmLines: string[] = [];
  for (const fl of farmRawLines) {
    const prev = mergedFarmLines[mergedFarmLines.length - 1];
    const hasUf = UF_PATTERN.test(fl);
    const hasFarmKw = PROPERTY_START.test(fl);
    if (
      prev &&
      hasUf &&
      !hasFarmKw &&
      !UF_PATTERN.test(prev)
    ) {
      mergedFarmLines[mergedFarmLines.length - 1] = `${prev} ${fl}`.replace(/\s+/g, ' ').trim();
      continue;
    }
    mergedFarmLines.push(fl);
  }

  const properties: Array<{ farmName: string; city: string; state: string }> = [];
  for (const fl of mergedFarmLines) {
    const parsed = parseFarmLine(fl);
    if (parsed) {
      if (/INATIVO/i.test(fl)) {
        warnings.push(`Inativo: ${formatPropertyLabel(parsed)}`);
      }
      properties.push(parsed);
    } else {
      warnings.push(`Fazenda não identificada: ${fl.slice(0, 70)}`);
    }
  }

  if (!name) warnings.push('Nome vazio');
  if (isGarbageBlockName(name)) return null;
  if (properties.length === 0) {
    warnings.push('Nenhuma fazenda identificada');
    properties.push({ farmName: '—', city: '—', state: 'PA' });
  }
  for (const p of properties) {
    if (!p.city.trim() || p.city === '—') {
      warnings.push(`Cidade não identificada: ${formatPropertyLabel(p)}`);
      p.city = '—';
    }
  }

  const email = allEmails[0] ?? null;
  const phone = allPhones[0] ?? null;
  const propertyPhone = allPhones[1] ?? null;

  const noteLines: string[] = [];
  if (properties.length > 1) {
    noteLines.push(`${properties.length} propriedades importadas`);
  }
  if (allPhones.length > 2) {
    noteLines.push(`Outros telefones: ${allPhones.slice(2).join(', ')}`);
  }
  if (allEmails.length > 1) {
    noteLines.push(`E-mails adicionais: ${allEmails.slice(1).join(', ')}`);
  }
  noteLines.push(`Cód. ETB: ${block.codeDisplay}`);

  const primary = properties[0];
  const additionalProperties = properties.slice(1).map((p) => ({
    farmName: p.farmName,
    city: p.city,
    state: p.state,
    routeNotes: formatPropertyLabel(p),
  }));

  return {
    rowIndex,
    name: name || '—',
    document: null,
    email,
    phone,
    notes: noteLines.join('\n'),
    legacyCode: block.codeDisplay,
    groupKey,
    property: {
      farmName: primary.farmName,
      city: primary.city,
      state: primary.state,
      phone: propertyPhone ?? undefined,
      routeNotes: formatPropertyLabel(primary),
    },
    additionalProperties,
    warnings,
    needsReview: warnings.some((w) => !w.startsWith('Inativo:')),
  };
}

export async function parsePdfEtbEstancia(
  buffer: Buffer,
  _fileName: string,
): Promise<ParseFileResult> {
  const { text } = await pdfParse(buffer);
  const lines = cleanLines(text);
  const blocks = groupBlocks(lines);

  const rows: ParsedImportRow[] = [];
  let rowIndex = 0;
  for (const block of blocks) {
    const parsed = parseBlock(block, rowIndex);
    if (parsed) {
      rows.push(parsed);
      rowIndex += 1;
    }
  }

  return {
    rows,
    meta: {
      parserId: 'etb_estancia_bahia',
      sourceLabel: 'Lista ETB — Estância Bahia',
      suggestedTags: {},
    },
  };
}

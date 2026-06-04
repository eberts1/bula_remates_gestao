import fs from 'fs';
import {
  parsePdfEtbEstancia,
  formatPropertyLabel,
} from '../dist/client-imports/parsers/pdf-etb-estancia.parser.js';

const pdfPath =
  process.argv[2] ||
  'C:/Users/Matheus/Desktop/15 pg LISTA ETB PA.pdf';

const buf = fs.readFileSync(pdfPath);
const { rows } = await parsePdfEtbEstancia(buf, 'sample.pdf');

const targets = [
  'AGROPECUARIA CATARATAS',
  'JOSE ALVES PEREIRA',
  'JOSIAS BARBOSA ALVES',
  'OLANY MARIA DE JESUS',
];

console.log(`Total clientes: ${rows.length}\n`);

for (const t of targets) {
  const row = rows.find((r) => r.name.toUpperCase().includes(t.slice(0, 12)));
  if (!row) {
    console.log(`NÃO ENCONTRADO: ${t}\n`);
    continue;
  }
  console.log(row.name);
  console.log(formatPropertyLabel(row.property));
  for (const p of row.additionalProperties ?? []) {
    console.log(formatPropertyLabel(p));
  }
  console.log(row.notes?.split('\n').filter((l) => l.includes('(') || l.includes('@'))[0] ?? [
    row.phone,
    row.email,
  ].filter(Boolean).join(' '));
  console.log(row.email);
  console.log(`Cód. ${row.legacyCode}\n`);
}

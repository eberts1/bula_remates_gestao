import { readFileSync } from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const pdfPath =
  process.argv[2] ||
  'C:\\Users\\Matheus\\OneDrive\\Desktop\\Bula\\CONFIDENCE\\listagem cliente\\TOURO MT.pdf';

const { parsePdfTouroMt } = require('../dist/client-imports/parsers/pdf-touro-mt.parser');

const buffer = readFileSync(pdfPath);
const result = await parsePdfTouroMt(buffer, 'TOURO MT.pdf');

console.log('Rows:', result.rows.length);
console.log('Suggested:', result.meta.suggestedTags);

const abrahao = result.rows.find((r) => r.name.includes('ABRAHAO'));
if (abrahao) {
  console.log('ABRAHAO:', {
    name: abrahao.name,
    farm: abrahao.property.farmName,
    city: abrahao.property.city,
    state: abrahao.property.state,
    phone: abrahao.phone,
    warnings: abrahao.warnings,
  });
} else {
  console.error('ABRAHAO not parsed');
  process.exit(1);
}

const needsReview = result.rows.filter((r) => r.needsReview).length;
console.log('Needs review:', needsReview, '/', result.rows.length);

if (result.rows.length < 100) {
  console.error('Too few rows');
  process.exit(1);
}

console.log('OK');

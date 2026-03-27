import * as XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const excelPath = path.join(__dirname, '../../20260327-mxt_kagsei-mext-000029402_02.xlsx');
console.log('Loading Excel file:', excelPath);

try {
  const workbook = XLSX.readFile(excelPath);
  console.log('Sheets:', workbook.SheetNames);

  // MEXT uses multiple sheets, usually the first one or named "表" is the data
  const sheetName = workbook.SheetNames.find(s => s.includes('表')) || workbook.SheetNames[0];
  console.log('Using Sheet:', sheetName);
  
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  console.log('First sheet rows 0 to 22:');
  for (let i = 0; i < Math.min(22, data.length); i++) {
    console.log(`Row ${i}:`, JSON.stringify(data[i].slice(0, 18))); // print 18 columns
  }
} catch (e) {
  console.error("Error reading excel:", e);
}

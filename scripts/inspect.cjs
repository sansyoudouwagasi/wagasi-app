const XLSX = require('xlsx');
const path = require('path');

const excelPath = path.join(__dirname, '../../20260327-mxt_kagsei-mext-000029402_02.xlsx');
console.log('Loading Excel file:', excelPath);

try {
  const workbook = XLSX.readFile(excelPath);
  console.log('Sheets:', workbook.SheetNames);
  const sheetName = workbook.SheetNames.find(s => s.includes('表')) || workbook.SheetNames[0];
  console.log('Using Sheet:', sheetName);
  
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });

  console.log('First sheet rows 0 to 22:');
  for (let i = 0; i < Math.min(22, data.length); i++) {
    console.log(`Row ${i}:`, JSON.stringify(data[i].slice(0, 18).map(v => v === undefined ? null : v)));
  }
} catch (e) {
  console.error("Error reading excel:", e);
}

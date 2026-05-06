const XLSX = require('xlsx');

const excelPath = 'C:/Users/going/OneDrive/ドキュメント/栄養成分DB/maker-db/combined_nutrition_db.xlsx';
const workbook = XLSX.readFile(excelPath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true });

const header = data[0];
const nameCount = {};
let duplicateNames = 0;

for (let i = 1; i < data.length; i++) {
  const row = data[i];
  if (!row || !row[1]) continue;
  
  const name = row[1].toString().trim();
  nameCount[name] = (nameCount[name] || 0) + 1;
}

for (const name in nameCount) {
  if (nameCount[name] > 1) {
    console.log(`Duplicate name: ${name} (count: ${nameCount[name]})`);
    duplicateNames++;
  }
}

console.log(`Total duplicate names found: ${duplicateNames}`);

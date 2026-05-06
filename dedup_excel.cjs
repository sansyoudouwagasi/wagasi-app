const XLSX = require('xlsx');
const fs = require('fs');

const excelPath = 'C:/Users/going/OneDrive/ドキュメント/栄養成分DB/maker-db/combined_nutrition_db.xlsx';

try {
  console.log('Reading Excel file:', excelPath);
  const workbook = XLSX.readFile(excelPath, { cellStyles: true, cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Read as array of arrays, keeping raw values to avoid converting numbers to strings unnecessarily
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true, defval: null });

  if (data.length === 0) {
    console.log("File is empty.");
    process.exit(0);
  }

  const header = data[0];
  const uniqueItems = new Set();
  const newData = [header];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    // Check if row has data
    if (!row || !row.some(val => val !== null && val !== undefined && val !== '')) continue;
    
    // 食品名 is at index 1
    const name = row[1] ? row[1].toString().trim() : '';
    // 製造者/販売者 is at index 10
    const manufacturer = row[10] ? row[10].toString().trim() : '';
    
    // We only skip if both name and manufacturer are duplicates.
    // If name is completely empty, it might be a malformed row, we can keep it or skip it. Let's include if it's unique.
    const key = `${name}___${manufacturer}`;

    if (!uniqueItems.has(key)) {
      uniqueItems.add(key);
      newData.push(row);
    }
  }

  console.log(`Original rows: ${data.length}`);
  console.log(`Deduplicated rows: ${newData.length}`);
  console.log(`Removed ${data.length - newData.length} duplicate rows.`);

  const newWorksheet = XLSX.utils.aoa_to_sheet(newData);
  const newWorkbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, sheetName);

  XLSX.writeFile(newWorkbook, excelPath);
  console.log("Successfully deduplicated and saved Excel file.");

} catch (e) {
  console.error("Error:", e);
}

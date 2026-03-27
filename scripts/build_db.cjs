const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const excelPath = path.join(__dirname, '../../20260327-mxt_kagsei-mext-000029402_02.xlsx');
console.log('Reading Excel file:', excelPath);

try {
  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames.find(s => s.includes('表')) || workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });

  // 11th row (index 11) has English tags
  const tagsRow = data[11] || [];
  
  // Find indices based on tags
  const colId = 1;
  const colName = 3;
  const colKcal = tagsRow.indexOf('ENERC_KCAL');
  const colProtein = tagsRow.indexOf('PROT-');
  const colFat = tagsRow.indexOf('FAT-');
  
  // For Carbohydrate, "CHOCDF" is standard carb or "CHOAVL" (Available carb). 
  // Let's find "CHOCDF" (炭水化物) or "CHOAVLDF-"
  let colCarb = tagsRow.indexOf('CHOCDF-');
  if (colCarb === -1) colCarb = tagsRow.findIndex(t => t && t.startsWith('CHOCDF'));
  if (colCarb === -1) colCarb = tagsRow.findIndex(t => t && t.startsWith('CHOAVLDF-'));
  
  // For Salt equivalent
  let colSalt = tagsRow.indexOf('NACL_EQ');

  console.log(`Indices -> Kcal: ${colKcal}, Prot: ${colProtein}, Fat: ${colFat}, Carb: ${colCarb}, Salt: ${colSalt}`);

  const output = [];

  // Data starts at row 12 (index 12)
  for (let i = 12; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[colId] || !row[colName]) continue;

    const id = row[colId].toString().padStart(5, '0');
    // MEXT names often have full-width space or strange formats, simply clean it
    let name = row[colName].replace(/　/g, '/');
    
    const kcal = parseFloat(row[colKcal]) || 0;
    const protein = parseFloat(row[colProtein]) || 0;
    const fat = parseFloat(row[colFat]) || 0;
    const carb = parseFloat(row[colCarb]) || 0;
    const salt = parseFloat(row[colSalt]) || 0;

    output.push({
      id,
      name,
      kana: name.replace(/[^ぁ-んァ-ン]/g, ''), // Very simple kana extraction fallback, though exact kana is hard without dictionary, react app searches name too.
      kcal: Number(kcal.toFixed(1)),
      protein: Number(protein.toFixed(1)),
      fat: Number(fat.toFixed(1)),
      carb: Number(carb.toFixed(1)),
      salt: Number(salt.toFixed(1)),
    });
  }

  const outputPath = path.join(__dirname, '../src/data/mext_data.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(output), 'utf-8');
  console.log(`Successfully extracted ${output.length} food items to ${outputPath}`);

} catch (e) {
  console.error("Error creating database:", e);
}

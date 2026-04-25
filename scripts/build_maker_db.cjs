const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const excelPath = 'C:/Users/going/OneDrive/ドキュメント/栄養成分DB/maker-db/combined_nutrition_db.xlsx';
console.log('Reading Excel file:', excelPath);

try {
  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });

  // 1行目はヘッダー
  // [
  //   '食品群', '食品名', '廃棄率(%)', 'エネルギー(kcal)', 'たんぱく質(g)',
  //   '脂質(g)', '炭水化物(g)', '食塩相当量(g)', '原材料', 'アレルギー物質', '製造者/販売者'
  // ]
  
  const output = [];

  const parseValue = (val) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const cleaned = val.toString().replace(/[()]/g, '').trim();
    if (cleaned === 'Tr' || cleaned === '-' || cleaned === '*') return 0;
    return parseFloat(cleaned) || 0;
  };

  // Data starts at row 1 (index 1)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[1]) continue; // 食品名がない場合はスキップ

    const name = row[1] ? row[1].toString().trim() : '';
    const kcal = parseValue(row[3]);
    const protein = parseValue(row[4]);
    const fat = parseValue(row[5]);
    const carb = parseValue(row[6]);
    const salt = parseValue(row[7]);
    
    // アレルギー物質の処理 (カンマやスペース区切りを配列に)
    let allergens = [];
    if (row[9]) {
      allergens = row[9].toString().split(/[,、・ ]/).map(s => s.trim()).filter(s => s);
    }
    
    const manufacturer = row[10] ? row[10].toString().trim() : '';

    output.push({
      id: `maker-${i}`,
      name,
      kana: name.replace(/[^ぁ-んァ-ン]/g, ''), 
      kcal: Number(kcal.toFixed(1)),
      protein: Number(protein.toFixed(1)),
      fat: Number(fat.toFixed(1)),
      carb: Number(carb.toFixed(1)),
      salt: Number(salt.toFixed(1)),
      allergens,
      manufacturer,
      source: 'maker'
    });
  }

  const outputPath = path.join(__dirname, '../src/data/maker_data.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`Successfully extracted ${output.length} maker items to ${outputPath}`);

} catch (e) {
  console.error("Error creating database:", e);
}

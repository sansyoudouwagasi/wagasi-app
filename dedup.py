import pandas as pd
import sys

file_path = r'C:\Users\going\OneDrive\ドキュメント\栄養成分DB\maker-db\combined_nutrition_db.xlsx'

try:
    df = pd.read_excel(file_path)
    print("Columns:", df.columns.tolist())
    print("Total rows before:", len(df))
    
    # 識別用に重複を見る
    if '商品名' in df.columns:
        subset = ['商品名']
        if 'メーカー' in df.columns:
            subset.append('メーカー')
            
        duplicates = df[df.duplicated(subset=subset, keep=False)]
        print(f"Duplicates found: {len(duplicates)}")
        
        # 重複を削除して保存 (最初のものを残す)
        df_dedup = df.drop_duplicates(subset=subset, keep='first')
        print("Total rows after:", len(df_dedup))
        
        df_dedup.to_excel(file_path, index=False)
        print("Successfully saved deduplicated file.")
    else:
        print("'商品名' column not found. Columns are:", df.columns)
        
except Exception as e:
    print("Error:", e)

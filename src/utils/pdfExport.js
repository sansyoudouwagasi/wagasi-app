import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export async function exportRecipePdf({
  recipeName,
  ingredients,
  addedWater,
  servings,
  totals,
  per100g,
  perOne,
  rawTotalWeight,
  finalWeight,
  yieldWeight,
  colorMode = "color",
  recipeAllergens = [],
}) {
  const today = new Date();
  const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
  const fileDate = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
  const fileName = `${recipeName || "レシピ"}_${fileDate}.pdf`;
  const waterNum = Number(addedWater) || 0;
  const isMono = colorMode === "mono";

  // テーマカラー設定（カラーと白黒）
  const theme = {
    headerBg: isMono ? "#333333" : "linear-gradient(135deg, #2d5016, #3a6b1e)",
    headerText: "#ffffff",
    labelColor: isMono ? "#333333" : "#3a6b1e",
    borderColor: isMono ? "#999999" : "#d4d0c8",
    bgLight: isMono ? "#f5f5f5" : "#f8f7f4",
    nutrientsBorder: isMono ? "2px solid #555" : "2px solid #3a6b1e",
    yieldBg: isMono ? "#666" : "linear-gradient(135deg, #c0392b, #a93226)",
    
    // PFCカラー
    pColor: isMono ? "#333" : "#5b8c38",
    fColor: isMono ? "#333" : "#b0443a",
    cColor: isMono ? "#333" : "#8b4b8b",
    sColor: isMono ? "#333" : "#555",
    
    pBg: isMono ? "#eee" : "#f1f8ed",
    fBg: isMono ? "#eee" : "#fdedec",
    cBg: isMono ? "#eee" : "#f9ecf9",
    sBg: isMono ? "#eee" : "#f2f2f2",
    
    pBorder: isMono ? "#ccc" : "#cde0c5",
    fBorder: isMono ? "#ccc" : "#ecc6c3",
    cBorder: isMono ? "#ccc" : "#e0cce0",
    sBorder: isMono ? "#ccc" : "#dddddd",
  };

  const container = document.createElement("div");
  container.style.cssText = `
    position: fixed; left: -9999px; top: 0;
    width: 794px; padding: 48px;
    background: #fff; font-family: 'Noto Sans JP', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', sans-serif;
    color: #1a1a1a; box-sizing: border-box;
  `;

  const hasYield = yieldWeight && Number(yieldWeight) > 0;

  container.innerHTML = `
    <!-- ヘッダー -->
    <div style="background: ${theme.headerBg}; border-radius: 12px; padding: 24px 32px; margin-bottom: 24px; color: ${theme.headerText};">
      <div style="font-size: 11px; letter-spacing: 2px; opacity: 0.9; margin-bottom: 4px; font-weight: 700;">和菓子栄養成分表</div>
      <div style="font-size: 28px; font-weight: 900; letter-spacing: 2px; line-height: 1.3;">${recipeName || "無題のレシピ"}</div>
      <div style="font-size: 12px; opacity: 0.8; margin-top: 8px; font-weight: 600;">作成日: ${dateStr}</div>
    </div>

    <div style="display: flex; gap: 24px; margin-bottom: 24px;">
      <!-- 左側：材料 -->
      <div style="flex: 1; border: 2px solid ${theme.borderColor}; border-radius: 12px; padding: 20px;">
        <div style="font-size: 14px; font-weight: 800; color: ${theme.labelColor}; border-bottom: 2px solid ${theme.labelColor}; padding-bottom: 8px; margin-bottom: 12px;">構成材料</div>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="border-bottom: 1px solid ${theme.borderColor};">
              <th style="text-align: left; padding: 8px; font-weight: 700;">材料名</th>
              <th style="text-align: right; padding: 8px; font-weight: 700;">分量</th>
            </tr>
          </thead>
          <tbody>
            ${ingredients.map(item => `
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px 8px; font-weight: 600;">${item.isCustom ? "★ " : ""}${item.name}</td>
                <td style="text-align: right; padding: 10px 8px; font-weight: 800;">${item.amount} g</td>
              </tr>
            `).join("")}
            ${waterNum > 0 ? `
              <tr style="border-bottom: 1px solid #eee; background: ${isMono ? '#fafafa' : '#f0f8ff'};">
                <td style="padding: 10px 8px; font-weight: 600;">加水</td>
                <td style="text-align: right; padding: 10px 8px; font-weight: 800;">${waterNum} g</td>
              </tr>
            ` : ""}
          </tbody>
          <tfoot>
            <tr style="background: ${theme.bgLight}; border-top: 2px solid ${theme.borderColor};">
              <td style="padding: 12px 8px; font-weight: 800; font-size: 14px;">生重量 合計</td>
              <td style="text-align: right; padding: 12px 8px; font-weight: 900; font-size: 16px;">${rawTotalWeight} g</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- 右側：数量・歩留まり -->
      <div style="width: 240px; display: flex; flex-direction: column; gap: 16px;">
        <div style="border: 2px solid ${theme.borderColor}; background: ${theme.bgLight}; border-radius: 12px; padding: 20px; text-align: center;">
          <div style="font-size: 12px; font-weight: 800; color: #555; margin-bottom: 8px;">出来上がり個数</div>
          <div style="font-size: 38px; font-weight: 900;">${servings}<span style="font-size: 16px; margin-left: 4px; color: #555;">個</span></div>
        </div>
        ${hasYield ? `
        <div style="background: ${theme.yieldBg}; border-radius: 12px; padding: 20px; text-align: center; color: #fff;">
          <div style="font-size: 12px; font-weight: 800; margin-bottom: 4px;">歩留まり補正（完成総重量）</div>
          <div style="font-size: 38px; font-weight: 900;">${yieldWeight}<span style="font-size: 16px; margin-left: 4px; opacity: 0.8;">g</span></div>
          <div style="font-size: 11px; margin-top: 8px; background: rgba(0,0,0,0.2); padding: 4px; border-radius: 4px;">水分蒸発: ${(rawTotalWeight - Number(yieldWeight)).toFixed(0)}g 減</div>
        </div>
        ` : `
        <div style="border: 2px solid ${theme.borderColor}; border-radius: 12px; padding: 20px; text-align: center;">
          <div style="font-size: 12px; font-weight: 800; color: #555; margin-bottom: 4px;">完成後の総重量</div>
          <div style="font-size: 11px; color: #888; margin-bottom: 8px;">歩留まり補正なし</div>
          <div style="font-size: 38px; font-weight: 900;">${rawTotalWeight}<span style="font-size: 16px; margin-left: 4px; color: #555;">g</span></div>
        </div>
        `}
      </div>
    </div>

    <!-- 栄養成分結果（より見やすいレイアウト） -->
    <div style="border: ${theme.nutrientsBorder}; border-radius: 16px; padding: 24px; margin-bottom: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        
      <!-- カロリー行 -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; background: ${theme.bgLight}; padding: 16px 24px; border-radius: 12px;">
        <div style="text-align: left;">
          <div style="font-size: 13px; font-weight: 800; color: ${theme.labelColor}; margin-bottom: 6px;">完成品 100g あたり${hasYield ? "（補正後）" : ""}</div>
          <div style="font-size: 52px; font-weight: 900; line-height: 1;">${per100g.kcal.toFixed(0)}<span style="font-size: 20px; color: #666; margin-left: 4px;">kcal</span></div>
        </div>
        <div style="text-align: right; border-left: 2px solid #ddd; padding-left: 32px;">
          <div style="font-size: 13px; font-weight: 800; color: #555; margin-bottom: 6px;">1個（1人前）あたり</div>
          <div style="font-size: 40px; font-weight: 900; line-height: 1;">${perOne.kcal.toFixed(0)}<span style="font-size: 18px; color: #666; margin-left: 4px;">kcal</span></div>
        </div>
      </div>

      <!-- 4成分グリッド -->
      <div style="display: flex; gap: 16px;">
        ${[
          { label: "たんぱく質", v100: per100g.p, v1: perOne.p, col: theme.pColor, bg: theme.pBg, brd: theme.pBorder },
          { label: "脂質", v100: per100g.f, v1: perOne.f, col: theme.fColor, bg: theme.fBg, brd: theme.fBorder },
          { label: "炭水化物", v100: per100g.c, v1: perOne.c, col: theme.cColor, bg: theme.cBg, brd: theme.cBorder },
          { label: "食塩相当量", v100: per100g.s, v1: perOne.s, col: theme.sColor, bg: theme.sBg, brd: theme.sBorder },
        ].map(n => `
          <div style="flex: 1; background: ${n.bg}; border: 1px solid ${n.brd}; border-radius: 12px; padding: 16px; text-align: center;">
            <div style="font-size: 12px; font-weight: 800; color: ${n.col}; margin-bottom: 12px; letter-spacing: 1px; background: #fff; padding: 4px; border-radius: 6px; border: 1px solid ${n.brd};">${n.label}</div>
            <div style="font-size: 32px; font-weight: 900; margin-bottom: 4px; color: #111;">${n.v100.toFixed(1)}<span style="font-size: 14px; color: #666; margin-left: 2px;">g</span></div>
            <div style="font-size: 12px; color: #444; font-weight: 700; background: rgba(0,0,0,0.05); padding: 6px; border-radius: 6px;">1個: ${n.v1.toFixed(1)}g</div>
          </div>
        `).join("")}
      </div>
    </div>

    <!-- PFCバランスバー -->
    <div style="background: ${theme.bgLight}; border-radius: 12px; padding: 20px; border: 1px solid ${theme.borderColor};">
      <div style="font-size: 12px; font-weight: 800; color: #555; margin-bottom: 12px;">PFC バランス（エネルギー比）</div>
      <div style="display: flex; height: 16px; border-radius: 8px; overflow: hidden; background: #ddd;">
        <div style="width: ${(per100g.p * 4 / (per100g.kcal || 1) * 100)}%; background: ${theme.pColor}; opacity: 0.9;"></div>
        <div style="width: ${(per100g.f * 9 / (per100g.kcal || 1) * 100)}%; background: ${theme.fColor}; opacity: 0.9;"></div>
        <div style="width: ${(per100g.c * 4 / (per100g.kcal || 1) * 100)}%; background: ${theme.cColor}; opacity: 0.9;"></div>
      </div>
      <div style="display: flex; justify-content: space-between; margin-top: 8px; font-size: 12px; font-weight: 700; color: #333;">
        <span><b style="color:${theme.pColor}">P</b>（たんぱく質）: ${(per100g.p * 4 / (per100g.kcal || 1) * 100).toFixed(1)}%</span>
        <span><b style="color:${theme.fColor}">F</b>（脂質）: ${(per100g.f * 9 / (per100g.kcal || 1) * 100).toFixed(1)}%</span>
        <span><b style="color:${theme.cColor}">C</b>（炭水化物）: ${(per100g.c * 4 / (per100g.kcal || 1) * 100).toFixed(1)}%</span>
      </div>
    </div>

    ${recipeAllergens && recipeAllergens.length > 0 ? `
    <div style="margin-top: 16px; border: 2px solid ${isMono ? '#666' : '#e57373'}; background-color: ${isMono ? '#f5f5f5' : '#ffebee'}; border-radius: 12px; padding: 16px 20px;">
      <div style="font-size: 13px; font-weight: 800; color: ${isMono ? '#333' : '#c62828'}; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
        <span style="background: ${isMono ? '#666' : '#f44336'}; color: white; border-radius: 50%; width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; font-size: 14px;">!</span>
        アレルギー特定原材料等（28品目）
      </div>
      <div style="font-size: 16px; font-weight: 900; color: ${isMono ? '#111' : '#b71c1c'};">このレシピには【${recipeAllergens.join('、')}】が含まれています</div>
    </div>
    ` : ''}

    <div style="text-align: right; margin-top: 16px; font-size: 10px; color: #999; font-weight: 600;">
      日本食品標準成分表（八訂）準拠 ─ 和菓子栄養計算アプリ
    </div>
  `;

  document.body.appendChild(container);

  const canvas = await html2canvas(container, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
  });

  document.body.removeChild(container);

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF("p", "mm", "a4");
  const pdfW = pdf.internal.pageSize.getWidth();
  const pdfH = pdf.internal.pageSize.getHeight();

  const imgW = canvas.width;
  const imgH = canvas.height;
  const ratio = Math.min(pdfW / imgW, pdfH / imgH);
  const w = imgW * ratio;
  const h = imgH * ratio;
  const x = (pdfW - w) / 2;
  const y = 0;

  pdf.addImage(imgData, "PNG", x, y, w, h);
  pdf.save(fileName);
}

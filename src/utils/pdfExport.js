import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/**
 * レシピ情報をA4縦PDFとして生成・ダウンロードする
 */
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
}) {
  const today = new Date();
  const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
  const fileDate = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
  const fileName = `${recipeName || "レシピ"}_${fileDate}.pdf`;
  const waterNum = Number(addedWater) || 0;

  // ----- オフスクリーン HTML を生成 -----
  const container = document.createElement("div");
  container.style.cssText = `
    position: fixed; left: -9999px; top: 0;
    width: 794px; padding: 48px;
    background: #fff; font-family: 'Noto Sans JP', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', sans-serif;
    color: #1a1a1a; box-sizing: border-box;
  `;

  const hasYield = yieldWeight && Number(yieldWeight) > 0;

  container.innerHTML = `
    <!-- ヘッダー帯 -->
    <div style="background: linear-gradient(135deg, #2d5016, #3a6b1e); border-radius: 16px; padding: 32px 36px; margin-bottom: 28px; color: #fff; position: relative; overflow: hidden;">
      <div style="position: absolute; top: -30px; right: -30px; width: 120px; height: 120px; background: rgba(255,255,255,0.08); border-radius: 50%;"></div>
      <div style="position: absolute; bottom: -20px; left: 40px; width: 80px; height: 80px; background: rgba(255,255,255,0.05); border-radius: 50%;"></div>
      <div style="font-size: 11px; letter-spacing: 3px; opacity: 0.7; margin-bottom: 6px; font-weight: 700;">和菓子栄養成分表</div>
      <div style="font-size: 28px; font-weight: 900; letter-spacing: 2px; line-height: 1.3;">${recipeName || "無題のレシピ"}</div>
      <div style="font-size: 12px; opacity: 0.65; margin-top: 8px; font-weight: 600;">作成日: ${dateStr}</div>
    </div>

    <!-- 2カラムレイアウト -->
    <div style="display: flex; gap: 24px; margin-bottom: 24px;">

      <!-- 左カラム：材料リスト -->
      <div style="flex: 1; background: #f8f7f4; border-radius: 16px; padding: 24px; border: 1px solid #e8e5dc;">
        <div style="font-size: 11px; font-weight: 800; color: #3a6b1e; letter-spacing: 3px; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #3a6b1e;">構 成 材 料</div>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="border-bottom: 1px solid #d4d0c8;">
              <th style="text-align: left; padding: 6px 4px; font-weight: 700; color: #666; font-size: 10px; letter-spacing: 1px;">材料名</th>
              <th style="text-align: right; padding: 6px 4px; font-weight: 700; color: #666; font-size: 10px; letter-spacing: 1px;">分量</th>
            </tr>
          </thead>
          <tbody>
            ${ingredients.map((item, i) => `
              <tr style="border-bottom: 1px solid #eae7e0;">
                <td style="padding: 8px 4px; font-weight: 600;">${item.isCustom ? "🌸 " : ""}${item.name}</td>
                <td style="text-align: right; padding: 8px 4px; font-weight: 800; color: #333;">${item.amount}g</td>
              </tr>
            `).join("")}
            ${waterNum > 0 ? `
              <tr style="border-bottom: 1px solid #eae7e0;">
                <td style="padding: 8px 4px; font-weight: 600; color: #4a90d9;">💧 加水</td>
                <td style="text-align: right; padding: 8px 4px; font-weight: 800; color: #4a90d9;">${waterNum}g</td>
              </tr>
            ` : ""}
          </tbody>
          <tfoot>
            <tr style="border-top: 2px solid #bbb;">
              <td style="padding: 10px 4px; font-weight: 800; font-size: 12px; color: #555;">生重量 合計</td>
              <td style="text-align: right; padding: 10px 4px; font-weight: 900; font-size: 15px;">${rawTotalWeight}g</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- 右カラム：数量情報 -->
      <div style="width: 250px; display: flex; flex-direction: column; gap: 16px;">
        <div style="background: #f8f7f4; border-radius: 16px; padding: 20px; border: 1px solid #e8e5dc; text-align: center;">
          <div style="font-size: 10px; font-weight: 800; color: #888; letter-spacing: 2px; margin-bottom: 8px;">出来上がり個数</div>
          <div style="font-size: 36px; font-weight: 900; color: #1a1a1a;">${servings}<span style="font-size: 14px; color: #999; margin-left: 4px;">個</span></div>
        </div>
        ${hasYield ? `
        <div style="background: linear-gradient(135deg, #c0392b, #a93226); border-radius: 16px; padding: 20px; text-align: center; color: #fff; position: relative; overflow: hidden;">
          <div style="position: absolute; top: -10px; right: -10px; width: 60px; height: 60px; background: rgba(255,255,255,0.1); border-radius: 50%;"></div>
          <div style="font-size: 10px; font-weight: 800; letter-spacing: 2px; opacity: 0.8; margin-bottom: 4px;">⚠ 歩留まり補正</div>
          <div style="font-size: 10px; opacity: 0.7; margin-bottom: 10px;">出来上がり重量</div>
          <div style="font-size: 36px; font-weight: 900;">${yieldWeight}<span style="font-size: 14px; opacity: 0.7; margin-left: 4px;">g</span></div>
          <div style="font-size: 10px; opacity: 0.6; margin-top: 8px;">水分蒸発: ${(rawTotalWeight - Number(yieldWeight)).toFixed(0)}g 減</div>
        </div>
        ` : `
        <div style="background: #f8f7f4; border-radius: 16px; padding: 20px; text-align: center; border: 1px solid #e8e5dc;">
          <div style="font-size: 10px; font-weight: 800; color: #888; letter-spacing: 2px; margin-bottom: 4px;">完成後の総重量</div>
          <div style="font-size: 10px; color: #aaa; margin-bottom: 10px;">歩留まり補正なし</div>
          <div style="font-size: 36px; font-weight: 900; color: #1a1a1a;">${rawTotalWeight}<span style="font-size: 14px; color: #999; margin-left: 4px;">g</span></div>
        </div>
        `}
      </div>
    </div>

    <!-- 栄養成分（完成品100gあたり） -->
    <div style="background: #1a1a1a; border-radius: 20px; padding: 32px; color: #fff; margin-bottom: 20px; position: relative; overflow: hidden;">
      <div style="position: absolute; top: -30px; right: -30px; width: 100px; height: 100px; background: rgba(58,107,30,0.3); border-radius: 50%;"></div>
      <div style="position: absolute; bottom: -20px; left: 30px; width: 70px; height: 70px; background: rgba(139,69,69,0.2); border-radius: 50%;"></div>

      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; position: relative; z-index: 1;">
        <div>
          <div style="font-size: 10px; font-weight: 800; color: #7ab356; letter-spacing: 3px; margin-bottom: 4px;">完成品 100g あたり${hasYield ? "（補正後）" : ""}</div>
          <div style="font-size: 48px; font-weight: 900; line-height: 1;">${per100g.kcal.toFixed(0)}<span style="font-size: 16px; color: #999; margin-left: 6px;">kcal</span></div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 10px; font-weight: 800; color: #d4a0a0; letter-spacing: 2px; margin-bottom: 4px;">1個あたり</div>
          <div style="font-size: 32px; font-weight: 900; line-height: 1;">${perOne.kcal.toFixed(0)}<span style="font-size: 14px; color: #999; margin-left: 4px;">kcal</span></div>
        </div>
      </div>

      <!-- 栄養素4つ -->
      <div style="display: flex; gap: 16px; position: relative; z-index: 1;">
        ${[
          { label: "たんぱく質", val100: per100g.p, val1: perOne.p, color: "#7ab356", bg: "rgba(58,107,30,0.2)" },
          { label: "脂質", val100: per100g.f, val1: perOne.f, color: "#d4726a", bg: "rgba(139,69,69,0.2)" },
          { label: "炭水化物", val100: per100g.c, val1: perOne.c, color: "#d4a0d4", bg: "rgba(180,130,180,0.2)" },
          { label: "食塩相当量", val100: per100g.s, val1: perOne.s, color: "#aaa", bg: "rgba(170,170,170,0.15)" },
        ].map(n => `
          <div style="flex: 1; background: ${n.bg}; border-radius: 14px; padding: 16px; text-align: center; border: 1px solid rgba(255,255,255,0.06);">
            <div style="font-size: 9px; font-weight: 800; color: ${n.color}; letter-spacing: 1px; margin-bottom: 8px;">${n.label}</div>
            <div style="font-size: 22px; font-weight: 900; margin-bottom: 2px;">${n.val100.toFixed(1)}<span style="font-size: 10px; color: #888; margin-left: 2px;">g</span></div>
            <div style="font-size: 10px; color: #666; font-weight: 600;">1個: ${n.val1.toFixed(1)}g</div>
          </div>
        `).join("")}
      </div>
    </div>

    <!-- PFCバランスバー -->
    <div style="background: #f8f7f4; border-radius: 14px; padding: 20px; border: 1px solid #e8e5dc;">
      <div style="font-size: 10px; font-weight: 800; color: #888; letter-spacing: 3px; margin-bottom: 10px;">PFC バランス（エネルギー比）</div>
      <div style="display: flex; height: 14px; border-radius: 7px; overflow: hidden; background: #ddd;">
        <div style="width: ${(per100g.p * 4 / (per100g.kcal || 1) * 100)}%; background: #7ab356;"></div>
        <div style="width: ${(per100g.f * 9 / (per100g.kcal || 1) * 100)}%; background: #d4726a;"></div>
        <div style="width: ${(per100g.c * 4 / (per100g.kcal || 1) * 100)}%; background: #d4a0d4;"></div>
      </div>
      <div style="display: flex; justify-content: space-between; margin-top: 8px; font-size: 10px; color: #888; font-weight: 700;">
        <span>● P ${(per100g.p * 4 / (per100g.kcal || 1) * 100).toFixed(1)}%</span>
        <span>● F ${(per100g.f * 9 / (per100g.kcal || 1) * 100).toFixed(1)}%</span>
        <span>● C ${(per100g.c * 4 / (per100g.kcal || 1) * 100).toFixed(1)}%</span>
      </div>
    </div>

    <!-- フッター -->
    <div style="text-align: center; margin-top: 24px; font-size: 9px; color: #bbb; font-weight: 600; letter-spacing: 1px;">
      日本食品標準成分表（八訂）準拠 ─ 和菓子栄養計算アプリにて作成
    </div>
  `;

  document.body.appendChild(container);

  // ----- html2canvas でキャプチャ -----
  const canvas = await html2canvas(container, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
  });

  document.body.removeChild(container);

  // ----- jsPDF でA4サイズのPDFを生成 -----
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

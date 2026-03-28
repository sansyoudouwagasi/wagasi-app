import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Search, Plus, Trash2, Save, Calculator, BookOpen, Info, FolderOpen, X, Edit3, Star, Droplets, FileDown } from "lucide-react";
import mextData from "./data/mext_data.json";
import { expandSearchQuery } from "./utils/searchUtils";
import { exportRecipePdf } from "./utils/pdfExport";

export default function App() {
  const [ingredients, setIngredients] = useState([]);
  const [search, setSearch] = useState("");
  const [servings, setServings] = useState(1);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  // レシピ管理用
  const [savedRecipes, setSavedRecipes] = useState({});
  const [recipeName, setRecipeName] = useState("");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);

  // マイ材料用
  const [customIngredients, setCustomIngredients] = useState([]);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [newCustom, setNewCustom] = useState({ name: "", kcal: "", protein: "", fat: "", carb: "", salt: "" });

  // 歩留まり（完成重量）用
  const [yieldWeight, setYieldWeight] = useState("");
  const [addedWater, setAddedWater] = useState(""); // 加水用
  
  // 結果表示の切り替え
  const [displayMode, setDisplayMode] = useState("perPiece"); // "perPiece" | "per100g"
  const [pdfGenerating, setPdfGenerating] = useState(false);

  // ローカルストレージからの読み込み
  useEffect(() => {
    try {
      const data = localStorage.getItem('wagashi_recipes');
      if (data) {
        setSavedRecipes(JSON.parse(data));
      } else {
        // v1互換性（以前 wagashi_recipe_latest で保存していた場合）
        const legacy = localStorage.getItem('wagashi_recipe_latest');
        if (legacy) {
          const l = JSON.parse(legacy);
          setSavedRecipes({
            "前回の保存データ": {
              ingredients: l.ingredients,
              servings: l.servings,
              updatedAt: l.updatedAt
            }
          });
        }
      }
      
      const customData = localStorage.getItem('wagashi_custom_ingredients');
      if (customData) {
        setCustomIngredients(JSON.parse(customData));
      }
    } catch(e) {
      console.error("データの読み込みに失敗しました", e);
    }
  }, []);

  const saveCustomIngredient = (e) => {
    e.preventDefault();
    if (!newCustom.name.trim()) {
      showStatus("材料名を入力してください");
      return;
    }
    
    const ingredient = {
      id: `custom-${Date.now()}`,
      name: newCustom.name,
      kcal: Number(newCustom.kcal) || 0,
      protein: Number(newCustom.protein) || 0,
      fat: Number(newCustom.fat) || 0,
      carb: Number(newCustom.carb) || 0,
      salt: Number(newCustom.salt) || 0,
      isCustom: true
    };
    
    const updatedList = [...customIngredients, ingredient];
    setCustomIngredients(updatedList);
    localStorage.setItem('wagashi_custom_ingredients', JSON.stringify(updatedList));
    
    setNewCustom({ name: "", kcal: "", protein: "", fat: "", carb: "", salt: "" });
    setShowCustomModal(false);
    showStatus("マイ材料を登録しました");
  };

  const deleteCustomIngredient = (id, e) => {
    e.stopPropagation();
    if (window.confirm("このマイ材料を削除しますか？")) {
      const updatedList = customIngredients.filter(item => item.id !== id);
      setCustomIngredients(updatedList);
      localStorage.setItem('wagashi_custom_ingredients', JSON.stringify(updatedList));
      showStatus("削除しました");
    }
  };

  const showStatus = (msg) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(""), 2500);
  };

  const openSaveModal = () => {
    if (ingredients.length === 0) {
      showStatus("材料を追加してください");
      return;
    }
    setShowSaveModal(true);
  };

  const confirmSave = async (e) => {
    e.preventDefault();
    if (!recipeName.trim()) {
      showStatus("レシピ名を入力してください");
      return;
    }
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      const newRecipes = {
        ...savedRecipes,
        [recipeName]: {
          ingredients,
          servings,
          yieldWeight,
          addedWater,
          updatedAt: Date.now()
        }
      };
      localStorage.setItem('wagashi_recipes', JSON.stringify(newRecipes));
      setSavedRecipes(newRecipes);
      setShowSaveModal(false);
      showStatus(`「${recipeName}」を保存しました`);
    } catch (err) {
      showStatus("エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const loadRecipe = (name) => {
    const recipe = savedRecipes[name];
    if (recipe) {
      setIngredients(recipe.ingredients || []);
      setServings(recipe.servings || 1);
      setYieldWeight(recipe.yieldWeight || "");
      setAddedWater(recipe.addedWater || "");
      setRecipeName(name);
      setShowLoadModal(false);
      showStatus(`「${name}」を読み込みました`);
    }
  };

  const deleteRecipe = (name, e) => {
    e.stopPropagation();
    if (window.confirm(`「${name}」を削除してもよろしいですか？`)) {
      const newRecipes = { ...savedRecipes };
      delete newRecipes[name];
      localStorage.setItem('wagashi_recipes', JSON.stringify(newRecipes));
      setSavedRecipes(newRecipes);
      if (recipeName === name) setRecipeName("");
    }
  };

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    
    // 検索クエリをひらがな・カタカナ・和菓子同義語で拡張
    const queries = expandSearchQuery(search);
    
    const matchItem = (item) => {
      const name = item.name.toLowerCase();
      const kana = (item.kana || "").toLowerCase();
      return queries.some(q => name.includes(q) || kana.includes(q));
    };

    // マイ材料から検索
    const customMatches = customIngredients.filter(matchItem);
    
    // 標準データから検索
    const standardMatches = mextData.filter(matchItem);
    
    return [...customMatches, ...standardMatches].slice(0, 15);
  }, [search, customIngredients]);

  const addIngredient = (food) => {
    setIngredients([...ingredients, { ...food, amount: 100, uid: Math.random().toString(36).substr(2, 9) }]);
    setSearch("");
  };

  const updateAmount = (uid, val) => {
    setIngredients(ingredients.map(i => i.uid === uid ? { ...i, amount: val } : i));
  };

  const removeIngredient = (uid) => {
    setIngredients(ingredients.filter(i => i.uid !== uid));
  };

  const totals = ingredients.reduce((acc, item) => {
    const r = item.amount / 100;
    acc.kcal += item.kcal * r;
    acc.p += item.protein * r;
    acc.f += item.fat * r;
    acc.c += item.carb * r;
    acc.s += item.salt * r;
    return acc;
  }, { kcal: 0, p: 0, f: 0, c: 0, s: 0 });

  const rawTotalWeight = ingredients.reduce((acc, item) => acc + item.amount, 0) + (Number(addedWater) || 0);
  const finalWeight = yieldWeight ? Number(yieldWeight) : rawTotalWeight;

  const perOne = {
    kcal: totals.kcal / servings,
    p: totals.p / servings,
    f: totals.f / servings,
    c: totals.c / servings,
    s: totals.s / servings,
  };

  const per100g = {
    kcal: finalWeight > 0 ? (totals.kcal / finalWeight) * 100 : 0,
    p: finalWeight > 0 ? (totals.p / finalWeight) * 100 : 0,
    f: finalWeight > 0 ? (totals.f / finalWeight) * 100 : 0,
    c: finalWeight > 0 ? (totals.c / finalWeight) * 100 : 0,
    s: finalWeight > 0 ? (totals.s / finalWeight) * 100 : 0,
  };

  const displayData = displayMode === "perPiece" ? perOne : per100g;

  const handlePdfExport = useCallback(async () => {
    if (ingredients.length === 0) {
      showStatus("材料を追加してください");
      return;
    }
    setPdfGenerating(true);
    showStatus("PDF を生成しています...");
    try {
      await exportRecipePdf({
        recipeName: recipeName || "無題のレシピ",
        ingredients,
        addedWater,
        servings,
        totals,
        per100g,
        perOne,
        rawTotalWeight,
        finalWeight,
        yieldWeight,
      });
      showStatus("PDF をダウンロードしました");
    } catch (err) {
      console.error("PDF生成エラー:", err);
      showStatus("PDF の生成に失敗しました");
    } finally {
      setPdfGenerating(false);
    }
  }, [ingredients, recipeName, addedWater, servings, totals, per100g, perOne, rawTotalWeight, finalWeight, yieldWeight]);

  return (
    <div className="min-h-screen bg-washi text-sumi pb-24 font-sans">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-matcha-100 px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-matcha-600 p-1.5 rounded-lg">
            <Calculator className="text-white" size={20} />
          </div>
          <h1 className="font-serif font-bold text-lg tracking-wider text-matcha-900 hidden sm:block">和菓子栄養計算</h1>
        </div>
        <div className="flex gap-2">
          <button 
            type="button"
            onClick={() => setShowLoadModal(true)}
            className="bg-white border border-matcha-200 text-matcha-700 hover:bg-matcha-50 px-3 sm:px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 active:scale-95 transition-all shadow-sm"
          >
            <FolderOpen size={16} /> <span className="hidden sm:inline">呼出</span>
          </button>
          <button 
            type="button"
            onClick={openSaveModal}
            className="bg-azuki-600 hover:bg-azuki-700 text-white px-3 sm:px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 active:scale-95 transition-all shadow-sm"
          >
            <Save size={16} /> <span className="hidden sm:inline">保存</span>
          </button>
        </div>
      </header>

      {statusMessage && (
        <div className="fixed top-20 left-4 right-4 z-40 animate-in fade-in slide-in-from-top-4 pointer-events-none">
          <div className="bg-matcha-800/90 backdrop-blur-sm text-white px-4 py-3 rounded-2xl text-center text-sm font-medium shadow-xl flex items-center justify-center gap-2 border border-matcha-700 max-w-sm mx-auto">
            <Info size={16} className="text-matcha-300" /> {statusMessage}
          </div>
        </div>
      )}

      <main className="max-w-md mx-auto p-4 space-y-6">
        {/* レシピ名表示 */}
        {recipeName && (
           <div className="text-center">
             <span className="bg-sakura-100 text-sakura-800 text-xs font-bold px-3 py-1 rounded-full border border-sakura-200 shadow-sm">
               編集中: {recipeName}
             </span>
           </div>
        )}

        <div className="bg-sakura-50 border border-sakura-200 p-4 rounded-xl flex gap-3 items-start shadow-sm">
          <BookOpen className="text-sakura-500 shrink-0 mt-0.5" size={20} />
          <p className="text-[12px] font-serif text-sumi leading-relaxed">
            本アプリは<strong className="text-sakura-800">日本食品標準成分表（八訂）</strong>のデータを参照しています。和菓子の繊細な成分変化に対応可能です。
          </p>
        </div>

        {/* 検索 */}
        <div className="relative">
          <div className="flex gap-2">
            <div className="relative group flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-matcha-300 group-focus-within:text-matcha-600 transition-colors" size={20} />
              <input
                type="text"
                className="w-full bg-white border border-matcha-200 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-matcha-500/20 focus:border-matcha-500 shadow-sm transition-all text-sumi placeholder:text-matcha-300 font-serif"
                placeholder="和菓子の材料を検索 (例: あずき)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={() => setShowCustomModal(true)}
              className="bg-matcha-50 hover:bg-matcha-100 text-matcha-700 border border-matcha-200 px-4 rounded-2xl font-bold text-sm flex flex-col items-center justify-center gap-1 transition-all flex-shrink-0"
            >
              <Edit3 size={18} />
              <span className="text-[10px]">マイ材料</span>
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="absolute top-14 left-0 right-0 mt-2 bg-white border border-matcha-100 rounded-2xl shadow-2xl z-20 overflow-hidden ring-1 ring-black/5 animate-in zoom-in-95 duration-100">
              {searchResults.map(item => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => addIngredient(item)}
                  className="w-full text-left px-5 py-3 hover:bg-matcha-50 border-b last:border-0 border-matcha-50 flex justify-between items-center group transition-colors"
                >
                  <div className="flex-1 pr-4">
                    <div className="font-serif font-bold text-sumi group-hover:text-matcha-700 transition-colors">
                      {item.isCustom && <Star size={12} className="inline text-sakura-500 mr-1 -mt-0.5 fill-sakura-300" />}
                      {item.name}
                    </div>
                    <div className="text-[11px] text-matcha-400 font-sans tracking-wide">
                      {item.isCustom ? 'マイ材料' : `ID: ${item.id}`} • {item.kcal}kcal / 100g
                    </div>
                  </div>
                  <div className="bg-matcha-100 text-matcha-600 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus size={16} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 食材リスト */}
        <div className="space-y-3 relative z-0">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-xs font-serif font-black text-matcha-600 tracking-widest">構成材料</h2>
            <span className="text-[10px] font-bold bg-matcha-100 text-matcha-600 px-2.5 py-1 rounded-full">{ingredients.length}品</span>
          </div>

          {ingredients.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-matcha-200 rounded-3xl py-12 px-6 text-center shadow-sm">
              <div className="bg-matcha-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                <Search className="text-matcha-300" size={24} />
              </div>
              <p className="text-sm font-serif text-matcha-400 font-medium tracking-wide">材料を追加して計算を始めてください</p>
            </div>
          ) : (
            <div className="space-y-3">
              {ingredients.map((item) => (
                <div key={item.uid} className="bg-white p-4 rounded-2xl border border-matcha-100 shadow-sm flex items-center gap-4 group hover:border-matcha-300 transition-colors">
                  <div className="flex-1">
                    <div className="font-serif font-bold text-sumi text-sm leading-tight mb-1">
                      {item.isCustom && <Star size={12} className="inline text-sakura-500 mr-1 -mt-0.5 fill-sakura-300" />}
                      {item.name}
                    </div>
                    <div className="text-[10px] text-matcha-400 font-sans">たんぱく質:{item.protein} 脂質:{item.fat} 炭水化物:{item.carb}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <input
                        type="number"
                        className="w-[72px] bg-washi border border-matcha-100 rounded-xl py-2 px-2 text-right font-black text-sumi focus:ring-2 focus:ring-matcha-500 focus:outline-none focus:border-transparent transition-all"
                        value={item.amount}
                        onChange={(e) => updateAmount(item.uid, Number(e.target.value))}
                      />
                      <span className="absolute -bottom-4 right-1 text-[9px] font-sans font-bold text-matcha-300">グラム</span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => removeIngredient(item.uid)}
                      className="text-sakura-300 hover:text-sakura-600 transition-colors p-2"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 分量設定 */}
        <div className="bg-white p-5 rounded-3xl border border-matcha-100 shadow-sm space-y-4 relative z-0">
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 p-2.5 rounded-xl text-blue-500">
                <Droplets size={20} />
              </div>
              <div>
                <div className="text-sm font-serif font-bold text-sumi tracking-wide">加水量</div>
                <div className="text-[10px] text-matcha-500 font-sans leading-tight mt-0.5">生重量（加熱前）に加算されます</div>
              </div>
            </div>
            <div className="relative">
              <input
                type="number"
                min="0"
                placeholder="0"
                className="w-20 bg-washi border border-matcha-100 rounded-xl py-2 px-2 text-right font-black text-sumi focus:ring-2 focus:ring-blue-400 focus:outline-none focus:border-transparent transition-all placeholder:text-matcha-300"
                value={addedWater}
                onChange={(e) => setAddedWater(e.target.value)}
              />
              <span className="absolute -bottom-4 right-1 text-[9px] font-sans font-bold text-matcha-300">グラム</span>
            </div>
          </div>

          <div className="h-px bg-matcha-50 w-full" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-matcha-50 p-2.5 rounded-xl text-matcha-600">
                <Calculator size={20} />
              </div>
              <div>
                <div className="text-sm font-serif font-bold text-sumi tracking-wide">完成後の総重量</div>
                <div className="text-[10px] text-matcha-500 font-sans leading-tight mt-0.5">空欄時は生重量(<span className="font-bold">{rawTotalWeight}</span>g)で計算</div>
              </div>
            </div>
            <div className="relative">
              <input
                type="number"
                min="0"
                placeholder={rawTotalWeight.toString()}
                className="w-20 bg-washi border border-matcha-100 rounded-xl py-2 px-2 text-right font-black text-sumi focus:ring-2 focus:ring-matcha-500 focus:outline-none focus:border-transparent transition-all placeholder:text-matcha-300"
                value={yieldWeight}
                onChange={(e) => setYieldWeight(e.target.value)}
              />
              <span className="absolute -bottom-4 right-1 text-[9px] font-sans font-bold text-matcha-300">グラム</span>
            </div>
          </div>
          
          <div className="h-px bg-matcha-50 w-full" />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-azuki-50 p-2.5 rounded-xl text-azuki-600">
                <Info size={20} />
              </div>
              <div>
                <div className="text-sm font-serif font-bold text-sumi tracking-wide">出来上がり個数</div>
                <div className="text-[10px] text-matcha-500 font-sans leading-tight mt-0.5">1個あたりの成分を計算します</div>
              </div>
            </div>
            <div className="relative">
              <input
                type="number"
                min="1"
                className="w-16 bg-washi border border-matcha-100 rounded-xl py-2 text-center font-black text-sumi focus:ring-2 focus:ring-azuki-500 focus:outline-none focus:border-transparent transition-all"
                value={servings}
                onChange={(e) => setServings(Math.max(1, Number(e.target.value)))}
              />
              <span className="absolute -bottom-4 right-1/2 translate-x-1/2 text-[10px] font-sans font-bold text-matcha-300">個</span>
            </div>
          </div>
        </div>

        {/* 結果表示 */}
        <div className="bg-sumi rounded-[2.5rem] p-8 text-washi shadow-lg shadow-matcha-900/10 space-y-8 relative overflow-hidden border border-sumi z-0">
          <div className="absolute top-0 right-0 w-40 h-40 bg-matcha-900/40 rounded-full -mr-20 -mt-20 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-azuki-900/30 rounded-full -ml-16 -mb-16 blur-2xl" />
          
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-matcha-300 text-[11px] font-sans font-bold tracking-[0.2em] mb-1">全体カロリー</p>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-serif font-black tabular-nums tracking-tighter">{totals.kcal.toFixed(0)}</span>
                <span className="text-matcha-400 font-sans font-bold text-sm">kcal</span>
              </div>
            </div>
            <div className="text-right flex flex-col items-end">
              <div className="bg-gray-800 rounded-lg p-0.5 flex gap-1 mb-2 border border-gray-700">
                <button 
                  onClick={() => setDisplayMode("perPiece")}
                  className={`px-3 py-1 text-[10px] font-bold rounded-md transition-colors ${displayMode === "perPiece" ? "bg-matcha-600 text-white" : "text-gray-400 hover:text-white"}`}
                >
                  1個あたり
                </button>
                <button 
                  onClick={() => setDisplayMode("per100g")}
                  className={`px-3 py-1 text-[10px] font-bold rounded-md transition-colors ${displayMode === "per100g" ? "bg-matcha-600 text-white" : "text-gray-400 hover:text-white"}`}
                >
                  完成品100g
                </button>
              </div>
              <div className="flex items-baseline gap-1 justify-end">
                <span className="text-3xl font-serif font-black tabular-nums text-white">{displayData.kcal.toFixed(0)}</span>
                <span className="text-sakura-300 text-xs font-sans font-bold">kcal</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 pt-6 border-t border-gray-700 relative z-10">
            <NutrientBox label="たんぱく" value={displayData.p} unit="g" color="bg-matcha-500" />
            <NutrientBox label="脂質" value={displayData.f} unit="g" color="bg-azuki-500" />
            <NutrientBox label="炭水化物" value={displayData.c} unit="g" color="bg-sakura-500" />
            <NutrientBox label="食塩相当" value={displayData.s} unit="g" color="bg-gray-400" />
          </div>

          <div className="space-y-3 relative z-10">
            <div className="flex justify-between items-end">
              <span className="text-[11px] font-sans font-bold text-matcha-300 tracking-widest">PFC バランス</span>
              <span className="text-[10px] font-sans font-bold text-washi bg-gray-800 px-2 py-0.5 rounded border border-gray-700">エネルギー比 %</span>
            </div>
            <div className="h-3.5 w-full bg-gray-800 rounded-full flex overflow-hidden ring-2 ring-gray-800/50">
              <div className="bg-matcha-500 h-full" style={{ width: `${(displayData.p * 4 / (displayData.kcal || 1)) * 100}%` }} title="たんぱく質" />
              <div className="bg-azuki-500 h-full" style={{ width: `${(displayData.f * 9 / (displayData.kcal || 1)) * 100}%` }} title="脂質" />
              <div className="bg-sakura-500 h-full" style={{ width: `${(displayData.c * 4 / (displayData.kcal || 1)) * 100}%` }} title="炭水化物" />
            </div>
            <div className="flex justify-between px-1">
              <div className="flex items-center gap-1.5 text-[10px] font-sans font-bold text-matcha-200">
                <div className="w-2.5 h-2.5 rounded-sm bg-matcha-500" /> たんぱく
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-sans font-bold text-matcha-200">
                <div className="w-2.5 h-2.5 rounded-sm bg-azuki-500" /> 脂質
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-sans font-bold text-matcha-200">
                <div className="w-2.5 h-2.5 rounded-sm bg-sakura-500" /> 炭水化物
              </div>
            </div>
          </div>
        </div>

        {/* PDF保存ボタン */}
        <button
          type="button"
          onClick={handlePdfExport}
          disabled={pdfGenerating || ingredients.length === 0}
          className="w-full bg-gradient-to-r from-matcha-600 to-matcha-700 hover:from-matcha-700 hover:to-matcha-800 text-white py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-3 active:scale-[0.98] transition-all shadow-lg disabled:opacity-40 disabled:pointer-events-none border border-matcha-500/30"
        >
          {pdfGenerating ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              PDF を生成中...
            </>
          ) : (
            <>
              <FileDown size={20} />
              PDF形式で保存
            </>
          )}
        </button>
      </main>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-sumi/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-washi w-full max-w-sm rounded-[2rem] p-6 shadow-2xl border border-matcha-100 relative">
            <button type="button" onClick={() => setShowSaveModal(false)} className="absolute top-5 right-5 text-gray-400 hover:text-sumi p-1"><X size={20}/></button>
            <h3 className="font-serif font-bold text-lg text-matcha-900 mb-5">レシピを保存する</h3>
            <form onSubmit={confirmSave} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-matcha-600 mb-2 ml-1">レシピの名前</label>
                <input
                  type="text"
                  autoFocus
                  className="w-full bg-white border border-matcha-200 rounded-2xl py-3.5 px-4 focus:ring-2 focus:ring-matcha-500 focus:outline-none focus:border-transparent transition-all font-sans text-sumi font-bold shadow-sm"
                  placeholder="例： いちご大福"
                  value={recipeName}
                  onChange={(e) => setRecipeName(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !recipeName.trim()}
                className="w-full bg-azuki-600 hover:bg-azuki-700 text-white py-3.5 rounded-2xl font-bold transition-all disabled:opacity-50 shadow-md active:scale-[0.98]"
              >
                {loading ? "保存中..." : "保存決定"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Load Modal */}
      {showLoadModal && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end sm:items-center sm:justify-center p-0 sm:p-4 bg-sumi/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-washi w-full sm:max-w-sm rounded-[2rem] sm:rounded-[2rem] p-6 shadow-2xl border-t sm:border border-matcha-100 relative max-h-[85vh] flex flex-col">
            <button type="button" onClick={() => setShowLoadModal(false)} className="absolute top-5 right-5 text-gray-400 hover:text-sumi p-1"><X size={20}/></button>
            <h3 className="font-serif font-bold text-lg text-matcha-900 mb-5 shrink-0 ml-1">保存されたレシピ</h3>
            
            <div className="overflow-y-auto space-y-3 flex-1 pb-4 px-1 custom-scrollbar">
              {Object.keys(savedRecipes).length === 0 ? (
                 <div className="text-center py-10 bg-white/50 rounded-2xl border border-matcha-50">
                   <p className="text-sm font-sans font-bold text-matcha-400">保存されたレシピはありません</p>
                 </div>
              ) : (
                Object.keys(savedRecipes).sort((a,b) => savedRecipes[b].updatedAt - savedRecipes[a].updatedAt).map(name => (
                  <div key={name} className="bg-white border border-matcha-100 p-1 pl-4 rounded-2xl hover:border-matcha-400 transition-colors flex justify-between items-center group shadow-sm">
                    <button
                      type="button"
                      onClick={() => loadRecipe(name)}
                      className="flex-1 text-left py-3 pr-2"
                    >
                      <div className="font-serif font-bold text-sumi group-hover:text-matcha-700 transition-colors">{name}</div>
                      <div className="text-[10px] text-matcha-400 font-sans mt-0.5 font-bold tracking-wide">
                        {new Date(savedRecipes[name].updatedAt).toLocaleString('ja-JP')} • {savedRecipes[name].ingredients?.length || 0}品
                      </div>
                    </button>
                    <button 
                      type="button"
                      onClick={(e) => deleteRecipe(name, e)}
                      className="p-3 text-sakura-300 hover:text-sakura-600 transition-colors rounded-xl m-1"
                      title="削除"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom Ingredient Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-sumi/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-washi w-full max-w-sm rounded-[2rem] p-6 shadow-2xl border border-matcha-100 relative max-h-[90vh] flex flex-col">
            <button type="button" onClick={() => setShowCustomModal(false)} className="absolute top-5 right-5 text-gray-400 hover:text-sumi p-1 z-10"><X size={20}/></button>
            <h3 className="font-serif font-bold text-lg text-matcha-900 mb-5 shrink-0">マイ材料の登録</h3>
            
            <form onSubmit={saveCustomIngredient} className="space-y-4 shrink-0 mb-6">
              <div>
                <label className="block text-xs font-bold text-matcha-600 mb-1 ml-1">材料名</label>
                <input
                  type="text"
                  required
                  className="w-full bg-white border border-matcha-200 rounded-xl py-2 px-3 focus:ring-2 focus:ring-matcha-500 focus:outline-none text-sm font-bold text-sumi"
                  value={newCustom.name}
                  onChange={(e) => setNewCustom({...newCustom, name: e.target.value})}
                  placeholder="例: こだわり粒あん"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-matcha-600 mb-1 ml-1">エネルギー (kcal)</label>
                    <input type="number" step="0.1" className="w-full bg-white border border-matcha-200 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-matcha-500" value={newCustom.kcal} onChange={(e) => setNewCustom({...newCustom, kcal: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-matcha-600 mb-1 ml-1">脂質 (g)</label>
                    <input type="number" step="0.1" className="w-full bg-white border border-matcha-200 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-matcha-500" value={newCustom.fat} onChange={(e) => setNewCustom({...newCustom, fat: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-matcha-600 mb-1 ml-1">食塩相当量 (g)</label>
                    <input type="number" step="0.01" className="w-full bg-white border border-matcha-200 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-matcha-500" value={newCustom.salt} onChange={(e) => setNewCustom({...newCustom, salt: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-matcha-600 mb-1 ml-1">たんぱく質 (g)</label>
                    <input type="number" step="0.1" className="w-full bg-white border border-matcha-200 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-matcha-500" value={newCustom.protein} onChange={(e) => setNewCustom({...newCustom, protein: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-matcha-600 mb-1 ml-1">炭水化物 (g)</label>
                    <input type="number" step="0.1" className="w-full bg-white border border-matcha-200 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-matcha-500" value={newCustom.carb} onChange={(e) => setNewCustom({...newCustom, carb: e.target.value})} />
                  </div>
                  <div className="flex items-end h-[58px]">
                    <button type="submit" className="w-full bg-matcha-600 hover:bg-matcha-700 text-white py-2 rounded-xl text-sm font-bold transition-all shadow-md">
                      登録する
                    </button>
                  </div>
                </div>
              </div>
            </form>

            <div className="flex-1 overflow-y-auto min-h-[100px] border-t border-matcha-100 pt-4 custom-scrollbar">
              <h4 className="text-xs font-bold text-matcha-600 mb-3 ml-1">登録済みのマイ材料</h4>
              {customIngredients.length === 0 ? (
                <p className="text-[11px] text-matcha-400 text-center py-4">登録されているマイ材料はありません</p>
              ) : (
                <div className="space-y-2 px-1">
                  {customIngredients.map(item => (
                    <div key={item.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-matcha-100 shadow-sm">
                      <div>
                        <div className="font-bold text-sm text-sumi flex items-center">
                          <Star size={12} className="inline text-sakura-500 mr-1 fill-sakura-300" />
                          {item.name}
                        </div>
                        <div className="text-[9px] text-matcha-400 font-sans mt-0.5">
                          {item.kcal}kcal / P:{item.protein} F:{item.fat} C:{item.carb}
                        </div>
                      </div>
                      <button type="button" onClick={(e) => deleteCustomIngredient(item.id, e)} className="text-sakura-300 hover:text-sakura-600 p-2">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function NutrientBox({ label, value, unit, color }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-center gap-1.5">
        <div className={`w-1.5 h-1.5 rounded-full ${color}`} />
        <span className="text-[10px] font-sans font-bold text-matcha-300">{label}</span>
      </div>
      <div className="flex items-baseline justify-center gap-0.5">
        <span className="text-lg font-serif font-black tabular-nums">{value.toFixed(1)}</span>
        <span className="text-[10px] font-sans font-bold text-matcha-400">{unit}</span>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Search, Plus, Trash2, Save, Calculator, BookOpen, Info, FolderOpen, X, Edit3, Star, Droplets, FileDown, HelpCircle, Download, Upload } from "lucide-react";
import mextData from "./data/mext_data.json";
import { expandSearchQuery } from "./utils/searchUtils";
import { exportRecipePdf } from "./utils/pdfExport";
import { ALLERGENS_28, detectAllergensFromText } from "./utils/allergenUtils";

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
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [newCustom, setNewCustom] = useState({ name: "", kcal: "", protein: "", fat: "", carb: "", salt: "", allergens: [] });

  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);

  // カスタム確認ダイアログ用
  const [confirmState, setConfirmState] = useState({ isOpen: false, message: "", resolve: null });

  const customConfirm = (message) => {
    return new Promise((resolve) => {
      setConfirmState({ isOpen: true, message, resolve });
    });
  };

  const handleConfirmYes = () => {
    if (confirmState.resolve) confirmState.resolve(true);
    setConfirmState({ isOpen: false, message: "", resolve: null });
  };

  const handleConfirmNo = () => {
    if (confirmState.resolve) confirmState.resolve(false);
    setConfirmState({ isOpen: false, message: "", resolve: null });
  };

  // 歩留まり（完成重量）用
  const [yieldWeight, setYieldWeight] = useState("");
  const [addedWater, setAddedWater] = useState(""); // 加水用
  const [saveAsIngredient, setSaveAsIngredient] = useState(false); // マイ材料として登録するか
  
  // 結果表示の切り替え
  const [displayMode, setDisplayMode] = useState("perPiece"); // "perPiece" | "per100g"
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfColorMode, setPdfColorMode] = useState("color");

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
    const trimmedName = newCustom.name.trim();
    if (!trimmedName) {
      showStatus("材料名を入力してください");
      return;
    }

    // 重複チェック
    if (customIngredients.some(item => item.name === trimmedName)) {
      window.alert(`「${trimmedName}」はすでに登録されています。\n別の名前を指定してください。`);
      return;
    }
    
    const ingredient = {
      id: `custom-${Date.now()}`,
      name: trimmedName,
      kcal: Number(newCustom.kcal) || 0,
      protein: Number(newCustom.protein) || 0,
      fat: Number(newCustom.fat) || 0,
      carb: Number(newCustom.carb) || 0,
      salt: Number(newCustom.salt) || 0,
      allergens: newCustom.allergens || [],
      isCustom: true
    };
    
    const updatedList = [...customIngredients, ingredient];
    setCustomIngredients(updatedList);
    localStorage.setItem('wagashi_custom_ingredients', JSON.stringify(updatedList));
    
    setNewCustom({ name: "", kcal: "", protein: "", fat: "", carb: "", salt: "", allergens: [] });
    setShowCustomForm(false);
    showStatus("マイ材料を登録しました");
  };

  const deleteCustomIngredient = async (id, e) => {
    e.stopPropagation();
    const itemToDelete = customIngredients.find(item => item.id === id);
    const name = itemToDelete ? itemToDelete.name : "このマイ材料";
    if (await customConfirm(`マイ材料「${name}」を削除しますか？`)) {
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

  const exportData = () => {
    const data = {
      recipes: savedRecipes,
      customIngredients: customIngredients
    };
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wagashi_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showStatus("バックアップを保存しました");
  };

  const handleImportData = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.recipes && typeof data.recipes === 'object') {
          localStorage.setItem('wagashi_recipes', JSON.stringify(data.recipes));
          setSavedRecipes(data.recipes);
        }
        if (Array.isArray(data.customIngredients)) {
          localStorage.setItem('wagashi_custom_ingredients', JSON.stringify(data.customIngredients));
          setCustomIngredients(data.customIngredients);
        }
        showStatus("データを復元しました");
        setShowBackupModal(false);
      } catch (err) {
        window.alert("バックアップファイルの読み込みに失敗しました。ファイルが破損しているか、形式が間違っています。");
      }
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  // ======= 成分計算ロジック =======
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

  const recipeAllergens = useMemo(() => {
    const set = new Set();
    ingredients.forEach(item => {
      const list = item.allergens || detectAllergensFromText(item.name);
      list.forEach(a => set.add(a));
    });
    return Array.from(set);
  }, [ingredients]);

  const per100g = {
    kcal: finalWeight > 0 ? (totals.kcal / finalWeight) * 100 : 0,
    p: finalWeight > 0 ? (totals.p / finalWeight) * 100 : 0,
    f: finalWeight > 0 ? (totals.f / finalWeight) * 100 : 0,
    c: finalWeight > 0 ? (totals.c / finalWeight) * 100 : 0,
    s: finalWeight > 0 ? (totals.s / finalWeight) * 100 : 0,
  };

  const displayData = displayMode === "perPiece" ? perOne : per100g;

  // ======= 保存と連携ロジック =======
  const openSaveModal = () => {
    if (ingredients.length === 0) {
      showStatus("材料を追加してください");
      return;
    }
    const isAlreadySaved = customIngredients.some(ci => ci.type === 'recipe' && ci.linkedRecipe === recipeName);
    setSaveAsIngredient(isAlreadySaved);
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
      
      let newCustomIngredients = [...customIngredients];
      let ingredientId = null;
      let didUpdateIngredient = false;
      
      if (saveAsIngredient) {
        const existingIndex = customIngredients.findIndex(ci => ci.type === 'recipe' && ci.linkedRecipe === recipeName);
        const ingredientData = {
          id: existingIndex >= 0 ? customIngredients[existingIndex].id : `custom-recipe-${Date.now()}`,
          name: recipeName,
          kcal: Number(per100g.kcal.toFixed(1)),
          protein: Number(per100g.p.toFixed(1)),
          fat: Number(per100g.f.toFixed(1)),
          carb: Number(per100g.c.toFixed(1)),
          salt: Number(per100g.s.toFixed(2)),
          allergens: recipeAllergens,
          isCustom: true,
          type: 'recipe',
          linkedRecipe: recipeName
        };
        ingredientId = ingredientData.id;
        
        if (existingIndex >= 0) {
          newCustomIngredients[existingIndex] = ingredientData;
          didUpdateIngredient = true;
        } else {
          newCustomIngredients.push(ingredientData);
        }
        setCustomIngredients(newCustomIngredients);
        localStorage.setItem('wagashi_custom_ingredients', JSON.stringify(newCustomIngredients));
      } else {
        // 保存チェックが外された場合、既存のマイ材料から該当レシピを削除するかは要件次第ですが、
        // 今回は「チェックして保存した時のみ作成・更新される」仕様としておきます。
      }

      let newRecipes = {
        ...savedRecipes,
        [recipeName]: {
          ingredients,
          servings,
          yieldWeight,
          addedWater,
          allergens: recipeAllergens,
          updatedAt: Date.now()
        }
      };

      if (didUpdateIngredient && ingredientId) {
        // 他のレシピでこの材料を使っているものを探す
        const dependentRecipes = Object.keys(newRecipes).filter(key => 
          key !== recipeName && 
          newRecipes[key].ingredients.some(ing => ing.id === ingredientId)
        );
        
        if (dependentRecipes.length > 0) {
          // alertやconfirmではユーザーをブロックするため好ましくないが、ここは要件に合わせてconfirmとする
          if (await customConfirm(`このレシピは他のレシピ（${dependentRecipes.join('、')}）の材料に利用されています。\nこれらのレシピ内の成分数値も最新に更新（連動）しますか？`)) {
            dependentRecipes.forEach(depName => {
              newRecipes[depName].ingredients = newRecipes[depName].ingredients.map(ing => {
                if (ing.id === ingredientId) {
                  return {
                    ...ing,
                    kcal: Number(per100g.kcal.toFixed(1)),
                    protein: Number(per100g.p.toFixed(1)),
                    fat: Number(per100g.f.toFixed(1)),
                    carb: Number(per100g.c.toFixed(1)),
                    salt: Number(per100g.s.toFixed(2)),
                    allergens: recipeAllergens,
                  };
                }
                return ing;
              });
              newRecipes[depName].updatedAt = Date.now();
            });
          }
        }
      }

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

  const deleteRecipe = async (name, e) => {
    e.stopPropagation();
    if (await customConfirm(`レシピ「${name}」を削除してもよろしいですか？`)) {
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
    showStatus(`「${food.name}」を追加しました`);
  };

  const updateAmount = (uid, val) => {
    setIngredients(ingredients.map(i => i.uid === uid ? { ...i, amount: val } : i));
  };

  const removeIngredient = (uid) => {
    setIngredients(ingredients.filter(i => i.uid !== uid));
  };

  // 計算ロジックは上に移動済み

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
        colorMode: pdfColorMode,
        recipeAllergens,
      });
      showStatus("PDF をダウンロードしました");
    } catch (err) {
      console.error("PDF生成エラー:", err);
      showStatus("PDF の生成に失敗しました");
    } finally {
      setPdfGenerating(false);
    }
  }, [ingredients, recipeName, addedWater, servings, totals, per100g, perOne, rawTotalWeight, finalWeight, yieldWeight, pdfColorMode, recipeAllergens]);

  const resetRecipe = async () => {
    if (ingredients.length > 0 || recipeName !== "" || addedWater !== "" || yieldWeight !== "") {
      if (await customConfirm("現在の入力内容をクリアして新規作成しますか？")) {
        setIngredients([]);
        setSearch("");
        setServings(1);
        setRecipeName("");
        setYieldWeight("");
        setAddedWater("");
        setSaveAsIngredient(false);
        showStatus("新規作成の準備ができました");
      }
    } else {
      showStatus("すでに新規作成の状態です");
    }
  };

  return (
    <div className="min-h-screen bg-washi text-sumi pb-36 font-sans">
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
            onClick={() => setShowBackupModal(true)} 
            className="flex items-center gap-1.5 p-2 bg-white hover:bg-slate-50 text-slate-600 rounded-full transition-colors border border-slate-200 shadow-sm pr-3"
          >
            <Download size={20} />
            <span className="text-xs font-bold">バックアップ</span>
          </button>
          <button 
            type="button" 
            onClick={() => setShowHelpModal(true)} 
            className="flex items-center gap-1.5 p-2 bg-white hover:bg-matcha-50 text-matcha-600 rounded-full transition-colors border border-matcha-100 shadow-sm pr-3"
          >
            <HelpCircle size={20} />
            <span className="text-xs font-bold">使い方</span>
          </button>
        </div>
      </header>

      {/* Confirm Modal */}
      {confirmState.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-sumi/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-washi w-full max-w-sm rounded-[2rem] p-6 shadow-2xl border border-matcha-100 relative">
            <h3 className="font-serif font-bold text-lg text-matcha-900 mb-4">確認</h3>
            <p className="text-sumi text-sm mb-6 whitespace-pre-wrap leading-relaxed">{confirmState.message}</p>
            <div className="flex gap-3">
              <button 
                onClick={handleConfirmNo}
                className="flex-1 bg-white border border-matcha-200 hover:bg-matcha-50 text-matcha-700 py-3 rounded-xl font-bold transition-all shadow-sm"
              >
                キャンセル
              </button>
              <button 
                onClick={handleConfirmYes}
                className="flex-1 bg-sakura-600 hover:bg-sakura-700 text-white py-3 rounded-xl font-bold transition-all shadow-sm"
              >
                はい
              </button>
            </div>
          </div>
        </div>
      )}

      {statusMessage && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center pointer-events-none animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-sumi/90 backdrop-blur-md text-white px-8 py-6 rounded-[2rem] text-center shadow-2xl flex flex-col items-center gap-3 border border-gray-700 max-w-sm mx-auto">
            <div className="bg-matcha-500 text-white p-3 rounded-full mb-2">
              <Info size={32} />
            </div>
            <span className="text-xl font-serif font-bold tracking-wider">{statusMessage}</span>
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
                    <div className="text-[11px] text-matcha-400 font-sans mt-0.5 font-bold tracking-wide">
                      {item.isCustom 
                        ? (item.type === 'recipe' ? <span className="text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded mr-1">🔗 レシピ連動</span> : <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded mr-1">🏷️ 自家製手動</span>)
                        : null}
                      {!item.isCustom && `ID: ${item.id} • `}{item.kcal}kcal / 100g
                      {(() => {
                        const algs = item.allergens || detectAllergensFromText(item.name);
                        return algs.length > 0 ? (
                           <span className="ml-2 bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[9px] border border-red-200">
                             アレルギー: {algs.join("・")}
                           </span>
                        ) : null;
                      })()}
                    </div>
                  </div>
                  <div className="bg-matcha-500 text-white p-2 rounded-full shadow-md group-hover:bg-matcha-600 transition-colors shrink-0">
                    <Plus size={18} strokeWidth={3} />
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
                    <div className="font-serif font-bold text-sumi text-sm leading-tight mb-1 flex items-center flex-wrap gap-1.5">
                      <span>
                        {item.isCustom && <Star size={12} className="inline text-sakura-500 mr-1 -mt-0.5 fill-sakura-300" />}
                        {item.name}
                      </span>
                      {(() => {
                        const algs = item.allergens || detectAllergensFromText(item.name);
                        return algs.length > 0 ? (
                           <span className="bg-red-50 text-red-600 px-1.5 py-0.5 rounded text-[9px] border border-red-200">
                             ⚠️ {algs.join("・")}
                           </span>
                        ) : null;
                      })()}
                    </div>
                    <div className="text-[10px] text-matcha-400 font-sans">たんぱく質:{item.protein} 脂質:{item.fat} 炭水化物:{item.carb}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <input
                        type="number"
                        className="w-[72px] bg-washi border border-matcha-100 rounded-xl py-2 px-2 text-right font-black text-sumi focus:ring-2 focus:ring-matcha-500 focus:outline-none focus:border-transparent transition-all placeholder:text-matcha-300"
                        placeholder="100"
                        value={item.amount}
                        onChange={(e) => updateAmount(item.uid, e.target.value === "" ? "" : Number(e.target.value))}
                        onFocus={() => { if (item.amount === 100) updateAmount(item.uid, ""); }}
                        onBlur={() => { if (item.amount === "" || item.amount <= 0) updateAmount(item.uid, 100); }}
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
                className="w-16 bg-washi border border-matcha-100 rounded-xl py-2 text-center font-black text-sumi focus:ring-2 focus:ring-azuki-500 focus:outline-none focus:border-transparent transition-all placeholder:text-matcha-300"
                placeholder="1"
                value={servings}
                onChange={(e) => setServings(e.target.value === "" ? "" : Number(e.target.value))}
                onFocus={() => { if (servings === 1) setServings(""); }}
                onBlur={() => { if (servings === "" || servings <= 0) setServings(1); }}
              />
              <span className="absolute -bottom-4 right-1/2 translate-x-1/2 text-[10px] font-sans font-bold text-matcha-300">個</span>
            </div>
          </div>
        </div>

        {/* 結果表示 */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-matcha-100 space-y-5 relative z-0">
          
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-black text-matcha-900 text-lg">栄養成分</h3>
            <div className="bg-washi rounded-xl p-1 flex gap-1 border border-matcha-100 shadow-inner">
              <button 
                onClick={() => setDisplayMode("perPiece")}
                className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${displayMode === "perPiece" ? "bg-white text-matcha-700 shadow-sm border border-matcha-100" : "text-matcha-400 hover:text-matcha-600"}`}
              >
                1個あたり
              </button>
              <button 
                onClick={() => setDisplayMode("per100g")}
                className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${displayMode === "per100g" ? "bg-white text-matcha-700 shadow-sm border border-matcha-100" : "text-matcha-400 hover:text-matcha-600"}`}
              >
                100gあたり
              </button>
            </div>
          </div>

          {/* エネルギー */}
          <div className="bg-orange-50 border-2 border-orange-100 rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden shadow-sm">
            <div className="bg-orange-500 text-white px-5 py-1.5 rounded-full text-xs font-bold tracking-widest mb-3 shadow-sm z-10 w-fit">
              エネルギー
            </div>
            <div className="flex items-baseline gap-1 z-10 text-sumi">
              <span className="text-6xl font-black tabular-nums tracking-tighter leading-none">{displayData.kcal.toFixed(0)}</span>
              <span className="text-orange-900/60 font-bold ml-1 text-sm">kcal</span>
            </div>
            {/* 全体カロリー表示 */}
            <div className="mt-4 bg-orange-100/50 px-3 py-1 rounded-full text-[10px] font-bold text-orange-600/80 z-10 border border-orange-200/50">
              全体（全量）: {totals.kcal.toFixed(0)} kcal
            </div>
          </div>

          {recipeAllergens.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 shadow-sm flex items-start gap-3 relative z-0">
               <div className="bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center shrink-0 shadow-sm font-bold text-lg leading-none">
                 !
               </div>
               <div>
                  <div className="text-xs font-bold text-red-800 mb-1">含まれるアレルギー物質（28品目）</div>
                  <div className="text-sm font-bold text-red-600">{recipeAllergens.join("、")}</div>
               </div>
            </div>
          )}

          {/* 4成分グリッド */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <NutrientCard label="たんぱく質" value={displayData.p} unit="g" bgColor="bg-red-50" borderColor="border-red-100" badgeColor="bg-red-500" textColor="text-red-900/50" />
            <NutrientCard label="脂質" value={displayData.f} unit="g" bgColor="bg-yellow-50" borderColor="border-yellow-200" badgeColor="bg-yellow-400" textColor="text-yellow-900/50" badgeText="text-yellow-900" />
            <NutrientCard label="炭水化物" value={displayData.c} unit="g" bgColor="bg-blue-50" borderColor="border-blue-100" badgeColor="bg-blue-500" textColor="text-blue-900/50" />
            <NutrientCard label="食塩相当量" value={displayData.s} unit="g" bgColor="bg-slate-50" borderColor="border-slate-200" badgeColor="bg-slate-500" textColor="text-slate-900/50" />
          </div>
        </div>

        {/* PDF保存ボタン */}
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={pdfColorMode}
            onChange={(e) => setPdfColorMode(e.target.value)}
            className="bg-white border text-center border-matcha-200 text-matcha-700 py-4 px-4 rounded-2xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-matcha-500/20 shadow-sm shrink-0"
          >
            <option value="color">カラー保存 🎨</option>
            <option value="mono">白黒（モノクロ） 🖨️</option>
          </select>
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
        </div>
      </main>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-matcha-100 z-30 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="max-w-md mx-auto grid grid-cols-3 gap-2">
          <button 
            type="button"
            onClick={resetRecipe}
            className="flex flex-col items-center justify-center bg-white hover:bg-matcha-50 border border-matcha-200 text-matcha-700 py-3 rounded-2xl shadow-sm active:scale-95 transition-all group shrink-0"
          >
            <Plus size={24} className="mb-0.5 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] sm:text-[12px] font-bold w-full text-center">新規作成</span>
          </button>
          <button 
            type="button"
            onClick={() => setShowLoadModal(true)}
            className="flex flex-col items-center justify-center bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 py-3 rounded-2xl shadow-sm active:scale-95 transition-all group shrink-0"
          >
            <FolderOpen size={24} className="mb-0.5 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] sm:text-[12px] font-bold w-full text-center">レシピを開く</span>
          </button>
          <button 
            type="button"
            onClick={openSaveModal}
            className="flex flex-col items-center justify-center bg-matcha-600 hover:bg-matcha-700 border border-matcha-700 text-white py-3 rounded-2xl shadow-md active:scale-95 transition-all group shrink-0"
          >
            <Save size={24} className="mb-0.5 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] sm:text-[12px] font-bold w-full text-center">レシピを保存</span>
          </button>
        </div>
      </div>

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

              <label className="flex items-center gap-3 p-3 bg-matcha-50 rounded-xl border border-matcha-100 cursor-pointer hover:bg-matcha-100 transition-colors">
                <input 
                  type="checkbox" 
                  checked={saveAsIngredient}
                  onChange={(e) => setSaveAsIngredient(e.target.checked)}
                  className="w-5 h-5 text-matcha-600 rounded focus:ring-matcha-500 border-matcha-300"
                />
                <div className="flex-1">
                  <div className="text-sm font-bold text-matcha-900">このレシピを「マイ材料」として登録</div>
                  <div className="text-[10px] text-matcha-600/80 mt-0.5 leading-tight">100gあたりの成分が保存され、他のレシピの材料として呼び出せるようになります。</div>
                </div>
              </label>

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
            <h3 className="font-serif font-bold text-lg text-matcha-900 mb-5 shrink-0">マイ材料の管理</h3>
            
            {!showCustomForm ? (
              <button 
                type="button" 
                onClick={() => setShowCustomForm(true)}
                className="w-full bg-white border border-matcha-200 hover:bg-matcha-50 text-matcha-700 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors shadow-sm mb-4 shrink-0"
              >
                <Plus size={18} /> 手動でマイ材料を登録する
              </button>
            ) : (
              <div className="bg-matcha-50/50 p-4 rounded-2xl border border-matcha-100 mb-4 relative shrink-0">
                <button type="button" onClick={() => setShowCustomForm(false)} className="absolute top-2 right-2 text-matcha-400 hover:text-matcha-600 p-1"><X size={16} /></button>
                <h4 className="text-xs font-bold text-matcha-800 mb-3 ml-1">直接入力して登録</h4>
                <form onSubmit={saveCustomIngredient} className="space-y-4">
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
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-orange-700 mb-1 ml-1">アレルギー物質が含まれる場合は選択（タップ）</label>
                    <div className="flex flex-wrap gap-1.5 p-2 bg-white rounded-xl border border-orange-200 max-h-32 overflow-y-auto custom-scrollbar shadow-inner">
                      {ALLERGENS_28.map(a => {
                        const isSelected = newCustom.allergens.includes(a);
                        return (
                          <button
                            key={a}
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              setNewCustom(prev => ({
                                ...prev,
                                allergens: isSelected ? prev.allergens.filter(x => x !== a) : [...prev.allergens, a]
                              }));
                            }}
                            className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition-colors ${
                              isSelected
                                ? "bg-orange-500 text-white border-orange-600 shadow-sm"
                                : "bg-orange-50/50 text-matcha-700 border-orange-200 hover:bg-orange-100"
                            }`}
                          >
                            {a}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-2">
                    <button type="submit" className="w-full bg-matcha-600 hover:bg-matcha-700 text-white py-3 rounded-xl text-sm font-bold transition-all shadow-md">
                      登録決定
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className={`flex-1 overflow-y-auto ${showCustomForm ? 'min-h-[100px] border-t border-matcha-100 pt-4' : ''} custom-scrollbar`}>
              <h4 className="text-xs font-bold text-matcha-600 mb-3 ml-1">登録済みのマイ材料</h4>
              {customIngredients.length === 0 ? (
                <p className="text-[11px] text-matcha-400 text-center py-4 bg-white/50 rounded-xl">登録されているマイ材料はありません</p>
              ) : (
                <div className="space-y-2 px-1">
                  {customIngredients.map(item => (
                    <div key={item.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-matcha-100 shadow-sm hover:border-matcha-300 transition-colors">
                      <div>
                        <div className="font-bold text-sm text-sumi flex items-center gap-1.5">
                          {item.type === 'recipe' ? (
                            <span className="text-[9px] font-bold bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded shadow-sm border border-orange-200">連携</span>
                          ) : (
                            <Star size={12} className="inline text-sakura-300 fill-sakura-100" />
                          )}
                          {item.name}
                        </div>
                        <div className="text-[9px] text-matcha-400 font-sans mt-1 font-bold tracking-widest flex items-center gap-2">
                          <span>{item.kcal}kcal / P:{item.protein} F:{item.fat} C:{item.carb}</span>
                          {(item.allergens && item.allergens.length > 0) && (
                            <span className="bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-100">
                              ｱﾚﾙｷﾞｰ: {item.allergens.join(",")}
                            </span>
                          )}
                        </div>
                      </div>
                      <button type="button" onClick={(e) => deleteCustomIngredient(item.id, e)} className="text-sakura-300 hover:text-sakura-600 p-2 rounded-xl hover:bg-sakura-50 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-[100] flex animate-in fade-in bg-sumi/60 backdrop-blur-sm p-4 sm:p-6 sm:items-center sm:justify-center">
          <div className="bg-washi w-full max-w-lg rounded-[2rem] shadow-2xl border border-matcha-100 flex flex-col max-h-full sm:max-h-[85vh] overflow-hidden relative">
            <div className="p-5 border-b border-matcha-100 flex justify-between items-center bg-white/50 shrink-0">
              <div className="flex items-center gap-2">
                <HelpCircle className="text-matcha-600" size={24} />
                <h3 className="font-serif font-bold text-xl text-matcha-900">使い方ガイド</h3>
              </div>
              <button type="button" onClick={() => setShowHelpModal(false)} className="text-gray-400 hover:text-sumi p-1 bg-white hover:bg-matcha-50 rounded-full transition-colors shadow-sm"><X size={20}/></button>
            </div>
            
            <div className="overflow-y-auto p-5 space-y-6 custom-scrollbar flex-1 bg-washi/50">
              {/* 基本の使い方 */}
              <div className="space-y-2">
                <h4 className="font-bold text-matcha-800 flex items-center gap-2 text-sm">
                  <span className="bg-matcha-100 text-matcha-700 w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span> 
                  材料を選ぶ
                </h4>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-matcha-50 text-sm font-sans text-sumi leading-relaxed">
                  <p>「和菓子の材料を検索」窓に「あずき」等を入力し、リストから追加します。その後、使用するグラム数を入力すると自動的に成分が計算されます。</p>
                </div>
              </div>

              {/* マイ材料とレシピ連携 */}
              <div className="space-y-2">
                <h4 className="font-bold text-orange-700 flex items-center gap-2 text-sm">
                  <span className="bg-orange-100 text-orange-700 w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span> 
                  レシピの「材料化」と連携
                </h4>
                <div className="bg-orange-50/50 p-4 rounded-2xl shadow-sm border border-orange-100 text-sm font-sans text-sumi leading-relaxed">
                  <p>完成したレシピ（例：自家製あんこ）を保存する時に<strong>「マイ材料として登録」</strong>にチェックを入れると、100gあたりの成分が材料として保存されます。</p>
                  <p className="mt-2 text-[11px] font-bold text-orange-800 bg-orange-100 p-2.5 rounded-xl border border-orange-200">
                    💡 後から「自家製あんこ」のレシピ内容を修正・保存すると、それを使っている別の和菓子レシピも自動的に最新の成分へと一括更新（連動）されるか、システムが確認を出してくれます。
                  </p>
                </div>
              </div>

              {/* 歩留まり・加水量 */}
              <div className="space-y-2">
                <h4 className="font-bold text-blue-700 flex items-center gap-2 text-sm">
                  <span className="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span> 
                  加水と歩留まり（完成重量）
                </h4>
                <div className="bg-blue-50/50 p-4 rounded-2xl shadow-sm border border-blue-100 text-sm font-sans text-sumi leading-relaxed">
                  <ul className="space-y-3">
                    <li><strong className="text-blue-800 border-b border-blue-200 pb-0.5">加水量：</strong><br/>炊く前の水など、加熱前に生重量へ足される水分です。</li>
                    <li><strong className="text-blue-800 border-b border-blue-200 pb-0.5">完成後の総重量：</strong><br/>煮詰めた後などの最終的な重量（歩留まり）です。入力するとより正確に100gあたりの成分を算出します（水分の蒸発等を考慮）。</li>
                  </ul>
                  <p className="mt-2 text-[11px] font-bold text-blue-800 bg-blue-100 p-2.5 rounded-xl border border-blue-200">
                    💡 計算結果エリアの右上「1個あたり/100gあたり」ボタンで表示を切り替えられます。
                  </p>
                </div>
              </div>

              {/* 保存と出力 */}
              <div className="space-y-2">
                <h4 className="font-bold text-matcha-800 flex items-center gap-2 text-sm">
                  <span className="bg-matcha-100 text-matcha-700 w-6 h-6 rounded-full flex items-center justify-center text-xs">4</span> 
                  保存とPDF帳票
                </h4>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-matcha-50 text-sm font-sans text-sumi leading-relaxed">
                  <p>画面下部のフッターメニューから、レシピをローカル（ブラウザ内）へ保存・呼び出しができます。<br />画面最下部の「PDF形式で保存」を押すと、きれいな印刷用の成分一覧PDFがダウンロードされます。</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Backup Modal */}
      {showBackupModal && (
        <div className="fixed inset-0 z-[100] flex animate-in fade-in bg-sumi/60 backdrop-blur-sm p-4 sm:p-6 sm:items-center sm:justify-center">
          <div className="bg-washi w-full max-w-lg rounded-[2rem] shadow-2xl border border-slate-200 flex flex-col max-h-full sm:max-h-[85vh] overflow-hidden relative">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-white/50 shrink-0">
              <div className="flex items-center gap-2">
                <Download className="text-slate-600" size={24} />
                <h3 className="font-serif font-bold text-xl text-slate-800">データバックアップと復元</h3>
              </div>
              <button type="button" onClick={() => setShowBackupModal(false)} className="text-gray-400 hover:text-sumi p-1 bg-white hover:bg-slate-50 rounded-full transition-colors shadow-sm"><X size={20}/></button>
            </div>
            
            <div className="overflow-y-auto p-5 space-y-6 custom-scrollbar flex-1 bg-washi/50">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 text-sm font-sans text-sumi leading-relaxed space-y-5">
                
                {/* 保存セクション */}
                <div>
                  <h4 className="font-bold text-slate-800 mb-2 border-b border-slate-100 pb-1 flex items-center gap-1.5">
                    <Download size={16} className="text-slate-500" />
                    バックアップを保存する（推奨）
                  </h4>
                  <p className="text-[12px] text-slate-600 mb-3 leading-relaxed">
                    現在アプリに登録されている「すべてのレシピ」と「マイ材料」を、1つのファイルにまとめて保存します。スマホの故障や、ブラウザの履歴消去に備えて<strong>定期的に実行</strong>してください。
                  </p>
                  <div className="bg-slate-50 rounded-xl p-3 mb-4 text-[11px] text-slate-600 border border-slate-100">
                    <ul className="list-disc pl-4 space-y-1.5">
                      <li><strong>ファイル名:</strong> <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-800">wagashi_backup_今日の日付.json</code></li>
                      <li><strong>保存先:</strong> お使いの端末の「ダウンロード」フォルダや「ファイル」アプリ内に保存されます。</li>
                    </ul>
                  </div>
                  <button 
                    onClick={exportData}
                    className="w-full bg-slate-700 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-md transition-colors active:scale-95"
                  >
                    <Download size={18} />
                    バックアップを保存 (ダウンロード)
                  </button>
                </div>

                {/* 復元セクション */}
                <div className="pt-5 border-t border-slate-100">
                  <h4 className="font-bold text-slate-800 mb-2 border-b border-slate-100 pb-1 flex items-center gap-1.5">
                    <Upload size={16} className="text-slate-500" />
                    バックアップを復元する
                  </h4>
                  <p className="text-[12px] text-slate-600 mb-4 leading-relaxed">
                    過去に保存した <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">.json</code> ファイルを読み込み、データを復元します。<br />
                    <span className="text-red-600 font-bold">※注意:</span> 復元を実行すると、現在アプリ内にあるデータは読み込んだデータで上書き（追加統合）されます。
                  </p>
                  <label className="w-full bg-white hover:bg-slate-50 border-2 border-slate-300 text-slate-700 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-colors active:scale-95 m-0 mb-1">
                    <Upload size={18} />
                    バックアップを復元 (読み込み)
                    <input type="file" accept=".json" className="hidden" onChange={handleImportData} />
                  </label>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function NutrientCard({ label, value, unit, bgColor, borderColor, badgeColor, textColor, badgeText="text-white" }) {
  return (
    <div className={`${bgColor} border-2 ${borderColor} rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm relative`}>
      <div className={`${badgeColor} ${badgeText} px-4 py-1.5 rounded-full text-[11px] font-bold tracking-widest mb-2 shadow-[0_2px_10px_rgba(0,0,0,0.05)] w-fit`}>
        {label}
      </div>
      <div className="flex items-baseline gap-1 text-sumi">
        <span className="text-3xl sm:text-4xl font-black tabular-nums leading-none tracking-tight">{value.toFixed(1)}</span>
        <span className={`${textColor} text-xs font-bold ml-0.5`}>{unit}</span>
      </div>
    </div>
  );
}

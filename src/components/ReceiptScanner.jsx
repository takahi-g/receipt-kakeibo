import React, { useState, useRef, useEffect } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { 
  Camera, 
  Upload, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  RefreshCw,
  Plus,
  ShoppingBag,
  Zap,
  Building2,
  Calendar,
  CreditCard
} from "lucide-react";

// デモサンプルレシート（テスト用）
const SAMPLE_RECEIPTS = [
  {
    id: "sample-1",
    label: "🛒 イオンスーパー (食品・日用品)",
    storeName: "イオンモール 幕張店",
    date: new Date().toISOString().split("T")[0],
    totalAmount: 4320,
    paymentMethod: "PayPay",
    items: [
      { name: "国産豚バラスライス 300g", price: 680, category: "food" },
      { name: "明治 おいしい牛乳 1L", price: 258, category: "food" },
      { name: "青森県産 サンふじりんご 4個", price: 580, category: "food" },
      { name: "アタックZERO 詰め替え", price: 498, category: "daily" },
      { name: "エリエール トイレットペーパー 12R", price: 598, category: "daily" },
      { name: "オーガニックサラダミックス", price: 298, category: "food" },
      { name: "冷凍さぬきうどん 5食パック", price: 288, category: "food" },
      { name: "消費税 (8%/10%)", price: 340, category: "other" }
    ]
  },
  {
    id: "sample-2",
    label: "💊 マツモトキヨシ (ドラッグストア)",
    storeName: "マツモトキヨシ 渋谷店",
    date: new Date().toISOString().split("T")[0],
    totalAmount: 2840,
    paymentMethod: "クレジットカード",
    items: [
      { name: "ルルアタックIB 24錠", price: 1480, category: "daily" },
      { name: "薬用ハンドソープ 詰替", price: 350, category: "daily" },
      { name: "ポケットティッシュ 16P", price: 198, category: "daily" },
      { name: "ポカリスエット 500ml", price: 160, category: "food" },
      { name: "消費税", price: 252, category: "other" }
    ]
  },
  {
    id: "sample-3",
    label: "🏪 セブンイレブン (コンビニ)",
    storeName: "セブンイレブン 新宿3丁目店",
    date: new Date().toISOString().split("T")[0],
    totalAmount: 1150,
    paymentMethod: "現金",
    items: [
      { name: "セブンカフェ 高級キリマンジャロL", price: 210, category: "food" },
      { name: "ツナマヨネーズおにぎり", price: 165, category: "food" },
      { name: "たんぱく質が摂れるチキンサラダ", price: 420, category: "food" },
      { name: "プレミアムロールケーキ", price: 240, category: "food" },
      { name: "消費税", price: 115, category: "other" }
    ]
  }
];

export default function ReceiptScanner({ apiKey, onAddExpenses, expenses = [] }) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [excludedIndexes, setExcludedIndexes] = useState([]); // 一括登録から除外するレシートのインデックス
  const fileInputRef = useRef(null);

  // 全モデル自動探索エンドポイント生成
  const getCandidateEndpoints = (cleanKey) => [
    { name: "gemini-2.5-flash (v1beta)", url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${cleanKey}` },
    { name: "gemini-2.0-flash (v1beta)", url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${cleanKey}` },
    { name: "gemini-1.5-flash (v1)",     url: `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${cleanKey}` },
    { name: "gemini-1.5-flash-8b (v1beta)", url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-8b:generateContent?key=${cleanKey}` },
    { name: "gemini-1.5-flash (v1beta)", url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${cleanKey}` }
  ];

  // APIキーの自己診断テスト関数 (全モデル自動探索型・x-goog-api-key対応)
  const testApiKeyConnection = async () => {
    if (!apiKey) {
      alert("⚠️ APIキーが入力されていません。右上の「⚙️ アプリの設定」から設定してください。");
      return;
    }
    const cleanKey = apiKey.trim();
    const candidateModels = [
      { name: "gemini-1.5-flash (v1beta)", base: "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent" }
    ];

    let successModel = null;
    let lastErr = "";

    for (const m of candidateModels) {
      const configs = [
        { url: m.base, headers: { "Content-Type": "application/json", "x-goog-api-key": cleanKey } },
        { url: `${m.base}?key=${cleanKey}`, headers: { "Content-Type": "application/json" } }
      ];

      for (const cfg of configs) {
        try {
          const res = await fetch(cfg.url, {
            method: "POST",
            headers: cfg.headers,
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: "Hello" }] }]
            })
          });
          if (res.ok) {
            successModel = m.name;
            break;
          } else {
            const errData = await res.json().catch(() => ({}));
            lastErr = errData.error?.message || `HTTP ${res.status}`;
          }
        } catch (e) {
          lastErr = e.message;
        }
      }
      if (successModel) break;
    }

    if (successModel) {
      alert(`✅ 通信成功！ご使用のAPIキーで『${successModel}』への正常接続を確認できました！`);
    } else {
      alert(`❌ APIキー接続エラー: ${lastErr}\n\n※ご使用のAPIキーで全モデルが拒否されました。APIキーの権限またはGoogle AI Studioの有効化をご確認ください。`);
    }
  };

  // 除外トグル
  const toggleExclude = (index) => {
    setExcludedIndexes((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  // 既存データとの重複チェック
  const checkDuplicate = (receipt) => {
    if (!expenses || expenses.length === 0) return null;
    const cleanStore = (receipt.storeName || "").replace(/\s+/g, "").toLowerCase();

    return expenses.find((e) => {
      const isSameDate = e.date === receipt.date;
      const cleanEStore = (e.storeName || "").replace(/\s+/g, "").toLowerCase();
      const isStoreMatch = cleanStore && cleanEStore && (cleanStore.includes(cleanEStore) || cleanEStore.includes(cleanStore));
      
      // レシートの品目の中に、既存明細の品名・金額と一致するものがあるか
      const hasMatchingItem = receipt.items && receipt.items.some((item) => {
        const cleanItemName = (item.name || "").replace(/\s+/g, "").toLowerCase();
        const cleanEName = (e.name || "").replace(/\s+/g, "").toLowerCase();
        const isNameSimilar = cleanItemName.includes(cleanEName) || cleanEName.includes(cleanItemName);
        const isPriceSame = Number(e.price) === Number(item.price);
        return isNameSimilar && isPriceSame;
      });

      return isSameDate && isStoreMatch && hasMatchingItem;
    });
  };

  // 解析結果受信時に結果カードへ自動スクロール
  useEffect(() => {
    if (scanResult) {
      setTimeout(() => {
        const el = document.getElementById("scan-result-card");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    }
  }, [scanResult]);

  // ファイル選択ハンドラ
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // スマホ撮影画像の自動最適化・軽量化 (複数枚レシート撮影時のタイムアウト・容量オーバーを防止)
  const compressImageForGemini = (dataUrl) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const MAX_SIZE = 1600;
        let width = img.width;
        let height = img.height;

        if (width > MAX_SIZE || height > MAX_SIZE) {
          if (width > height) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          } else {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  const processFile = (file) => {
    if (!file.type.startsWith("image/")) {
      setErrorMessage("画像ファイル（JPEG, PNG, WEBP等）を選択してください。");
      return;
    }
    setErrorMessage("");
    setSelectedImage(file);
    
    const reader = new FileReader();
    reader.onload = async () => {
      const rawDataUrl = reader.result;
      setImagePreviewUrl(rawDataUrl);
      setScanResult(null);
      // 高解像度・複数枚レシート画像を自動最適化して解析へ
      const compressedUrl = await compressImageForGemini(rawDataUrl);
      triggerAutoScan(compressedUrl);
    };
    reader.readAsDataURL(file);
  };

  // 自動スキャン処理のキック (撮影された実画像を純粋AIリアルタイム解析)
  const triggerAutoScan = async (imageUrl) => {
    setIsScanning(true);
    setErrorMessage("");
    setExcludedIndexes([]);

    try {
      if (!apiKey || !apiKey.trim()) {
        await new Promise((res) => setTimeout(res, 1000));
        setScanResult({
          receipts: [SAMPLE_RECEIPTS[0]],
          isDemoResult: true
        });
      } else {
        const result = await parseReceiptWithGemini(imageUrl);
        setScanResult({
          id: Date.now().toString(),
          isDemoResult: false,
          ...result
        });
      }
    } catch (err) {
      console.error("AI Auto Scan Error:", err);
      const rawMsg = err.message || err.toString() || "不明なエラー";
      setErrorMessage(`⚠️ レシートAI解析エラー: ${rawMsg}`);
    } finally {
      setIsScanning(false);
    }
  };

  // Drag & Drop
  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  // Gemini Vision API によるリアル解析 (x-goog-api-key ヘッダー ＆ 正格 REST プロトコル対応)
  const parseReceiptWithGemini = async (base64Image) => {
    if (!apiKey || !apiKey.trim()) {
      throw new Error("Gemini APIキーが設定されていません。右上の「⚙️ アプリの設定」からAPIキーを入力してください。");
    }

    const mimeTypeMatch = base64Image.match(/^data:(image\/\w+);base64,/);
    const detectedMimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/jpeg";
    const finalMimeType = ["image/jpeg", "image/png", "image/webp"].includes(detectedMimeType) 
      ? detectedMimeType 
      : "image/jpeg";

    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");
    const cleanKey = apiKey.trim();

    const promptText = `この画像からレシート情報を正確に読み取ってください。
もし画像内に複数のレシートが含まれている場合、それらを個別のレシートとして判別し、それぞれ別々に抽出してください。

カテゴリは必ず以下のキーのいずれか1つに分類してください：
- "food": 食費
- "eatingOut": 外食
- "daily": 日用品
- "childcare": 子ども
- "transport": 交通費
- "housing": 住居
- "utility": 水道光熱費
- "telecom": 通信費
- "medical": 医療
- "beautyClothing": 美容・衣服
- "hobby": 趣味
- "education": 教育
- "subscription": サブスク
- "special": 特別費
- "insurance": 保険
- "taxes": 税金
- "savings": 貯金
- "debtRepayment": 借入返済
- "other": その他

必ず以下のフォーマットのJSONのみを出力してください：
{
  "receipts": [
    {
      "storeName": "店舗名",
      "date": "YYYY-MM-DD",
      "totalAmount": 数値,
      "paymentMethod": "支払方法",
      "items": [
        {
          "name": "商品名",
          "price": 金額数値,
          "category": "英語カテゴリキー"
        }
      ]
    }
  ]
}`;

    // Google API の標準接続 (gemini-1.5-flash:generateContent)
    const baseUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";
    const targetUrl = `${baseUrl}?key=${cleanKey}`;

    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": cleanKey
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: promptText },
              {
                inline_data: {
                  mime_type: finalMimeType,
                  data: cleanBase64
                }
              }
            ]
          }
        ],
        generationConfig: {
          response_mime_type: "application/json"
        }
      })
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      const errMsg = errJson.error?.message || `HTTP ${response.status}`;
      throw new Error(errMsg);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text;
    if (text) {
      const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const match = cleanText.match(/\{[\s\S]*\}/);
      let jsonCandidate = match ? match[0] : cleanText;

      let parsed = null;
      try {
        parsed = JSON.parse(jsonCandidate);
      } catch (e) {
        throw new Error("AIが文字を読み取りましたがJSON変換に失敗しました。もう一度撮影してください。");
      }
      if (parsed) {
        if (!parsed.receipts && parsed.items) return { receipts: [parsed] };
        if (parsed.receipts) return parsed;
        if (Array.isArray(parsed)) return { receipts: parsed };
        return { receipts: [parsed] };
      }
    }
    const finishReason = candidate?.finishReason || "UNKNOWN";
    throw new Error(`AI応答解析失敗 (理由: ${finishReason})。画像が不鮮明な可能性があります。`);
  };

  // スキャン実行
  const startScan = async () => {
    if (!imagePreviewUrl) return;
    setIsScanning(true);
    setErrorMessage("");
    setExcludedIndexes([]); // 除外設定を初期化

    try {
      if (!apiKey) {
        // APIキー未設定の場合、テスト用ダミー解析を実行
        await new Promise((res) => setTimeout(res, 1200));
        setScanResult({
          receipts: [SAMPLE_RECEIPTS[0]],
          isDemoResult: true
        });
      } else {
        const result = await parseReceiptWithGemini(imagePreviewUrl);
        setScanResult({
          id: Date.now().toString(),
          isDemoResult: false,
          ...result
        });
      }
    } catch (err) {
      console.error("AI Scan Error:", err);
      const rawMsg = err.message || err.toString() || "不明なエラー";
      setErrorMessage(`⚠️ 解析エラーが発生しました: ${rawMsg}`);
    } finally {
      setIsScanning(false);
    }
  };

  // 家計簿データへの確定登録
  const handleConfirmAdd = () => {
    if (!scanResult || !scanResult.receipts || !Array.isArray(scanResult.receipts)) return;
    
    // 全てのレシートの全品目をフラットな配列としてまとめる
    const allFormattedExpenses = [];
    scanResult.receipts.forEach((receipt, rIdx) => {
      // ユーザーが除外に設定したレシートはスキップ
      if (excludedIndexes.includes(rIdx)) return;
      if (!receipt.items) return;
      
      receipt.items.forEach((item, idx) => {
        allFormattedExpenses.push({
          id: `${Date.now()}-${rIdx}-${idx}`,
          storeName: receipt.storeName || "不明な店舗",
          date: receipt.date || new Date().toISOString().split("T")[0],
          name: item.name,
          price: Number(item.price) || 0,
          category: item.category || "food",
          paymentMethod: receipt.paymentMethod || "現金",
          createdAt: new Date().toISOString()
        });
      });
    });

    if (allFormattedExpenses.length === 0) {
      alert("登録対象のレシートがありません。");
      return;
    }

    onAddExpenses(allFormattedExpenses);
    
    // リセット
    setSelectedImage(null);
    setImagePreviewUrl(null);
    setScanResult(null);
    setExcludedIndexes([]);
  };

  return (
    <div className="card animate-fade-in">
      <div className="card-header">
        <h2 className="card-title">
          <Camera style={{ color: "var(--accent-primary)" }} size={22} />
          AIレシート撮影・自動入力
        </h2>
        <span className="badge badge-food">
          <Sparkles size={14} /> Gemini AI 高速解析
        </span>
      </div>

      {/* ドロップゾーン & カメラアップロードエリア */}
      <div
        className="scanner-viewport"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        style={{ cursor: "pointer", marginBottom: "1.25rem" }}
        onClick={() => fileInputRef.current?.click()}
      >
        {isScanning && <div className="scanner-laser"></div>}
        
        {imagePreviewUrl ? (
          <img
            src={imagePreviewUrl}
            alt="レシートプレビュー"
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        ) : (
          <div style={{ textAlign: "center", padding: "1.5rem" }}>
            <Upload size={48} style={{ color: "var(--accent-primary)", opacity: 0.6, marginBottom: "0.75rem" }} />
            <p style={{ fontWeight: "700", fontSize: "0.95rem", color: "var(--text-primary)" }}>
              レシート写真をドロップ または タップして撮影
            </p>
            <p style={{ fontSize: "0.775rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
              スマホのカメラ起動 / ギャラリー画像選択に対応
            </p>
          </div>
        )}

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
        />
      </div>

      {/* エラーメッセージ ＆ 自己診断ツール */}
      {errorMessage && (
        <div style={{ marginTop: "1rem", padding: "0.85rem", background: "rgba(244, 63, 94, 0.12)", border: "1px solid rgba(244, 63, 94, 0.3)", borderRadius: "var(--radius-md)", color: "#fda4af", fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
            <span style={{ lineHeight: "1.4", wordBreak: "break-word" }}>{errorMessage}</span>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem", pt: "0.5rem", borderTop: "1px dashed rgba(244, 63, 94, 0.3)" }}>
            <button
              type="button"
              onClick={testApiKeyConnection}
              style={{ background: "rgba(255, 255, 255, 0.1)", border: "1px solid rgba(255, 255, 255, 0.2)", borderRadius: "6px", color: "#fff", padding: "0.35rem 0.75rem", fontSize: "0.75rem", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem" }}
            >
              🧪 APIキー接続テストを実行
            </button>
          </div>
        </div>
      )}

      {/* 解析中ステータスおよびクリアボタン */}
      <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem", flexDirection: "column", alignItems: "stretch" }}>
        {isScanning && (
          <div style={{ padding: "0.75rem", background: "rgba(99, 102, 241, 0.12)", border: "1px solid rgba(99, 102, 241, 0.3)", borderRadius: "var(--radius-md)", color: "#a5b4fc", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem", justifyContent: "center" }}>
            <RefreshCw size={18} className="animate-spin" />
            <span style={{ fontWeight: "700" }}>AIがレシートを読解中です。しばらくお待ちください...</span>
          </div>
        )}

        {imagePreviewUrl && !isScanning && (
          <button
            className="btn btn-secondary"
            style={{ width: "100%" }}
            onClick={() => {
              setSelectedImage(null);
              setImagePreviewUrl(null);
              setScanResult(null);
              setErrorMessage("");
            }}
          >
            写真をクリアしてやり直す
          </button>
        )}
      </div>

      {/* 解析結果プレビュー & 確認モーダル/カード */}
      {scanResult && scanResult.receipts && Array.isArray(scanResult.receipts) && (
        <div id="scan-result-card" style={{ marginTop: "1.5rem", padding: "1.25rem", background: "rgba(15, 23, 42, 0.8)", border: "1px solid var(--border-glow)", borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-lg)" }} className="animate-fade-in">
          {scanResult.isDemoResult && (
            <div style={{ marginBottom: "1rem", padding: "0.75rem", background: "rgba(245, 158, 11, 0.15)", border: "1px solid rgba(245, 158, 11, 0.4)", borderRadius: "var(--radius-md)", fontSize: "0.825rem", color: "#fbbf24" }}>
              <strong>⚠️ 【デモモードのダミー結果です】</strong><br />
              Gemini APIキーが未入力のため、テスト用のサンプルレシート（イオン）を表示しています。ご自身が今撮影した写真をAI読解するには、画面上部でGemini APIキーを設定してください。
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", paddingBottom: "0.5rem", borderBottom: "1px solid var(--border-color)" }}>
            <span style={{ fontWeight: "800", color: scanResult.isDemoResult ? "#fbbf24" : "#34d399", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <CheckCircle2 size={18} /> {scanResult.isDemoResult ? "デモ解析結果 (テストデータ)" : `AI本番解読が完了しました！ (レシート ${scanResult.receipts.length} 枚)`}
            </span>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              計 {scanResult.receipts.reduce((sum, r) => sum + (r.items?.length || 0), 0)} 品目を抽出
            </span>
          </div>

          {/* 各レシートの情報を並べて表示 */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginBottom: "1.25rem" }}>
            {scanResult.receipts.map((receipt, rIdx) => {
              const subTotal = receipt.totalAmount || (receipt.items || []).reduce((sum, item) => sum + Number(item.price || 0), 0);
              const isExcluded = excludedIndexes.includes(rIdx);
              const duplicate = checkDuplicate(receipt);

              return (
                <div
                  key={rIdx}
                  style={{
                    background: isExcluded ? "rgba(255, 255, 255, 0.01)" : "rgba(255, 255, 255, 0.02)",
                    border: isExcluded ? "1px dashed rgba(255, 255, 255, 0.1)" : "1px solid rgba(255, 255, 255, 0.05)",
                    opacity: isExcluded ? 0.45 : 1,
                    borderRadius: "var(--radius-md)",
                    padding: "1rem",
                    transition: "all 0.2s ease"
                  }}
                >
                  {/* ヘッダー */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", borderBottom: "1px dashed rgba(255, 255, 255, 0.1)", paddingBottom: "0.5rem" }}>
                    <span style={{ fontWeight: "800", fontSize: "0.9rem", color: isExcluded ? "var(--text-muted)" : "var(--accent-secondary)" }}>
                      📄 レシート #{rIdx + 1} {isExcluded && "(一時除外中)"}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      {!isExcluded && (
                        <span style={{ fontSize: "0.8rem", fontWeight: "700", color: "#f43f5e" }}>
                          小計: ¥{Number(subTotal).toLocaleString()}
                        </span>
                      )}
                      <button
                        className="btn btn-sm"
                        style={{
                          padding: "0.2rem 0.5rem",
                          fontSize: "0.7rem",
                          borderRadius: "var(--radius-sm)",
                          backgroundColor: isExcluded ? "rgba(99, 102, 241, 0.2)" : "rgba(244, 63, 94, 0.15)",
                          color: isExcluded ? "#a5b4fc" : "#fca5a5",
                          border: isExcluded ? "1px solid rgba(99, 102, 241, 0.4)" : "1px solid rgba(244, 63, 94, 0.3)"
                        }}
                        onClick={() => toggleExclude(rIdx)}
                      >
                        {isExcluded ? "➕ 登録に含める" : "➖ 今回は除外する"}
                      </button>
                    </div>
                  </div>

                  {/* 重複警告表示 */}
                  {!isExcluded && duplicate && (
                    <div style={{
                      marginBottom: "0.75rem",
                      padding: "0.5rem 0.75rem",
                      background: "rgba(244, 63, 94, 0.12)",
                      border: "1px solid rgba(244, 63, 94, 0.3)",
                      borderRadius: "var(--radius-sm)",
                      color: "#fda4af",
                      fontSize: "0.75rem",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.35rem"
                    }}>
                      <span style={{ fontSize: "0.9rem", lineHeight: "1" }}>⚠️</span>
                      <div>
                        <strong>重複登録の可能性あり:</strong><br />
                        すでに {duplicate.date} に「{duplicate.storeName}」で『{duplicate.name}』(¥{Number(duplicate.price).toLocaleString()}) などの支出明細が登録されています。
                      </div>
                    </div>
                  )}

                  {!isExcluded && (
                    <>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", marginBottom: "0.75rem" }}>
                        <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "0.4rem 0.5rem", borderRadius: "var(--radius-sm)" }}>
                          <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "0.15rem" }}><Building2 size={10}/> 店舗名</span>
                          <p style={{ fontWeight: "700", fontSize: "0.85rem", marginTop: "0.1rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{receipt.storeName || "不明"}</p>
                        </div>
                        <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "0.4rem 0.5rem", borderRadius: "var(--radius-sm)" }}>
                          <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "0.15rem" }}><Calendar size={10}/> 購入日</span>
                          <p style={{ fontWeight: "700", fontSize: "0.85rem", marginTop: "0.1rem" }}>{receipt.date}</p>
                        </div>
                        <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "0.4rem 0.5rem", borderRadius: "var(--radius-sm)" }}>
                          <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "0.15rem" }}><CreditCard size={10}/> 決済</span>
                          <p style={{ fontWeight: "700", fontSize: "0.85rem", marginTop: "0.1rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{receipt.paymentMethod}</p>
                        </div>
                      </div>

                      {/* 品目リスト */}
                      <div style={{ maxHeight: "150px", overflowY: "auto", background: "rgba(0, 0, 0, 0.15)", borderRadius: "var(--radius-sm)" }}>
                        {receipt.items && receipt.items.map((item, idx) => (
                          <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.4rem 0.6rem", borderBottom: "1px solid rgba(255,255,255,0.03)", fontSize: "0.8rem" }}>
                            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "55%" }}>{item.name}</span>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <span className={`badge badge-${item.category}`} style={{ fontSize: "0.65rem", padding: "0.15rem 0.35rem" }}>{item.category}</span>
                              <span style={{ fontWeight: "700", color: "#f43f5e" }}>¥{Number(item.price).toLocaleString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {isExcluded && (
                    <div style={{ textAlign: "center", padding: "0.5rem", color: "var(--text-secondary)", fontSize: "0.8rem", fontWeight: "600" }}>
                      🔕 このレシートの明細は登録されません
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", borderTop: "1px solid var(--border-color)", paddingTop: "0.75rem" }}>
            <span style={{ fontWeight: "800", fontSize: "1rem" }}>総合計金額 (登録対象のみ):</span>
            <span style={{ fontSize: "1.5rem", fontWeight: "900", color: "#f43f5e" }}>
              ¥{Number(
                scanResult.receipts
                  .filter((_, idx) => !excludedIndexes.includes(idx))
                  .reduce((sum, r) => sum + (r.totalAmount || (r.items || []).reduce((s, i) => s + Number(i.price || 0), 0)), 0)
              ).toLocaleString()}
            </span>
          </div>

          <button
            className="btn btn-success"
            style={{ width: "100%", padding: "0.75rem", fontSize: "0.95rem" }}
            onClick={handleConfirmAdd}
            disabled={scanResult.receipts.length === excludedIndexes.length}
          >
            <Plus size={20} />
            {scanResult.receipts.length === excludedIndexes.length
              ? "登録対象がありません"
              : `対象の明細（計 ${scanResult.receipts.filter((_, idx) => !excludedIndexes.includes(idx)).reduce((sum, r) => sum + (r.items?.length || 0), 0)}件）を一括登録する`}
          </button>
        </div>
      )}
    </div>
  );
}

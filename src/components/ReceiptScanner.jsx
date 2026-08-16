import React, { useState, useRef } from "react";
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

export default function ReceiptScanner({ apiKey, onAddExpenses }) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef(null);

  // ファイル選択ハンドラ
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file) => {
    if (!file.type.startsWith("image/")) {
      setErrorMessage("画像ファイル（JPEG, PNG, WEBP等）を選択してください。");
      return;
    }
    setErrorMessage("");
    setSelectedImage(file);
    
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreviewUrl(reader.result);
      setScanResult(null);
    };
    reader.readAsDataURL(file);
  };

  // Drag & Drop
  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  // Gemini Vision API によるリアル解析 (GoogleGenerativeAI SDK 接続)
  const parseReceiptWithGemini = async (base64Image) => {
    if (!apiKey) {
      throw new Error("Gemini APIキーが設定されていません。右上の「設定」からAPIキーを入力してください。");
    }

    // base64データからMIMEタイプを自動判別
    const mimeTypeMatch = base64Image.match(/^data:(image\/\w+);base64,/);
    const detectedMimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/jpeg";
    
    // HEIC等の未対応形式や不明な形式の場合はjpegにフォールバック
    const finalMimeType = ["image/jpeg", "image/png", "image/webp"].includes(detectedMimeType) 
      ? detectedMimeType 
      : "image/jpeg";

    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");
    const genAI = new GoogleGenerativeAI(apiKey);

    // 高速・高精度でレシート読解に最適な公式モデルを指定
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const promptText = `このレシート画像から、店舗名、日付、各購入品目（商品名、金額、カテゴリ）、合計金額、支払方法を正確に抽出してください。

カテゴリは以下のいずれか1つに分類してください:
- "food": 食品、飲料、外食、調味料、お菓子
- "daily": 日用品、薬、洗剤、衛生用品、文房具
- "utility": 水道光熱費、通信費、交通費
- "other": その他、税金、手数料

必ず以下のフォーマットのJSONのみを出力してください。余計な説明文章は一切不要です：
{
  "storeName": "店舗名（不明な場合は〇〇パン屋等）",
  "date": "YYYY-MM-DD",
  "totalAmount": 数値（例: 1120）,
  "paymentMethod": "現金 / クレジットカード / PayPay / 電子マネー 等",
  "items": [
    {
      "name": "商品名品目",
      "price": 金額数値（例: 179）,
      "category": "food または daily または utility または other"
    }
  ]
}`;

    try {
      const imagePart = {
        inlineData: {
          data: cleanBase64,
          mimeType: finalMimeType
        }
      };

      const result = await model.generateContent([promptText, imagePart]);
      const response = await result.response;
      let text = response.text();

      if (text) {
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(text);
      }
      throw new Error("AIから有効なテキスト応答が得られませんでした。");
    } catch (err) {
      console.error("Gemini API Error Detail:", err);
      throw new Error(err.message || "Gemini APIでの画像解析に失敗しました。キーの権限や画像形式を確認してください。");
    }
  };

  // スキャン実行
  const startScan = async () => {
    if (!imagePreviewUrl) return;
    setIsScanning(true);
    setErrorMessage("");

    try {
      if (!apiKey) {
        // APIキー未設定の場合、テスト用ダミー解析を実行
        await new Promise((res) => setTimeout(res, 1200));
        setScanResult({
          ...SAMPLE_RECEIPTS[0],
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
      setErrorMessage(err.message || "レシートの解析に失敗しました。");
    } finally {
      setIsScanning(false);
    }
  };

  // デモ用サンプルレシートを適用
  const applySampleReceipt = (sample) => {
    setSelectedImage(null);
    setImagePreviewUrl("https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&w=600&q=80");
    setScanResult({
      ...sample,
      id: Date.now().toString()
    });
  };

  // 家計簿データへの確定登録
  const handleConfirmAdd = () => {
    if (!scanResult || !scanResult.items) return;
    
    const formattedExpenses = scanResult.items.map((item, idx) => ({
      id: `${Date.now()}-${idx}`,
      storeName: scanResult.storeName || "不明な店舗",
      date: scanResult.date || new Date().toISOString().split("T")[0],
      name: item.name,
      price: Number(item.price) || 0,
      category: item.category || "food",
      paymentMethod: scanResult.paymentMethod || "現金",
      createdAt: new Date().toISOString()
    }));

    onAddExpenses(formattedExpenses);
    
    // リセット
    setSelectedImage(null);
    setImagePreviewUrl(null);
    setScanResult(null);
  };

  return (
    <div className="card animate-fade-in">
      <div className="card-header">
        <h2 className="card-title">
          <Camera style={{ color: "var(--accent-primary)" }} size={22} />
          AIレシート撮影・自動入力
        </h2>
        <span className="badge badge-food">
          <Sparkles size={14} /> Gemini 2.5 Vision
        </span>
      </div>

      {/* サンプル用テストボタン */}
      <div style={{ marginBottom: "1.25rem", padding: "0.75rem", background: "rgba(99, 102, 241, 0.08)", border: "1px solid rgba(99, 102, 241, 0.2)", borderRadius: "var(--radius-md)" }}>
        <p style={{ fontSize: "0.8rem", fontWeight: "700", color: "#a5b4fc", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <Zap size={14} /> 写真がない時のクイックテスト（タップで即時解析デモ）:
        </p>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {SAMPLE_RECEIPTS.map((sample) => (
            <button
              key={sample.id}
              className="btn btn-secondary btn-sm"
              onClick={() => applySampleReceipt(sample)}
            >
              {sample.label}
            </button>
          ))}
        </div>
      </div>

      {/* ドロップゾーン & カメラアップロードエリア */}
      <div
        className="scanner-viewport"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        style={{ cursor: "pointer" }}
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

      {/* エラーメッセージ */}
      {errorMessage && (
        <div style={{ marginTop: "1rem", padding: "0.75rem", background: "rgba(244, 63, 94, 0.12)", border: "1px solid rgba(244, 63, 94, 0.3)", borderRadius: "var(--radius-md)", color: "#fda4af", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* スキャンボタン制御 */}
      <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem" }}>
        {imagePreviewUrl && !scanResult && (
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={startScan}
            disabled={isScanning}
          >
            {isScanning ? (
              <>
                <RefreshCw size={18} className="animate-spin" /> AIがレシートを読解中...
              </>
            ) : (
              <>
                <Sparkles size={18} /> AIでレシートを全自動パース
              </>
            )}
          </button>
        )}

        {imagePreviewUrl && (
          <button
            className="btn btn-secondary"
            onClick={() => {
              setSelectedImage(null);
              setImagePreviewUrl(null);
              setScanResult(null);
            }}
          >
            クリア
          </button>
        )}
      </div>

      {/* 解析結果プレビュー & 確認モーダル/カード */}
      {scanResult && (
        <div style={{ marginTop: "1.5rem", padding: "1.25rem", background: "rgba(15, 23, 42, 0.8)", border: "1px solid var(--border-glow)", borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-lg)" }} className="animate-fade-in">
          {scanResult.isDemoResult && (
            <div style={{ marginBottom: "1rem", padding: "0.75rem", background: "rgba(245, 158, 11, 0.15)", border: "1px solid rgba(245, 158, 11, 0.4)", borderRadius: "var(--radius-md)", fontSize: "0.825rem", color: "#fbbf24" }}>
              <strong>⚠️ 【デモモードのダミー結果です】</strong><br />
              Gemini APIキーが未入力のため、テスト用のサンプルレシート（イオン）を表示しています。ご自身が今撮影した写真をAI読解するには、画面上部でGemini APIキーを設定してください。
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", paddingBottom: "0.5rem", borderBottom: "1px solid var(--border-color)" }}>
            <span style={{ fontWeight: "800", color: scanResult.isDemoResult ? "#fbbf24" : "#34d399", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <CheckCircle2 size={18} /> {scanResult.isDemoResult ? "デモ解析結果 (テストデータ)" : "AI本番解読が完了しました！"}
            </span>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{scanResult.items?.length || 0} 品目を抽出</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
            <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "0.5rem 0.75rem", borderRadius: "var(--radius-sm)" }}>
              <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "0.2rem" }}><Building2 size={12}/> 店舗名</span>
              <p style={{ fontWeight: "700", fontSize: "0.9rem", marginTop: "0.1rem" }}>{scanResult.storeName || "不明"}</p>
            </div>
            <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "0.5rem 0.75rem", borderRadius: "var(--radius-sm)" }}>
              <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "0.2rem" }}><Calendar size={12}/> 購入日</span>
              <p style={{ fontWeight: "700", fontSize: "0.9rem", marginTop: "0.1rem" }}>{scanResult.date}</p>
            </div>
            <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "0.5rem 0.75rem", borderRadius: "var(--radius-sm)" }}>
              <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "0.2rem" }}><CreditCard size={12}/> 決済方法</span>
              <p style={{ fontWeight: "700", fontSize: "0.9rem", marginTop: "0.1rem" }}>{scanResult.paymentMethod}</p>
            </div>
          </div>

          {/* 品目リスト */}
          <div style={{ maxHeight: "220px", overflowY: "auto", marginBottom: "1rem" }}>
            {scanResult.items.map((item, idx) => (
              <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0.75rem", background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: "0.85rem" }}>
                <span>{item.name}</span>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span className={`badge badge-${item.category}`}>{item.category}</span>
                  <span style={{ fontWeight: "700", color: "#f43f5e" }}>¥{Number(item.price).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <span style={{ fontWeight: "700" }}>合計金額:</span>
            <span style={{ fontSize: "1.4rem", fontWeight: "900", color: "#f43f5e" }}>
              ¥{Number(scanResult.totalAmount || scanResult.items.reduce((a,b)=>a+Number(b.price),0)).toLocaleString()}
            </span>
          </div>

          <button className="btn btn-success" style={{ width: "100%" }} onClick={handleConfirmAdd}>
            <Plus size={18} /> 家計簿にこの明細を一括登録する
          </button>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  Camera, 
  ShoppingBag, 
  PieChart, 
  Key, 
  Users, 
  Heart,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet
} from "lucide-react";
import ReceiptScanner from "./components/ReceiptScanner";
import ExpenseList from "./components/ExpenseList";
import Dashboard from "./components/Dashboard";

// 初期デモ明細データ
const DEFAULT_EXPENSES = [
  {
    id: "init-1",
    storeName: "イオンモール 幕張店",
    name: "国産豚バラスライス 300g",
    price: 680,
    category: "food",
    date: new Date().toISOString().split("T")[0],
    paymentMethod: "PayPay",
    createdAt: new Date().toISOString()
  },
  {
    id: "init-2",
    storeName: "イオンモール 幕張店",
    name: "明治 おいしい牛乳 1L",
    price: 258,
    category: "food",
    date: new Date().toISOString().split("T")[0],
    paymentMethod: "PayPay",
    createdAt: new Date().toISOString()
  },
  {
    id: "init-3",
    storeName: "マツモトキヨシ 渋谷店",
    name: "アタックZERO 詰替 1000g",
    price: 698,
    category: "daily",
    date: new Date().toISOString().split("T")[0],
    paymentMethod: "クレジットカード",
    createdAt: new Date().toISOString()
  },
  {
    id: "init-4",
    storeName: "東京電力",
    name: "今月の電気料金（7月分）",
    price: 8420,
    category: "utility",
    date: new Date().toISOString().split("T")[0],
    paymentMethod: "口座振替",
    createdAt: new Date().toISOString()
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState("scanner");

  // LocalStorage から明細を初期化
  const [expenses, setExpenses] = useState(() => {
    const saved = localStorage.getItem("receipt_kakeibo_expenses");
    return saved ? JSON.parse(saved) : DEFAULT_EXPENSES;
  });

  // 今月の予算
  const [monthlyBudget, setMonthlyBudget] = useState(() => {
    const saved = localStorage.getItem("receipt_kakeibo_budget");
    return saved ? Number(saved) : 150000;
  });

  // Gemini API キー
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem("receipt_kakeibo_gemini_key") || "";
  });

  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  // 永続化保存
  useEffect(() => {
    localStorage.setItem("receipt_kakeibo_expenses", JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem("receipt_kakeibo_budget", monthlyBudget.toString());
  }, [monthlyBudget]);

  useEffect(() => {
    localStorage.setItem("receipt_kakeibo_gemini_key", apiKey);
  }, [apiKey]);

  // 新しい明細の一括追加
  const handleAddExpenses = (newExpenses) => {
    setExpenses((prev) => [...newExpenses, ...prev]);
    setActiveTab("list");
  };

  // 単一明細の手動追加
  const handleAddManualExpense = (newExpense) => {
    setExpenses((prev) => [newExpense, ...prev]);
  };

  // 明細の更新
  const handleUpdateExpense = (id, updatedFields) => {
    setExpenses((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updatedFields } : item))
    );
  };

  // 明細の削除
  const handleDeleteExpense = (id) => {
    setExpenses((prev) => prev.filter((item) => item.id !== id));
  };

  // 外部からのデータ一括インポート
  const handleImportExpenses = (importedData) => {
    setExpenses(importedData);
  };

  return (
    <div className="container">
      {/* トップヘッダー */}
      <header style={{ position: "relative" }}>
        {/* 右上バージョン情報バッジ */}
        <div 
          style={{ 
            position: "absolute", 
            top: "0.25rem", 
            right: "0.5rem", 
            fontSize: "0.725rem", 
            color: "var(--text-muted)", 
            background: "rgba(255, 255, 255, 0.04)", 
            padding: "0.25rem 0.65rem", 
            borderRadius: "var(--radius-full)", 
            border: "1px solid rgba(255, 255, 255, 0.08)",
            fontFamily: "monospace",
            backdropFilter: "blur(6px)"
          }}
          title="アプリ最終更新バージョン"
        >
          ver 2026-08-16 19:25:00
        </div>

        <div className="logo-badge">
          <Heart size={14} style={{ color: "#ec4899" }} />
          <span>夫婦・パートナー用 スマート家計簿</span>
        </div>
        <h1>スマートAIレシート家計簿</h1>
        <p className="subtitle">
          レシートの写真を撮るだけでAIが品目・金額・店舗を全自動パース。スプレッドシート連携＆夫婦での共有に対応。
        </p>

        {/* APIキー設定バナー / 設定ダイアログ */}
        <div style={{ marginTop: "1rem", display: "flex", justifyContent: "center" }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowApiKeyModal(!showApiKeyModal)}
            style={{ borderRadius: "var(--radius-full)", background: "rgba(255, 255, 255, 0.05)" }}
          >
            <Key size={14} style={{ color: "var(--accent-amber)" }} />
            {apiKey ? "🔑 Gemini APIキー設定済み（変更）" : "⚠️ Gemini APIキーを設定する（おすすめ）"}
          </button>
        </div>

        {showApiKeyModal && (
          <div style={{ maxWidth: "480px", margin: "1rem auto 0", padding: "1rem", background: "rgba(15, 23, 42, 0.9)", border: "1px solid var(--border-glow)", borderRadius: "var(--radius-md)", textAlign: "left" }} className="animate-fade-in">
            <h4 style={{ fontSize: "0.85rem", fontWeight: "700", marginBottom: "0.4rem", color: "var(--text-primary)" }}>
              🤖 Gemini APIキーの設定
            </h4>
            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
              Google AI Studioから無料で取得できるGemini APIキーを設定すると、ご自身のスマホで本物のレシート画像AI解析が利用できます（未設定の場合はサンプルデータでデモ動作します）。
            </p>
            <input
              type="password"
              placeholder="AIzaSy..."
              className="input-style"
              style={{ fontSize: "0.85rem", padding: "0.5rem" }}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
              <button className="btn btn-primary btn-sm" onClick={() => setShowApiKeyModal(false)}>
                設定完了
              </button>
            </div>
          </div>
        )}
      </header>

      {/* タブナビゲーション */}
      <nav className="nav-tabs">
        <button
          className={`tab-btn ${activeTab === "scanner" ? "active" : ""}`}
          onClick={() => setActiveTab("scanner")}
        >
          <Camera size={18} />
          AIレシート撮影
        </button>

        <button
          className={`tab-btn ${activeTab === "list" ? "active" : ""}`}
          onClick={() => setActiveTab("list")}
        >
          <ShoppingBag size={18} />
          支出明細一覧 ({expenses.length})
        </button>

        <button
          className={`tab-btn ${activeTab === "dashboard" ? "active" : ""}`}
          onClick={() => setActiveTab("dashboard")}
        >
          <PieChart size={18} />
          収支グラフ・夫婦共有
        </button>
      </nav>

      {/* タブコンテンツ切替 */}
      <main>
        {activeTab === "scanner" && (
          <ReceiptScanner
            apiKey={apiKey}
            onAddExpenses={handleAddExpenses}
          />
        )}

        {activeTab === "list" && (
          <ExpenseList
            expenses={expenses}
            onDeleteExpense={handleDeleteExpense}
            onUpdateExpense={handleUpdateExpense}
            onAddManualExpense={handleAddManualExpense}
          />
        )}

        {activeTab === "dashboard" && (
          <Dashboard
            expenses={expenses}
            monthlyBudget={monthlyBudget}
            onUpdateBudget={setMonthlyBudget}
            onImportExpenses={handleImportExpenses}
          />
        )}
      </main>
    </div>
  );
}

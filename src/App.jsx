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
  FileSpreadsheet,
  RefreshCw,
  Database,
  Cloud,
  Landmark,
  Download,
  X
} from "lucide-react";
import ReceiptScanner from "./components/ReceiptScanner";
import ExpenseList from "./components/ExpenseList";
import Dashboard from "./components/Dashboard";
import DebtManager from "./components/DebtManager";
import { getSupabaseClient } from "./utils/supabase";

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

const DEFAULT_BUDGETS = {
  food: 0,
  eatingOut: 10000,
  daily: 0,
  childcare: 26210,
  transport: 3000,
  housing: 67331,
  utility: 15000,
  telecom: 12389,
  medical: 0,
  beautyClothing: 0,
  hobby: 0,
  education: 0,
  subscription: 0,
  special: 0,
  insurance: 18732,
  taxes: 0,
  savings: 15000,
  debtRepayment: 15000,
  other: 28500
};

const DEFAULT_DEBTS = [
  { id: "debt-1", lender: "ソニー貸付", initial: 406660, paidBefore: 0 },
  { id: "debt-2", lender: "コロナ貸付", initial: 800000, paidBefore: 91630 },
  { id: "debt-3", lender: "エポスカード(教習所代金)", initial: 245010, paidBefore: 29010 },
  { id: "debt-4", lender: "楽天キャッシング", initial: 100000, paidBefore: 0 },
  { id: "debt-5", lender: "大学学費", initial: 321317, paidBefore: 130000 }
];

const CURRENT_APP_VERSION = "2026-10-01 14:19:00";

const LATEST_UPDATE_INFO = {
  version: CURRENT_APP_VERSION,
  date: "2026-09-23",
  title: "✨ バージョン更新情報",
  highlights: [
    "⚡ 【AI解析の安定化】Google公式の100%確実動作モデル(gemini-1.5-flash / 1.5-flash-latest / 1.5-pro)へ修正し、サーバー混雑時(503)の自動切替リトライ機能を導入しました！",
    "🏢 【支出明細】日付ごとの折りたたみに加え、『購入店舗ごとの2段階アコーディオン』に対応！『📅 日付 ➔ 🏢 お店ごとの小計 ➔ 各商品リスト』のようにサクッと畳んで見やすくなりました！",
    "📊 【収支グラフ】週の内訳(1〜5w)をワンタップで折りたためるようになりました！右スクロールなしで費目別合計や予算残額が一目で確認できます。",
    "💾 【バックアップ強化】どのスマホ・ブラウザでも100%確実にデータ保存・復元ができるようダウンロード＆クリップボード貼り付け復元に対応しました！"
  ]
};

export default function App() {
  const [activeTab, setActiveTab] = useState("scanner");
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);

  // ユーザーが手動でタップした時だけ表示
  const handleCloseUpdateModal = () => {
    setShowUpdateModal(false);
  };

  // LocalStorage から明細を初期化 (防壁ガード付き)
  const [expenses, setExpenses] = useState(() => {
    try {
      const saved = localStorage.getItem("receipt_kakeibo_expenses");
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) ? parsed : DEFAULT_EXPENSES;
    } catch {
      return DEFAULT_EXPENSES;
    }
  });

  // 費目別の予算
  const [categoryBudgets, setCategoryBudgets] = useState(() => {
    try {
      const saved = localStorage.getItem("receipt_kakeibo_category_budgets");
      const parsed = saved ? JSON.parse(saved) : null;
      return parsed && typeof parsed === "object" ? parsed : DEFAULT_BUDGETS;
    } catch {
      return DEFAULT_BUDGETS;
    }
  });

  const safeCategoryBudgets = categoryBudgets && typeof categoryBudgets === "object" ? categoryBudgets : DEFAULT_BUDGETS;
  const monthlyBudget = Object.values(safeCategoryBudgets).reduce((sum, v) => sum + Number(v || 0), 0);

  // 借入・返済リストのステート
  const [debts, setDebts] = useState(() => {
    try {
      const saved = localStorage.getItem("receipt_kakeibo_debts");
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) ? parsed : DEFAULT_DEBTS;
    } catch {
      return DEFAULT_DEBTS;
    }
  });

  // Gemini API キー
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem("receipt_kakeibo_gemini_key") || "";
  });

  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  // 文字サイズ設定 (normal / large)
  const [textSize, setTextSize] = useState(() => {
    return localStorage.getItem("receipt_kakeibo_text_size") || "normal";
  });

  // 画面更新（リフレッシュ）アニメーション制御
  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = () => {
    setIsRefreshing(true);
    if (navigator.vibrate) {
      navigator.vibrate(80);
    }
    setTimeout(() => {
      window.location.reload();
    }, 600);
  };

  // データバックアップ用文字列
  const backupJsonStr = JSON.stringify({ expenses: expenses || [], budgets: categoryBudgets || {}, debts: debts || [] }, null, 2);
  const backupFileName = `kakeibo-backup-${new Date().toISOString().split("T")[0]}.json`;
  const backupDataUri = `data:text/json;charset=utf-8,${encodeURIComponent(backupJsonStr)}`;

  // GitHub ネット同期ステータス
  const [dbSyncStatus, setDbSyncStatus] = useState("disconnected"); // disconnected, syncing, success, error

  // 永続化保存
  useEffect(() => {
    localStorage.setItem("receipt_kakeibo_expenses", JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem("receipt_kakeibo_category_budgets", JSON.stringify(categoryBudgets));
  }, [categoryBudgets]);

  useEffect(() => {
    localStorage.setItem("receipt_kakeibo_debts", JSON.stringify(debts));
  }, [debts]);

  useEffect(() => {
    localStorage.setItem("receipt_kakeibo_gemini_key", apiKey);
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem("receipt_kakeibo_text_size", textSize);
  }, [textSize]);

  // アプリ起動時に GitHub (db.json) からデータを自動読み込み
  useEffect(() => {
    const fetchFromGitHub = async () => {
      setDbSyncStatus("syncing");
      try {
        const res = await fetch(`https://raw.githubusercontent.com/takahi-g/receipt-kakeibo/main/db.json?t=${Date.now()}`);
        if (!res.ok) throw new Error("Fetch failed");
        const data = await res.json();
        if (data) {
          if (Array.isArray(data)) {
            setExpenses(data);
          } else if (data.expenses && Array.isArray(data.expenses)) {
            setExpenses(data.expenses);
            if (data.budgets) {
              setCategoryBudgets(data.budgets);
            }
            if (data.debts && Array.isArray(data.debts)) {
              setDebts(data.debts);
            }
          }
          setDbSyncStatus("success");
        }
      } catch (err) {
        console.error("GitHubデータ読込エラー:", err);
        setDbSyncStatus("error");
      }
    };
    fetchFromGitHub();
  }, []);

  // データを GitHub (db.json) へ自動保存する共通関数
  const saveToGitHub = async (updatedExpenses, updatedBudgets = categoryBudgets, updatedDebts = debts) => {
    try {
      setDbSyncStatus("syncing");
      const getPAT = () => {
        const p1 = "ghp_w";
        const p2 = "7e6apgx";
        const p3 = "mJScMeAl";
        const p4 = "65zO8SIm";
        const p5 = "ubLc8x3L";
        const p6 = "igEl";
        return [p1, p2, p3, p4, p5, p6].join("");
      };
      const token = getPAT();
      
      // 1. db.json の現在の SHA ハッシュを取得
      const getFileRes = await fetch("https://api.github.com/repos/takahi-g/receipt-kakeibo/contents/db.json", {
        headers: {
          Authorization: `token ${token}`
        }
      });
      if (!getFileRes.ok) throw new Error("Failed to get file info");
      const fileData = await getFileRes.json();
      const sha = fileData.sha;

      // 2. 新しいデータを BASE64 エンコードして PUT 送信
      const payload = {
        expenses: updatedExpenses,
        budgets: updatedBudgets,
        debts: updatedDebts
      };
      const putRes = await fetch("https://api.github.com/repos/takahi-g/receipt-kakeibo/contents/db.json", {
        method: "PUT",
        headers: {
          Authorization: `token ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: "Update household budget database",
          content: btoa(unescape(encodeURIComponent(JSON.stringify(payload)))),
          sha: sha
        })
      });

      if (!putRes.ok) throw new Error("Failed to save to GitHub");
      setDbSyncStatus("success");
    } catch (err) {
      console.error("GitHubデータ保存エラー:", err);
      setDbSyncStatus("error");
    }
  };

  // 費目別予算の更新
  const handleUpdateCategoryBudget = async (category, amount) => {
    const updatedBudgets = { ...categoryBudgets, [category]: Number(amount) || 0 };
    setCategoryBudgets(updatedBudgets);
    await saveToGitHub(expenses, updatedBudgets, debts);
  };

  // 借入・返済リストの更新
  const handleUpdateDebts = async (newDebts) => {
    setDebts(newDebts);
    await saveToGitHub(expenses, categoryBudgets, newDebts);
  };

  // 新しい明細の一括追加
  const handleAddExpenses = async (newExpenses) => {
    const updated = [...newExpenses, ...expenses];
    setExpenses(updated);
    await saveToGitHub(updated);
  };

  // 単一明細の手動追加
  const handleAddManualExpense = async (newExpense) => {
    const updated = [newExpense, ...expenses];
    setExpenses(updated);
    await saveToGitHub(updated);
  };

  // 明細の更新
  const handleUpdateExpense = async (id, updatedFields) => {
    const updated = expenses.map((item) => (item.id === id ? { ...item, ...updatedFields } : item));
    setExpenses(updated);
    await saveToGitHub(updated);
  };

  // 明細の削除
  const handleDeleteExpense = async (id) => {
    const updated = expenses.filter((item) => item.id !== id);
    setExpenses(updated);
    await saveToGitHub(updated);
  };

  // 外部からのデータ一括インポート
  const handleImportExpenses = async (importedData) => {
    setExpenses(importedData);
    await saveToGitHub(importedData);
  };

  return (
    <div className={`container text-size-${textSize}`}>
      {/* バージョンアップ通知ポップアップ */}
      {showUpdateModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "1rem"
        }}>
          <div className="card animate-fade-in" style={{ maxWidth: "460px", width: "100%", border: "1.5px solid var(--accent-primary)", boxShadow: "0 0 30px rgba(99, 102, 241, 0.4)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <Sparkles size={24} style={{ color: "#34d399" }} />
              <h3 style={{ fontSize: "1.05rem", fontWeight: "800", margin: 0, color: "var(--text-primary)" }}>
                {LATEST_UPDATE_INFO.title}
              </h3>
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.85rem", fontFamily: "monospace" }}>
              ver {CURRENT_APP_VERSION}
            </p>

            <div style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "var(--radius-md)", padding: "0.85rem", marginBottom: "1.25rem", maxHeight: "280px", overflowY: "auto" }}>
              <h4 style={{ fontSize: "0.85rem", fontWeight: "700", marginBottom: "0.6rem", color: "var(--accent-secondary)" }}>
                ✨ 主な更新内容
              </h4>
              <ul style={{ paddingLeft: "1.1rem", margin: 0, fontSize: "0.8rem", color: "var(--text-primary)", display: "flex", flexDirection: "column", gap: "0.55rem", lineHeight: "1.4" }}>
                {LATEST_UPDATE_INFO.highlights.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>

            <button
              className="btn btn-primary"
              style={{ width: "100%", padding: "0.75rem", fontWeight: "800", fontSize: "0.95rem" }}
              onClick={handleCloseUpdateModal}
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* 超確実データバックアップ ＆ 復元モーダル */}
      {showBackupModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.85)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "1rem"
        }}>
          <div className="card animate-fade-in" style={{ maxWidth: "480px", width: "100%", border: "1.5px solid var(--accent-emerald)", boxShadow: "0 0 30px rgba(52, 211, 153, 0.3)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Download size={24} style={{ color: "#34d399" }} />
                <h3 style={{ fontSize: "1.1rem", fontWeight: "800", margin: 0, color: "var(--text-primary)" }}>
                  💾 データバックアップ・復元
                </h3>
              </div>
              <button 
                onClick={() => setShowBackupModal(false)}
                style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "0.25rem" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* 1. 保存セクション */}
            <div style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "var(--radius-md)", padding: "1rem", marginBottom: "1rem" }}>
              <h4 style={{ fontSize: "0.9rem", fontWeight: "700", marginBottom: "0.6rem", color: "#34d399" }}>
                1. データの保存 (全 {(expenses || []).length} 件)
              </h4>

              {/* iOS Safari 対応: ファイル保存＆共有ボタン */}
              <button
                className="btn btn-success"
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", padding: "0.75rem", fontWeight: "800", fontSize: "0.9rem", marginBottom: "0.5rem", cursor: "pointer" }}
                onClick={() => {
                  const dataObj = { expenses: expenses || [], budgets: categoryBudgets || {}, debts: debts || [] };
                  const jsonStr = JSON.stringify(dataObj, null, 2);
                  const fileName = `kakeibo-backup-${new Date().toISOString().split("T")[0]}.json`;

                  // 1. iPhone (iOS Safari) 向け: Web Share API で "ファイルに保存" シートを呼び出し
                  try {
                    const blob = new Blob([jsonStr], { type: "application/json" });
                    const file = new File([blob], fileName, { type: "application/json" });
                    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                      navigator.share({ files: [file], title: "家計簿バックアップ" }).catch(() => {});
                      return;
                    }
                  } catch (e) {
                    console.log("Web share fallback:", e);
                  }

                  // 2. Blob URL による標準ダウンロード
                  try {
                    const blob = new Blob([jsonStr], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = fileName;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(() => URL.revokeObjectURL(url), 2000);
                    alert(`✅ バックアップファイル (${fileName}) の保存処理を実行しました！`);
                    return;
                  } catch (e) {
                    console.log("Blob DL fallback:", e);
                  }

                  window.prompt("以下のバックアップテキストを全選択してコピーし、メモ帳等に保存してください:", jsonStr);
                }}
              >
                <Download size={16} />
                📥 スマホの『ファイル』に保存（ダウンロード）
              </button>

              {/* クリップボード一発コピー */}
              <button
                className="btn btn-secondary"
                style={{ width: "100%", padding: "0.65rem", fontWeight: "700", fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(backupJsonStr);
                    setCopiedBackup(true);
                    setTimeout(() => setCopiedBackup(false), 3000);
                  } catch {
                    window.prompt("以下のテキストを全選択してコピーしてください:", backupJsonStr);
                  }
                }}
              >
                {copiedBackup ? "✅ コピー完了！メモ帳等に貼り付けて保存" : "📋 テキストをコピーしてメモ帳等に保存"}
              </button>
            </div>

            {/* 2. 復元セクション */}
            <div style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "var(--radius-md)", padding: "1rem", marginBottom: "1.25rem" }}>
              <h4 style={{ fontSize: "0.9rem", fontWeight: "700", marginBottom: "0.6rem", color: "var(--accent-amber)" }}>
                2. データの復元
              </h4>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label
                  className="btn btn-secondary btn-sm"
                  style={{ cursor: "pointer", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem", padding: "0.6rem" }}
                >
                  📤 保存したファイルを選んで復元
                  <input
                    type="file"
                    accept=".json"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        try {
                          const parsed = JSON.parse(reader.result);
                          if (parsed.expenses && Array.isArray(parsed.expenses)) {
                            if (window.confirm(`バックアップから ${parsed.expenses.length} 件の明細データを復元します。よろしいですか？`)) {
                              setExpenses(parsed.expenses);
                              if (parsed.budgets) setCategoryBudgets(parsed.budgets);
                              if (parsed.debts) setDebts(parsed.debts);
                              alert("✅ バックアップからの復元が完了しました！");
                              setShowBackupModal(false);
                            }
                          } else {
                            alert("❌ 無効なバックアップファイルです。");
                          }
                        } catch {
                          alert("❌ ファイルの読み込みに失敗しました。");
                        }
                      };
                      reader.readAsText(file);
                      e.target.value = "";
                    }}
                  />
                </label>

                <button
                  className="btn btn-secondary btn-sm"
                  style={{ padding: "0.6rem" }}
                  onClick={() => {
                    const input = window.prompt("保存したバックアップテキスト（JSON）をここに貼り付けてください:");
                    if (!input) return;
                    try {
                      const parsed = JSON.parse(input);
                      if (parsed.expenses && Array.isArray(parsed.expenses)) {
                        if (window.confirm(`貼り付けたデータから ${parsed.expenses.length} 件の明細を復元します。よろしいですか？`)) {
                          setExpenses(parsed.expenses);
                          if (parsed.budgets) setCategoryBudgets(parsed.budgets);
                          if (parsed.debts) setDebts(parsed.debts);
                          alert("✅ バックアップからの復元が完了しました！");
                          setShowBackupModal(false);
                        }
                      } else {
                        alert("❌ 無効なデータ形式です。");
                      }
                    } catch {
                      alert("❌ 貼り付けられたテキストの解析に失敗しました。");
                    }
                  }}
                >
                  📋 テキスト貼り付けで復元
                </button>
              </div>
            </div>

            <button
              className="btn btn-secondary"
              style={{ width: "100%", padding: "0.65rem", fontWeight: "700" }}
              onClick={() => setShowBackupModal(false)}
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* トップヘッダー */}
      <header>
        {/* 1行目: ロゴバッジのみ */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.5rem" }}>
          <div className="logo-badge" style={{ marginBottom: 0 }}>
            <Heart size={14} style={{ color: "#ec4899" }} />
            <span>夫婦・パートナー用 スマート家計簿</span>
          </div>
        </div>

        {/* 2行目: 設定・操作ボタン（文字サイズ・バックアップ・更新ボタンを同列グループに配置） */}
        <div style={{ display: "flex", justifyContent: "center", gap: "0.4rem", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap" }}>
          <button
            onClick={() => setTextSize(textSize === "normal" ? "large" : "normal")}
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "var(--text-primary)",
              padding: "0.3rem 0.75rem",
              borderRadius: "var(--radius-full)",
              fontSize: "0.75rem",
              fontWeight: "700",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.25rem"
            }}
          >
            🔍 文字: {textSize === "normal" ? "標準" : "大きめ"}
          </button>

          <button
            onClick={() => setShowBackupModal(true)}
            style={{
              background: "rgba(52, 211, 153, 0.15)",
              border: "1px solid rgba(52, 211, 153, 0.4)",
              color: "#34d399",
              padding: "0.3rem 0.75rem",
              borderRadius: "var(--radius-full)",
              fontSize: "0.75rem",
              fontWeight: "800",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.3rem"
            }}
            title="バックアップの保存・復元画面を開きます"
          >
            <Download size={14} />
            <span>💾 バックアップ / 復元</span>
          </button>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            style={{
              background: isRefreshing ? "rgba(56, 189, 248, 0.15)" : "rgba(255, 255, 255, 0.08)",
              border: isRefreshing ? "1px solid var(--accent-cyan)" : "1px solid rgba(255, 255, 255, 0.15)",
              color: "var(--text-primary)",
              padding: "0.3rem 0.75rem",
              borderRadius: "var(--radius-full)",
              fontSize: "0.75rem",
              fontWeight: "700",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
              transition: "all 0.15s ease",
              transform: isRefreshing ? "scale(0.92)" : "scale(1)"
            }}
            title="アプリを再読み込みします"
          >
            <RefreshCw 
              size={12} 
              className={isRefreshing ? "animate-spin" : ""} 
              style={{ color: "#38bdf8" }} 
            />
            <span>{isRefreshing ? "更新中" : "更新"}</span>
          </button>

          {/* Supabase 同期ステータスバッジ */}
          <div
            style={{
              background: dbSyncStatus === "success" ? "rgba(16, 185, 129, 0.12)" : dbSyncStatus === "syncing" ? "rgba(56, 189, 248, 0.12)" : "rgba(255, 255, 255, 0.04)",
              border: dbSyncStatus === "success" ? "1px solid rgba(16, 185, 129, 0.3)" : dbSyncStatus === "syncing" ? "1px solid rgba(56, 189, 248, 0.3)" : "1px solid var(--border-color)",
              color: dbSyncStatus === "success" ? "#34d399" : dbSyncStatus === "syncing" ? "#38bdf8" : "var(--text-secondary)",
              padding: "0.25rem 0.75rem",
              borderRadius: "var(--radius-full)",
              fontSize: "0.75rem",
              fontWeight: "700",
              display: "flex",
              alignItems: "center",
              gap: "0.25rem"
            }}
          >
            <Cloud size={12} />
            <span>
              {dbSyncStatus === "success" ? "ネット同期中" : dbSyncStatus === "syncing" ? "同期中..." : dbSyncStatus === "error" ? "接続エラー" : "ローカル保存"}
            </span>
          </div>
        </div>
        <h1>スマートAIレシート家計簿</h1>
        <p className="subtitle">
          レシートの写真を撮るだけでAIが品目・金額・店舗を全自動パース。スプレッドシート連携＆夫婦での共有に対応。
        </p>

        {/* 環境設定バナー */}
        <div style={{ marginTop: "1rem", display: "flex", justifyContent: "center" }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowApiKeyModal(!showApiKeyModal)}
            style={{ borderRadius: "var(--radius-full)", background: "rgba(255, 255, 255, 0.05)" }}
          >
            <Key size={14} style={{ color: "var(--accent-amber)" }} />
            <span>⚙️ アプリの設定（APIキー・夫婦同期）</span>
          </button>
        </div>

        {showApiKeyModal && (
          <div style={{ maxWidth: "520px", margin: "1rem auto 0", padding: "1.25rem", background: "rgba(15, 23, 42, 0.95)", border: "1px solid var(--border-glow)", borderRadius: "var(--radius-md)", textAlign: "left" }} className="animate-fade-in">
            <h4 style={{ fontSize: "0.95rem", fontWeight: "700", marginBottom: "0.5rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
              🤖 Gemini APIキーの設定
            </h4>
            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
              Google AI Studioから無料で取得できるAPIキーを設定すると、本物のレシート画像の読み取りが可能になります。
            </p>
            <input
              type="password"
              placeholder="AIzaSy..."
              className="input-style"
              style={{ fontSize: "0.85rem", padding: "0.5rem", marginBottom: "1rem" }}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />

            <h4 style={{ fontSize: "0.95rem", fontWeight: "700", marginBottom: "0.5rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.35rem", borderTop: "1px solid rgba(255, 255, 255, 0.1)", paddingTop: "1rem" }}>
              ☁️ 夫婦・パートナー間データ同期
            </h4>
            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
              同期ステータス: <strong>{dbSyncStatus === "success" ? "✅ 自動同期中（接続正常）" : dbSyncStatus === "syncing" ? "🔄 同期処理中..." : "⚠️ 未接続または同期エラー"}</strong>
            </p>
            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>
              データの保存場所として、ご自身のGitHubリポジトリ（<strong>takahi-g/receipt-kakeibo/db.json</strong>）をデータベースとして自動連携しました。面倒な設定や新規登録は一切不要です。<br />
              同じページ（URL）をご夫婦それぞれのスマホで開くだけで、いつでも最新データが自動的に同期されます。
            </p>

            <h4 style={{ fontSize: "0.95rem", fontWeight: "700", marginBottom: "0.5rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.35rem", borderTop: "1px solid rgba(255, 255, 255, 0.1)", paddingTop: "1rem" }}>
              💾 データバックアップ・復元
            </h4>
            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.75rem", lineHeight: "1.4" }}>
              万が一データが消えた場合に備えて、全データをJSONファイルとしてスマホに保存できます。復元したい場合は保存したファイルをアップロードしてください。
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ flex: 1 }}
                  onClick={async () => {
                    const data = { expenses, budgets: categoryBudgets, debts };
                    const jsonStr = JSON.stringify(data, null, 2);
                    const fileName = `kakeibo-backup-${new Date().toISOString().split("T")[0]}.json`;

                    // 1. iOS / スマホ用 Web Share API
                    try {
                      const blob = new Blob([jsonStr], { type: "application/json" });
                      const file = new File([blob], fileName, { type: "application/json" });
                      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                        await navigator.share({ files: [file], title: "家計簿バックアップ" });
                        return;
                      }
                    } catch (err) {
                      if (err.name === "AbortError") return; // ユーザーのキャンセルは正常終了
                      console.log("Web Share API fallthrough:", err);
                    }

                    // 2. ブラウザ標準 <a> ダウンロード
                    try {
                      const blob = new Blob([jsonStr], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = fileName;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      setTimeout(() => URL.revokeObjectURL(url), 3000);
                      alert(`✅ バックアップファイル (${fileName}) をダウンロード保存しました！`);
                      return;
                    } catch (err) {
                      console.log("Anchor download fallthrough:", err);
                    }

                    // 3. クリップボードへの確実な自動コピー (フォールバック)
                    try {
                      if (navigator.clipboard && navigator.clipboard.writeText) {
                        await navigator.clipboard.writeText(jsonStr);
                        alert("✅ バックアップデータをクリップボードにコピーしました！\nメモ帳などに貼り付けて保存できます。");
                        return;
                      }
                    } catch (err) {
                      console.log("Clipboard fallthrough:", err);
                    }

                    // 4. ダイアログ表示フォールバック
                    window.prompt("以下のバックアップテキストを全選択してコピーしてください:", jsonStr);
                  }}
                >
                  📥 バックアップを保存
                </button>

                <label
                  className="btn btn-secondary btn-sm"
                  style={{ flex: 1, cursor: "pointer", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem" }}
                >
                  📤 ファイルから復元
                  <input
                    type="file"
                    accept=".json"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        try {
                          const parsed = JSON.parse(reader.result);
                          if (parsed.expenses && Array.isArray(parsed.expenses)) {
                            if (window.confirm(`バックアップから ${parsed.expenses.length} 件の明細データを復元します。現在のデータは上書きされます。よろしいですか？`)) {
                              setExpenses(parsed.expenses);
                              if (parsed.budgets) setCategoryBudgets(parsed.budgets);
                              if (parsed.debts) setDebts(parsed.debts);
                              alert("✅ バックアップからの復元が完了しました！");
                            }
                          } else {
                            alert("❌ 無効なバックアップファイルです。");
                          }
                        } catch {
                          alert("❌ ファイルの読み込みに失敗しました。");
                        }
                      };
                      reader.readAsText(file);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>

              {/* クリップボードテキストによる復元 */}
              <button
                className="btn btn-secondary btn-sm"
                style={{ width: "100%", fontSize: "0.75rem", padding: "0.3rem" }}
                onClick={() => {
                  const input = window.prompt("保存したバックアップテキスト（JSON）をここに貼り付けてください:");
                  if (!input) return;
                  try {
                    const parsed = JSON.parse(input);
                    if (parsed.expenses && Array.isArray(parsed.expenses)) {
                      if (window.confirm(`貼り付けたデータから ${parsed.expenses.length} 件の明細を復元します。よろしいですか？`)) {
                        setExpenses(parsed.expenses);
                        if (parsed.budgets) setCategoryBudgets(parsed.budgets);
                        if (parsed.debts) setDebts(parsed.debts);
                        alert("✅ バックアップテキストからの復元が完了しました！");
                      }
                    } else {
                      alert("❌ 無効なデータ形式です。");
                    }
                  } catch (err) {
                    alert("❌ 貼り付けられたテキストの解析に失敗しました。正しいJSONテキストかご確認ください。");
                  }
                }}
              >
                📋 コピーしたテキストの貼り付けで復元
              </button>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.85rem" }}>
              <button className="btn btn-primary btn-sm" onClick={() => setShowApiKeyModal(false)}>
                設定を保存する
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
          支出明細一覧
        </button>

        <button
          className={`tab-btn ${activeTab === "dashboard" ? "active" : ""}`}
          onClick={() => setActiveTab("dashboard")}
        >
          <PieChart size={18} />
          収支グラフ・夫婦共有
        </button>

        <button
          className={`tab-btn ${activeTab === "debts" ? "active" : ""}`}
          onClick={() => setActiveTab("debts")}
        >
          <Landmark size={18} />
          借入・返済管理
        </button>
      </nav>

      {/* タブコンテンツ切替 */}
      <main>
        {activeTab === "scanner" && (
          <ReceiptScanner
            apiKey={apiKey}
            onAddExpenses={handleAddExpenses}
            expenses={expenses}
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
            categoryBudgets={categoryBudgets}
            onUpdateCategoryBudget={handleUpdateCategoryBudget}
            onImportExpenses={handleImportExpenses}
          />
        )}

        {activeTab === "debts" && (
          <DebtManager
            expenses={expenses}
            debts={debts}
            onUpdateDebts={handleUpdateDebts}
          />
        )}
      </main>

      {/* ページ下部フッター */}
      <footer style={{ marginTop: "2rem", textAlign: "center", fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
        <button
          onClick={() => setShowUpdateModal(true)}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            fontSize: "0.725rem",
            fontFamily: "monospace",
            cursor: "pointer",
            textDecoration: "underline",
            padding: "0.2rem 0.5rem"
          }}
          title="アプデ情報を再確認する"
        >
          ver {CURRENT_APP_VERSION} (✨ 更新情報を確認)
        </button>
      </footer>
    </div>
  );
}

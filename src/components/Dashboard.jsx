import React, { useState } from "react";
import { 
  PieChart, 
  Share2, 
  FileSpreadsheet, 
  Download, 
  Upload, 
  Users, 
  TrendingUp, 
  Wallet, 
  DollarSign, 
  Check, 
  Copy,
  Settings,
  ShieldCheck,
  CloudSync
} from "lucide-react";

export default function Dashboard({ expenses, monthlyBudget, onUpdateBudget, onImportExpenses }) {
  const [copiedSync, setCopiedSync] = useState(false);
  const [supabaseUrl, setSupabaseUrl] = useState(() => localStorage.getItem("kakeibo_supabase_url") || "");
  const [supabaseKey, setSupabaseKey] = useState(() => localStorage.getItem("kakeibo_supabase_key") || "");
  const [showSyncConfig, setShowSyncConfig] = useState(false);

  // 今月の支出合計計算
  const currentMonthStr = new Date().toISOString().substring(0, 7); // "YYYY-MM"
  const currentMonthExpenses = expenses.filter((item) => (item.date || "").startsWith(currentMonthStr));
  
  const totalSpend = currentMonthExpenses.reduce((sum, item) => sum + Number(item.price || 0), 0);
  const budgetRemaining = monthlyBudget - totalSpend;
  const budgetPercent = Math.min(Math.round((totalSpend / (monthlyBudget || 1)) * 100), 100);

  // カテゴリ別集計
  const categoryTotals = {
    food: 0,
    daily: 0,
    utility: 0,
    other: 0
  };

  currentMonthExpenses.forEach((item) => {
    const cat = item.category || "other";
    categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(item.price || 0);
  });

  // Google Sheets / CSV への出力
  const exportToCSV = () => {
    if (expenses.length === 0) return;

    const headers = ["日付", "店舗・支払先", "品名", "金額(円)", "カテゴリ", "決済方法"];
    const rows = expenses.map((item) => [
      `"${item.date || ""}"`,
      `"${item.storeName || ""}"`,
      `"${item.name || ""}"`,
      item.price || 0,
      `"${item.category || "other"}"`,
      `"${item.paymentMethod || "現金"}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `家計簿データ_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  // JSONバックアップ保存
  const exportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(expenses, null, 2));
    const link = document.createElement("a");
    link.href = dataStr;
    link.download = `kakeibo_backup_${new Date().toISOString().split("T")[0]}.json`;
    link.click();
  };

  // JSONインポート
  const handleJSONImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (Array.isArray(imported)) {
          onImportExpenses(imported);
          alert("データが正常に同期・読み込まれました！");
        }
      } catch (err) {
        alert("JSONファイルの形式が正しくありません。");
      }
    };
    reader.readAsText(file);
  };

  // 夫婦共有コードの生成
  const generateSyncCode = () => {
    const syncData = btoa(encodeURIComponent(JSON.stringify(expenses.slice(0, 30))));
    navigator.clipboard.writeText(syncData);
    setCopiedSync(true);
    setTimeout(() => setCopiedSync(false), 2500);
  };

  // Supabase保存
  const handleSaveSupabaseConfig = (e) => {
    e.preventDefault();
    localStorage.setItem("kakeibo_supabase_url", supabaseUrl);
    localStorage.setItem("kakeibo_supabase_key", supabaseKey);
    alert("クラウド同期設定を保存しました！");
    setShowSyncConfig(false);
  };

  return (
    <div className="card animate-fade-in">
      <div className="card-header">
        <h2 className="card-title">
          <PieChart style={{ color: "var(--accent-pink)" }} size={22} />
          今月の収支ダッシュボード & 夫婦共有
        </h2>
        <button className="btn btn-secondary btn-sm" onClick={() => setShowSyncConfig(!showSyncConfig)}>
          <Settings size={14} /> 共有・同期設定
        </button>
      </div>

      {/* クラウド設定アコーディオン */}
      {showSyncConfig && (
        <form onSubmit={handleSaveSupabaseConfig} style={{ marginBottom: "1.25rem", padding: "1rem", background: "rgba(15, 23, 42, 0.8)", border: "1px solid var(--border-glow)", borderRadius: "var(--radius-md)" }}>
          <h4 style={{ fontSize: "0.9rem", fontWeight: "700", marginBottom: "0.5rem", color: "#818cf8", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Users size={16} /> 夫婦・パートナー間クラウド同期 (Supabase / Firebase)
          </h4>
          <p style={{ fontSize: "0.775rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
            URLとキーを入力することで、お互いのスマホからリアルタイムに同じ家計簿データを書き込み・共有できます。
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <input
              type="text"
              placeholder="Supabase Project URL"
              className="input-style"
              style={{ fontSize: "0.8rem", padding: "0.4rem 0.6rem" }}
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
            />
            <input
              type="password"
              placeholder="Supabase Anon Key"
              className="input-style"
              style={{ fontSize: "0.8rem", padding: "0.4rem 0.6rem" }}
              value={supabaseKey}
              onChange={(e) => setSupabaseKey(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-sm" style={{ width: "100%" }}>
            クラウド同期設定を保存
          </button>
        </form>
      )}

      {/* サマリーカード Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
        <div className="stat-box">
          <span className="stat-lbl">今月の支出合計</span>
          <div className="stat-val">¥{totalSpend.toLocaleString()}</div>
        </div>

        <div className="stat-box">
          <span className="stat-lbl">今月の設定予算</span>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem", marginTop: "0.2rem" }}>
            <span style={{ fontSize: "1.3rem", fontWeight: "800" }}>¥</span>
            <input
              type="number"
              className="input-style"
              style={{ width: "110px", padding: "0.2rem 0.4rem", fontSize: "1.1rem", fontWeight: "800", textAlign: "center" }}
              value={monthlyBudget}
              onChange={(e) => onUpdateBudget(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="stat-box">
          <span className="stat-lbl">今月の予算残高</span>
          <div className="stat-val" style={{ color: budgetRemaining < 0 ? "#f43f5e" : "#10b981" }}>
            ¥{budgetRemaining.toLocaleString()}
          </div>
        </div>
      </div>

      {/* 予算進捗バー */}
      <div style={{ marginBottom: "1.75rem", background: "rgba(15, 23, 42, 0.4)", padding: "1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", fontWeight: "700" }}>
          <span>今月の予算消化率</span>
          <span style={{ color: budgetPercent > 90 ? "#f43f5e" : "var(--accent-primary)" }}>{budgetPercent}% 消化</span>
        </div>
        <div className="progress-bar-bg">
          <div
            className="progress-bar-fill"
            style={{
              width: `${budgetPercent}%`,
              background: budgetPercent > 90 
                ? "linear-gradient(90deg, #f59e0b, #f43f5e)" 
                : "linear-gradient(90deg, #6366f1, #10b981)"
            }}
          ></div>
        </div>
      </div>

      {/* カテゴリ別内訳 */}
      <div style={{ marginBottom: "1.75rem" }}>
        <h3 style={{ fontSize: "0.95rem", fontWeight: "700", marginBottom: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <TrendingUp size={18} style={{ color: "var(--accent-secondary)" }} />今月の費目別支出グラフ
        </h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <div style={{ padding: "0.85rem", background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "var(--radius-md)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "#34d399" }}>🍎 食費</span>
              <span style={{ fontWeight: "800", fontSize: "1.1rem" }}>¥{categoryTotals.food.toLocaleString()}</span>
            </div>
          </div>

          <div style={{ padding: "0.85rem", background: "rgba(56, 189, 248, 0.08)", border: "1px solid rgba(56, 189, 248, 0.2)", borderRadius: "var(--radius-md)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "#38bdf8" }}>🧴 日用品</span>
              <span style={{ fontWeight: "800", fontSize: "1.1rem" }}>¥{categoryTotals.daily.toLocaleString()}</span>
            </div>
          </div>

          <div style={{ padding: "0.85rem", background: "rgba(251, 191, 36, 0.08)", border: "1px solid rgba(251, 191, 36, 0.2)", borderRadius: "var(--radius-md)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "#fbbf24" }}>⚡️ 光熱費</span>
              <span style={{ fontWeight: "800", fontSize: "1.1rem" }}>¥{categoryTotals.utility.toLocaleString()}</span>
            </div>
          </div>

          <div style={{ padding: "0.85rem", background: "rgba(168, 85, 247, 0.08)", border: "1px solid rgba(168, 85, 247, 0.2)", borderRadius: "var(--radius-md)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "#c084fc" }}>📦 その他</span>
              <span style={{ fontWeight: "800", fontSize: "1.1rem" }}>¥{categoryTotals.other.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* データ共有・書き出しセクション */}
      <div style={{ padding: "1.25rem", background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)" }}>
        <h3 style={{ fontSize: "0.95rem", fontWeight: "700", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <FileSpreadsheet size={18} style={{ color: "var(--accent-emerald)" }} />
          データ共有・Googleスプレッドシート書き出し
        </h3>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button className="btn btn-success" style={{ flex: 1 }} onClick={exportToCSV}>
            <FileSpreadsheet size={18} /> CSV出力 (Google Sheets対応)
          </button>

          <button className="btn btn-secondary" onClick={generateSyncCode}>
            {copiedSync ? <Check size={18} style={{ color: "#34d399" }} /> : <Copy size={18} />}
            {copiedSync ? "コピーしました！" : "共有コードをコピー"}
          </button>

          <button className="btn btn-secondary" onClick={exportJSON}>
            <Download size={18} /> JSONバックアップ
          </button>

          <label className="btn btn-secondary" style={{ cursor: "pointer" }}>
            <Upload size={18} /> バックアップ読込
            <input type="file" accept=".json" onChange={handleJSONImport} style={{ display: "none" }} />
          </label>
        </div>
      </div>
    </div>
  );
}

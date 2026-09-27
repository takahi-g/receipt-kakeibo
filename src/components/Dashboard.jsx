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
  CloudSync,
  Eye,
  EyeOff
} from "lucide-react";

const CATEGORY_MAP = {
  food: { label: "食費", emoji: "🍎" },
  eatingOut: { label: "外食", emoji: "🍔" },
  daily: { label: "日用品", emoji: "🧴" },
  childcare: { label: "子ども", emoji: "👶" },
  transport: { label: "交通費", emoji: "🚗" },
  housing: { label: "住居", emoji: "🏠" },
  utility: { label: "水道光熱費", emoji: "⚡️" },
  telecom: { label: "通信費", emoji: "📞" },
  medical: { label: "医療", emoji: "🏥" },
  beautyClothing: { label: "美容・衣服", emoji: "👗" },
  hobby: { label: "趣味", emoji: "🎮" },
  education: { label: "教育", emoji: "✏️" },
  subscription: { label: "サブスク", emoji: "📺" },
  special: { label: "特別費", emoji: "🎁" },
  insurance: { label: "保険", emoji: "🛡️" },
  taxes: { label: "税金", emoji: "💸" },
  savings: { label: "貯金", emoji: "🐷" },
  debtRepayment: { label: "借入返済", emoji: "🏦" },
  other: { label: "その他", emoji: "📦" }
};

export default function Dashboard({ expenses, categoryBudgets, onUpdateCategoryBudget, onImportExpenses }) {
  const [copiedSync, setCopiedSync] = useState(false);

  // 明細データから存在するすべての「年-月」を重複なしで抽出して並び替え
  const availableMonths = Array.from(new Set(
    expenses.map((item) => (item.date || "").substring(0, 7))
      .filter((m) => m && m.length === 7 && /^\d{4}-\d{2}$/.test(m))
  ));
  
  // 今月の月を必ず選択肢に追加
  const currentMonthToday = new Date().toISOString().substring(0, 7);
  if (!availableMonths.includes(currentMonthToday)) {
    availableMonths.push(currentMonthToday);
  }
  
  // 降順にソート (新しい月が上)
  availableMonths.sort((a, b) => b.localeCompare(a));

  // 選択中の表示年月
  const [selectedMonth, setSelectedMonth] = useState(currentMonthToday);

  // 週の内訳 (1week〜5week) の表示・折りたたみ状態 (デフォルトは折りたたんでスッキリ表示)
  const [showWeeklyDetails, setShowWeeklyDetails] = useState(false);

  // 全体の総予算（費目別予算の合計）
  const monthlyBudget = Object.values(categoryBudgets).reduce((sum, v) => sum + Number(v || 0), 0);

  // 選択した月の支出合計計算
  const currentMonthStr = selectedMonth;
  const currentMonthExpenses = expenses.filter((item) => (item.date || "").startsWith(currentMonthStr));
  
  const totalSpend = currentMonthExpenses.reduce((sum, item) => sum + Number(item.price || 0), 0);
  const budgetRemaining = monthlyBudget - totalSpend;
  const budgetPercent = Math.min(Math.round((totalSpend / (monthlyBudget || 1)) * 100), 100);

  // 週別の仕分け集計ロジック
  const weeklyData = {};
  Object.keys(CATEGORY_MAP).forEach((cat) => {
    weeklyData[cat] = {
      w1: 0,
      w2: 0,
      w3: 0,
      w4: 0,
      w5: 0,
      total: 0
    };
  });

  currentMonthExpenses.forEach((item) => {
    const cat = item.category || "other";
    const targetCat = weeklyData[cat] ? cat : "other";
    
    // 日付の日を取得
    const dateObj = new Date(item.date);
    const day = isNaN(dateObj.getTime()) ? 1 : dateObj.getDate();
    const price = Number(item.price || 0);

    if (day <= 7) {
      weeklyData[targetCat].w1 += price;
    } else if (day <= 14) {
      weeklyData[targetCat].w2 += price;
    } else if (day <= 21) {
      weeklyData[targetCat].w3 += price;
    } else if (day <= 28) {
      weeklyData[targetCat].w4 += price;
    } else {
      weeklyData[targetCat].w5 += price;
    }
    weeklyData[targetCat].total += price;
  });

  // 列ごとの合計値
  const colTotals = { w1: 0, w2: 0, w3: 0, w4: 0, w5: 0, total: 0, budget: 0, remaining: 0 };
  Object.keys(CATEGORY_MAP).forEach((cat) => {
    colTotals.w1 += weeklyData[cat].w1;
    colTotals.w2 += weeklyData[cat].w2;
    colTotals.w3 += weeklyData[cat].w3;
    colTotals.w4 += weeklyData[cat].w4;
    colTotals.w5 += weeklyData[cat].w5;
    colTotals.total += weeklyData[cat].total;
    colTotals.budget += Number(categoryBudgets[cat] || 0);
  });
  colTotals.remaining = colTotals.budget - colTotals.total;

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
          alert("バックアップデータ(JSON)を正常に読み込みました！");
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

  return (
    <div className="card animate-fade-in">
      <div className="card-header">
        <h2 className="card-title">
          <PieChart style={{ color: "var(--accent-pink)" }} size={22} />
          今月の収支ダッシュボード & 夫婦共有
        </h2>
      </div>

      {/* 年月セレクター */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem", padding: "0.5rem 0.75rem", background: "rgba(255, 255, 255, 0.03)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", width: "fit-content" }}>
        <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: "700" }}>📅 表示年月を選択:</span>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="input-style"
          style={{ 
            width: "155px", 
            color: "#ffffff",
            backgroundColor: "#1e293b",
            colorScheme: "dark",
            border: "1px solid var(--border-color)",
            padding: "0.35rem 0.5rem" // 大きめモードを考慮して少しゆとりを持たせる
          }}
        >
          {availableMonths.map((m) => {
            const [y, mm] = m.split("-");
            return <option key={m} value={m} style={{ color: "#ffffff", backgroundColor: "#1e293b" }}>{`${y}年${mm}月`}</option>;
          })}
        </select>
      </div>

      {/* サマリーカード Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
        <div className="stat-box">
          <span className="stat-lbl">今月の支出合計</span>
          <div className="stat-val">¥{totalSpend.toLocaleString()}</div>
        </div>

        <div className="stat-box">
          <span className="stat-lbl">今月の設定予算</span>
          <div className="stat-val" style={{ marginTop: "0.2rem" }}>¥{monthlyBudget.toLocaleString()}</div>
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

      {/* スプレッドシート風 週別集計テーブル */}
      <div style={{ marginBottom: "1.75rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <h3 style={{ fontSize: "0.95rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.5rem", whiteSpace: "nowrap", margin: 0 }}>
            <TrendingUp size={18} style={{ color: "var(--accent-secondary)" }} />
            【{selectedMonth.split("-")[0]}年{selectedMonth.split("-")[1]}月】費目別・集計テーブル
          </h3>
          <button
            onClick={() => setShowWeeklyDetails(!showWeeklyDetails)}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: "0.75rem", padding: "0.3rem 0.65rem", display: "flex", alignItems: "center", gap: "0.35rem", borderRadius: "var(--radius-sm)" }}
          >
            {showWeeklyDetails ? <EyeOff size={14} /> : <Eye size={14} />}
            {showWeeklyDetails ? "週の内訳(1〜5w)をたたむ" : "週の内訳(1〜5w)を表示"}
          </button>
        </div>
        
        {/* レスポンシブな横スクロール対応コンテナ */}
        <div style={{ width: "100%", overflowX: "auto", background: "rgba(15, 23, 42, 0.5)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: "0.5rem" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", textAlign: "right", minWidth: showWeeklyDetails ? "750px" : "100%" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>
                <th style={{ textAlign: "left", padding: "0.5rem", fontWeight: "800" }}>費目</th>
                {showWeeklyDetails && (
                  <>
                    <th style={{ padding: "0.5rem" }}>1week</th>
                    <th style={{ padding: "0.5rem" }}>2week</th>
                    <th style={{ padding: "0.5rem" }}>3week</th>
                    <th style={{ padding: "0.5rem" }}>4week</th>
                    <th style={{ padding: "0.5rem" }}>5week</th>
                  </>
                )}
                <th style={{ padding: "0.5rem", fontWeight: "800", color: "var(--text-primary)" }}>合計 (TOTAL)</th>
                <th style={{ padding: "0.5rem", fontWeight: "800", color: "var(--accent-primary)", width: "100px" }}>予算</th>
                <th style={{ padding: "0.5rem", fontWeight: "800" }}>残額</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(CATEGORY_MAP).map(([catKey, cfg]) => {
                const data = weeklyData[catKey];
                const budget = Number(categoryBudgets[catKey] || 0);
                const remaining = budget - data.total;
                const isOverBudget = remaining < 0;

                return (
                  <tr key={catKey} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.03)" }}>
                    <td style={{ textAlign: "left", padding: "0.5rem", fontWeight: "700", color: "var(--text-primary)", whiteSpace: "nowrap" }}>
                      {cfg.emoji} {cfg.label}
                    </td>
                    {showWeeklyDetails && (
                      <>
                        <td style={{ padding: "0.5rem", color: data.w1 > 0 ? "var(--text-primary)" : "var(--text-muted)" }}>
                          {data.w1 > 0 ? `¥${data.w1.toLocaleString()}` : "¥0"}
                        </td>
                        <td style={{ padding: "0.5rem", color: data.w2 > 0 ? "var(--text-primary)" : "var(--text-muted)" }}>
                          {data.w2 > 0 ? `¥${data.w2.toLocaleString()}` : "¥0"}
                        </td>
                        <td style={{ padding: "0.5rem", color: data.w3 > 0 ? "var(--text-primary)" : "var(--text-muted)" }}>
                          {data.w3 > 0 ? `¥${data.w3.toLocaleString()}` : "¥0"}
                        </td>
                        <td style={{ padding: "0.5rem", color: data.w4 > 0 ? "var(--text-primary)" : "var(--text-muted)" }}>
                          {data.w4 > 0 ? `¥${data.w4.toLocaleString()}` : "¥0"}
                        </td>
                        <td style={{ padding: "0.5rem", color: data.w5 > 0 ? "var(--text-primary)" : "var(--text-muted)" }}>
                          {data.w5 > 0 ? `¥${data.w5.toLocaleString()}` : "¥0"}
                        </td>
                      </>
                    )}
                    <td style={{ padding: "0.5rem", fontWeight: "800", color: data.total > 0 ? "var(--text-primary)" : "var(--text-muted)" }}>
                      ¥{data.total.toLocaleString()}
                    </td>
                    <td style={{ padding: "0.25rem 0.5rem" }}>
                      <input
                        type="number"
                        value={categoryBudgets[catKey] === 0 ? "" : categoryBudgets[catKey]}
                        placeholder="0"
                        onChange={(e) => onUpdateCategoryBudget(catKey, Number(e.target.value))}
                        style={{
                          width: "80px",
                          background: "rgba(255, 255, 255, 0.04)",
                          border: "1px solid var(--border-color)",
                          borderRadius: "4px",
                          padding: "0.2rem 0.4rem",
                          color: "var(--text-primary)",
                          textAlign: "right",
                          fontSize: "0.8rem",
                          fontWeight: "700"
                        }}
                      />
                    </td>
                    <td style={{ 
                      padding: "0.5rem", 
                      fontWeight: "800", 
                      color: isOverBudget ? "#f43f5e" : "#10b981",
                      textShadow: isOverBudget ? "0 0 8px rgba(244, 63, 94, 0.3)" : "none"
                    }}>
                      ¥{remaining.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
              
              {/* 合計行 */}
              <tr style={{ borderTop: "2px solid var(--border-color)", background: "rgba(255, 255, 255, 0.02)", fontWeight: "800" }}>
                <td style={{ textAlign: "left", padding: "0.6rem 0.5rem", color: "var(--text-primary)" }}>合計</td>
                {showWeeklyDetails && (
                  <>
                    <td style={{ padding: "0.6rem 0.5rem" }}>¥{colTotals.w1.toLocaleString()}</td>
                    <td style={{ padding: "0.6rem 0.5rem" }}>¥{colTotals.w2.toLocaleString()}</td>
                    <td style={{ padding: "0.6rem 0.5rem" }}>¥{colTotals.w3.toLocaleString()}</td>
                    <td style={{ padding: "0.6rem 0.5rem" }}>¥{colTotals.w4.toLocaleString()}</td>
                    <td style={{ padding: "0.6rem 0.5rem" }}>¥{colTotals.w5.toLocaleString()}</td>
                  </>
                )}
                <td style={{ padding: "0.6rem 0.5rem", color: "var(--text-primary)" }}>¥{colTotals.total.toLocaleString()}</td>
                <td style={{ padding: "0.6rem 0.5rem", color: "var(--accent-primary)" }}>¥{colTotals.budget.toLocaleString()}</td>
                <td style={{ padding: "0.6rem 0.5rem", color: colTotals.remaining < 0 ? "#f43f5e" : "#10b981" }}>
                  ¥{colTotals.remaining.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
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

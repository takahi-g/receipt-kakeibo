import React, { useState } from "react";
import { Landmark, Plus, Trash2, Edit3, Check, X, Percent, TrendingUp } from "lucide-react";

export default function DebtManager({ expenses, debts, onUpdateDebts }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLender, setNewLender] = useState("");
  const [newInitial, setNewInitial] = useState("");
  const [newPaidBefore, setNewPaidBefore] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  // 特定の借入先に対する今年の返済額を、明細一覧から自動抽出して計算
  const getThisYearPaid = (lender) => {
    // "(教習所代金)"などの括弧内を除いたシンプルなキーワードで部分一致比較
    const cleanLender = lender.replace(/\(.*?\)/g, "").replace(/（.*?）/g, "").trim();
    if (!cleanLender) return 0;

    return expenses
      .filter((e) => {
        if (e.category !== "debtRepayment") return false;
        const expenseName = (e.name || "").toLowerCase();
        const storeName = (e.storeName || "").toLowerCase();
        const keyword = cleanLender.toLowerCase();
        return expenseName.includes(keyword) || storeName.includes(keyword) || keyword.includes(expenseName);
      })
      .reduce((sum, e) => sum + Number(e.price || 0), 0);
  };

  // 手動追加の処理
  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!newLender || !newInitial) return;

    const newDebt = {
      id: "debt-" + Date.now().toString(),
      lender: newLender,
      initial: Number(newInitial) || 0,
      paidBefore: Number(newPaidBefore) || 0
    };

    onUpdateDebts([...debts, newDebt]);

    setNewLender("");
    setNewInitial("");
    setNewPaidBefore("");
    setShowAddForm(false);
  };

  // 編集開始
  const handleStartEdit = (item) => {
    setEditingId(item.id);
    setEditForm({ ...item });
  };

  // 編集保存
  const handleSaveEdit = (id) => {
    const updated = debts.map((d) => (d.id === id ? { ...editForm } : d));
    onUpdateDebts(updated);
    setEditingId(null);
  };

  // 削除
  const handleDelete = (id) => {
    if (window.confirm("この借入先を削除してもよろしいですか？")) {
      const updated = debts.filter((d) => d.id !== id);
      onUpdateDebts(updated);
    }
  };

  // 各自の計算を含む一覧データの生成
  const computedDebts = debts.map((item) => {
    const thisYearPaid = getThisYearPaid(item.lender);
    const totalPaid = Number(item.paidBefore || 0) + thisYearPaid;
    const currentBalance = Math.max(Number(item.initial || 0) - totalPaid, 0);
    const progressPercent = item.initial > 0 ? Math.min(Math.round((totalPaid / item.initial) * 1000) / 10, 100) : 0;

    return {
      ...item,
      thisYearPaid,
      totalPaid,
      currentBalance,
      progressPercent
    };
  });

  // 合計の算出
  const totals = computedDebts.reduce(
    (acc, cur) => {
      acc.initial += cur.initial;
      acc.paidBefore += cur.paidBefore;
      acc.thisYearPaid += cur.thisYearPaid;
      acc.totalPaid += cur.totalPaid;
      acc.currentBalance += cur.currentBalance;
      return acc;
    },
    { initial: 0, paidBefore: 0, thisYearPaid: 0, totalPaid: 0, currentBalance: 0 }
  );
  const totalProgressPercent = totals.initial > 0 ? Math.round((totals.totalPaid / totals.initial) * 1000) / 10 : 0;

  return (
    <div className="card animate-fade-in">
      <div className="card-header">
        <h2 className="card-title">
          <Landmark style={{ color: "var(--accent-secondary)" }} size={22} />
          借入・返済進捗管理
        </h2>
        <button className="btn btn-secondary btn-sm" onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? <X size={16} /> : <Plus size={16} />}
          {showAddForm ? "閉じる" : "新しい借入先を追加"}
        </button>
      </div>

      {/* 新規追加フォーム */}
      {showAddForm && (
        <form onSubmit={handleAddSubmit} style={{ marginBottom: "1.25rem", padding: "1rem", background: "rgba(255, 255, 255, 0.03)", border: "1px solid var(--border-glow)", borderRadius: "var(--radius-md)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>借入先名称</label>
              <input
                type="text"
                placeholder="例: ソニー貸付"
                className="input-style"
                style={{ padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}
                value={newLender}
                onChange={(e) => setNewLender(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>当初借入額 (円)</label>
              <input
                type="number"
                placeholder="400000"
                className="input-style"
                style={{ padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}
                value={newInitial}
                onChange={(e) => setNewInitial(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>前月までの返済額 (円)</label>
              <input
                type="number"
                placeholder="50000"
                className="input-style"
                style={{ padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}
                value={newPaidBefore}
                onChange={(e) => setNewPaidBefore(e.target.value)}
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-sm" style={{ width: "100%" }}>
            <Plus size={16} /> 借入先を登録
          </button>
        </form>
      )}

      {/* 返済進捗サマリーカード */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
        <div className="stat-box">
          <span className="stat-lbl">借入総額（当初）</span>
          <div className="stat-val" style={{ fontSize: "1.25rem" }}>¥{totals.initial.toLocaleString()}</div>
        </div>
        <div className="stat-box">
          <span className="stat-lbl">現在の借入残高合計</span>
          <div className="stat-val" style={{ fontSize: "1.25rem", color: "#f43f5e", textShadow: "0 0 8px rgba(244, 63, 94, 0.2)" }}>
            ¥{totals.currentBalance.toLocaleString()}
          </div>
        </div>
        <div className="stat-box">
          <span className="stat-lbl">返済完了率（全体）</span>
          <div className="stat-val" style={{ fontSize: "1.25rem", color: "#10b981" }}>
            {totalProgressPercent}%
          </div>
        </div>
      </div>

      {/* 返済管理テーブル */}
      <div style={{ width: "100%", overflowX: "auto", background: "rgba(15, 23, 42, 0.5)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: "0.5rem", marginBottom: "1.5rem" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", textAlign: "right", minWidth: "800px" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>借入先</th>
              <th style={{ padding: "0.5rem" }}>当初借入額</th>
              <th style={{ padding: "0.5rem" }}>前月までの返済</th>
              <th style={{ padding: "0.5rem", color: "var(--accent-secondary)" }}>アプリ登録返済</th>
              <th style={{ padding: "0.5rem", fontWeight: "800", color: "var(--text-primary)" }}>現在の残高</th>
              <th style={{ padding: "0.5rem", textAlign: "center", width: "160px" }}>返済進捗</th>
              <th style={{ padding: "0.5rem", textAlign: "center", width: "80px" }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {computedDebts.map((item) => {
              const isEditing = editingId === item.id;

              return (
                <tr key={item.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.03)" }}>
                  {isEditing ? (
                    <>
                      <td style={{ textAlign: "left", padding: "0.25rem" }}>
                        <input
                          type="text"
                          className="input-style"
                          style={{ padding: "0.2rem 0.4rem", fontSize: "0.8rem" }}
                          value={editForm.lender}
                          onChange={(e) => setEditForm({ ...editForm, lender: e.target.value })}
                        />
                      </td>
                      <td style={{ padding: "0.25rem" }}>
                        <input
                          type="number"
                          className="input-style"
                          style={{ padding: "0.2rem 0.4rem", fontSize: "0.8rem", textAlign: "right" }}
                          value={editForm.initial}
                          onChange={(e) => setEditForm({ ...editForm, initial: Number(e.target.value) })}
                        />
                      </td>
                      <td style={{ padding: "0.25rem" }}>
                        <input
                          type="number"
                          className="input-style"
                          style={{ padding: "0.2rem 0.4rem", fontSize: "0.8rem", textAlign: "right" }}
                          value={editForm.paidBefore}
                          onChange={(e) => setEditForm({ ...editForm, paidBefore: Number(e.target.value) })}
                        />
                      </td>
                      <td style={{ padding: "0.5rem", color: "var(--text-muted)" }}>
                        ¥{item.thisYearPaid.toLocaleString()}
                      </td>
                      <td style={{ padding: "0.5rem", fontWeight: "800" }}>
                        ¥{item.currentBalance.toLocaleString()}
                      </td>
                      <td style={{ padding: "0.5rem" }}>-</td>
                      <td style={{ padding: "0.25rem", textAlign: "center" }}>
                        <div style={{ display: "flex", gap: "0.25rem", justifyContent: "center" }}>
                          <button className="btn btn-success btn-sm" onClick={() => handleSaveEdit(item.id)}>
                            <Check size={12} />
                          </button>
                          <button className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}>
                            <X size={12} />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ textAlign: "left", padding: "0.6rem 0.5rem", fontWeight: "700", color: "var(--text-primary)", whiteSpace: "nowrap" }}>
                        🏦 {item.lender}
                      </td>
                      <td style={{ padding: "0.6rem 0.5rem" }}>¥{item.initial.toLocaleString()}</td>
                      <td style={{ padding: "0.6rem 0.5rem" }}>¥{item.paidBefore.toLocaleString()}</td>
                      <td style={{ padding: "0.6rem 0.5rem", color: item.thisYearPaid > 0 ? "var(--accent-secondary)" : "var(--text-muted)", fontWeight: item.thisYearPaid > 0 ? "800" : "normal" }}>
                        ¥{item.thisYearPaid.toLocaleString()}
                      </td>
                      <td style={{ padding: "0.6rem 0.5rem", fontWeight: "800", color: item.currentBalance > 0 ? "var(--text-primary)" : "#10b981" }}>
                        ¥{item.currentBalance.toLocaleString()}
                      </td>
                      <td style={{ padding: "0.6rem 0.5rem", verticalAlign: "middle" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", justifyContent: "flex-end" }}>
                          <span style={{ fontWeight: "700", color: "var(--text-primary)" }}>{item.progressPercent}%</span>
                          <div style={{ width: "80px", height: "8px", background: "rgba(255, 255, 255, 0.1)", borderRadius: "99px", overflow: "hidden", display: "inline-block" }}>
                            <div style={{ 
                              width: `${item.progressPercent}%`, 
                              height: "100%", 
                              background: item.progressPercent === 100 ? "#10b981" : "linear-gradient(90deg, #6366f1, #3b82f6)",
                              boxShadow: "0 0 8px rgba(59, 130, 246, 0.5)"
                            }}></div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "0.6rem 0.5rem", textAlign: "center" }}>
                        <div style={{ display: "flex", gap: "0.25rem", justifyContent: "center" }}>
                          <button className="btn btn-secondary btn-sm" style={{ padding: "0.2rem 0.35rem" }} onClick={() => handleStartEdit(item)}>
                            <Edit3 size={12} />
                          </button>
                          <button className="btn btn-danger btn-sm" style={{ padding: "0.2rem 0.35rem" }} onClick={() => handleDelete(item.id)}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}

            {/* 合計行 */}
            <tr style={{ borderTop: "2px solid var(--border-color)", background: "rgba(255, 255, 255, 0.02)", fontWeight: "800" }}>
              <td style={{ textAlign: "left", padding: "0.6rem 0.5rem", color: "var(--text-primary)" }}>合計</td>
              <td style={{ padding: "0.6rem 0.5rem" }}>¥{totals.initial.toLocaleString()}</td>
              <td style={{ padding: "0.6rem 0.5rem" }}>¥{totals.paidBefore.toLocaleString()}</td>
              <td style={{ padding: "0.6rem 0.5rem", color: "var(--accent-secondary)" }}>¥{totals.thisYearPaid.toLocaleString()}</td>
              <td style={{ padding: "0.6rem 0.5rem", color: totals.currentBalance > 0 ? "#f43f5e" : "#10b981" }}>
                ¥{totals.currentBalance.toLocaleString()}
              </td>
              <td style={{ padding: "0.6rem 0.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", justifyContent: "flex-end" }}>
                  <span style={{ color: "var(--text-primary)" }}>{totalProgressPercent}%</span>
                  <div style={{ width: "80px", height: "8px", background: "rgba(255, 255, 255, 0.1)", borderRadius: "99px", overflow: "hidden", display: "inline-block" }}>
                    <div style={{ 
                      width: `${totalProgressPercent}%`, 
                      height: "100%", 
                      background: "linear-gradient(90deg, #3b82f6, #10b981)",
                      boxShadow: "0 0 8px rgba(16, 185, 129, 0.5)"
                    }}></div>
                  </div>
                </div>
              </td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.85rem", background: "rgba(99, 102, 241, 0.08)", border: "1px solid rgba(99, 102, 241, 0.2)", borderRadius: "var(--radius-md)", fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>
        <TrendingUp size={16} style={{ color: "var(--accent-primary)", flexShrink: 0 }} />
        <span>
          <strong>自動計算連携機能</strong>: 「支出明細一覧」でカテゴリを<strong>「借入返済」</strong>に設定し、品名に借入先名（例: 「楽天」、「コロナ」、「エポス」など）を含めて明細を登録すると、<strong>「アプリ登録返済」額として自動加算され、残高や進捗率がリアルタイムで更新</strong>されます。
        </span>
      </div>
    </div>
  );
}

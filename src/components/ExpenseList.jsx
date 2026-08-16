import React, { useState } from "react";
import { 
  ShoppingBag, 
  Trash2, 
  Edit3, 
  Search, 
  Filter, 
  Plus, 
  Check, 
  X,
  Building2,
  Calendar,
  Tag,
  DollarSign
} from "lucide-react";

const CATEGORY_MAP = {
  food: { label: "食費", emoji: "🍎", class: "badge-food" },
  daily: { label: "日用品", emoji: "🧴", class: "badge-daily" },
  utility: { label: "光熱費", emoji: "⚡️", class: "badge-utility" },
  other: { label: "その他", emoji: "📦", class: "badge-other" }
};

export default function ExpenseList({ expenses, onDeleteExpense, onUpdateExpense, onAddManualExpense }) {
  const [filterCategory, setFilterCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  // 手動追加フォーム
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStore, setNewStore] = useState("");
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newCategory, setNewCategory] = useState("food");
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);

  // フィルタリング処理
  const filteredExpenses = expenses.filter((item) => {
    const matchesCategory = filterCategory === "all" || item.category === filterCategory;
    const matchesSearch = 
      (item.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.storeName || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const totalFilteredAmount = filteredExpenses.reduce((sum, item) => sum + Number(item.price || 0), 0);

  // 編集開始
  const handleStartEdit = (item) => {
    setEditingId(item.id);
    setEditForm({ ...item });
  };

  // 編集保存
  const handleSaveEdit = (id) => {
    onUpdateExpense(id, editForm);
    setEditingId(null);
  };

  // 手動追加実行
  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!newName || !newPrice) return;

    onAddManualExpense({
      id: Date.now().toString(),
      storeName: newStore || "手動入力",
      name: newName,
      price: Number(newPrice),
      category: newCategory,
      date: newDate || new Date().toISOString().split("T")[0],
      createdAt: new Date().toISOString()
    });

    setNewStore("");
    setNewName("");
    setNewPrice("");
    setShowAddForm(false);
  };

  return (
    <div className="card animate-fade-in">
      <div className="card-header">
        <h2 className="card-title">
          <ShoppingBag style={{ color: "var(--accent-secondary)" }} size={22} />
          家計簿・支出明細一覧
        </h2>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? <X size={16} /> : <Plus size={16} />}
          {showAddForm ? "閉じる" : "手動で1件追加"}
        </button>
      </div>

      {/* 手動入力アコーディオン */}
      {showAddForm && (
        <form onSubmit={handleAddSubmit} style={{ marginBottom: "1.25rem", padding: "1rem", background: "rgba(255, 255, 255, 0.03)", border: "1px solid var(--border-glow)", borderRadius: "var(--radius-md)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>店舗・支払先</label>
              <input
                type="text"
                placeholder="例: セブンイレブン"
                className="input-style"
                style={{ padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}
                value={newStore}
                onChange={(e) => setNewStore(e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>品名・費目</label>
              <input
                type="text"
                placeholder="例: ランチ代"
                className="input-style"
                style={{ padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>金額 (円)</label>
              <input
                type="number"
                placeholder="1000"
                className="input-style"
                style={{ padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>カテゴリ</label>
              <select
                className="input-style"
                style={{ padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              >
                <option value="food">🍎 食費</option>
                <option value="daily">🧴 日用品</option>
                <option value="utility">⚡️ 光熱費</option>
                <option value="other">📦 その他</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>日付</label>
              <input
                type="date"
                className="input-style"
                style={{ padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-sm" style={{ width: "100%" }}>
            <Plus size={16} /> 明細を登録
          </button>
        </form>
      )}

      {/* 検索 & フィルター */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
          <Search size={16} style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="店舗名や商品名で検索..."
            className="input-style"
            style={{ paddingLeft: "2.4rem", fontSize: "0.85rem", height: "38px" }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", gap: "0.35rem", overflowX: "auto" }}>
          <button
            className={`btn btn-sm ${filterCategory === "all" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setFilterCategory("all")}
          >
            すべて
          </button>
          {Object.entries(CATEGORY_MAP).map(([key, cfg]) => (
            <button
              key={key}
              className={`btn btn-sm ${filterCategory === key ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setFilterCategory(key)}
            >
              {cfg.emoji} {cfg.label}
            </button>
          ))}
        </div>
      </div>

      {/* 検索・絞り込みの集計 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0.75rem", background: "rgba(15, 23, 42, 0.4)", borderRadius: "var(--radius-sm)", marginBottom: "1rem", fontSize: "0.8rem" }}>
        <span style={{ color: "var(--text-secondary)" }}>
          件数: <strong>{filteredExpenses.length}</strong> 件
        </span>
        <span>
          絞り込み合計: <strong style={{ color: "#f43f5e", fontSize: "1rem" }}>¥{totalFilteredAmount.toLocaleString()}</strong>
        </span>
      </div>

      {/* 明細リスト */}
      <div style={{ maxHeight: "450px", overflowY: "auto" }}>
        {filteredExpenses.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-muted)" }}>
            <ShoppingBag size={40} style={{ opacity: 0.3, marginBottom: "0.5rem" }} />
            <p style={{ fontWeight: "600" }}>該当する支出明細はありません</p>
            <p style={{ fontSize: "0.8rem", marginTop: "0.25rem" }}>レシート撮影または「手動で1件追加」から支出を記録しましょう。</p>
          </div>
        ) : (
          filteredExpenses.map((item) => {
            const isEditing = editingId === item.id;
            const cat = CATEGORY_MAP[item.category] || CATEGORY_MAP.other;

            return (
              <div key={item.id} className="expense-item">
                {isEditing ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", width: "100%" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                      <input
                        type="text"
                        className="input-style"
                        style={{ padding: "0.3rem 0.5rem", fontSize: "0.85rem" }}
                        value={editForm.storeName}
                        onChange={(e) => setEditForm({ ...editForm, storeName: e.target.value })}
                        placeholder="店舗名"
                      />
                      <input
                        type="text"
                        className="input-style"
                        style={{ padding: "0.3rem 0.5rem", fontSize: "0.85rem" }}
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        placeholder="商品名"
                      />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
                      <input
                        type="number"
                        className="input-style"
                        style={{ padding: "0.3rem 0.5rem", fontSize: "0.85rem" }}
                        value={editForm.price}
                        onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                        placeholder="金額"
                      />
                      <select
                        className="input-style"
                        style={{ padding: "0.3rem 0.5rem", fontSize: "0.85rem" }}
                        value={editForm.category}
                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                      >
                        <option value="food">🍎 食費</option>
                        <option value="daily">🧴 日用品</option>
                        <option value="utility">⚡️ 光熱費</option>
                        <option value="other">📦 その他</option>
                      </select>
                      <div style={{ display: "flex", gap: "0.25rem" }}>
                        <button className="btn btn-success btn-sm" style={{ flex: 1 }} onClick={() => handleSaveEdit(item.id)}>
                          <Check size={14} />
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}>
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="expense-main">
                      <div className="expense-icon-box">{cat.emoji}</div>
                      <div className="expense-info">
                        <h4>{item.name}</h4>
                        <p style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span>🏢 {item.storeName || "登録店舗なし"}</span>
                          <span>📅 {item.date}</span>
                        </p>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                      <span className={`badge ${cat.class}`}>{cat.label}</span>
                      <div className="expense-price">
                        ¥{Number(item.price).toLocaleString()}
                      </div>

                      <div style={{ display: "flex", gap: "0.25rem" }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ padding: "0.35rem 0.5rem" }}
                          onClick={() => handleStartEdit(item)}
                          title="編集"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          style={{ padding: "0.35rem 0.5rem" }}
                          onClick={() => onDeleteExpense(item.id)}
                          title="削除"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

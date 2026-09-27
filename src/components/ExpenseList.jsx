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
  DollarSign,
  ChevronDown
} from "lucide-react";

const CATEGORY_MAP = {
  food: { label: "食費", emoji: "🍎", class: "badge-food" },
  eatingOut: { label: "外食", emoji: "🍔", class: "badge-eatingOut" },
  daily: { label: "日用品", emoji: "🧴", class: "badge-daily" },
  childcare: { label: "子ども", emoji: "👶", class: "badge-childcare" },
  transport: { label: "交通費", emoji: "🚗", class: "badge-transport" },
  housing: { label: "住居", emoji: "🏠", class: "badge-housing" },
  utility: { label: "水道光熱費", emoji: "⚡️", class: "badge-utility" },
  telecom: { label: "通信費", emoji: "📞", class: "badge-telecom" },
  medical: { label: "医療", emoji: "🏥", class: "badge-medical" },
  beautyClothing: { label: "美容・衣服", emoji: "👗", class: "badge-beautyClothing" },
  hobby: { label: "趣味", emoji: "🎮", class: "badge-hobby" },
  education: { label: "教育", emoji: "✏️", class: "badge-education" },
  subscription: { label: "サブスク", emoji: "📺", class: "badge-subscription" },
  special: { label: "特別費", emoji: "🎁", class: "badge-special" },
  insurance: { label: "保険", emoji: "🛡️", class: "badge-insurance" },
  taxes: { label: "税金", emoji: "💸", class: "badge-taxes" },
  savings: { label: "貯金", emoji: "🐷", class: "badge-savings" },
  debtRepayment: { label: "借入返済", emoji: "🏦", class: "badge-debtRepayment" },
  other: { label: "その他", emoji: "📦", class: "badge-other" }
};

export default function ExpenseList({ expenses, onDeleteExpense, onUpdateExpense, onAddManualExpense }) {
  const [filterCategory, setFilterCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

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

  // 手動追加フォーム
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStore, setNewStore] = useState("");
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newCategory, setNewCategory] = useState("food");
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);

  // 日付ごとのアコーディオン開閉状態
  const [expandedDates, setExpandedDates] = useState({});
  // 店舗ごとのアコーディオン開閉状態 (キー: date_storeName)
  const [expandedStores, setExpandedStores] = useState({});

  const toggleDate = (dateStr) => {
    setExpandedDates((prev) => ({
      ...prev,
      [dateStr]: !prev[dateStr]
    }));
  };

  const toggleStore = (storeKey) => {
    setExpandedStores((prev) => ({
      ...prev,
      [storeKey]: !prev[storeKey]
    }));
  };

  // フィルタリング処理
  const filteredExpenses = (expenses || []).filter((item) => {
    if (!item) return false;
    const matchesMonth = (item.date || "").startsWith(selectedMonth);
    const matchesCategory = filterCategory === "all" || item.category === filterCategory;
    const matchesSearch = 
      (item.name || "").toLowerCase().includes((searchQuery || "").toLowerCase()) ||
      (item.storeName || "").toLowerCase().includes((searchQuery || "").toLowerCase());
    return matchesMonth && matchesCategory && matchesSearch;
  });

  const totalFilteredAmount = filteredExpenses.reduce((sum, item) => sum + Number(item?.price || 0), 0);

  // 日付 ＆ 店舗ごとの2段階グループ化
  const groupedByDate = {};
  const groupedByDateStore = {};

  filteredExpenses.forEach((item) => {
    if (!item) return;
    const d = item.date || "日付不明";
    const store = item.storeName || "登録店舗なし";

    if (!groupedByDate[d]) groupedByDate[d] = [];
    groupedByDate[d].push(item);

    if (!groupedByDateStore[d]) groupedByDateStore[d] = {};
    if (!groupedByDateStore[d][store]) groupedByDateStore[d][store] = [];
    groupedByDateStore[d][store].push(item);
  });
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

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
                {Object.entries(CATEGORY_MAP).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.emoji} {cfg.label}</option>
                ))}
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
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap", alignItems: "center" }}>
        {/* 年月フィルター */}
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
            padding: "0.35rem 0.5rem",
            fontSize: "0.85rem",
            fontWeight: "800"
          }}
        >
          {availableMonths.map((m) => {
            const [y, mm] = m.split("-");
            return <option key={m} value={m} style={{ color: "#ffffff", backgroundColor: "#1e293b" }}>{`${y}年${mm}月`}</option>;
          })}
        </select>

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

        <div style={{ display: "flex", gap: "0.35rem", overflowX: "auto", flexWrap: "nowrap", width: "100%", paddingBottom: "0.25rem" }}>
          <button
            className={`btn btn-sm ${filterCategory === "all" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setFilterCategory("all")}
            style={{ flexShrink: 0, whiteSpace: "nowrap" }}
          >
            すべて
          </button>
          {Object.entries(CATEGORY_MAP).map(([key, cfg]) => (
            <button
              key={key}
              className={`btn btn-sm ${filterCategory === key ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setFilterCategory(key)}
              style={{ flexShrink: 0, whiteSpace: "nowrap" }}
            >
              {cfg.emoji} {cfg.label}
            </button>
          ))}
        </div>
      </div>

      {/* 検索・件数表示 */}
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", padding: "0.35rem 0.75rem", background: "rgba(15, 23, 42, 0.4)", borderRadius: "var(--radius-sm)", marginBottom: "1rem", fontSize: "0.8rem" }}>
        <span style={{ color: "var(--text-secondary)" }}>
          該当件数: <strong>{filteredExpenses.length}</strong> 件
        </span>
      </div>

      {/* 明細リスト（日付ごとアコーディオン） */}
      <div style={{ maxHeight: "550px", overflowY: "auto" }}>
        {filteredExpenses.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-muted)" }}>
            <ShoppingBag size={40} style={{ opacity: 0.3, marginBottom: "0.5rem" }} />
            <p style={{ fontWeight: "600" }}>該当する支出明細はありません</p>
            <p style={{ fontSize: "0.8rem", marginTop: "0.25rem" }}>レシート撮影または「手動で1件追加」から支出を記録しましょう。</p>
          </div>
        ) : (
          sortedDates.map((dateStr) => {
            const items = groupedByDate[dateStr];
            const dayTotal = items.reduce((s, i) => s + Number(i.price || 0), 0);
            const isOpen = !!expandedDates[dateStr];

            return (
              <div key={dateStr} style={{ marginBottom: "0.5rem" }}>
                {/* 日付ヘッダー（タップで展開/折りたたみ） */}
                <button
                  onClick={() => toggleDate(dateStr)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.85rem 1rem",
                    background: isOpen ? "rgba(99, 102, 241, 0.15)" : "rgba(255, 255, 255, 0.04)",
                    border: isOpen ? "1px solid rgba(99, 102, 241, 0.4)" : "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "var(--radius-md)",
                    cursor: "pointer",
                    color: "var(--text-primary)",
                    transition: "all 0.2s ease"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                    <span style={{ fontSize: "1.3rem" }}>📅</span>
                    <span style={{ fontWeight: "800", fontSize: "1.15rem", letterSpacing: "0.02em" }}>{dateStr}</span>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "600" }}>
                      ({items.length}件)
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span style={{ fontWeight: "900", fontSize: "1.15rem", color: "#f43f5e" }}>
                      ¥{dayTotal.toLocaleString()}
                    </span>
                    <ChevronDown
                      size={20}
                      style={{
                        color: "var(--text-secondary)",
                        transition: "transform 0.2s ease",
                        transform: isOpen ? "rotate(180deg)" : "rotate(0deg)"
                      }}
                    />
                  </div>
                </button>

                {/* 展開時：店舗別アコーディオン ＆ 品目リスト */}
                {isOpen && (
                  <div style={{ paddingLeft: "0.25rem", paddingRight: "0.25rem", paddingTop: "0.45rem" }}>
                    {Object.entries(groupedByDateStore[dateStr] || {}).map(([storeName, storeItems]) => {
                      const validStoreItems = storeItems || [];
                      const storeKey = `${dateStr}_${storeName}`;
                      const isStoreOpen = !!expandedStores[storeKey]; // デフォルトは畳んで店舗名・小計のみスッキリ表示
                      const storeTotal = validStoreItems.reduce((s, i) => s + Number(i?.price || 0), 0);

                      return (
                        <div key={storeKey} style={{ marginBottom: "0.6rem" }}>
                          {/* 店舗ヘッダーボタン (老眼対応で文字・金額を大きめ化) */}
                          <button
                            onClick={() => toggleStore(storeKey)}
                            style={{
                              width: "100%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "0.65rem 0.85rem",
                              background: isStoreOpen ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.03)",
                              border: "1px solid rgba(255, 255, 255, 0.12)",
                              borderRadius: "var(--radius-sm)",
                              cursor: "pointer",
                              color: "var(--text-primary)",
                              marginBottom: "0.4rem",
                              transition: "all 0.15s ease"
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
                              <span style={{ fontSize: "1.15rem" }}>🏢</span>
                              <span style={{ fontWeight: "800", fontSize: "1.05rem", color: "var(--text-primary)", letterSpacing: "0.01em" }}>
                                {storeName}
                              </span>
                              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: "600" }}>
                                ({validStoreItems.length}件)
                              </span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                              <span style={{ fontWeight: "800", fontSize: "1.05rem", color: "var(--accent-secondary)" }}>
                                ¥{storeTotal.toLocaleString()}
                              </span>
                              <ChevronDown
                                size={18}
                                style={{
                                  color: "var(--text-secondary)",
                                  transition: "transform 0.2s ease",
                                  transform: isStoreOpen ? "rotate(180deg)" : "rotate(0deg)"
                                }}
                              />
                            </div>
                          </button>

                          {/* 店舗展開時：品目リスト */}
                          {isStoreOpen && (
                            <div style={{ paddingLeft: "0.35rem" }}>
                              {validStoreItems.map((item) => {
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
                                            {Object.entries(CATEGORY_MAP).map(([key, cfg]) => (
                                              <option key={key} value={key}>{cfg.emoji} {cfg.label}</option>
                                            ))}
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
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

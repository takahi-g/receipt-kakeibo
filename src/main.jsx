import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught App Error:", error, errorInfo);
  }

  handleResetStorage = () => {
    try {
      // データのバックアップを保護・レスキュー
      const rawExpenses = localStorage.getItem("receipt_kakeibo_expenses");
      if (rawExpenses) {
        const parsed = JSON.parse(rawExpenses);
        if (Array.isArray(parsed)) {
          const clean = parsed.filter(i => i && typeof i === "object" && (i.name || i.price));
          localStorage.setItem("receipt_kakeibo_expenses", JSON.stringify(clean));
        }
      }
      alert("✅ 家計簿データを全件レスキュー・保護して復旧しました！");
      window.location.reload();
    } catch {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "2rem 1rem", textAlign: "center", color: "#fff", backgroundColor: "#0f172a", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: "800", marginBottom: "0.5rem" }}>⚠️ 一時的な画面表示エラーが発生しました</h2>
          
          <div style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid #ef4444", borderRadius: "8px", padding: "0.75rem", margin: "1rem 0", maxWidth: "90%", overflowX: "auto", textAlign: "left", fontSize: "0.75rem", color: "#fca5a5", fontFamily: "monospace" }}>
            {this.state.error ? this.state.error.toString() : "不明なエラー"}
          </div>

          <p style={{ color: "#94a3b8", fontSize: "0.8rem", marginBottom: "1.5rem", maxWidth: "360px", lineHeight: "1.4" }}>
            下のボタンを押してアプリを再読み込みするか、「🛡️ データを保護して安全復旧」をお試しください。
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", width: "100%", maxWidth: "300px" }}>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: "0.75rem 1.5rem", background: "var(--accent-primary, #6366f1)", border: "none", borderRadius: "9999px", color: "#fff", fontWeight: "bold", cursor: "pointer", fontSize: "0.9rem" }}
            >
              🔄 アプリを再読み込みする
            </button>

            <button
              onClick={this.handleResetStorage}
              style={{ padding: "0.6rem 1rem", background: "rgba(52, 211, 153, 0.15)", border: "1px solid rgba(52, 211, 153, 0.4)", borderRadius: "9999px", color: "#34d399", fontSize: "0.8rem", fontWeight: "bold", cursor: "pointer" }}
            >
              🛡️ データを保護して安全復旧
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)

import { useState, useEffect } from "react";

const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbxoVMw0OGJMrjnT1ctO89_EPmPZxSes9UlSrYPTcseUcC0X2akPSewjclqE2K_G6nL9Dg/exec";
const SALON_NAME = "拾形造型";
const SALON_EN   = "Shiin Studio";

const SERVICES = [
  { id: 1, name: "單髮服務",                  icon: "🎀", note: "時長約 30–60 分鐘" },
  { id: 2, name: "單妝服務",                  icon: "💄", note: "時長約 30–60 分鐘" },
  { id: 3, name: "專業妝髮（僅放髮/低馬尾）",    icon: "✨", note: "時長約 60–90 分鐘" },
  { id: 4, name: "客製妝髮（妝+指定髮型）",    icon: "🎨", note: "時長約 90–120 分鐘" },
  { id: 5, name: "主題妝髮（節慶）",      icon: "🎃", note: "時長約 90–180 分鐘" },
  { id: 6, name: "新秘妝髮（含試妝）",        icon: "💍", note: "時長約 180–210 分鐘" },
  { id: 7, name: "婚禮妝髮（新郎及親友）",    icon: "💒", note: "時長約 90–180 分鐘" },
  { id: 8, name: "兒童妝髮（比賽/活動/生活）", icon: "🌈", note: "時長約 90–120 分鐘" },
];

const DEPOSIT = 500;

const ADDONS = [
  { id: 1, name: "編髮／盤髮",         icon: "🪢" },
  { id: 2, name: "假睫毛",             icon: "👁️" },
  { id: 3, name: "眼型調整",           icon: "✦"  },
  { id: 4, name: "特效道具協作",             icon: "🎭" },
  { id: 5, name: "造型配件黏貼", icon: "💎" },
  { id: 6, name: "租借造型飾品",       icon: "👑" },
];

const BANK_INFO = {
  bank: "中華郵政", code: "700",
  account: "00017910243086", holder: "周采錞",
  notes: ["匯款後請保留收據", "備註欄請填寫您的姓名", "請提供匯款末五碼以利對帳"],
};

const STUDIO_ADDRESS = "新北市三峽區學府路（爵仕悅社區），抵達時通知我們會到大廳接您";
const STORAGE_KEY = "shiin_bookings_v2";
function fmtPrice(n) { return `NT$ ${(n||0).toLocaleString()}`; }

// ─── Components ───────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const MAP = {
    pending:   { label: "待確認匯款", bg: "rgba(220,160,60,0.15)",  color: "#e0a030" },
    paid:      { label: "已確認付款", bg: "rgba(100,180,100,0.15)", color: "#64b464" },
    cancelled: { label: "已取消",     bg: "rgba(200,80,80,0.15)",   color: "#c85050" },
  };
  const s = MAP[status] || MAP.pending;
  return <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 20, background: s.bg, color: s.color, letterSpacing: "0.04em", fontWeight: 500 }}>{s.label}</span>;
}

function GoldDivider() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "18px 0" }}>
      <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg,transparent,rgba(193,155,100,0.3))" }} />
      <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#c19b64" }} />
      <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg,rgba(193,155,100,0.3),transparent)" }} />
    </div>
  );
}

function TextInput({ value, onChange, type = "text", placeholder, error }) {
  return (
    <div>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        style={{
          width: "100%", padding: "11px 13px", background: "rgba(255,255,255,0.04)",
          border: `1px solid ${error ? "rgba(200,80,80,0.4)" : "rgba(255,255,255,0.09)"}`,
          borderRadius: 8, color: "#ede9e1", fontSize: 14, fontFamily: "inherit",
          outline: "none", boxSizing: "border-box", transition: "border-color 0.2s",
        }}
        onFocus={e => e.target.style.borderColor = "#c19b64"}
        onBlur={e => e.target.style.borderColor = error ? "rgba(200,80,80,0.4)" : "rgba(255,255,255,0.09)"}
      />
      {error && <div style={{ color: "#e07070", fontSize: 11.5, marginTop: 4 }}>{error}</div>}
    </div>
  );
}

function FieldLabel({ label, required }) {
  return (
    <label style={{ fontSize: 11, color: "rgba(237,233,225,0.45)", display: "block", marginBottom: 6, letterSpacing: "0.04em" }}>
      {label}{required && <span style={{ color: "#c19b64" }}> *</span>}
    </label>
  );
}

// ─── Payment Modal ─────────────────────────────────────────────────────────────
function PaymentModal({ booking, svc, onSuccess, onClose }) {
  const [last5, setLast5]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [copied, setCopied]   = useState("");

  const copy = (text, key) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(key); setTimeout(() => setCopied(""), 1800);
  };

  const handleConfirm = async () => {
    if (last5.replace(/\D/g, "").length < 5) return setError("請輸入匯款末五碼（5 位數字）");
    setLoading(true); setError("");
    await onSuccess(last5);
    setLoading(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(6,6,12,0.88)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ width: "100%", maxWidth: 430, background: "linear-gradient(160deg,#13101c,#0d1420)", border: "1px solid rgba(193,155,100,0.22)", borderRadius: 18, padding: "26px 22px", boxShadow: "0 28px 64px rgba(0,0,0,0.7)", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: "0.35em", color: "#c19b64", marginBottom: 4 }}>BANK TRANSFER</div>
            <div style={{ fontSize: 20, fontWeight: 300, color: "#ede9e1" }}>匯款資訊</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(237,233,225,0.3)", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>
        <GoldDivider />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(193,155,100,0.08)", border: "1px solid rgba(193,155,100,0.18)", borderRadius: 10, padding: "12px 16px", marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 12, color: "rgba(237,233,225,0.45)", marginBottom: 2 }}>{svc?.icon} {svc?.name}</div>
            <div style={{ fontSize: 11, color: "rgba(237,233,225,0.3)" }}>{booking.datetime}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, color: "rgba(237,233,225,0.38)", marginBottom: 2 }}>訂金金額</div>
            <div style={{ fontSize: 24, fontWeight: 500, color: "#c19b64" }}>{fmtPrice(DEPOSIT)}</div>
          </div>
        </div>

        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
          {[
            { label: "銀行", value: `${BANK_INFO.bank}（${BANK_INFO.code}）`, key: "bank" },
            { label: "帳號", value: BANK_INFO.account, key: "account", mono: true },
            { label: "戶名", value: BANK_INFO.holder, key: "holder" },
          ].map(({ label, value, key, mono }, i) => (
            <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
              <div>
                <div style={{ fontSize: 10.5, color: "rgba(237,233,225,0.38)", marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: mono ? 16 : 14, color: "#ede9e1", fontFamily: mono ? "'Courier New',monospace" : "inherit", letterSpacing: mono ? "0.08em" : "normal" }}>{value}</div>
              </div>
              <button onClick={() => copy(value, key)} style={{ padding: "5px 11px", background: copied === key ? "rgba(100,180,100,0.15)" : "rgba(193,155,100,0.1)", border: `1px solid ${copied === key ? "rgba(100,180,100,0.3)" : "rgba(193,155,100,0.2)"}`, borderRadius: 7, color: copied === key ? "#64b464" : "#c19b64", fontSize: 11.5, cursor: "pointer", fontFamily: "inherit", transition: "all 0.25s", whiteSpace: "nowrap" }}>
                {copied === key ? "✓ 已複製" : "複製"}
              </button>
            </div>
          ))}
        </div>

        <div style={{ background: "rgba(193,155,100,0.05)", border: "1px solid rgba(193,155,100,0.12)", borderRadius: 9, padding: "11px 14px", marginBottom: 18 }}>
          <div style={{ fontSize: 10.5, color: "#c19b64", letterSpacing: "0.06em", marginBottom: 7 }}>⚠ 注意事項</div>
          {BANK_INFO.notes.map((n, i) => (
            <div key={i} style={{ fontSize: 12, color: "rgba(237,233,225,0.5)", marginBottom: i < BANK_INFO.notes.length - 1 ? 4 : 0, display: "flex", gap: 6 }}>
              <span style={{ color: "rgba(193,155,100,0.5)" }}>·</span>{n}
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11.5, color: "rgba(237,233,225,0.5)", display: "block", marginBottom: 7 }}>
            匯款末五碼 <span style={{ color: "#c19b64" }}>*</span>
            <span style={{ fontSize: 10.5, color: "rgba(237,233,225,0.3)", marginLeft: 6 }}>（方便我們快速對帳）</span>
          </label>
          <input type="text" inputMode="numeric" placeholder="例：12345" maxLength={5}
            value={last5} onChange={e => { setLast5(e.target.value.replace(/\D/g, "").slice(0, 5)); setError(""); }}
            style={{ width: "100%", padding: "12px 14px", background: "rgba(255,255,255,0.04)", border: `1px solid ${error ? "rgba(200,80,80,0.5)" : "rgba(255,255,255,0.1)"}`, borderRadius: 9, color: "#ede9e1", fontSize: 20, fontFamily: "'Courier New',monospace", letterSpacing: "0.3em", outline: "none", boxSizing: "border-box", textAlign: "center" }}
            onFocus={e => e.target.style.borderColor = "#c19b64"}
            onBlur={e => e.target.style.borderColor = error ? "rgba(200,80,80,0.5)" : "rgba(255,255,255,0.1)"}
          />
          {error && <div style={{ color: "#e07070", fontSize: 12, marginTop: 6, textAlign: "center" }}>{error}</div>}
        </div>

        <button onClick={handleConfirm} disabled={loading} style={{ width: "100%", padding: "14px", background: loading ? "rgba(193,155,100,0.3)" : "linear-gradient(135deg,#c19b64,#8a6830)", border: "none", borderRadius: 10, color: "#fff", fontSize: 14.5, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", letterSpacing: "0.05em", boxShadow: loading ? "none" : "0 4px 20px rgba(193,155,100,0.35)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          {loading ? <><span style={{ display: "inline-block", width: 15, height: 15, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />提交中…</> : "✓ 我已完成匯款"}
        </button>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function BookingSystem() {
  const [step, setStep]           = useState(1);
  const [form, setForm]           = useState({
    name: "", phone: "", lineId: "", datetime: "",
    serviceId: null, locationType: "", address: "", note: "",
  });
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [consents, setConsents]   = useState({ privacy: false, portrait: false });
  const [errors, setErrors]       = useState({});
  const [bookings, setBookings]   = useState([]);
  const [tab, setTab]             = useState("book");
  const [done, setDone]           = useState(null);
  const [payTarget, setPayTarget] = useState(null);
  const [trans, setTrans]         = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setBookings(JSON.parse(saved));
    } catch {}
  }, []);

  const persist = (list) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch {}
  };

  const sendToSheet = async (booking) => {
    if (!WEBHOOK_URL) return;
    const svc = SERVICES.find(s => s.id === booking.serviceId);
    const addonNames = (booking.addons || []).map(a => a.name).join("、");
    try {
      await fetch(WEBHOOK_URL, {
        method: "POST", mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          createdAt:    booking.createdAt,
          service:      svc?.name || "",
          datetime:     booking.datetime,
          name:         booking.name,
          phone:        booking.phone,
          lineId:       booking.lineId,
          locationType: booking.locationType,
          address:      booking.locationType === "到府服務" ? booking.address : STUDIO_ADDRESS,
          deposit:      fmtPrice(DEPOSIT),
          price:        "（依諮詢確認）",
          status:       booking.status === "paid" ? "已確認付款" : "待確認匯款",
          last5:        booking.last5 || "",
          addons:       addonNames,
          note:         booking.note,
        }),
      });
    } catch (e) { console.warn("Sheets sync failed:", e); }
  };

  const go = (fn) => { setTrans(true); setTimeout(() => { fn(); setTrans(false); }, 170); };

  const validateStep1 = () => {
    const e = {};
    if (!form.name.trim())                               e.name = "請填寫姓名";
    if (form.phone.replace(/\D/g,"").length < 8)         e.phone = "請填寫有效電話";
    if (!form.lineId.trim())                             e.lineId = "請填寫 LINE ID";
    if (!form.datetime.trim())                           e.datetime = "請填寫預約時間";
    if (!form.serviceId)                                 e.serviceId = "請選擇服務項目";
    if (!form.locationType)                              e.locationType = "請選擇梳化地點";
    if (form.locationType === "到府服務" && !form.address.trim()) e.address = "請填寫到府地址";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNextStep1 = () => { if (validateStep1()) go(() => setStep(2)); };
  const handleNextStep2 = () => go(() => setStep(3));
  const goBack = () => go(() => setStep(s => s - 1));

  const toggleAddon = (addon) => {
    setSelectedAddons(prev =>
      prev.find(a => a.id === addon.id) ? prev.filter(a => a.id !== addon.id) : [...prev, addon]
    );
  };

  const handleBook = () => {
    const nb = {
      id: Date.now(), ...form,
      addons: selectedAddons,
      status: "pending",
      createdAt: new Date().toLocaleString("zh-TW"),
    };
    const updated = [nb, ...bookings];
    setBookings(updated);
    persist(updated);
    setDone(nb);
    sendToSheet(nb);
    go(() => setStep(4));
  };

  const handlePaySuccess = async (last5) => {
    const updated = bookings.map(b => b.id === payTarget.id ? { ...b, status: "paid", last5 } : b);
    setBookings(updated);
    persist(updated);
    const paid = updated.find(b => b.id === payTarget.id);
    await sendToSheet(paid);
    setPayTarget(null);
    if (done?.id === payTarget.id) setDone({ ...done, status: "paid", last5 });
  };

  const cancelBooking = (id) => {
    const updated = bookings.map(b => b.id === id ? { ...b, status: "cancelled" } : b);
    setBookings(updated);
    persist(updated);
  };

  const resetAll = () => {
    setForm({ name: "", phone: "", lineId: "", datetime: "", serviceId: null, locationType: "", address: "", note: "" });
    setSelectedAddons([]); setConsents({ privacy: false, portrait: false });
    setErrors({}); setStep(1); setDone(null); setTab("book");
  };

  const svc        = SERVICES.find(s => s.id === form.serviceId);
  const doneSvc    = done ? SERVICES.find(s => s.id === done.serviceId) : null;
  const addonTotal = 0; // 加購不顯示價格
  const STEP_LABELS = ["填寫資料", "同意書", "確認預約", "完成"];

  const setF = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }));

  const btnStyle = (active) => ({
    flex: 1, padding: "11px 8px", border: `1px solid ${active ? "#c19b64" : "rgba(255,255,255,0.09)"}`,
    borderRadius: 9, cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, transition: "all 0.2s",
    background: active ? "linear-gradient(135deg,rgba(193,155,100,0.2),rgba(193,155,100,0.08))" : "rgba(255,255,255,0.03)",
    color: active ? "#c19b64" : "rgba(237,233,225,0.5)",
  });

  return (
    <div style={{ minHeight: "100vh", background: "#0a0b10", fontFamily: "'Noto Serif TC','Georgia',serif", color: "#ede9e1" }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-15%", left: "-10%", width: "60vw", height: "60vw", borderRadius: "50%", background: "radial-gradient(circle,rgba(193,155,100,0.06) 0%,transparent 65%)" }} />
        <div style={{ position: "absolute", bottom: "-20%", right: "-5%", width: "55vw", height: "55vw", borderRadius: "50%", background: "radial-gradient(circle,rgba(80,110,200,0.05) 0%,transparent 65%)" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 680, margin: "0 auto", padding: "28px 18px 80px" }}>

        {/* Logo */}
        <header style={{ textAlign: "center", marginBottom: 30 }}>
          <p style={{ fontSize: 10, letterSpacing: "0.45em", color: "#c19b64", margin: "0 0 6px", textTransform: "uppercase" }}>{SALON_EN}</p>
          <h1 style={{ fontSize: "clamp(26px,6vw,40px)", fontWeight: 300, margin: 0, background: "linear-gradient(130deg,#ede9e1 20%,#c19b64 55%,#ede9e1 90%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "0.08em" }}>{SALON_NAME}</h1>
          <div style={{ width: 48, height: 1, background: "linear-gradient(90deg,transparent,#c19b64,transparent)", margin: "10px auto 0" }} />
        </header>

        {/* Tabs */}
        <div style={{ display: "flex", background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: 4, marginBottom: 24, border: "1px solid rgba(193,155,100,0.12)" }}>
          {[{ key: "book", label: "預約資訊" }, { key: "records", label: `我的預約${bookings.length ? ` (${bookings.length})` : ""}` }].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ flex: 1, padding: "11px", border: "none", borderRadius: 9, background: tab === t.key ? "linear-gradient(135deg,#c19b64,#8a6830)" : "transparent", color: tab === t.key ? "#fff" : "rgba(237,233,225,0.45)", fontSize: 13.5, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.03em", transition: "all 0.3s" }}>{t.label}</button>
          ))}
        </div>

        {/* ══ BOOK TAB ══ */}
        {tab === "book" && !done && (
          <>
            {/* Step bar */}
            <div style={{ display: "flex", alignItems: "flex-start", marginBottom: 22 }}>
              {STEP_LABELS.map((lbl, i) => {
                const n = i + 1; const active = step === n; const isDone = step > n;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", flex: i < 3 ? 1 : "none" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: isDone ? "linear-gradient(135deg,#c19b64,#8a6830)" : active ? "rgba(193,155,100,0.18)" : "rgba(255,255,255,0.05)", border: `1.5px solid ${isDone || active ? "#c19b64" : "rgba(255,255,255,0.09)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: isDone ? "#fff" : active ? "#c19b64" : "rgba(237,233,225,0.25)", transition: "all 0.3s" }}>{isDone ? "✓" : n}</div>
                      <span style={{ fontSize: 9.5, color: active ? "#c19b64" : "rgba(237,233,225,0.28)", whiteSpace: "nowrap" }}>{lbl}</span>
                    </div>
                    {i < 2 && <div style={{ flex: 1, height: 1, margin: "14px 4px 0", background: isDone ? "#c19b64" : "rgba(255,255,255,0.07)", transition: "background 0.3s" }} />}
                  </div>
                );
              })}
            </div>

            {/* Card */}
            <div style={{ background: "rgba(255,255,255,0.025)", borderRadius: 16, border: "1px solid rgba(193,155,100,0.1)", padding: "24px 20px", opacity: trans ? 0 : 1, transform: trans ? "translateY(6px)" : "translateY(0)", transition: "opacity 0.17s,transform 0.17s", backdropFilter: "blur(12px)" }}>

              {/* ── Step 1: 填寫資料 ── */}
              {step === 1 && (
                <div style={{ display: "grid", gap: 16 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 400, margin: "0 0 4px", letterSpacing: "0.05em" }}>填寫預約資料</h2>

                  {/* 基本資料 */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <FieldLabel label="姓名" required />
                      <TextInput value={form.name} onChange={setF("name")} placeholder="請填寫姓名" error={errors.name} />
                    </div>
                    <div>
                      <FieldLabel label="電話" required />
                      <TextInput value={form.phone} onChange={setF("phone")} type="tel" placeholder="請填寫電話" error={errors.phone} />
                    </div>
                  </div>

                  <div>
                    <FieldLabel label="LINE ID" required />
                    <TextInput value={form.lineId} onChange={setF("lineId")} placeholder="請填寫 LINE ID" error={errors.lineId} />
                  </div>

                  <div>
                    <FieldLabel label="預約時間" required />
                    <TextInput value={form.datetime} onChange={setF("datetime")} placeholder="例：2026/4/5 13:30" error={errors.datetime} />
                  </div>

                  {/* 服務項目 */}
                  <div>
                    <FieldLabel label="服務項目" required />
                    {errors.serviceId && <div style={{ color: "#e07070", fontSize: 11.5, marginBottom: 6 }}>{errors.serviceId}</div>}
                    <div style={{ display: "grid", gap: 7 }}>
                      {SERVICES.map(s => {
                        const sel = form.serviceId === s.id;
                        return (
                          <button key={s.id} onClick={() => { setForm(p => ({ ...p, serviceId: s.id })); setErrors(p => ({ ...p, serviceId: undefined })); }} style={{ display: "flex", alignItems: "center", padding: "11px 14px", background: sel ? "linear-gradient(135deg,rgba(193,155,100,0.18),rgba(193,155,100,0.07))" : "rgba(255,255,255,0.03)", border: `1px solid ${sel ? "#c19b64" : "rgba(255,255,255,0.07)"}`, borderRadius: 10, cursor: "pointer", color: "#ede9e1", fontFamily: "inherit", transition: "all 0.2s", textAlign: "left", width: "100%" }}>
                            <span style={{ fontSize: 18, marginRight: 11 }}>{s.icon}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: sel ? 500 : 400 }}>{s.name}</div>
                              <div style={{ fontSize: 10.5, color: "rgba(237,233,225,0.4)", marginTop: 1 }}>{s.note}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 加購項目 */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <FieldLabel label="加購項目" />
                      <span style={{ fontSize: 10.5, color: "rgba(237,233,225,0.3)" }}>可複選，也可略過</span>
                    </div>
                    {selectedAddons.length > 0 && (
                      <div style={{ fontSize: 12, color: "#c19b64", marginBottom: 8 }}>已選 {selectedAddons.length} 項</div>
                    )}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {ADDONS.map(a => {
                        const sel = !!selectedAddons.find(x => x.id === a.id);
                        return (
                          <button key={a.id} onClick={() => toggleAddon(a)} style={{
                            padding: "9px 14px", border: `1px solid ${sel ? "#c19b64" : "rgba(255,255,255,0.09)"}`,
                            borderRadius: 20, cursor: "pointer", fontFamily: "inherit", fontSize: 13, transition: "all 0.2s",
                            background: sel ? "linear-gradient(135deg,rgba(193,155,100,0.2),rgba(193,155,100,0.08))" : "rgba(255,255,255,0.03)",
                            color: sel ? "#c19b64" : "rgba(237,233,225,0.6)",
                            display: "flex", alignItems: "center", gap: 5,
                          }}>
                            <span>{a.icon}</span> {a.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 梳化地點 */}
                  <div>
                    <FieldLabel label="梳化地點" required />
                    {errors.locationType && <div style={{ color: "#e07070", fontSize: 11.5, marginBottom: 6 }}>{errors.locationType}</div>}
                    <div style={{ display: "flex", gap: 10, marginBottom: form.locationType === "到府服務" ? 10 : 0 }}>
                      {["工作室梳化", "到府服務"].map(opt => (
                        <button key={opt} onClick={() => { setForm(p => ({ ...p, locationType: opt, address: "" })); setErrors(p => ({ ...p, locationType: undefined, address: undefined })); }} style={btnStyle(form.locationType === opt)}>
                          {opt === "工作室梳化" ? "🏠 工作室梳化" : "🚗 到府服務"}
                        </button>
                      ))}
                    </div>
                    {form.locationType === "工作室梳化" && (
                      <div style={{ fontSize: 11.5, color: "rgba(237,233,225,0.4)", padding: "8px 12px", background: "rgba(193,155,100,0.06)", borderRadius: 7, border: "1px solid rgba(193,155,100,0.12)" }}>
                        📍 {STUDIO_ADDRESS}
                      </div>
                    )}
                    {form.locationType === "到府服務" && (
                      <div>
                        <TextInput value={form.address} onChange={setF("address")} placeholder="請填寫到府地址" error={errors.address} />
                      </div>
                    )}
                  </div>

                  {/* 備註 */}
                  <div>
                    <FieldLabel label="備註" />
                    <textarea value={form.note} onChange={setF("note")} rows={3} placeholder="如有特殊需求請告知…"
                      style={{ width: "100%", padding: "11px 13px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 8, color: "#ede9e1", fontSize: 14, fontFamily: "inherit", outline: "none", resize: "none", boxSizing: "border-box" }}
                      onFocus={e => e.target.style.borderColor = "#c19b64"}
                      onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.09)"}
                    />
                  </div>
                </div>
              )}

              {/* ── Step 2: 同意書 ── */}
              {step === 2 && (
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 400, margin: "0 0 6px", letterSpacing: "0.05em" }}>同意書</h2>
                  <p style={{ fontSize: 12.5, color: "rgba(237,233,225,0.4)", margin: "0 0 20px" }}>請詳閱並勾選以下同意事項，方可完成預約。</p>

                  {[
                    {
                      key: "privacy",
                      title: "隱私權政策同意",
                      icon: "🔒",
                      content: "本人同意拾形造型蒐集、處理及利用本人所提供之個人資料（包含姓名、電話、LINE ID），僅供預約確認及服務聯繫使用，不會提供予第三方。",
                    },
                    {
                      key: "portrait",
                      title: "肖像權授權同意",
                      icon: "📸",
                      content: "本人同意拾形造型得將梳化過程及成果照片，用於社群媒體（如 Instagram）及作品集展示。若不同意使用，請於預約備註中告知。",
                    },
                  ].map(item => (
                    <div key={item.key} onClick={() => setConsents(p => ({ ...p, [item.key]: !p[item.key] }))} style={{ cursor: "pointer", background: consents[item.key] ? "linear-gradient(135deg,rgba(193,155,100,0.12),rgba(193,155,100,0.05))" : "rgba(255,255,255,0.03)", border: `1px solid ${consents[item.key] ? "#c19b64" : "rgba(255,255,255,0.07)"}`, borderRadius: 12, padding: "16px", marginBottom: 12, transition: "all 0.2s" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                        <div style={{ width: 22, height: 22, borderRadius: 5, background: consents[item.key] ? "#c19b64" : "transparent", border: `1.5px solid ${consents[item.key] ? "#c19b64" : "rgba(237,233,225,0.2)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#fff", flexShrink: 0, marginTop: 1, transition: "all 0.2s" }}>{consents[item.key] ? "✓" : ""}</div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6, color: consents[item.key] ? "#c19b64" : "#ede9e1" }}>{item.icon} {item.title}</div>
                          <div style={{ fontSize: 12, color: "rgba(237,233,225,0.45)", lineHeight: 1.7 }}>{item.content}</div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {!canStep2 && (
                    <div style={{ fontSize: 12, color: "rgba(237,233,225,0.35)", textAlign: "center", marginTop: 8 }}>
                      請勾選以上兩項同意書才能繼續
                    </div>
                  )}
                </div>
              )}

              {/* ── Step 3: 確認預約 ── */}
              {step === 3 && (
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 400, margin: "0 0 6px", letterSpacing: "0.05em" }}>確認預約資訊</h2>
                  <p style={{ fontSize: 12.5, color: "rgba(237,233,225,0.4)", margin: "0 0 18px" }}>確認後請完成匯款訂金，預約即成立。</p>

                  <div style={{ background: "rgba(193,155,100,0.07)", border: "1px solid rgba(193,155,100,0.15)", borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
                    {[
                      ["服務", `${svc?.icon} ${svc?.name}`],
                      ["預約時間", form.datetime],
                      ["梳化地點", form.locationType],
                      ...(form.locationType === "到府服務" ? [["到府地址", form.address]] : []),
                      ["姓名", form.name],
                      ["電話", form.phone],
                      ["LINE ID", form.lineId],
                      ["服務費", "（依諮詢確認）"],
                      ["訂金", fmtPrice(DEPOSIT)],
                    ].map(([k, v], i, arr) => (
                      <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                        <span style={{ fontSize: 11.5, color: "rgba(237,233,225,0.4)", flexShrink: 0 }}>{k}</span>
                        <span style={{ fontSize: 13, color: k === "訂金" ? "#c19b64" : "#ede9e1", fontWeight: k === "訂金" ? 500 : 400, textAlign: "right", marginLeft: 12 }}>{v}</span>
                      </div>
                    ))}
                    {selectedAddons.length > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px" }}>
                        <span style={{ fontSize: 11.5, color: "rgba(237,233,225,0.4)" }}>加購項目</span>
                        <span style={{ fontSize: 12.5, color: "#c19b64", textAlign: "right", marginLeft: 12 }}>{selectedAddons.map(a => a.name).join("、")} (+{fmtPrice(addonTotal)})</span>
                      </div>
                    )}
                  </div>

                  {form.note && (
                    <div style={{ fontSize: 12, color: "rgba(237,233,225,0.4)", marginBottom: 16, fontStyle: "italic" }}>備註：{form.note}</div>
                  )}

                  <div style={{ background: "rgba(193,155,100,0.05)", border: "1px solid rgba(193,155,100,0.12)", borderRadius: 9, padding: "11px 14px" }}>
                    <div style={{ fontSize: 10.5, color: "#c19b64", marginBottom: 6, letterSpacing: "0.05em" }}>⚠ 梳化注意事項</div>
                    {["請準時到場", "請勿遲到超過 15 分鐘", "如需取消請提前告知", "梳化前一晚請確實保養（敷面膜、擦保濕等），不然妝會不服貼唷！"].map((n, i) => (
                      <div key={i} style={{ fontSize: 12, color: "rgba(237,233,225,0.5)", marginBottom: i < 3 ? 4 : 0, display: "flex", gap: 6 }}>
                        <span style={{ color: "rgba(193,155,100,0.5)" }}>·</span>{n}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Step 4: 完成 ── */}
              {step === 4 && (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg,rgba(193,155,100,0.22),rgba(193,155,100,0.07))", border: "2px solid #c19b64", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, margin: "0 auto 20px" }}>✓</div>
                  <h2 style={{ fontSize: 20, fontWeight: 300, margin: "0 0 8px", letterSpacing: "0.06em" }}>預約資料已送出！</h2>
                  <p style={{ fontSize: 13, color: "rgba(237,233,225,0.45)", margin: "0 0 24px", lineHeight: 1.7 }}>
                    請完成匯款訂金以確保預約位置<br/>我們收到後將與您確認細節
                  </p>
                  <div style={{ marginBottom: 20 }}><StatusBadge status={done?.status || "pending"} /></div>
                  <div style={{ background: "rgba(193,155,100,0.07)", border: "1px solid rgba(193,155,100,0.15)", borderRadius: 10, padding: "13px 16px", textAlign: "left", marginBottom: 20 }}>
                    {done && [
                      ["服務", `${doneSvc?.icon} ${doneSvc?.name}`],
                      ["預約時間", done.datetime],
                      ["梳化地點", done.locationType],
                      ["姓名", done.name],
                      ["訂金", fmtPrice(DEPOSIT)],
                    ].map(([k, v]) => (
                      <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 13 }}>
                        <span style={{ color: "rgba(237,233,225,0.4)" }}>{k}</span>
                        <span style={{ color: "#ede9e1" }}>{v}</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setPayTarget(done)} style={{ width: "100%", padding: "14px", background: "linear-gradient(135deg,#c19b64,#8a6830)", border: "none", borderRadius: 10, color: "#fff", fontSize: 14.5, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.05em", boxShadow: "0 4px 20px rgba(193,155,100,0.35)", marginBottom: 10 }}>
                    🏦 查看匯款資訊
                  </button>
                  <button onClick={() => setTab("records")} style={{ width: "100%", padding: "11px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 10, color: "rgba(237,233,225,0.55)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                    查看我的預約
                  </button>
                </div>
              )}

            </div>

            {/* Nav */}
            {step < 4 && <div style={{ display: "flex", gap: 8, marginTop: 13 }}>
              {step > 1 && (
                <button onClick={goBack} style={{ padding: "13px 20px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 10, color: "rgba(237,233,225,0.55)", fontSize: 13.5, cursor: "pointer", fontFamily: "inherit" }}>← 上一步</button>
              )}
              <button
                disabled={step === 2 && !canStep2}
                onClick={step === 1 ? handleNextStep1 : step === 2 ? handleNextStep2 : step === 3 ? handleBook : null}
                style={{ flex: 1, padding: "13px", background: (step === 2 && !canStep2) ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg,#c19b64,#8a6830)", border: "none", borderRadius: 10, color: (step === 2 && !canStep2) ? "rgba(237,233,225,0.2)" : "#fff", fontSize: 15, cursor: (step === 2 && !canStep2) ? "not-allowed" : "pointer", fontFamily: "inherit", letterSpacing: "0.05em", transition: "all 0.3s", boxShadow: (step === 2 && !canStep2) ? "none" : "0 4px 18px rgba(193,155,100,0.3)" }}>
                {step < 3 ? "下一步 →" : "確認預約"}
              </button>
            </div>}
          </>
        )}

        {/* ══ DONE SCREEN ══ */}
        {tab === "book" && done && (
          <div style={{ background: "rgba(255,255,255,0.025)", borderRadius: 16, border: "1px solid rgba(193,155,100,0.12)", padding: "34px 22px", textAlign: "center" }}>
            <div style={{ width: 66, height: 66, borderRadius: "50%", background: "linear-gradient(135deg,rgba(193,155,100,0.22),rgba(193,155,100,0.07))", border: "2px solid #c19b64", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, margin: "0 auto 16px" }}>✓</div>
            <h2 style={{ fontSize: 20, fontWeight: 300, margin: "0 0 6px", letterSpacing: "0.06em" }}>資料填寫完成！</h2>
            <p style={{ fontSize: 12.5, color: "rgba(237,233,225,0.42)", margin: "0 0 18px" }}>請完成匯款訂金，預約即正式成立</p>
            <div style={{ marginBottom: 18 }}><StatusBadge status={done.status} /></div>

            <div style={{ background: "rgba(193,155,100,0.07)", border: "1px solid rgba(193,155,100,0.15)", borderRadius: 10, padding: "13px 16px", textAlign: "left", marginBottom: 20 }}>
              {[
                ["服務", `${doneSvc?.icon} ${doneSvc?.name}`],
                ["預約時間", done.datetime],
                ["梳化地點", done.locationType],
                ["姓名", done.name],
                ["訂金", fmtPrice(DEPOSIT)],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 13 }}>
                  <span style={{ color: "rgba(237,233,225,0.4)" }}>{k}</span>
                  <span style={{ color: "#ede9e1" }}>{v}</span>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              {done.status === "pending" && (
                <button onClick={() => setPayTarget(done)} style={{ width: "100%", padding: "14px", background: "linear-gradient(135deg,#c19b64,#8a6830)", border: "none", borderRadius: 10, color: "#fff", fontSize: 14.5, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.05em", boxShadow: "0 4px 20px rgba(193,155,100,0.35)" }}>
                  🏦 查看匯款資訊
                </button>
              )}
              {done.status === "paid" && (
                <div style={{ padding: "13px", background: "rgba(100,180,100,0.1)", border: "1px solid rgba(100,180,100,0.25)", borderRadius: 10, color: "#64b464", fontSize: 13.5 }}>
                  ✓ 訂金已確認，預約完成！
                </div>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setTab("records")} style={{ flex: 1, padding: "11px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 10, color: "rgba(237,233,225,0.55)", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>查看紀錄</button>
                <button onClick={resetAll} style={{ flex: 1, padding: "11px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 10, color: "rgba(237,233,225,0.55)", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>重新填寫</button>
              </div>
            </div>
          </div>
        )}

        {/* ══ RECORDS TAB ══ */}
        {tab === "records" && (
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 400, margin: "0 0 14px", letterSpacing: "0.05em" }}>預約紀錄</h2>
            {bookings.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", background: "rgba(255,255,255,0.02)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>📋</div>
                <p style={{ color: "rgba(237,233,225,0.32)", fontSize: 13 }}>尚無預約紀錄</p>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {bookings.map(b => {
                  const bSvc = SERVICES.find(s => s.id === b.serviceId);
                  return (
                    <div key={b.id} style={{ background: "rgba(255,255,255,0.025)", borderRadius: 12, border: "1px solid rgba(193,155,100,0.1)", padding: "14px 16px", opacity: b.status === "cancelled" ? 0.5 : 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 9 }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 500 }}>{bSvc?.icon} {bSvc?.name}</div>
                          <div style={{ fontSize: 11, color: "rgba(237,233,225,0.4)", marginTop: 1 }}>{b.datetime} · {b.locationType}</div>
                        </div>
                        <StatusBadge status={b.status} />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px 10px", marginBottom: 9 }}>
                        {[["姓名", b.name], ["電話", b.phone], ["LINE ID", b.lineId], b.last5 ? ["末五碼", b.last5] : ["訂金", fmtPrice(DEPOSIT)]].map(([k, v]) => (
                          <div key={k} style={{ fontSize: 11 }}>
                            <span style={{ color: "rgba(237,233,225,0.35)" }}>{k}：</span>
                            <span style={{ color: "rgba(237,233,225,0.7)" }}>{v}</span>
                          </div>
                        ))}
                      </div>
                      {(b.addons || []).length > 0 && <div style={{ fontSize: 11, color: "#c19b64", marginBottom: 8 }}>加購：{b.addons.map(a => a.name).join("、")}</div>}
                      {b.note && <div style={{ fontSize: 11, color: "rgba(237,233,225,0.33)", fontStyle: "italic", marginBottom: 9 }}>備註：{b.note}</div>}
                      {b.status !== "cancelled" && (
                        <div style={{ display: "flex", gap: 7 }}>
                          {b.status === "pending" && (
                            <button onClick={() => setPayTarget(b)} style={{ padding: "7px 13px", background: "linear-gradient(135deg,rgba(193,155,100,0.3),rgba(138,104,48,0.3))", border: "1px solid rgba(193,155,100,0.3)", borderRadius: 7, color: "#c19b64", fontSize: 11.5, cursor: "pointer", fontFamily: "inherit" }}>🏦 匯款資訊</button>
                          )}
                          <button onClick={() => cancelBooking(b.id)} style={{ padding: "7px 13px", background: "rgba(200,80,80,0.08)", border: "1px solid rgba(200,80,80,0.18)", borderRadius: 7, color: "#c85050", fontSize: 11.5, cursor: "pointer", fontFamily: "inherit" }}>取消預約</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {payTarget && (
        <PaymentModal
          booking={payTarget}
          svc={SERVICES.find(s => s.id === payTarget.serviceId)}
          onSuccess={handlePaySuccess}
          onClose={() => setPayTarget(null)}
        />
      )}
    </div>
  );

  function canStep2() { return consents.privacy && consents.portrait; }
}

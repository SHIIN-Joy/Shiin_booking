import { useState, useEffect } from "react";

// ── 請將 Apps Script 部署後的 Webhook URL 填入此處 ──
const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbxoVMw0OGJMrjnT1ctO89_EPmPZxSes9UlSrYPTcseUcC0X2akPSewjclqE2K_G6nL9Dg/exec";

// ─── Data ────────────────────────────────────────────────────────────────────
const SERVICES = [
  { id: 1, name: "剪髮造型", duration: 60,  price: 800,  deposit: 200, icon: "✂️" },
  { id: 2, name: "染髮護色", duration: 120, price: 2500, deposit: 500, icon: "🎨" },
  { id: 3, name: "燙髮造型", duration: 150, price: 3000, deposit: 600, icon: "💫" },
  { id: 4, name: "頭皮護理", duration: 90,  price: 1500, deposit: 300, icon: "🌿" },
  { id: 5, name: "造型梳理", duration: 45,  price: 600,  deposit: 150, icon: "💄" },
];

const STAFF = [
  { id: 1, name: "Aria", title: "首席設計師", avatar: "A", color: "#c9856a" },
  { id: 2, name: "Leo",  title: "資深造型師", avatar: "L", color: "#6a8fc9" },
  { id: 3, name: "Nina", title: "染髮專家",   avatar: "N", color: "#8fc96a" },
];

const TIME_SLOTS = [
  "10:00","10:30","11:00","11:30","12:00",
  "13:00","13:30","14:00","14:30","15:00",
  "15:30","16:00","16:30","17:00","17:30","18:00",
];

const BANK_INFO = {
  bank:    "中華郵政",
  code:    "700",
  account: "00017910243086",
  holder:  "周采錞",
  notes: [
    "匯款後請保留收據",
    "備註欄請填寫您的姓名",
    "請提供匯款末五碼以利對帳",
  ],
};

const DAYS_CN = ["日","一","二","三","四","五","六"];
const STORAGE_KEY = "salon_bookings_v3";

function getNextDays(n) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i); return d;
  });
}
function fmtPrice(n) { return `NT$ ${(n||0).toLocaleString()}`; }

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ staff, size = 40 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `radial-gradient(135deg,${staff.color}88,${staff.color}33)`,
      border: `1.5px solid ${staff.color}66`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 700, color: "#fff", flexShrink: 0,
    }}>{staff.avatar}</div>
  );
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const MAP = {
    pending:   { label: "待確認匯款", bg: "rgba(220,160,60,0.15)",  color: "#e0a030" },
    paid:      { label: "已確認付款", bg: "rgba(100,180,100,0.15)", color: "#64b464" },
    cancelled: { label: "已取消",     bg: "rgba(200,80,80,0.15)",   color: "#c85050" },
  };
  const s = MAP[status] || MAP.pending;
  return (
    <span style={{
      fontSize: 11, padding: "3px 9px", borderRadius: 20,
      background: s.bg, color: s.color, letterSpacing: "0.04em", fontWeight: 500,
    }}>{s.label}</span>
  );
}

// ─── Divider ─────────────────────────────────────────────────────────────────
function GoldDivider() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "18px 0" }}>
      <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg,transparent,rgba(193,155,100,0.3))" }} />
      <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#c19b64" }} />
      <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg,rgba(193,155,100,0.3),transparent)" }} />
    </div>
  );
}

// ─── Payment Modal ────────────────────────────────────────────────────────────
function PaymentModal({ booking, svc, onSuccess, onClose }) {
  const [last5, setLast5]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [copied, setCopied]   = useState("");

  const copy = (text, key) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(""), 1800);
  };

  const handleConfirm = async () => {
    if (last5.replace(/\D/g, "").length < 5) {
      return setError("請輸入匯款末五碼（5 位數字）");
    }
    setLoading(true);
    setError("");
    await onSuccess(last5);
    setLoading(false);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(6,6,12,0.88)", backdropFilter: "blur(10px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        width: "100%", maxWidth: 430,
        background: "linear-gradient(160deg,#13101c,#0d1420)",
        border: "1px solid rgba(193,155,100,0.22)", borderRadius: 18,
        padding: "26px 22px",
        boxShadow: "0 28px 64px rgba(0,0,0,0.7)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: "0.35em", color: "#c19b64", marginBottom: 4 }}>BANK TRANSFER</div>
            <div style={{ fontSize: 20, fontWeight: 300, color: "#ede9e1" }}>匯款資訊</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(237,233,225,0.3)", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>

        <GoldDivider />

        {/* Amount card */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: "rgba(193,155,100,0.08)", border: "1px solid rgba(193,155,100,0.18)",
          borderRadius: 10, padding: "12px 16px", marginBottom: 18,
        }}>
          <div>
            <div style={{ fontSize: 12, color: "rgba(237,233,225,0.45)", marginBottom: 2 }}>{svc?.icon} {svc?.name}</div>
            <div style={{ fontSize: 11, color: "rgba(237,233,225,0.3)" }}>
              {booking.date} {booking.time} · {booking.staffName}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, color: "rgba(237,233,225,0.38)", marginBottom: 2 }}>訂金金額</div>
            <div style={{ fontSize: 24, fontWeight: 500, color: "#c19b64" }}>{fmtPrice(svc?.deposit)}</div>
          </div>
        </div>

        {/* Bank info rows */}
        <div style={{
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 12, overflow: "hidden", marginBottom: 16,
        }}>
          {[
            { label: "銀行", value: `${BANK_INFO.bank}（${BANK_INFO.code}）`, key: "bank" },
            { label: "帳號", value: BANK_INFO.account, key: "account", mono: true },
            { label: "戶名", value: BANK_INFO.holder, key: "holder" },
          ].map(({ label, value, key, mono }, i) => (
            <div key={key} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "13px 16px",
              borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.05)" : "none",
            }}>
              <div>
                <div style={{ fontSize: 10.5, color: "rgba(237,233,225,0.38)", marginBottom: 2, letterSpacing: "0.04em" }}>{label}</div>
                <div style={{
                  fontSize: mono ? 16 : 14, color: "#ede9e1",
                  fontFamily: mono ? "'Courier New',monospace" : "inherit",
                  letterSpacing: mono ? "0.08em" : "normal",
                }}>{value}</div>
              </div>
              <button onClick={() => copy(value, key)} style={{
                padding: "5px 11px",
                background: copied === key ? "rgba(100,180,100,0.15)" : "rgba(193,155,100,0.1)",
                border: `1px solid ${copied === key ? "rgba(100,180,100,0.3)" : "rgba(193,155,100,0.2)"}`,
                borderRadius: 7, color: copied === key ? "#64b464" : "#c19b64",
                fontSize: 11.5, cursor: "pointer", fontFamily: "inherit",
                transition: "all 0.25s", whiteSpace: "nowrap",
              }}>
                {copied === key ? "✓ 已複製" : "複製"}
              </button>
            </div>
          ))}
        </div>

        {/* Notes */}
        <div style={{
          background: "rgba(193,155,100,0.05)", border: "1px solid rgba(193,155,100,0.12)",
          borderRadius: 9, padding: "11px 14px", marginBottom: 18,
        }}>
          <div style={{ fontSize: 10.5, color: "#c19b64", letterSpacing: "0.06em", marginBottom: 7 }}>⚠ 注意事項</div>
          {BANK_INFO.notes.map((n, i) => (
            <div key={i} style={{ fontSize: 12, color: "rgba(237,233,225,0.5)", marginBottom: i < BANK_INFO.notes.length - 1 ? 4 : 0, display: "flex", gap: 6 }}>
              <span style={{ color: "rgba(193,155,100,0.5)" }}>·</span>{n}
            </div>
          ))}
        </div>

        {/* Last 5 digits input */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11.5, color: "rgba(237,233,225,0.5)", display: "block", marginBottom: 7, letterSpacing: "0.04em" }}>
            匯款末五碼 <span style={{ color: "#c19b64" }}>*</span>
            <span style={{ fontSize: 10.5, color: "rgba(237,233,225,0.3)", marginLeft: 6 }}>（方便我們快速對帳）</span>
          </label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="例：12345"
            maxLength={5}
            value={last5}
            onChange={e => { setLast5(e.target.value.replace(/\D/g, "").slice(0, 5)); setError(""); }}
            style={{
              width: "100%", padding: "12px 14px",
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${error ? "rgba(200,80,80,0.5)" : "rgba(255,255,255,0.1)"}`,
              borderRadius: 9, color: "#ede9e1",
              fontSize: 20, fontFamily: "'Courier New',monospace",
              letterSpacing: "0.3em", outline: "none", boxSizing: "border-box",
              textAlign: "center", transition: "border-color 0.2s",
            }}
            onFocus={e => e.target.style.borderColor = "#c19b64"}
            onBlur={e => e.target.style.borderColor = error ? "rgba(200,80,80,0.5)" : "rgba(255,255,255,0.1)"}
          />
          {error && <div style={{ color: "#e07070", fontSize: 12, marginTop: 6, textAlign: "center" }}>{error}</div>}
        </div>

        <button onClick={handleConfirm} disabled={loading} style={{
          width: "100%", padding: "14px",
          background: loading ? "rgba(193,155,100,0.3)" : "linear-gradient(135deg,#c19b64,#8a6830)",
          border: "none", borderRadius: 10, color: "#fff",
          fontSize: 14.5, cursor: loading ? "not-allowed" : "pointer",
          fontFamily: "inherit", letterSpacing: "0.05em",
          boxShadow: loading ? "none" : "0 4px 20px rgba(193,155,100,0.35)",
          transition: "all 0.3s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          {loading ? (
            <>
              <span style={{
                display: "inline-block", width: 15, height: 15,
                border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff",
                borderRadius: "50%", animation: "spin 0.7s linear infinite",
              }} />
              提交中…
            </>
          ) : "✓ 我已完成匯款"}
        </button>

        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function BookingSystem() {
  const [step, setStep]         = useState(1);
  const [form, setForm]         = useState({ serviceId: null, staffId: null, date: null, time: null, name: "", phone: "", note: "" });
  const [bookings, setBookings] = useState([]);
  const [tab, setTab]           = useState("book");
  const [done, setDone]         = useState(null);
  const [payTarget, setPayTarget] = useState(null);
  const [trans, setTrans]       = useState(false);

  const days = getNextDays(14);

  // ── Load from storage ──
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setBookings(JSON.parse(saved));
    } catch {}
  }, []);

  const persist = (list) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch {}
  };

  // ── Send to Google Sheets ──
  const sendToSheet = async (booking) => {
    if (!WEBHOOK_URL || WEBHOOK_URL === "YOUR_APPS_SCRIPT_WEBHOOK_URL") return;
    const svc   = SERVICES.find(s => s.id === booking.serviceId);
    const staff = STAFF.find(s => s.id === booking.staffId);
    try {
      await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          createdAt: booking.createdAt,
          service:   svc?.name || "",
          staff:     staff?.name || "",
          date:      booking.date,
          time:      booking.time,
          name:      booking.name,
          phone:     booking.phone,
          deposit:   fmtPrice(svc?.deposit),
          price:     fmtPrice(svc?.price),
          status:    booking.status === "paid" ? "已確認付款" : "待確認匯款",
          last5:     booking.last5 || "",
          note:      booking.note || "",
        }),
      });
    } catch (e) { console.warn("Sheets sync failed:", e); }
  };

  // ── Taken slots ──
  const takenSlots = {};
  bookings.forEach(b => {
    const k = `${b.date}_${b.time}`;
    if (!takenSlots[k]) takenSlots[k] = [];
    takenSlots[k].push(b.staffId);
  });
  const isAvailable = (time, staffId) => {
    if (!form.date) return true;
    return !(takenSlots[`${form.date}_${time}`] || []).includes(staffId);
  };

  // ── Navigation ──
  const go = (fn) => { setTrans(true); setTimeout(() => { fn(); setTrans(false); }, 170); };
  const goNext = () => go(() => setStep(s => s + 1));
  const goBack = () => go(() => setStep(s => s - 1));

  // ── Book ──
  const handleBook = () => {
    const staff = STAFF.find(s => s.id === form.staffId);
    const nb = {
      id: Date.now(), ...form,
      staffName: staff?.name,
      status: "pending",
      createdAt: new Date().toLocaleString("zh-TW"),
    };
    const updated = [nb, ...bookings];
    setBookings(updated);
    persist(updated);
    setDone(nb);
    sendToSheet(nb);
  };

  // ── Payment confirmed ──
  const handlePaySuccess = async (last5) => {
    const updated = bookings.map(b =>
      b.id === payTarget.id ? { ...b, status: "paid", last5 } : b
    );
    setBookings(updated);
    persist(updated);
    const paid = updated.find(b => b.id === payTarget.id);
    await sendToSheet(paid);       // update sheet with paid status + last5
    setPayTarget(null);
    if (done?.id === payTarget.id) setDone({ ...done, status: "paid", last5 });
  };

  // ── Cancel ──
  const cancelBooking = (id) => {
    const updated = bookings.map(b => b.id === id ? { ...b, status: "cancelled" } : b);
    setBookings(updated);
    persist(updated);
  };

  const resetAll = () => {
    setForm({ serviceId: null, staffId: null, date: null, time: null, name: "", phone: "", note: "" });
    setStep(1); setDone(null); setTab("book");
  };

  const svc   = SERVICES.find(s => s.id === form.serviceId);
  const staff = STAFF.find(s => s.id === form.staffId);
  const doneSvc = done ? SERVICES.find(s => s.id === done.serviceId) : null;

  const canProceed = [
    !!form.serviceId,
    !!form.staffId,
    !!(form.date && form.time),
    form.name.trim().length > 0 && form.phone.replace(/\D/g, "").length >= 8,
  ];

  const STEP_LABELS = ["選擇服務", "選擇設計師", "選擇時間", "填寫資料", "確認預約"];

  // ─── UI ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#0a0b10", fontFamily: "'Noto Serif TC','Georgia',serif", color: "#ede9e1" }}>
      {/* Ambient */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-15%", left: "-10%", width: "60vw", height: "60vw", borderRadius: "50%", background: "radial-gradient(circle,rgba(193,155,100,0.06) 0%,transparent 65%)" }} />
        <div style={{ position: "absolute", bottom: "-20%", right: "-5%", width: "55vw", height: "55vw", borderRadius: "50%", background: "radial-gradient(circle,rgba(80,110,200,0.05) 0%,transparent 65%)" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 680, margin: "0 auto", padding: "28px 18px 80px" }}>

        {/* Logo */}
        <header style={{ textAlign: "center", marginBottom: 30 }}>
          <p style={{ fontSize: 10, letterSpacing: "0.45em", color: "#c19b64", margin: "0 0 6px", textTransform: "uppercase" }}>Luxury Hair Studio</p>
          <h1 style={{
            fontSize: "clamp(26px,6vw,40px)", fontWeight: 300, margin: 0,
            background: "linear-gradient(130deg,#ede9e1 20%,#c19b64 55%,#ede9e1 90%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            letterSpacing: "0.08em",
          }}>雅致沙龍</h1>
          <div style={{ width: 48, height: 1, background: "linear-gradient(90deg,transparent,#c19b64,transparent)", margin: "10px auto 0" }} />
        </header>

        {/* Tabs */}
        <div style={{ display: "flex", background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: 4, marginBottom: 24, border: "1px solid rgba(193,155,100,0.12)" }}>
          {[{ key: "book", label: "立即預約" }, { key: "records", label: `預約紀錄${bookings.length ? ` (${bookings.length})` : ""}` }].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              flex: 1, padding: "11px", border: "none", borderRadius: 9,
              background: tab === t.key ? "linear-gradient(135deg,#c19b64,#8a6830)" : "transparent",
              color: tab === t.key ? "#fff" : "rgba(237,233,225,0.45)",
              fontSize: 13.5, cursor: "pointer", fontFamily: "inherit",
              letterSpacing: "0.03em", transition: "all 0.3s",
            }}>{t.label}</button>
          ))}
        </div>

        {/* ══ BOOK TAB ══ */}
        {tab === "book" && !done && (
          <>
            {/* Step bar */}
            <div style={{ display: "flex", alignItems: "flex-start", marginBottom: 22 }}>
              {STEP_LABELS.map((lbl, i) => {
                const n = i + 1;
                const active = step === n, isDone = step > n;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", flex: i < 4 ? 1 : "none" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <div style={{
                        width: 27, height: 27, borderRadius: "50%",
                        background: isDone ? "linear-gradient(135deg,#c19b64,#8a6830)" : active ? "rgba(193,155,100,0.18)" : "rgba(255,255,255,0.05)",
                        border: `1.5px solid ${isDone || active ? "#c19b64" : "rgba(255,255,255,0.09)"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, color: isDone ? "#fff" : active ? "#c19b64" : "rgba(237,233,225,0.25)",
                        transition: "all 0.3s",
                      }}>{isDone ? "✓" : n}</div>
                      <span style={{ fontSize: 9, color: active ? "#c19b64" : "rgba(237,233,225,0.28)", whiteSpace: "nowrap", letterSpacing: "0.03em" }}>{lbl}</span>
                    </div>
                    {i < 4 && <div style={{ flex: 1, height: 1, margin: "13px 3px 0", background: isDone ? "#c19b64" : "rgba(255,255,255,0.07)", transition: "background 0.3s" }} />}
                  </div>
                );
              })}
            </div>

            {/* Card */}
            <div style={{
              background: "rgba(255,255,255,0.025)", borderRadius: 16,
              border: "1px solid rgba(193,155,100,0.1)", padding: "24px 20px",
              opacity: trans ? 0 : 1, transform: trans ? "translateY(6px)" : "translateY(0)",
              transition: "opacity 0.17s,transform 0.17s", backdropFilter: "blur(12px)",
              minHeight: 300,
            }}>

              {/* Step 1 */}
              {step === 1 && (
                <>
                  <h2 style={{ fontSize: 16, fontWeight: 400, margin: "0 0 16px", letterSpacing: "0.05em" }}>選擇服務項目</h2>
                  <div style={{ display: "grid", gap: 8 }}>
                    {SERVICES.map(s => {
                      const sel = form.serviceId === s.id;
                      return (
                        <button key={s.id} onClick={() => setForm(p => ({ ...p, serviceId: s.id }))} style={{
                          display: "flex", alignItems: "center", padding: "12px 15px",
                          background: sel ? "linear-gradient(135deg,rgba(193,155,100,0.18),rgba(193,155,100,0.07))" : "rgba(255,255,255,0.03)",
                          border: `1px solid ${sel ? "#c19b64" : "rgba(255,255,255,0.07)"}`,
                          borderRadius: 10, cursor: "pointer", color: "#ede9e1",
                          fontFamily: "inherit", transition: "all 0.2s", textAlign: "left", width: "100%",
                        }}>
                          <span style={{ fontSize: 20, marginRight: 12 }}>{s.icon}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: sel ? 500 : 400 }}>{s.name}</div>
                            <div style={{ fontSize: 11, color: "rgba(237,233,225,0.4)", marginTop: 1 }}>
                              {s.duration} 分鐘 · 訂金 {fmtPrice(s.deposit)}
                            </div>
                          </div>
                          <div style={{ fontSize: 14.5, color: sel ? "#c19b64" : "rgba(237,233,225,0.35)", fontWeight: 500 }}>{fmtPrice(s.price)}</div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Step 2 */}
              {step === 2 && (
                <>
                  <h2 style={{ fontSize: 16, fontWeight: 400, margin: "0 0 16px", letterSpacing: "0.05em" }}>選擇設計師</h2>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                    {STAFF.map(s => {
                      const sel = form.staffId === s.id;
                      return (
                        <button key={s.id} onClick={() => setForm(p => ({ ...p, staffId: s.id }))} style={{
                          padding: "18px 8px", textAlign: "center",
                          background: sel ? `linear-gradient(160deg,${s.color}22,${s.color}0a)` : "rgba(255,255,255,0.03)",
                          border: `1px solid ${sel ? s.color + "88" : "rgba(255,255,255,0.07)"}`,
                          borderRadius: 12, cursor: "pointer", color: "#ede9e1",
                          fontFamily: "inherit", transition: "all 0.2s",
                        }}>
                          <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
                            <Avatar staff={s} size={44} />
                          </div>
                          <div style={{ fontSize: 14.5, fontWeight: 500, marginBottom: 2 }}>{s.name}</div>
                          <div style={{ fontSize: 10.5, color: s.color }}>{s.title}</div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Step 3 */}
              {step === 3 && (
                <>
                  <h2 style={{ fontSize: 16, fontWeight: 400, margin: "0 0 13px", letterSpacing: "0.05em" }}>選擇日期與時段</h2>
                  <div style={{ overflowX: "auto", paddingBottom: 4, marginBottom: 16 }}>
                    <div style={{ display: "flex", gap: 6, minWidth: "max-content" }}>
                      {days.map((d, i) => {
                        const ds = d.toLocaleDateString("zh-TW");
                        const sel = form.date === ds;
                        return (
                          <button key={i} onClick={() => setForm(p => ({ ...p, date: ds, time: null }))} style={{
                            padding: "8px 9px", textAlign: "center", minWidth: 48,
                            background: sel ? "linear-gradient(135deg,#c19b64,#8a6830)" : "rgba(255,255,255,0.03)",
                            border: `1px solid ${sel ? "#c19b64" : "rgba(255,255,255,0.07)"}`,
                            borderRadius: 8, cursor: "pointer",
                            color: sel ? "#fff" : "#ede9e1",
                            fontFamily: "inherit", transition: "all 0.2s",
                          }}>
                            <div style={{ fontSize: 9, color: sel ? "rgba(255,255,255,0.6)" : "rgba(237,233,225,0.35)", marginBottom: 2 }}>
                              {i === 0 ? "今天" : `週${DAYS_CN[d.getDay()]}`}
                            </div>
                            <div style={{ fontSize: 16, fontWeight: 500 }}>{d.getDate()}</div>
                            <div style={{ fontSize: 9, color: sel ? "rgba(255,255,255,0.6)" : "rgba(237,233,225,0.35)", marginTop: 1 }}>{d.getMonth() + 1}月</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {form.date ? (
                    <>
                      <div style={{ fontSize: 10.5, color: "rgba(237,233,225,0.35)", marginBottom: 8, letterSpacing: "0.04em" }}>可用時段</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
                        {TIME_SLOTS.map(t => {
                          const avail = form.staffId ? isAvailable(t, form.staffId) : true;
                          const sel = form.time === t;
                          return (
                            <button key={t} disabled={!avail} onClick={() => setForm(p => ({ ...p, time: t }))} style={{
                              padding: "9px 4px", textAlign: "center", fontSize: 12,
                              background: sel ? "linear-gradient(135deg,#c19b64,#8a6830)" : avail ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.015)",
                              border: `1px solid ${sel ? "#c19b64" : avail ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.03)"}`,
                              borderRadius: 7, cursor: avail ? "pointer" : "not-allowed",
                              color: sel ? "#fff" : avail ? "#ede9e1" : "rgba(237,233,225,0.18)",
                              fontFamily: "inherit", transition: "all 0.2s",
                              textDecoration: !avail ? "line-through" : "none",
                            }}>{t}</button>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div style={{ textAlign: "center", padding: "28px 0", color: "rgba(237,233,225,0.28)", fontSize: 13 }}>請先選擇日期</div>
                  )}
                </>
              )}

              {/* Step 4 */}
              {step === 4 && (
                <>
                  <h2 style={{ fontSize: 16, fontWeight: 400, margin: "0 0 14px", letterSpacing: "0.05em" }}>填寫預約資料</h2>
                  {/* Mini summary */}
                  <div style={{
                    background: "rgba(193,155,100,0.07)", border: "1px solid rgba(193,155,100,0.15)",
                    borderRadius: 9, padding: "11px 14px", marginBottom: 16,
                    display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px",
                  }}>
                    {[["服務", `${svc?.icon} ${svc?.name}`], ["設計師", staff?.name], ["日期", form.date], ["時段", form.time]].map(([k, v]) => (
                      <div key={k}>
                        <div style={{ fontSize: 10, color: "rgba(237,233,225,0.38)", marginBottom: 1 }}>{k}</div>
                        <div style={{ fontSize: 12.5, color: "#ede9e1" }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "grid", gap: 12 }}>
                    {[{ key: "name", label: "姓名", type: "text", placeholder: "請輸入姓名" }, { key: "phone", label: "聯絡電話", type: "tel", placeholder: "請輸入電話" }].map(f => (
                      <div key={f.key}>
                        <label style={{ fontSize: 11, color: "rgba(237,233,225,0.45)", display: "block", marginBottom: 5 }}>
                          {f.label}<span style={{ color: "#c19b64" }}> *</span>
                        </label>
                        <input type={f.type} placeholder={f.placeholder} value={form[f.key]}
                          onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                          style={{
                            width: "100%", padding: "11px 13px", background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.09)", borderRadius: 8,
                            color: "#ede9e1", fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box",
                          }}
                          onFocus={e => e.target.style.borderColor = "#c19b64"}
                          onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.09)"}
                        />
                      </div>
                    ))}
                    <div>
                      <label style={{ fontSize: 11, color: "rgba(237,233,225,0.45)", display: "block", marginBottom: 5 }}>備註（選填）</label>
                      <textarea rows={3} placeholder="如有特殊需求或過敏史請告知…" value={form.note}
                        onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
                        style={{
                          width: "100%", padding: "11px 13px", background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.09)", borderRadius: 8,
                          color: "#ede9e1", fontSize: 14, fontFamily: "inherit", outline: "none",
                          resize: "none", boxSizing: "border-box",
                        }}
                        onFocus={e => e.target.style.borderColor = "#c19b64"}
                        onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.09)"}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Step 5 — Confirm */}
              {step === 5 && (
                <>
                  <h2 style={{ fontSize: 16, fontWeight: 400, margin: "0 0 6px", letterSpacing: "0.05em" }}>確認預約</h2>
                  <p style={{ fontSize: 12.5, color: "rgba(237,233,225,0.42)", margin: "0 0 18px" }}>
                    確認後將顯示匯款資訊，完成訂金付款即完成預約。
                  </p>
                  <div style={{ display: "grid", gap: 0 }}>
                    {[
                      ["服務", `${svc?.icon} ${svc?.name}`],
                      ["設計師", staff?.name],
                      ["日期", form.date],
                      ["時段", form.time],
                      ["客戶", form.name],
                      ["電話", form.phone],
                      ["服務費", fmtPrice(svc?.price)],
                      ["訂金", fmtPrice(svc?.deposit)],
                    ].map(([k, v], i, arr) => (
                      <div key={k} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "10px 0",
                        borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                      }}>
                        <span style={{ fontSize: 12, color: "rgba(237,233,225,0.4)" }}>{k}</span>
                        <span style={{ fontSize: 13.5, color: k === "訂金" ? "#c19b64" : "#ede9e1", fontWeight: k === "訂金" ? 500 : 400 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                  {form.note && (
                    <div style={{ marginTop: 10, fontSize: 12, color: "rgba(237,233,225,0.38)", fontStyle: "italic" }}>備註：{form.note}</div>
                  )}
                </>
              )}
            </div>

            {/* Nav buttons */}
            <div style={{ display: "flex", gap: 8, marginTop: 13 }}>
              {step > 1 && (
                <button onClick={goBack} style={{
                  padding: "13px 20px", background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.09)", borderRadius: 10,
                  color: "rgba(237,233,225,0.55)", fontSize: 13.5, cursor: "pointer",
                  fontFamily: "inherit", transition: "all 0.2s",
                }}>← 上一步</button>
              )}
              <button disabled={!canProceed[step - 1]} onClick={step < 5 ? goNext : handleBook} style={{
                flex: 1, padding: "13px",
                background: canProceed[step - 1] ? "linear-gradient(135deg,#c19b64,#8a6830)" : "rgba(255,255,255,0.05)",
                border: "none", borderRadius: 10,
                color: canProceed[step - 1] ? "#fff" : "rgba(237,233,225,0.2)",
                fontSize: 15, cursor: canProceed[step - 1] ? "pointer" : "not-allowed",
                fontFamily: "inherit", letterSpacing: "0.05em", transition: "all 0.3s",
                boxShadow: canProceed[step - 1] ? "0 4px 18px rgba(193,155,100,0.3)" : "none",
              }}>
                {step < 5 ? "下一步 →" : "確認預約"}
              </button>
            </div>
          </>
        )}

        {/* ══ DONE SCREEN ══ */}
        {tab === "book" && done && (
          <div style={{
            background: "rgba(255,255,255,0.025)", borderRadius: 16,
            border: "1px solid rgba(193,155,100,0.12)", padding: "34px 22px", textAlign: "center",
          }}>
            <div style={{
              width: 66, height: 66, borderRadius: "50%",
              background: "linear-gradient(135deg,rgba(193,155,100,0.22),rgba(193,155,100,0.07))",
              border: "2px solid #c19b64",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 26, margin: "0 auto 16px",
            }}>✓</div>
            <h2 style={{ fontSize: 20, fontWeight: 300, margin: "0 0 6px", letterSpacing: "0.06em" }}>預約成功！</h2>
            <p style={{ fontSize: 12.5, color: "rgba(237,233,225,0.42)", margin: "0 0 18px" }}>
              請完成匯款訂金以確保您的預約位置
            </p>
            <div style={{ marginBottom: 18 }}>
              <StatusBadge status={done.status} />
            </div>

            {/* Summary */}
            <div style={{
              background: "rgba(193,155,100,0.07)", border: "1px solid rgba(193,155,100,0.15)",
              borderRadius: 10, padding: "13px 16px", textAlign: "left", marginBottom: 20,
            }}>
              {[
                ["服務", `${doneSvc?.icon} ${doneSvc?.name}`],
                ["設計師", done.staffName],
                ["日期時間", `${done.date} ${done.time}`],
                ["客戶姓名", done.name],
                ["聯絡電話", done.phone],
                ["訂金金額", fmtPrice(doneSvc?.deposit)],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 13 }}>
                  <span style={{ color: "rgba(237,233,225,0.4)" }}>{k}</span>
                  <span style={{ color: "#ede9e1" }}>{v}</span>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              {done.status === "pending" && (
                <button onClick={() => setPayTarget(done)} style={{
                  width: "100%", padding: "14px",
                  background: "linear-gradient(135deg,#c19b64,#8a6830)",
                  border: "none", borderRadius: 10, color: "#fff",
                  fontSize: 14.5, cursor: "pointer", fontFamily: "inherit",
                  letterSpacing: "0.05em", boxShadow: "0 4px 20px rgba(193,155,100,0.35)",
                }}>🏦 查看匯款資訊</button>
              )}
              {done.status === "paid" && (
                <div style={{
                  padding: "13px", background: "rgba(100,180,100,0.1)",
                  border: "1px solid rgba(100,180,100,0.25)", borderRadius: 10,
                  color: "#64b464", fontSize: 13.5, letterSpacing: "0.04em",
                }}>✓ 訂金已確認，預約完成！</div>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setTab("records")} style={{
                  flex: 1, padding: "11px", background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.09)", borderRadius: 10,
                  color: "rgba(237,233,225,0.55)", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit",
                }}>查看紀錄</button>
                <button onClick={resetAll} style={{
                  flex: 1, padding: "11px", background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.09)", borderRadius: 10,
                  color: "rgba(237,233,225,0.55)", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit",
                }}>再次預約</button>
              </div>
            </div>
          </div>
        )}

        {/* ══ RECORDS TAB ══ */}
        {tab === "records" && (
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 400, margin: "0 0 14px", letterSpacing: "0.05em" }}>預約紀錄</h2>
            {bookings.length === 0 ? (
              <div style={{
                textAlign: "center", padding: "60px 20px",
                background: "rgba(255,255,255,0.02)", borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.06)",
              }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>📋</div>
                <p style={{ color: "rgba(237,233,225,0.32)", fontSize: 13 }}>尚無預約紀錄</p>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {bookings.map(b => {
                  const bSvc = SERVICES.find(s => s.id === b.serviceId);
                  const bStaff = STAFF.find(s => s.id === b.staffId);
                  return (
                    <div key={b.id} style={{
                      background: "rgba(255,255,255,0.025)", borderRadius: 12,
                      border: "1px solid rgba(193,155,100,0.1)", padding: "14px 16px",
                      opacity: b.status === "cancelled" ? 0.5 : 1,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 9 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                          {bStaff && <Avatar staff={bStaff} size={30} />}
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 500 }}>{bSvc?.icon} {bSvc?.name}</div>
                            <div style={{ fontSize: 11, color: "rgba(237,233,225,0.4)", marginTop: 1 }}>
                              {b.date} {b.time} · {bStaff?.name}
                            </div>
                          </div>
                        </div>
                        <StatusBadge status={b.status} />
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px 10px", marginBottom: 9 }}>
                        {[["客戶", b.name], ["電話", b.phone], ["訂金", fmtPrice(bSvc?.deposit)], b.last5 ? ["末五碼", b.last5] : ["服務費", fmtPrice(bSvc?.price)]].map(([k, v]) => (
                          <div key={k} style={{ fontSize: 11 }}>
                            <span style={{ color: "rgba(237,233,225,0.35)" }}>{k}：</span>
                            <span style={{ color: "rgba(237,233,225,0.7)" }}>{v}</span>
                          </div>
                        ))}
                      </div>

                      {b.note && <div style={{ fontSize: 11, color: "rgba(237,233,225,0.33)", fontStyle: "italic", marginBottom: 9 }}>備註：{b.note}</div>}

                      {b.status !== "cancelled" && (
                        <div style={{ display: "flex", gap: 7 }}>
                          {b.status === "pending" && (
                            <button onClick={() => setPayTarget(b)} style={{
                              padding: "7px 13px", background: "linear-gradient(135deg,rgba(193,155,100,0.3),rgba(138,104,48,0.3))",
                              border: "1px solid rgba(193,155,100,0.3)", borderRadius: 7,
                              color: "#c19b64", fontSize: 11.5, cursor: "pointer", fontFamily: "inherit",
                            }}>🏦 匯款資訊</button>
                          )}
                          <button onClick={() => cancelBooking(b.id)} style={{
                            padding: "7px 13px", background: "rgba(200,80,80,0.08)",
                            border: "1px solid rgba(200,80,80,0.18)", borderRadius: 7,
                            color: "#c85050", fontSize: 11.5, cursor: "pointer", fontFamily: "inherit",
                          }}>取消預約</button>
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

      {/* Payment Modal */}
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
}

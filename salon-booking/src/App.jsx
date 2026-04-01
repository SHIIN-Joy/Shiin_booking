import { useState, useEffect, useCallback } from "react";

const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbxoVMw0OGJMrjnT1ctO89_EPmPZxSes9UlSrYPTcseUcC0X2akPSewjclqE2K_G6nL9Dg/exec";
const SALON_NAME  = "拾形造型";
const SALON_EN    = "Shiin Studio";
const ADMIN_PASS  = "Steam74446";
const STORAGE_KEY = "shiin_bookings_v4";
const LINE_ID     = "@879xtdof";

const SERVICES = [
  { id:1, name:"單髮服務",            icon:"✂️", note:"時長約 30–60 分鐘" },
  { id:2, name:"單妝服務",            icon:"💄", note:"時長約 30–60 分鐘" },
  { id:3, name:"精緻妝髮（僅放髮）",  icon:"✨", note:"時長約 60–90 分鐘" },
  { id:4, name:"個人指定妝髮",        icon:"🎨", note:"時長約 90–120 分鐘" },
  { id:5, name:"特殊妝髮（主題節慶）",icon:"🌟", note:"時長約 90–180 分鐘" },
  { id:6, name:"結婚妝髮",            icon:"💍", note:"時長約 180–210 分鐘，$10,000 起", isWedding:true },
  { id:7, name:"兒童指定妝髮",        icon:"🎭", note:"時長約 90–120 分鐘" },
  { id:8, name:"兒童生活妝髮",        icon:"🌈", note:"時長約 60–90 分鐘" },
];

const ADDONS = [
  { id:1, name:"編髮／盤髮",          icon:"🪢" },
  { id:2, name:"假睫毛",              icon:"👁️" },
  { id:3, name:"眼型調整",            icon:"✦"  },
  { id:4, name:"特殊妝",              icon:"🎭" },
  { id:5, name:"鑽飾與造型配件黏貼",  icon:"💎" },
  { id:6, name:"造型飾品租借",        icon:"👑" },
  { id:7, name:"假髮租借",            icon:"💇" },
];

const GENDERS = ["男","女"];

const TIME_SLOTS_LIST = (() => {
  const s = [];
  for (let h=9;h<=19;h++) {
    s.push(`${String(h).padStart(2,"0")}:00`);
    if (h<19) s.push(`${String(h).padStart(2,"0")}:30`);
  }
  s.push("19:30");
  return [...new Set(s)];
})();

const BANK_INFO = {
  bank:"中華郵政", code:"700", account:"00017910243086", holder:"周采錞",
  notes:["匯款後請保留收據","備註欄請填寫您的姓名","請提供匯款末五碼以利對帳"],
};

const STUDIO_ADDRESS = "新北市三峽區學府路（爵仕悅社區），抵達時通知我們會到大廳接您";
const WEDDING_NOTICE = `✨ 我們會於婚期前一個禮拜至宴會場確認環境，以防當日有用具無法使用的情況，再麻煩您提供會場地址，以及協助知會現場工作人員🫶

✨ 若於「預約日期前一個月做取消」，可全額退押金（例：預約 7/8，最晚 6/8 前皆可全額退）

✨ 若於「試妝後做取消」，將收取預約項目費用的 50%

再麻煩您留意唷!! 謝謝🤍`;

const BOOKING_NOTICES_DEFAULT = [
  "1. 不定期優惠通知，歡迎持續關注我們的官方帳號！",
  "2. 如須取消或改期，請提前 3 天告知。梳化前一天通知將收取 $300 的臨時更改費。",
];

const todayStr = () => new Date().toISOString().split("T")[0];
const fmtPrice = (n) => n ? `NT$ ${Number(String(n).replace(/[^0-9]/g,"")).toLocaleString()}` : "";
const thisMonth = () => new Date().toISOString().slice(0,7);

// ─── UI Helpers ───────────────────────────────────────────────────────────────
function Divider() {
  return (
    <div style={{display:"flex",alignItems:"center",gap:8,margin:"16px 0"}}>
      <div style={{flex:1,height:1,background:"linear-gradient(90deg,transparent,rgba(44,44,44,0.15))"}}/>
      <div style={{width:4,height:4,borderRadius:"50%",background:"#2c2c2c"}}/>
      <div style={{flex:1,height:1,background:"linear-gradient(90deg,rgba(44,44,44,0.15),transparent)"}}/>
    </div>
  );
}

function FieldLabel({label,required}) {
  return (
    <label style={{fontSize:11,color:"rgba(44,44,44,0.45)",display:"block",marginBottom:6,letterSpacing:"0.04em"}}>
      {label}{required&&<span style={{color:"#2c2c2c"}}> *</span>}
    </label>
  );
}

function TInput({value,onChange,type="text",placeholder,error}) {
  return (
    <div>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        style={{width:"100%",padding:"11px 13px",background:"#faf8f5",border:`1px solid ${error?"rgba(200,80,80,0.4)":"#dedad4"}`,borderRadius:8,color:"#2c2c2c",fontSize:14,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}
        onFocus={e=>e.target.style.borderColor="#2c2c2c"}
        onBlur={e=>e.target.style.borderColor=error?"rgba(200,80,80,0.4)":"#dedad4"}
      />
      {error&&<div style={{color:"#e07070",fontSize:11.5,marginTop:4}}>{error}</div>}
    </div>
  );
}

function StatusBadge({status}) {
  const M={pending:{l:"待確認匯款",bg:"rgba(220,160,60,0.12)",c:"#b08020"},paid:{l:"已確認付款",bg:"rgba(100,180,100,0.12)",c:"#3a9a3a"},cancelled:{l:"已取消",bg:"rgba(200,80,80,0.12)",c:"#c04040"}};
  const s=M[status]||M.pending;
  return <span style={{fontSize:11,padding:"3px 9px",borderRadius:20,background:s.bg,color:s.c,fontWeight:500}}>{s.l}</span>;
}

function btnStyle(active) {
  return {flex:1,padding:"11px 8px",border:`1px solid ${active?"#2c2c2c":"#dedad4"}`,borderRadius:9,cursor:"pointer",fontFamily:"inherit",fontSize:13.5,background:active?"rgba(44,44,44,0.08)":"#faf8f5",color:active?"#2c2c2c":"rgba(44,44,44,0.45)",transition:"all 0.2s"};
}

// ─── Wedding Modal ─────────────────────────────────────────────────────────────
function WeddingModal({onConfirm,onClose}) {
  return (
    <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(44,44,44,0.5)",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{width:"100%",maxWidth:420,background:"#fff",borderRadius:16,padding:"26px 22px",boxShadow:"0 20px 50px rgba(44,44,44,0.15)",maxHeight:"85vh",overflowY:"auto"}}>
        <div style={{fontSize:22,marginBottom:6}}>💍</div>
        <h2 style={{fontSize:18,fontWeight:500,margin:"0 0 4px",color:"#2c2c2c"}}>結婚妝髮注意事項</h2>
        <Divider/>
        <div style={{fontSize:13.5,color:"rgba(44,44,44,0.7)",lineHeight:1.8,whiteSpace:"pre-line",marginBottom:20}}>{WEDDING_NOTICE}</div>
        <button onClick={onConfirm} style={{width:"100%",padding:"13px",background:"linear-gradient(135deg,#2c2c2c,#1a1a1a)",border:"none",borderRadius:10,color:"#fff",fontSize:14.5,cursor:"pointer",fontFamily:"inherit"}}>我已了解，繼續選擇</button>
      </div>
    </div>
  );
}

// ─── Notice Modal ──────────────────────────────────────────────────────────────
function NoticeModal({notices,onClose}) {
  return (
    <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(44,44,44,0.5)",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{width:"100%",maxWidth:440,background:"#fff",borderRadius:16,padding:"26px 22px",boxShadow:"0 20px 50px rgba(44,44,44,0.15)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <h2 style={{fontSize:18,fontWeight:500,margin:0,color:"#2c2c2c"}}>預約須知</h2>
          <button onClick={onClose} style={{background:"none",border:"none",color:"rgba(44,44,44,0.3)",fontSize:20,cursor:"pointer"}}>✕</button>
        </div>
        {notices.map((n,i)=>(
          <div key={i} style={{fontSize:13.5,color:"rgba(44,44,44,0.7)",lineHeight:1.8,marginBottom:i<notices.length-1?12:0,padding:"12px 16px",background:"#faf8f5",borderRadius:9,border:"1px solid #dedad4"}}>{n}</div>
        ))}
        <Divider/>
        <div style={{fontSize:12,color:"rgba(44,44,44,0.4)",textAlign:"center"}}>如有任何疑問，歡迎透過 LINE 官方帳號 {LINE_ID} 與我們聯繫 🤍</div>
        <button onClick={onClose} style={{width:"100%",marginTop:16,padding:"12px",background:"linear-gradient(135deg,#2c2c2c,#1a1a1a)",border:"none",borderRadius:10,color:"#fff",fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>我已了解</button>
      </div>
    </div>
  );
}

// ─── Payment Modal ─────────────────────────────────────────────────────────────
function PaymentModal({booking,svc,depositAmount,onSuccess,onClose}) {
  const [last5,setLast5]=useState("");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [copied,setCopied]=useState("");

  const copy=(text,key)=>{navigator.clipboard?.writeText(text).catch(()=>{});setCopied(key);setTimeout(()=>setCopied(""),1800);};

  const handleConfirm=async()=>{
    if(last5.replace(/\D/g,"").length<5)return setError("請輸入匯款末五碼（5 位數字）");
    setLoading(true);setError("");
    await onSuccess(last5);
    setLoading(false);
  };

  const amt = depositAmount || "NT$ 500";

  return (
    <div style={{position:"fixed",inset:0,zIndex:100,background:"rgba(44,44,44,0.4)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{width:"100%",maxWidth:430,background:"#fff",borderRadius:18,padding:"26px 22px",boxShadow:"0 24px 60px rgba(44,44,44,0.15)",maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <div style={{fontSize:10,letterSpacing:"0.35em",color:"rgba(44,44,44,0.45)",marginBottom:4}}>BANK TRANSFER</div>
            <div style={{fontSize:20,fontWeight:500,color:"#2c2c2c"}}>匯款資訊</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"rgba(44,44,44,0.3)",fontSize:20,cursor:"pointer"}}>✕</button>
        </div>
        <Divider/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(44,44,44,0.04)",border:"1px solid rgba(44,44,44,0.1)",borderRadius:10,padding:"12px 16px",marginBottom:18}}>
          <div>
            <div style={{fontSize:12,color:"rgba(44,44,44,0.5)",marginBottom:2}}>{svc?.icon} {svc?.name}</div>
            <div style={{fontSize:11,color:"rgba(44,44,44,0.35)"}}>{booking.date} {booking.time}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:10,color:"rgba(44,44,44,0.4)",marginBottom:2}}>訂金金額</div>
            <div style={{fontSize:24,fontWeight:600,color:"#2c2c2c"}}>{amt}</div>
          </div>
        </div>
        <div style={{background:"#faf8f5",border:"1px solid #dedad4",borderRadius:12,overflow:"hidden",marginBottom:16}}>
          {[{label:"銀行",value:`${BANK_INFO.bank}（${BANK_INFO.code}）`,key:"bank"},{label:"帳號",value:BANK_INFO.account,key:"account",mono:true},{label:"戶名",value:BANK_INFO.holder,key:"holder"}].map(({label,value,key,mono},i)=>(
            <div key={key} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px 16px",borderBottom:i<2?"1px solid #ede9e3":"none"}}>
              <div>
                <div style={{fontSize:10.5,color:"rgba(44,44,44,0.4)",marginBottom:2}}>{label}</div>
                <div style={{fontSize:mono?16:14,color:"#2c2c2c",fontFamily:mono?"'Courier New',monospace":"inherit",letterSpacing:mono?"0.08em":"normal"}}>{value}</div>
              </div>
              <button onClick={()=>copy(value,key)} style={{padding:"5px 11px",background:copied===key?"rgba(100,180,100,0.12)":"rgba(44,44,44,0.07)",border:`1px solid ${copied===key?"rgba(100,180,100,0.3)":"rgba(44,44,44,0.15)"}`,borderRadius:7,color:copied===key?"#3a9a3a":"#2c2c2c",fontSize:11.5,cursor:"pointer",fontFamily:"inherit",transition:"all 0.25s",whiteSpace:"nowrap"}}>
                {copied===key?"✓ 已複製":"複製"}
              </button>
            </div>
          ))}
        </div>
        <div style={{background:"rgba(44,44,44,0.04)",border:"1px solid rgba(44,44,44,0.1)",borderRadius:9,padding:"11px 14px",marginBottom:18}}>
          <div style={{fontSize:10.5,color:"#2c2c2c",letterSpacing:"0.06em",marginBottom:7,fontWeight:500}}>⚠ 注意事項</div>
          {BANK_INFO.notes.map((n,i)=>(
            <div key={i} style={{fontSize:12,color:"rgba(44,44,44,0.6)",marginBottom:i<BANK_INFO.notes.length-1?4:0,display:"flex",gap:6}}><span style={{color:"rgba(44,44,44,0.35)"}}>·</span>{n}</div>
          ))}
        </div>
        <div style={{marginBottom:16}}>
          <label style={{fontSize:11.5,color:"rgba(44,44,44,0.5)",display:"block",marginBottom:7}}>匯款末五碼 <span style={{color:"#2c2c2c"}}>*</span><span style={{fontSize:10.5,color:"rgba(44,44,44,0.35)",marginLeft:6}}>（方便我們快速對帳）</span></label>
          <input type="text" inputMode="numeric" placeholder="例：12345" maxLength={5} value={last5} onChange={e=>{setLast5(e.target.value.replace(/\D/g,"").slice(0,5));setError("");}}
            style={{width:"100%",padding:"12px 14px",background:"#faf8f5",border:`1px solid ${error?"rgba(200,80,80,0.5)":"#dedad4"}`,borderRadius:9,color:"#2c2c2c",fontSize:20,fontFamily:"'Courier New',monospace",letterSpacing:"0.3em",outline:"none",boxSizing:"border-box",textAlign:"center"}}
            onFocus={e=>e.target.style.borderColor="#2c2c2c"} onBlur={e=>e.target.style.borderColor=error?"rgba(200,80,80,0.5)":"#dedad4"}
          />
          {error&&<div style={{color:"#e07070",fontSize:12,marginTop:6,textAlign:"center"}}>{error}</div>}
        </div>
        <button onClick={handleConfirm} disabled={loading} style={{width:"100%",padding:"14px",background:loading?"rgba(44,44,44,0.3)":"linear-gradient(135deg,#2c2c2c,#1a1a1a)",border:"none",borderRadius:10,color:"#fff",fontSize:14.5,cursor:loading?"not-allowed":"pointer",fontFamily:"inherit",letterSpacing:"0.05em",boxShadow:loading?"none":"0 4px 16px rgba(44,44,44,0.2)",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          {loading?<><span style={{display:"inline-block",width:15,height:15,border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>提交中…</>:"✓ 我已完成匯款"}
        </button>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );
}

// ─── Admin Panel ───────────────────────────────────────────────────────────────
function AdminPanel({onLogout,webhookUrl}) {
  const [tab,setTab]           = useState("month");
  const [bookings,setBookings] = useState([]);
  const [loading,setLoading]   = useState(true);
  const [notices,setNotices]   = useState(()=>{
    try { return JSON.parse(localStorage.getItem("shiin_notices")||"null") || BOOKING_NOTICES_DEFAULT; } catch { return BOOKING_NOTICES_DEFAULT; }
  });
  const [editNotices,setEditNotices] = useState(false);
  const [draftNotices,setDraftNotices] = useState(notices);
  const [linkForm,setLinkForm] = useState({service:"",addons:[],totalPrice:"",deposit:"",travel:"",note:""});
  const [generatedLink,setGeneratedLink] = useState("");
  const [copied,setCopied]     = useState(false);

  const fetchBookings = useCallback(async()=>{
    setLoading(true);
    try {
      const res = await fetch(webhookUrl+"?action=getBookings");
      const data = await res.json();
      setBookings(data.bookings||[]);
    } catch { setBookings([]); }
    setLoading(false);
  },[webhookUrl]);

  useEffect(()=>{ fetchBookings(); },[fetchBookings]);

  const cancelBooking = async(b)=>{
    if (!confirm(`確定取消 ${b.name} 的預約？`)) return;
    try {
      await fetch(webhookUrl,{method:"POST",mode:"no-cors",headers:{"Content-Type":"text/plain"},body:JSON.stringify({...b,status:"已取消",datetime:(b.date||"")+" "+(b.time||"")})});
      fetchBookings();
    } catch {}
  };

  const saveNotices = ()=>{
    setNotices(draftNotices);
    localStorage.setItem("shiin_notices",JSON.stringify(draftNotices));
    setEditNotices(false);
  };

  const generateLink = ()=>{
    const params = new URLSearchParams();
    if (linkForm.service)    params.set("service",linkForm.service);
    if (linkForm.addons.length) params.set("addons",linkForm.addons.join(","));
    if (linkForm.totalPrice) params.set("totalPrice",linkForm.totalPrice);
    if (linkForm.deposit)    params.set("deposit",linkForm.deposit);
    if (linkForm.travel)     params.set("travel",linkForm.travel);
    if (linkForm.note)       params.set("note",linkForm.note);
    setGeneratedLink(`${window.location.origin}?${params.toString()}`);
  };

  const now = thisMonth();
  const monthBookings = bookings.filter(b=>b.date&&b.date.startsWith(now.replace("/","-").slice(0,7)));

  // Stats
  const byMonth = {};
  bookings.forEach(b=>{
    if (!b.date||b.status==="已取消") return;
    const m = b.date.slice(0,7);
    if (!byMonth[m]) byMonth[m]={count:0,revenue:0};
    byMonth[m].count++;
    const p = parseInt(String(b.totalPrice||b.price||"0").replace(/[^0-9]/g,""))||0;
    byMonth[m].revenue += p;
  });
  const months = Object.keys(byMonth).sort().reverse();
  const totalCount   = Object.values(byMonth).reduce((s,v)=>s+v.count,0);
  const totalRevenue = Object.values(byMonth).reduce((s,v)=>s+v.revenue,0);

  const inputStyle = {width:"100%",padding:"10px 12px",background:"#faf8f5",border:"1px solid #dedad4",borderRadius:8,color:"#2c2c2c",fontSize:13.5,fontFamily:"inherit",outline:"none",boxSizing:"border-box"};

  return (
    <div style={{minHeight:"100vh",background:"#f5f2ee",fontFamily:"'Noto Serif TC','Georgia',serif",color:"#2c2c2c"}}>
      <div style={{maxWidth:780,margin:"0 auto",padding:"24px 18px 60px"}}>
        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
          <div>
            <div style={{fontSize:10,letterSpacing:"0.4em",color:"rgba(44,44,44,0.45)",marginBottom:4}}>ADMIN</div>
            <h1 style={{fontSize:22,fontWeight:500,margin:0,color:"#2c2c2c"}}>{SALON_NAME} 公司端</h1>
          </div>
          <button onClick={onLogout} style={{padding:"8px 16px",background:"rgba(200,80,80,0.08)",border:"1px solid rgba(200,80,80,0.2)",borderRadius:8,color:"#c04040",fontSize:12.5,cursor:"pointer",fontFamily:"inherit"}}>登出</button>
        </div>

        {/* Tabs */}
        <div style={{display:"flex",background:"#ede9e3",borderRadius:12,padding:4,marginBottom:24,gap:4}}>
          {[{k:"month",l:"本月預約"},{k:"link",l:"產生連結"},{k:"notices",l:"預約須知"},{k:"stats",l:"數據報表"}].map(t=>(
            <button key={t.k} onClick={()=>setTab(t.k)} style={{flex:1,padding:"10px 4px",border:"none",borderRadius:9,background:tab===t.k?"#fff":"transparent",color:tab===t.k?"#2c2c2c":"rgba(44,44,44,0.45)",fontSize:12,cursor:"pointer",fontFamily:"inherit",boxShadow:tab===t.k?"0 1px 4px rgba(44,44,44,0.1)":"none"}}>{t.l}</button>
          ))}
        </div>

        {/* ── 本月預約 ── */}
        {tab==="month" && (
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <h2 style={{fontSize:17,fontWeight:500,margin:0}}>本月預約</h2>
              <button onClick={fetchBookings} style={{padding:"7px 14px",background:"rgba(44,44,44,0.07)",border:"1px solid rgba(44,44,44,0.15)",borderRadius:8,color:"#2c2c2c",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>🔄 重新整理</button>
            </div>
            {loading ? (
              <div style={{textAlign:"center",padding:"40px",color:"rgba(44,44,44,0.4)"}}>載入中…</div>
            ) : monthBookings.length===0 ? (
              <div style={{textAlign:"center",padding:"60px 20px",background:"#fff",borderRadius:16,border:"1px solid rgba(44,44,44,0.08)"}}>
                <div style={{fontSize:40,marginBottom:10}}>📅</div>
                <p style={{color:"rgba(44,44,44,0.4)",fontSize:13}}>本月尚無預約</p>
              </div>
            ) : (
              <div style={{display:"grid",gap:10}}>
                {monthBookings.sort((a,b)=>a.date>b.date?1:-1).map((b,idx)=>(
                  <div key={idx} style={{background:"#fff",borderRadius:12,border:"1px solid rgba(44,44,44,0.08)",padding:"14px 16px",opacity:b.status==="已取消"?0.55:1,boxShadow:"0 1px 6px rgba(44,44,44,0.05)"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                      <div>
                        <div style={{fontSize:14,fontWeight:500}}>{b.service}</div>
                        <div style={{fontSize:11,color:"rgba(44,44,44,0.45)",marginTop:1}}>{b.date} · {b.locationType} · {b.persons||"1"} 人</div>
                      </div>
                      <StatusBadge status={b.status==="已確認付款"?"paid":b.status==="已取消"?"cancelled":"pending"}/>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"3px 10px",marginBottom:8}}>
                      {[["姓名",b.name],["電話",b.phone],["LINE",b.lineId],["性別",b.gender],["訂金",b.thisDeposit||b.deposit],["總費用",b.totalPrice]].map(([k,v])=>v?(
                        <div key={k} style={{fontSize:11}}><span style={{color:"rgba(44,44,44,0.4)"}}>{k}：</span><span style={{color:"rgba(44,44,44,0.7)"}}>{v}</span></div>
                      ):null)}
                    </div>
                    {b.addons && <div style={{fontSize:11,color:"rgba(44,44,44,0.55)",marginBottom:6}}>加購：{b.addons}</div>}
                    {b.note && <div style={{fontSize:11,color:"rgba(44,44,44,0.4)",fontStyle:"italic",marginBottom:8}}>備註：{b.note}</div>}
                    {b.status!=="已取消" && (
                      <button onClick={()=>cancelBooking(b)} style={{padding:"6px 12px",background:"rgba(200,80,80,0.08)",border:"1px solid rgba(200,80,80,0.2)",borderRadius:7,color:"#c04040",fontSize:11.5,cursor:"pointer",fontFamily:"inherit"}}>取消預約</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── 產生連結 ── */}
        {tab==="link" && (
          <div>
            <h2 style={{fontSize:17,fontWeight:500,margin:"0 0 16px"}}>產生專屬預約連結</h2>
            <div style={{background:"#fff",borderRadius:16,border:"1px solid rgba(44,44,44,0.08)",padding:"24px 20px",boxShadow:"0 2px 12px rgba(44,44,44,0.06)"}}>
              <div style={{display:"grid",gap:14}}>
                {/* 服務項目下拉 */}
                <div>
                  <FieldLabel label="服務項目"/>
                  <select value={linkForm.service} onChange={e=>setLinkForm(p=>({...p,service:e.target.value}))} style={{...inputStyle,cursor:"pointer",colorScheme:"light"}}>
                    <option value="">請選擇服務項目</option>
                    {SERVICES.map(s=><option key={s.id} value={s.name}>{s.icon} {s.name}</option>)}
                  </select>
                </div>
                {/* 加購項目 */}
                <div>
                  <FieldLabel label="加購項目（可複選）"/>
                  <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
                    {ADDONS.map(a=>{
                      const sel=linkForm.addons.includes(a.name);
                      return <button key={a.id} onClick={()=>setLinkForm(p=>({...p,addons:sel?p.addons.filter(x=>x!==a.name):[...p.addons,a.name]}))} style={{padding:"7px 12px",border:`1px solid ${sel?"#2c2c2c":"#dedad4"}`,borderRadius:20,cursor:"pointer",fontFamily:"inherit",fontSize:12.5,background:sel?"rgba(44,44,44,0.08)":"#faf8f5",color:sel?"#2c2c2c":"rgba(44,44,44,0.55)"}}>{a.icon} {a.name}</button>;
                    })}
                  </div>
                </div>
                {/* 費用欄位 */}
                {[{k:"totalPrice",l:"總費用（NT$）",ph:"例：10000"},{k:"deposit",l:"本次訂金（NT$）",ph:"例：500"},{k:"travel",l:"到府交通費（NT$）",ph:"例：500，無則留空"},{k:"note",l:"備註",ph:"例：含試妝"}].map(f=>(
                  <div key={f.k}>
                    <FieldLabel label={f.l}/>
                    <input value={linkForm[f.k]} onChange={e=>setLinkForm(p=>({...p,[f.k]:e.target.value}))} placeholder={f.ph} style={inputStyle} onFocus={e=>e.target.style.borderColor="#2c2c2c"} onBlur={e=>e.target.style.borderColor="#dedad4"}/>
                  </div>
                ))}
                <button onClick={generateLink} style={{padding:"13px",background:"linear-gradient(135deg,#2c2c2c,#1a1a1a)",border:"none",borderRadius:10,color:"#fff",fontSize:14,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 14px rgba(44,44,44,0.18)"}}>產生專屬連結</button>
                {generatedLink && (
                  <div style={{background:"#faf8f5",border:"1px solid #dedad4",borderRadius:9,padding:"14px 16px"}}>
                    <div style={{fontSize:11,color:"rgba(44,44,44,0.45)",marginBottom:6}}>專屬連結（複製後傳給客人）</div>
                    <div style={{fontSize:11.5,color:"#2c2c2c",wordBreak:"break-all",marginBottom:10}}>{generatedLink}</div>
                    <button onClick={()=>{navigator.clipboard?.writeText(generatedLink).catch(()=>{});setCopied(true);setTimeout(()=>setCopied(false),2000);}} style={{padding:"8px 16px",background:copied?"rgba(100,180,100,0.12)":"rgba(44,44,44,0.07)",border:`1px solid ${copied?"rgba(100,180,100,0.3)":"rgba(44,44,44,0.15)"}`,borderRadius:7,color:copied?"#3a9a3a":"#2c2c2c",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
                      {copied?"✓ 已複製":"複製連結"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── 預約須知 ── */}
        {tab==="notices" && (
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <h2 style={{fontSize:17,fontWeight:500,margin:0}}>預約須知編輯</h2>
              {!editNotices ? (
                <button onClick={()=>{setDraftNotices(notices);setEditNotices(true);}} style={{padding:"7px 14px",background:"rgba(44,44,44,0.07)",border:"1px solid rgba(44,44,44,0.15)",borderRadius:8,color:"#2c2c2c",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>✏️ 編輯</button>
              ) : (
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>setEditNotices(false)} style={{padding:"7px 14px",background:"#faf8f5",border:"1px solid #dedad4",borderRadius:8,color:"rgba(44,44,44,0.55)",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>取消</button>
                  <button onClick={saveNotices} style={{padding:"7px 14px",background:"linear-gradient(135deg,#2c2c2c,#1a1a1a)",border:"none",borderRadius:8,color:"#fff",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>儲存</button>
                </div>
              )}
            </div>
            <div style={{background:"#fff",borderRadius:16,border:"1px solid rgba(44,44,44,0.08)",padding:"20px",boxShadow:"0 2px 12px rgba(44,44,44,0.06)"}}>
              {editNotices ? (
                <div style={{display:"grid",gap:10}}>
                  {draftNotices.map((n,i)=>(
                    <div key={i} style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                      <textarea value={n} onChange={e=>setDraftNotices(p=>p.map((x,j)=>j===i?e.target.value:x))} rows={3}
                        style={{flex:1,padding:"10px 12px",background:"#faf8f5",border:"1px solid #dedad4",borderRadius:8,color:"#2c2c2c",fontSize:13,fontFamily:"inherit",outline:"none",resize:"vertical"}}
                        onFocus={e=>e.target.style.borderColor="#2c2c2c"} onBlur={e=>e.target.style.borderColor="#dedad4"}
                      />
                      <button onClick={()=>setDraftNotices(p=>p.filter((_,j)=>j!==i))} style={{padding:"8px 10px",background:"rgba(200,80,80,0.08)",border:"1px solid rgba(200,80,80,0.2)",borderRadius:7,color:"#c04040",fontSize:12,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>刪除</button>
                    </div>
                  ))}
                  <button onClick={()=>setDraftNotices(p=>[...p,""])} style={{padding:"10px",background:"rgba(44,44,44,0.05)",border:"1px dashed rgba(44,44,44,0.2)",borderRadius:8,color:"rgba(44,44,44,0.5)",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>+ 新增一條</button>
                </div>
              ) : (
                <div style={{display:"grid",gap:10}}>
                  {notices.map((n,i)=>(
                    <div key={i} style={{fontSize:13.5,color:"rgba(44,44,44,0.7)",lineHeight:1.8,padding:"12px 16px",background:"#faf8f5",borderRadius:9,border:"1px solid #dedad4"}}>{n}</div>
                  ))}
                  <Divider/>
                  <div style={{fontSize:12,color:"rgba(44,44,44,0.4)",textAlign:"center"}}>LINE 官方帳號 {LINE_ID}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── 數據報表 ── */}
        {tab==="stats" && (
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <h2 style={{fontSize:17,fontWeight:500,margin:0}}>數據報表</h2>
              <button onClick={fetchBookings} style={{padding:"7px 14px",background:"rgba(44,44,44,0.07)",border:"1px solid rgba(44,44,44,0.15)",borderRadius:8,color:"#2c2c2c",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>🔄 更新</button>
            </div>
            {/* 總計 */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
              {[["總預約數",totalCount+" 筆"],["預估總收入",totalRevenue?`NT$ ${totalRevenue.toLocaleString()}`:"—"]].map(([k,v])=>(
                <div key={k} style={{background:"#fff",borderRadius:12,border:"1px solid rgba(44,44,44,0.08)",padding:"16px",textAlign:"center",boxShadow:"0 1px 6px rgba(44,44,44,0.05)"}}>
                  <div style={{fontSize:11,color:"rgba(44,44,44,0.4)",marginBottom:6}}>{k}</div>
                  <div style={{fontSize:22,fontWeight:500,color:"#2c2c2c"}}>{v}</div>
                </div>
              ))}
            </div>
            {/* 每月明細 */}
            <div style={{background:"#fff",borderRadius:16,border:"1px solid rgba(44,44,44,0.08)",overflow:"hidden",boxShadow:"0 2px 12px rgba(44,44,44,0.06)"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",padding:"10px 16px",background:"rgba(44,44,44,0.05)",borderBottom:"1px solid rgba(44,44,44,0.08)"}}>
                {["月份","預約數","預估收入"].map(h=><div key={h} style={{fontSize:11,color:"rgba(44,44,44,0.45)",fontWeight:500}}>{h}</div>)}
              </div>
              {months.length===0 ? (
                <div style={{padding:"30px",textAlign:"center",color:"rgba(44,44,44,0.35)",fontSize:13}}>尚無資料</div>
              ) : months.map(m=>(
                <div key={m} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",padding:"12px 16px",borderBottom:"1px solid #ede9e3"}}>
                  <div style={{fontSize:13,color:"#2c2c2c"}}>{m}</div>
                  <div style={{fontSize:13,color:"#2c2c2c"}}>{byMonth[m].count} 筆</div>
                  <div style={{fontSize:13,color:"#2c2c2c"}}>{byMonth[m].revenue?`NT$ ${byMonth[m].revenue.toLocaleString()}`:"—"}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function BookingSystem() {
  const [isAdmin,setIsAdmin]         = useState(false);
  const [showAdminLogin,setShowAdminLogin] = useState(false);
  const [adminPw,setAdminPw]         = useState("");
  const [adminErr,setAdminErr]       = useState("");

  const [step,setStep]               = useState(0); // 0=須知, 1-4=流程
  const [form,setForm]               = useState({
    name:"",phone:"",lineId:"",date:"",time:"",gender:"",
    serviceId:null,persons:"1",locationType:"",address:"",
    note:"",totalPrice:"",thisDeposit:"",travel:"",clientNote:"",
    prefillService:"",prefillAddons:[],prefillTotalPrice:"",prefillDeposit:"",prefillTravel:"",prefillNote:"",
  });
  const [selectedAddons,setSelectedAddons] = useState([]);
  const [consents,setConsents]       = useState({privacy:false,portrait:false});
  const [errors,setErrors]           = useState({});
  const [bookings,setBookings]       = useState([]);
  const [tab,setTab]                 = useState("book");
  const [done,setDone]               = useState(null);
  const [payTarget,setPayTarget]     = useState(null);
  const [trans,setTrans]             = useState(false);
  const [showWedding,setShowWedding] = useState(false);
  const [showNotice,setShowNotice]   = useState(true);
  const [notices,setNotices]         = useState(()=>{
    try { return JSON.parse(localStorage.getItem("shiin_notices")||"null")||BOOKING_NOTICES_DEFAULT; } catch { return BOOKING_NOTICES_DEFAULT; }
  });

  useEffect(()=>{
    try { const s=localStorage.getItem(STORAGE_KEY); if(s) setBookings(JSON.parse(s)); } catch {}
    const params=new URLSearchParams(window.location.search);
    if (params.get("service")||params.get("totalPrice")) {
      const addonsParam = params.get("addons")||"";
      const addonsArr   = addonsParam ? addonsParam.split(",") : [];
      const matchedSvc  = SERVICES.find(s=>s.name===params.get("service"));
      const matchedAddons = ADDONS.filter(a=>addonsArr.includes(a.name));
      setForm(p=>({
        ...p,
        serviceId:       matchedSvc?.id||null,
        prefillService:  params.get("service")||"",
        prefillAddons:   addonsArr,
        prefillTotalPrice: params.get("totalPrice")||"",
        prefillDeposit:  params.get("deposit")||"",
        prefillTravel:   params.get("travel")||"",
        prefillNote:     params.get("note")||"",
        thisDeposit:     params.get("deposit")||"",
        totalPrice:      params.get("totalPrice")||"",
        travel:          params.get("travel")||"",
      }));
      if (matchedAddons.length) setSelectedAddons(matchedAddons);
    }
  },[]);

  // 監聽 notices 變更
  useEffect(()=>{
    const saved = localStorage.getItem("shiin_notices");
    if (saved) try { setNotices(JSON.parse(saved)); } catch {}
  },[]);

  const persist=(list)=>{ try { localStorage.setItem(STORAGE_KEY,JSON.stringify(list)); } catch {} };

  const sendToSheet=async(booking)=>{
    if (!WEBHOOK_URL) return;
    const svc=SERVICES.find(s=>s.id===booking.serviceId);
    try {
      await fetch(WEBHOOK_URL,{method:"POST",mode:"no-cors",headers:{"Content-Type":"text/plain"},body:JSON.stringify({
        createdAt:   booking.createdAt,
        service:     svc?.name||"",
        datetime:    (booking.date||"")+" "+(booking.time||""),
        locationType:booking.locationType,
        address:     booking.locationType==="到府服務"?booking.address:STUDIO_ADDRESS,
        name:        booking.name,
        gender:      booking.gender||"",
        phone:       booking.phone,
        lineId:      booking.lineId,
        addons:      (booking.addons||[]).map(a=>a.name).join("、"),
        deposit:     booking.thisDeposit||"NT$ 500",
        price:       booking.totalPrice||"（依諮詢確認）",
        status:      booking.status==="paid"?"已確認付款":booking.status==="cancelled"?"已取消":"待確認匯款",
        last5:       booking.last5||"",
        note:        [booking.clientNote,booking.prefillNote].filter(Boolean).join(" / "),
        totalPrice:  booking.totalPrice||"",
        thisDeposit: booking.thisDeposit||"",
        travel:      booking.travel||"",
        persons:     booking.persons||"1",
      })});
    } catch {}
  };

  const go=(fn)=>{ setTrans(true); setTimeout(()=>{ fn(); setTrans(false); },170); };

  const validateStep1=()=>{
    const e={};
    if (!form.name.trim())                        e.name="請填寫姓名";
    if (form.phone.replace(/\D/g,"").length<8)    e.phone="請填寫有效電話";
    if (!form.gender)                             e.gender="請選擇性別";
    if (!form.lineId.trim())                      e.lineId="請填寫 LINE 上的名稱";
    if (!form.date)                               e.date="請選擇預約日期";
    if (!form.time)                               e.time="請選擇預約時段";
    if (!form.serviceId)                          e.serviceId="請選擇服務項目";
    if (!form.locationType)                       e.locationType="請選擇梳化地點";
    if (form.locationType==="到府服務"&&!form.address.trim()) e.address="請填寫到府地址";
    setErrors(e);
    return Object.keys(e).length===0;
  };

  const validateStep2=()=>{
    if (!consents.privacy) { setErrors({privacy:"請同意隱私權政策以繼續"}); return false; }
    return true;
  };

  const handleBook=()=>{
    const nb={id:Date.now(),...form,addons:selectedAddons,status:"pending",createdAt:new Date().toLocaleString("zh-TW")};
    const updated=[nb,...bookings];
    setBookings(updated);
    persist(updated);
    setDone(nb);
    sendToSheet(nb);
    go(()=>setStep(4));
  };

  const handlePaySuccess=async(last5)=>{
    const updated=bookings.map(b=>b.id===payTarget.id?{...b,status:"paid",last5}:b);
    setBookings(updated);
    persist(updated);
    const paid=updated.find(b=>b.id===payTarget.id);
    await sendToSheet(paid);
    setPayTarget(null);
    if (done?.id===payTarget.id) setDone({...done,status:"paid",last5});
  };

  const cancelBooking=(id)=>{
    const updated=bookings.map(b=>b.id===id?{...b,status:"cancelled"}:b);
    setBookings(updated);
    persist(updated);
    const c=updated.find(b=>b.id===id);
    if(c) sendToSheet(c);
  };

  const resetAll=()=>{
    setForm({name:"",phone:"",lineId:"",date:"",time:"",gender:"",serviceId:null,persons:"1",locationType:"",address:"",note:"",totalPrice:"",thisDeposit:"",travel:"",clientNote:"",prefillService:"",prefillAddons:[],prefillTotalPrice:"",prefillDeposit:"",prefillTravel:"",prefillNote:""});
    setSelectedAddons([]);setConsents({privacy:false,portrait:false});
    setErrors({});setStep(1);setDone(null);setTab("book");
  };

  const svc     = SERVICES.find(s=>s.id===form.serviceId);
  const doneSvc = done?SERVICES.find(s=>s.id===done.serviceId):null;
  const setF    = (key)=>(e)=>setForm(p=>({...p,[key]:e.target.value}));
  const STEP_LABELS=["填寫資料","同意書","確認預約","完成"];
  const thisMonthStr = thisMonth();
  const monthBookings = bookings.filter(b=>b.date&&b.date.startsWith(thisMonthStr));

  // Admin login
  const handleAdminLogin=()=>{ if(adminPw===ADMIN_PASS){setIsAdmin(true);setShowAdminLogin(false);setAdminPw("");}else{setAdminErr("密碼錯誤");} };

  // Show admin panel
  if (isAdmin) return <AdminPanel onLogout={()=>setIsAdmin(false)} webhookUrl={WEBHOOK_URL}/>;

  return (
    <div style={{minHeight:"100vh",background:"#f5f2ee",fontFamily:"'Noto Serif TC','Georgia',serif",color:"#2c2c2c"}}>
      <div style={{maxWidth:680,margin:"0 auto",padding:"28px 18px 80px",position:"relative",zIndex:1}}>

        {/* Logo */}
        <header style={{textAlign:"center",marginBottom:30}}>
          <p style={{fontSize:10,letterSpacing:"0.45em",color:"rgba(44,44,44,0.45)",margin:"0 0 6px",textTransform:"uppercase"}}>{SALON_EN}</p>
          <h1 style={{fontSize:"clamp(26px,6vw,40px)",fontWeight:300,margin:0,color:"#2c2c2c",letterSpacing:"0.08em"}}>{SALON_NAME}</h1>
          <div style={{width:48,height:1,background:"linear-gradient(90deg,transparent,#2c2c2c,transparent)",margin:"10px auto 0"}}/>
        </header>

        {/* Tabs */}
        <div style={{display:"flex",background:"#ede9e3",borderRadius:12,padding:4,marginBottom:16,gap:4}}>
          {[{k:"book",l:"預約資訊"},{k:"records",l:`我的預約${bookings.length?` (${bookings.length})`:""}`},{k:"month",l:"本月預約"},{k:"notice",l:"預約須知"}].map(t=>(
            <button key={t.k} onClick={()=>setTab(t.k)} style={{flex:1,padding:"10px 4px",border:"none",borderRadius:9,background:tab===t.k?"#fff":"transparent",color:tab===t.k?"#2c2c2c":"rgba(44,44,44,0.45)",fontSize:12,cursor:"pointer",fontFamily:"inherit",boxShadow:tab===t.k?"0 1px 4px rgba(44,44,44,0.1)":"none"}}>{t.l}</button>
          ))}
        </div>

        {/* Admin button */}
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}>
          <button onClick={()=>setShowAdminLogin(true)} style={{padding:"6px 12px",background:"rgba(44,44,44,0.04)",border:"1px solid rgba(44,44,44,0.1)",borderRadius:7,color:"rgba(44,44,44,0.4)",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>公司端</button>
        </div>

        {/* Prefill banner */}
        {(form.prefillService||form.prefillTotalPrice)&&tab==="book"&&!done&&step>=1&&(
          <div style={{background:"rgba(44,44,44,0.05)",border:"1px solid rgba(44,44,44,0.1)",borderRadius:10,padding:"12px 16px",marginBottom:14,fontSize:13}}>
            <div style={{fontWeight:500,marginBottom:4}}>📋 已為您預填確認資訊</div>
            <div style={{color:"rgba(44,44,44,0.6)",fontSize:12,display:"flex",flexWrap:"wrap",gap:"4px 12px"}}>
              {form.prefillService&&<span>服務：{form.prefillService}</span>}
              {form.prefillTotalPrice&&<span>總費用：NT$ {form.prefillTotalPrice}</span>}
              {form.prefillDeposit&&<span>訂金：NT$ {form.prefillDeposit}</span>}
              {form.prefillTravel&&<span>交通費：NT$ {form.prefillTravel}</span>}
              {form.prefillAddons.length>0&&<span>加購：{form.prefillAddons.join("、")}</span>}
            </div>
          </div>
        )}

        {/* ══ BOOK TAB ══ */}
        {tab==="book"&&!done&&(
          <>
            {step===0 ? (
              // 須知頁
              <div style={{background:"#fff",borderRadius:16,border:"1px solid rgba(44,44,44,0.08)",padding:"24px 20px",boxShadow:"0 2px 12px rgba(44,44,44,0.06)"}}>
                <h2 style={{fontSize:16,fontWeight:500,margin:"0 0 16px",color:"#2c2c2c"}}>預約須知</h2>
                {notices.map((n,i)=>(
                  <div key={i} style={{fontSize:13.5,color:"rgba(44,44,44,0.7)",lineHeight:1.8,marginBottom:i<notices.length-1?12:0,padding:"12px 16px",background:"#faf8f5",borderRadius:9,border:"1px solid #dedad4"}}>{n}</div>
                ))}
                <Divider/>
                <div style={{fontSize:12,color:"rgba(44,44,44,0.4)",textAlign:"center",marginBottom:16}}>如有任何疑問，歡迎透過 LINE 官方帳號 {LINE_ID} 與我們聯繫 🤍</div>
                <button onClick={()=>go(()=>setStep(1))} style={{width:"100%",padding:"14px",background:"linear-gradient(135deg,#2c2c2c,#1a1a1a)",border:"none",borderRadius:10,color:"#fff",fontSize:15,cursor:"pointer",fontFamily:"inherit",letterSpacing:"0.04em",boxShadow:"0 4px 14px rgba(44,44,44,0.18)"}}>我已了解，開始預約 →</button>
              </div>
            ) : (
              <>
                {/* Step bar */}
                <div style={{display:"flex",alignItems:"flex-start",marginBottom:22}}>
                  {STEP_LABELS.map((lbl,i)=>{
                    const n=i+1;const active=step===n;const isDone=step>n;
                    return (
                      <div key={i} style={{display:"flex",alignItems:"flex-start",flex:i<3?1:"none"}}>
                        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                          <div style={{width:28,height:28,borderRadius:"50%",background:isDone?"#2c2c2c":active?"rgba(44,44,44,0.12)":"rgba(44,44,44,0.05)",border:`1.5px solid ${isDone||active?"#2c2c2c":"rgba(44,44,44,0.15)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:isDone?"#fff":active?"#2c2c2c":"rgba(44,44,44,0.3)",transition:"all 0.3s"}}>{isDone?"✓":n}</div>
                          <span style={{fontSize:9.5,color:active?"#2c2c2c":"rgba(44,44,44,0.35)",whiteSpace:"nowrap"}}>{lbl}</span>
                        </div>
                        {i<3&&<div style={{flex:1,height:1,margin:"14px 4px 0",background:isDone?"#2c2c2c":"rgba(44,44,44,0.12)",transition:"background 0.3s"}}/>}
                      </div>
                    );
                  })}
                </div>

                {/* Card */}
                <div style={{background:"#fff",borderRadius:16,border:"1px solid rgba(44,44,44,0.08)",padding:"24px 20px",opacity:trans?0:1,transform:trans?"translateY(6px)":"translateY(0)",transition:"opacity 0.17s,transform 0.17s",boxShadow:"0 2px 12px rgba(44,44,44,0.06)"}}>

                  {/* Step 1 */}
                  {step===1&&(
                    <div style={{display:"grid",gap:16}}>
                      <h2 style={{fontSize:16,fontWeight:500,margin:"0 0 4px",color:"#2c2c2c"}}>填寫預約資料</h2>

                      {/* 姓名+電話 */}
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                        <div><FieldLabel label="姓名" required/><TInput value={form.name} onChange={setF("name")} placeholder="請填寫姓名" error={errors.name}/></div>
                        <div><FieldLabel label="電話" required/><TInput value={form.phone} onChange={setF("phone")} type="tel" placeholder="請填寫電話" error={errors.phone}/></div>
                      </div>

                      {/* 性別 */}
                      <div>
                        <FieldLabel label="性別" required/>
                        {errors.gender&&<div style={{color:"#e07070",fontSize:11.5,marginBottom:6}}>{errors.gender}</div>}
                        <div style={{display:"flex",gap:10}}>
                          {GENDERS.map(g=><button key={g} onClick={()=>{setForm(p=>({...p,gender:g}));setErrors(p=>({...p,gender:undefined}));}} style={btnStyle(form.gender===g)}>{g}</button>)}
                        </div>
                      </div>

                      {/* LINE */}
                      <div><FieldLabel label="LINE 用戶名稱" required/><TInput value={form.lineId} onChange={setF("lineId")} placeholder="請填寫 LINE 上的名稱" error={errors.lineId}/></div>

                      {/* 預約人數 */}
                      <div>
                        <FieldLabel label="預約人數" required/>
                        <div style={{display:"flex",gap:8}}>
                          {["1","2","3","4","5+"].map(n=><button key={n} onClick={()=>setForm(p=>({...p,persons:n}))} style={{...btnStyle(form.persons===n),flex:1,padding:"10px 4px",fontSize:13}}>{n}</button>)}
                        </div>
                      </div>

                      {/* 日期 */}
                      <div>
                        <FieldLabel label="預約日期" required/>
                        {errors.date&&<div style={{color:"#e07070",fontSize:11.5,marginBottom:6}}>{errors.date}</div>}
                        <div style={{position:"relative"}}>
                          {!form.date&&<div style={{position:"absolute",top:"50%",left:13,transform:"translateY(-50%)",color:"rgba(44,44,44,0.35)",fontSize:14,pointerEvents:"none",zIndex:1}}>請選擇日期 📅</div>}
                          <input type="date" value={form.date} onChange={e=>{setForm(p=>({...p,date:e.target.value}));setErrors(p=>({...p,date:undefined}));}} min={todayStr()}
                            style={{width:"100%",padding:"11px 13px",background:"#faf8f5",border:`1px solid ${errors.date?"rgba(200,80,80,0.4)":"#dedad4"}`,borderRadius:8,color:form.date?"#2c2c2c":"rgba(44,44,44,0.35)",fontSize:14,fontFamily:"inherit",outline:"none",boxSizing:"border-box",colorScheme:"light",accentColor:"#2c2c2c",minHeight:46,display:"block"}}
                            onFocus={e=>e.target.style.borderColor="#2c2c2c"} onBlur={e=>e.target.style.borderColor=errors.date?"rgba(200,80,80,0.4)":"#dedad4"}
                          />
                        </div>
                      </div>

                      {/* 時段 */}
                      <div>
                        <FieldLabel label="預約時段" required/>
                        {errors.time&&<div style={{color:"#e07070",fontSize:11.5,marginBottom:6}}>{errors.time}</div>}
                        <select value={form.time} onChange={e=>{setForm(p=>({...p,time:e.target.value}));setErrors(p=>({...p,time:undefined}));}}
                          style={{width:"100%",padding:"11px 13px",background:"#faf8f5",border:`1px solid ${errors.time?"rgba(200,80,80,0.4)":"#dedad4"}`,borderRadius:8,color:form.time?"#2c2c2c":"rgba(44,44,44,0.35)",fontSize:14,fontFamily:"inherit",outline:"none",boxSizing:"border-box",colorScheme:"light",cursor:"pointer"}}
                          onFocus={e=>e.target.style.borderColor="#2c2c2c"} onBlur={e=>e.target.style.borderColor=errors.time?"rgba(200,80,80,0.4)":"#dedad4"}
                        >
                          <option value="" disabled>請選擇時段</option>
                          {TIME_SLOTS_LIST.map(t=><option key={t} value={t} style={{background:"#fff",color:"#2c2c2c"}}>{t}</option>)}
                        </select>
                      </div>

                      {/* 服務項目 */}
                      <div>
                        <FieldLabel label="服務項目" required/>
                        {errors.serviceId&&<div style={{color:"#e07070",fontSize:11.5,marginBottom:6}}>{errors.serviceId}</div>}
                        <div style={{display:"grid",gap:7}}>
                          {SERVICES.map(s=>{
                            const sel=form.serviceId===s.id;
                            const prefilled=form.prefillService===s.name;
                            return (
                              <button key={s.id} onClick={()=>{if(s.isWedding)setShowWedding(true);setForm(p=>({...p,serviceId:s.id}));setErrors(p=>({...p,serviceId:undefined}));}}
                                style={{display:"flex",alignItems:"center",padding:"11px 14px",background:sel?"rgba(44,44,44,0.07)":"#faf8f5",border:`1px solid ${sel?"#2c2c2c":prefilled?"rgba(44,44,44,0.3)":"#dedad4"}`,borderRadius:10,cursor:"pointer",color:"#2c2c2c",fontFamily:"inherit",transition:"all 0.2s",textAlign:"left",width:"100%"}}>
                                <span style={{fontSize:18,marginRight:11}}>{s.icon}</span>
                                <div style={{flex:1}}>
                                  <div style={{fontSize:13,fontWeight:sel?500:400}}>{s.name}{prefilled&&!sel&&<span style={{fontSize:10,color:"rgba(44,44,44,0.45)",marginLeft:6}}>（已確認）</span>}</div>
                                  <div style={{fontSize:10.5,color:"rgba(44,44,44,0.45)",marginTop:1}}>{s.note}</div>
                                </div>
                                {s.isWedding&&<span style={{fontSize:11,color:"rgba(44,44,44,0.4)",marginLeft:8}}>ℹ️</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 加購項目 */}
                      <div>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                          <FieldLabel label="加購項目"/>
                          <span style={{fontSize:10.5,color:"rgba(44,44,44,0.35)"}}>可複選，也可略過</span>
                        </div>
                        {selectedAddons.length>0&&<div style={{fontSize:12,color:"#2c2c2c",marginBottom:8,fontWeight:500}}>已選 {selectedAddons.length} 項</div>}
                        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                          {ADDONS.map(a=>{
                            const sel=!!selectedAddons.find(x=>x.id===a.id);
                            const prefilled=form.prefillAddons.includes(a.name);
                            return <button key={a.id} onClick={()=>setSelectedAddons(prev=>sel?prev.filter(x=>x.id!==a.id):[...prev,a])} style={{padding:"9px 14px",border:`1px solid ${sel?"#2c2c2c":prefilled?"rgba(44,44,44,0.3)":"#dedad4"}`,borderRadius:20,cursor:"pointer",fontFamily:"inherit",fontSize:13,background:sel?"rgba(44,44,44,0.08)":"#faf8f5",color:sel?"#2c2c2c":"rgba(44,44,44,0.55)",display:"flex",alignItems:"center",gap:5}}><span>{a.icon}</span>{a.name}</button>;
                          })}
                        </div>
                      </div>

                      {/* 梳化地點 */}
                      <div>
                        <FieldLabel label="梳化地點" required/>
                        {errors.locationType&&<div style={{color:"#e07070",fontSize:11.5,marginBottom:6}}>{errors.locationType}</div>}
                        <div style={{display:"flex",gap:10,marginBottom:form.locationType?10:0}}>
                          {["工作室梳化","到府服務"].map(opt=>(
                            <button key={opt} onClick={()=>{setForm(p=>({...p,locationType:opt,address:""}));setErrors(p=>({...p,locationType:undefined,address:undefined}));}} style={btnStyle(form.locationType===opt)}>
                              {opt==="工作室梳化"?"🏠 工作室梳化":"🚗 到府服務"}
                            </button>
                          ))}
                        </div>
                        {form.locationType==="工作室梳化"&&<div style={{fontSize:11.5,color:"rgba(44,44,44,0.5)",padding:"8px 12px",background:"rgba(44,44,44,0.04)",borderRadius:7,border:"1px solid rgba(44,44,44,0.08)"}}>📍 {STUDIO_ADDRESS}</div>}
                        {form.locationType==="到府服務"&&<TInput value={form.address} onChange={setF("address")} placeholder="請填寫到府地址" error={errors.address}/>}
                      </div>

                      {/* 公司填寫欄位（預填時顯示） */}
                      {(form.prefillTotalPrice||form.prefillDeposit||form.prefillTravel)&&(
                        <div style={{background:"rgba(44,44,44,0.04)",border:"1px solid rgba(44,44,44,0.1)",borderRadius:10,padding:"14px 16px"}}>
                          <div style={{fontSize:11,color:"rgba(44,44,44,0.45)",marginBottom:10,fontWeight:500}}>📋 確認費用明細</div>
                          {[form.prefillTotalPrice&&["總費用",`NT$ ${form.prefillTotalPrice}`],form.prefillDeposit&&["本次訂金",`NT$ ${form.prefillDeposit}`],form.prefillTravel&&["到府交通費",`NT$ ${form.prefillTravel}`]].filter(Boolean).map(([k,v])=>(
                            <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid rgba(44,44,44,0.06)",fontSize:13}}>
                              <span style={{color:"rgba(44,44,44,0.5)"}}>{k}</span>
                              <span style={{color:"#2c2c2c",fontWeight:500}}>{v}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 客人備註 */}
                      <div>
                        <FieldLabel label="備註（選填）"/>
                        <textarea value={form.clientNote} onChange={setF("clientNote")} rows={3} placeholder="如有特殊需求請告知…"
                          style={{width:"100%",padding:"11px 13px",background:"#faf8f5",border:"1px solid #dedad4",borderRadius:8,color:"#2c2c2c",fontSize:14,fontFamily:"inherit",outline:"none",resize:"none",boxSizing:"border-box"}}
                          onFocus={e=>e.target.style.borderColor="#2c2c2c"} onBlur={e=>e.target.style.borderColor="#dedad4"}
                        />
                      </div>
                    </div>
                  )}

                  {/* Step 2 */}
                  {step===2&&(
                    <div>
                      <h2 style={{fontSize:16,fontWeight:500,margin:"0 0 6px",color:"#2c2c2c"}}>同意書</h2>
                      <p style={{fontSize:12.5,color:"rgba(44,44,44,0.5)",margin:"0 0 20px"}}>請詳閱以下同意事項。</p>
                      {errors.privacy&&<div style={{color:"#e07070",fontSize:12,marginBottom:12,padding:"8px 12px",background:"rgba(200,80,80,0.06)",borderRadius:8}}>{errors.privacy}</div>}
                      {[
                        {key:"privacy",title:"隱私權政策同意",icon:"🔒",required:true,content:"本人同意拾形造型蒐集、處理及利用本人所提供之個人資料（包含姓名、電話、LINE 用戶名稱），僅供預約確認及服務聯繫使用，不會提供予第三方。"},
                        {key:"portrait",title:"肖像權授權同意",icon:"📸",required:false,content:"本人同意拾形造型得將梳化過程及成果照片，用於社群媒體（如 Instagram）及作品集展示。若不同意使用，請勿勾選。"},
                      ].map(item=>(
                        <div key={item.key} onClick={()=>setConsents(p=>({...p,[item.key]:!p[item.key]}))}
                          style={{cursor:"pointer",background:consents[item.key]?"rgba(44,44,44,0.05)":"#faf8f5",border:`1px solid ${consents[item.key]?"#2c2c2c":"#dedad4"}`,borderRadius:12,padding:"16px",marginBottom:12,transition:"all 0.2s"}}>
                          <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                            <div style={{width:22,height:22,borderRadius:5,background:consents[item.key]?"#2c2c2c":"transparent",border:`1.5px solid ${consents[item.key]?"#2c2c2c":"#dedad4"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"#fff",flexShrink:0,marginTop:1}}>{consents[item.key]?"✓":""}</div>
                            <div>
                              <div style={{fontSize:14,fontWeight:500,marginBottom:4,color:"#2c2c2c"}}>{item.icon} {item.title}{item.required&&<span style={{color:"#c04040",fontSize:11,marginLeft:6}}>必填</span>}{!item.required&&<span style={{color:"rgba(44,44,44,0.4)",fontSize:11,marginLeft:6}}>選填</span>}</div>
                              <div style={{fontSize:12,color:"rgba(44,44,44,0.55)",lineHeight:1.7}}>{item.content}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Step 3 */}
                  {step===3&&(
                    <div>
                      <h2 style={{fontSize:16,fontWeight:500,margin:"0 0 6px",color:"#2c2c2c"}}>確認預約資訊</h2>
                      <p style={{fontSize:12.5,color:"rgba(44,44,44,0.5)",margin:"0 0 18px"}}>確認後請完成匯款訂金，預約即成立。</p>
                      <div style={{background:"#faf8f5",border:"1px solid #dedad4",borderRadius:10,overflow:"hidden",marginBottom:16}}>
                        {[
                          ["服務",`${svc?.icon} ${svc?.name}`],
                          ["預約日期",form.date],["預約時段",form.time],["預約人數",form.persons+" 人"],
                          ["梳化地點",form.locationType],
                          ...(form.locationType==="到府服務"?[["到府地址",form.address]]:[]),
                          ["姓名",form.name],["電話",form.phone],["LINE",form.lineId],
                          ...(form.prefillTotalPrice?[["總費用",`NT$ ${form.prefillTotalPrice}`]]:[]),
                          ...(form.prefillTravel?[["到府交通費",`NT$ ${form.prefillTravel}`]]:[]),
                          ["本次訂金",form.prefillDeposit?`NT$ ${form.prefillDeposit}`:"NT$ 500"],
                        ].map(([k,v],i,arr)=>(
                          <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",borderBottom:i<arr.length-1?"1px solid #ede9e3":"none"}}>
                            <span style={{fontSize:11.5,color:"rgba(44,44,44,0.45)"}}>{k}</span>
                            <span style={{fontSize:13,color:"#2c2c2c",textAlign:"right",marginLeft:12,fontWeight:k==="本次訂金"?500:400}}>{v}</span>
                          </div>
                        ))}
                        {selectedAddons.length>0&&(
                          <div style={{display:"flex",justifyContent:"space-between",padding:"10px 14px"}}>
                            <span style={{fontSize:11.5,color:"rgba(44,44,44,0.45)"}}>加購項目</span>
                            <span style={{fontSize:12.5,color:"#2c2c2c",textAlign:"right"}}>{selectedAddons.map(a=>a.name).join("、")}</span>
                          </div>
                        )}
                      </div>
                      <div style={{background:"rgba(44,44,44,0.04)",border:"1px solid rgba(44,44,44,0.1)",borderRadius:9,padding:"11px 14px"}}>
                        <div style={{fontSize:10.5,color:"#2c2c2c",marginBottom:6,fontWeight:500}}>⚠ 梳化注意事項</div>
                        {["請準時到場","請勿遲到超過 15 分鐘","如需取消請提前告知","梳化前一晚請確實保養（敷面膜、擦保濕等），不然妝會不服貼唷！"].map((n,i)=>(
                          <div key={i} style={{fontSize:12,color:"rgba(44,44,44,0.6)",marginBottom:i<3?4:0,display:"flex",gap:6}}><span style={{color:"rgba(44,44,44,0.35)"}}>·</span>{n}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Step 4 */}
                  {step===4&&(
                    <div style={{textAlign:"center",padding:"20px 0"}}>
                      <div style={{width:68,height:68,borderRadius:"50%",background:"rgba(44,44,44,0.07)",border:"2px solid #2c2c2c",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,margin:"0 auto 18px"}}>✓</div>
                      <h2 style={{fontSize:20,fontWeight:400,margin:"0 0 8px",color:"#2c2c2c"}}>預約資料已送出！</h2>
                      <p style={{fontSize:13,color:"rgba(44,44,44,0.5)",margin:"0 0 20px",lineHeight:1.7}}>請完成匯款訂金以確保預約位置<br/>我們收到後將與您確認細節</p>
                      <div style={{marginBottom:18}}><StatusBadge status={done?.status||"pending"}/></div>
                      {done&&(
                        <div style={{background:"#faf8f5",border:"1px solid #dedad4",borderRadius:10,padding:"13px 16px",textAlign:"left",marginBottom:20}}>
                          {[["服務",`${doneSvc?.icon} ${doneSvc?.name}`],["日期時間",`${done.date} ${done.time}`],["姓名",done.name],["本次訂金",done.prefillDeposit?`NT$ ${done.prefillDeposit}`:"NT$ 500"]].map(([k,v])=>(
                            <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #ede9e3",fontSize:13}}>
                              <span style={{color:"rgba(44,44,44,0.45)"}}>{k}</span><span style={{color:"#2c2c2c"}}>{v}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {done?.status==="pending"&&<button onClick={()=>setPayTarget(done)} style={{width:"100%",padding:"14px",background:"linear-gradient(135deg,#2c2c2c,#1a1a1a)",border:"none",borderRadius:10,color:"#fff",fontSize:14.5,cursor:"pointer",fontFamily:"inherit",marginBottom:10,boxShadow:"0 4px 16px rgba(44,44,44,0.2)"}}>🏦 查看匯款資訊</button>}
                      {done?.status==="paid"&&<div style={{padding:"13px",background:"rgba(100,180,100,0.1)",border:"1px solid rgba(100,180,100,0.2)",borderRadius:10,color:"#3a9a3a",fontSize:13.5,marginBottom:10}}>✓ 訂金已確認，預約完成！</div>}
                      <div style={{display:"flex",gap:8}}>
                        <button onClick={()=>setTab("records")} style={{flex:1,padding:"11px",background:"#faf8f5",border:"1px solid #dedad4",borderRadius:10,color:"rgba(44,44,44,0.6)",fontSize:12.5,cursor:"pointer",fontFamily:"inherit"}}>查看紀錄</button>
                        <button onClick={resetAll} style={{flex:1,padding:"11px",background:"#faf8f5",border:"1px solid #dedad4",borderRadius:10,color:"rgba(44,44,44,0.6)",fontSize:12.5,cursor:"pointer",fontFamily:"inherit"}}>重新填寫</button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Nav */}
                {step<4&&(
                  <div style={{display:"flex",gap:8,marginTop:13}}>
                    <button onClick={()=>go(()=>setStep(s=>s<=1?0:s-1))} style={{padding:"13px 20px",background:"#faf8f5",border:"1px solid #dedad4",borderRadius:10,color:"rgba(44,44,44,0.55)",fontSize:13.5,cursor:"pointer",fontFamily:"inherit"}}>← 上一步</button>
                    <button onClick={()=>{
                      if(step===1){if(validateStep1())go(()=>setStep(2));}
                      else if(step===2){if(validateStep2())go(()=>setStep(3));}
                      else if(step===3){handleBook();}
                    }} style={{flex:1,padding:"13px",background:"linear-gradient(135deg,#2c2c2c,#1a1a1a)",border:"none",borderRadius:10,color:"#fff",fontSize:15,cursor:"pointer",fontFamily:"inherit",letterSpacing:"0.05em",boxShadow:"0 4px 14px rgba(44,44,44,0.18)"}}>
                      {step<3?"下一步 →":"確認預約"}
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ══ RECORDS TAB ══ */}
        {tab==="records"&&(
          <div>
            <h2 style={{fontSize:17,fontWeight:500,margin:"0 0 14px",color:"#2c2c2c"}}>我的預約</h2>
            {bookings.length===0?(
              <div style={{textAlign:"center",padding:"60px 20px",background:"#fff",borderRadius:16,border:"1px solid rgba(44,44,44,0.08)"}}>
                <div style={{fontSize:40,marginBottom:10}}>📋</div>
                <p style={{color:"rgba(44,44,44,0.4)",fontSize:13}}>尚無預約紀錄</p>
              </div>
            ):(
              <div style={{display:"grid",gap:10}}>
                {bookings.map(b=>{
                  const bSvc=SERVICES.find(s=>s.id===b.serviceId);
                  return (
                    <div key={b.id} style={{background:"#fff",borderRadius:12,border:"1px solid rgba(44,44,44,0.08)",padding:"14px 16px",opacity:b.status==="cancelled"?0.55:1,boxShadow:"0 1px 6px rgba(44,44,44,0.05)"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:9}}>
                        <div>
                          <div style={{fontSize:14,fontWeight:500,color:"#2c2c2c"}}>{bSvc?.icon} {bSvc?.name}</div>
                          <div style={{fontSize:11,color:"rgba(44,44,44,0.45)",marginTop:1}}>{b.date} {b.time} · {b.locationType}</div>
                        </div>
                        <StatusBadge status={b.status}/>
                      </div>
                      {b.status==="cancelled"&&<div style={{fontSize:12,color:"#c04040",fontStyle:"italic",marginBottom:8}}>此預約已取消</div>}
                      {b.status==="pending"&&<button onClick={()=>setPayTarget(b)} style={{padding:"7px 13px",background:"rgba(44,44,44,0.07)",border:"1px solid rgba(44,44,44,0.15)",borderRadius:7,color:"#2c2c2c",fontSize:11.5,cursor:"pointer",fontFamily:"inherit"}}>🏦 匯款資訊</button>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ MONTH TAB ══ */}
        {tab==="month"&&(
          <div>
            <h2 style={{fontSize:17,fontWeight:500,margin:"0 0 4px",color:"#2c2c2c"}}>本月預約</h2>
            <p style={{fontSize:12,color:"rgba(44,44,44,0.4)",margin:"0 0 14px"}}>{new Date().getFullYear()} 年 {new Date().getMonth()+1} 月</p>
            {monthBookings.length===0?(
              <div style={{textAlign:"center",padding:"60px 20px",background:"#fff",borderRadius:16,border:"1px solid rgba(44,44,44,0.08)"}}>
                <div style={{fontSize:40,marginBottom:10}}>📅</div>
                <p style={{color:"rgba(44,44,44,0.4)",fontSize:13}}>本月尚無預約</p>
              </div>
            ):(
              <div style={{display:"grid",gap:10}}>
                {monthBookings.sort((a,b)=>a.date>b.date?1:-1).map(b=>{
                  const bSvc=SERVICES.find(s=>s.id===b.serviceId);
                  return (
                    <div key={b.id} style={{background:"#fff",borderRadius:12,border:"1px solid rgba(44,44,44,0.08)",padding:"14px 16px",opacity:b.status==="cancelled"?0.55:1,boxShadow:"0 1px 6px rgba(44,44,44,0.05)"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                        <div>
                          <div style={{fontSize:14,fontWeight:500,color:"#2c2c2c"}}>{bSvc?.icon} {bSvc?.name}</div>
                          <div style={{fontSize:11,color:"rgba(44,44,44,0.45)",marginTop:1}}>{b.date} {b.time}</div>
                        </div>
                        <StatusBadge status={b.status}/>
                      </div>
                      <div style={{fontSize:12,color:"rgba(44,44,44,0.55)"}}>{b.name} · {b.locationType} · {b.persons||"1"} 人</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ NOTICE TAB ══ */}
        {tab==="notice"&&(
          <div>
            <h2 style={{fontSize:17,fontWeight:500,margin:"0 0 16px",color:"#2c2c2c"}}>預約須知</h2>
            <div style={{background:"#fff",borderRadius:16,border:"1px solid rgba(44,44,44,0.08)",padding:"24px 20px",boxShadow:"0 2px 12px rgba(44,44,44,0.06)"}}>
              {notices.map((n,i)=>(
                <div key={i} style={{fontSize:13.5,color:"rgba(44,44,44,0.7)",lineHeight:1.8,marginBottom:i<notices.length-1?12:0,padding:"12px 16px",background:"#faf8f5",borderRadius:9,border:"1px solid #dedad4"}}>{n}</div>
              ))}
              <Divider/>
              <div style={{fontSize:12,color:"rgba(44,44,44,0.4)",textAlign:"center"}}>如有任何疑問，歡迎透過 LINE 官方帳號 {LINE_ID} 與我們聯繫 🤍</div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showWedding&&<WeddingModal onConfirm={()=>{setShowWedding(false);setErrors(p=>({...p,serviceId:undefined}));}} onClose={()=>{setShowWedding(false);setForm(p=>({...p,serviceId:null}));}}/>}
      {payTarget&&<PaymentModal booking={payTarget} svc={SERVICES.find(s=>s.id===payTarget.serviceId)} depositAmount={payTarget.prefillDeposit?`NT$ ${payTarget.prefillDeposit}`:"NT$ 500"} onSuccess={handlePaySuccess} onClose={()=>setPayTarget(null)}/>}
      {showAdminLogin&&(
        <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(44,44,44,0.5)",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{width:"100%",maxWidth:360,background:"#fff",borderRadius:16,padding:"26px 22px",boxShadow:"0 20px 50px rgba(44,44,44,0.15)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <h2 style={{fontSize:18,fontWeight:500,margin:0,color:"#2c2c2c"}}>公司端登入</h2>
              <button onClick={()=>{setShowAdminLogin(false);setAdminPw("");setAdminErr("");}} style={{background:"none",border:"none",color:"rgba(44,44,44,0.3)",fontSize:20,cursor:"pointer"}}>✕</button>
            </div>
            <input type="password" placeholder="請輸入密碼" value={adminPw}
              onChange={e=>{setAdminPw(e.target.value);setAdminErr("");}}
              onKeyDown={e=>e.key==="Enter"&&handleAdminLogin()}
              style={{width:"100%",padding:"11px 13px",background:"#faf8f5",border:`1px solid ${adminErr?"rgba(200,80,80,0.4)":"#dedad4"}`,borderRadius:8,color:"#2c2c2c",fontSize:14,fontFamily:"inherit",outline:"none",boxSizing:"border-box",marginBottom:8}}
            />
            {adminErr&&<div style={{color:"#e07070",fontSize:12,marginBottom:8}}>{adminErr}</div>}
            <button onClick={handleAdminLogin} style={{width:"100%",padding:"12px",background:"linear-gradient(135deg,#2c2c2c,#1a1a1a)",border:"none",borderRadius:10,color:"#fff",fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>登入</button>
          </div>
        </div>
      )}
    </div>
  );
}

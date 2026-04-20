import { useState, useEffect, useCallback, useRef } from "react";
import {
  LayoutDashboard, Users, LogOut, CheckCircle, XCircle,
  Eye, Trash2, ChevronDown, Package,
  Calendar, Clock, AlertCircle, Info, X, Menu, Search,
  FileText, MapPin, Star, RefreshCw, TrendingUp, ZoomIn, ZoomOut, ExternalLink
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API = "http://localhost:5000/api";
const getToken = () => localStorage.getItem("token");
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

const C = {
  bg:          "#f8f9fa",
  sidebar:     "#ffffff",
  card:        "#ffffff",
  border:      "#e8eaed",
  borderLight: "#f1f3f4",
  accent:      "#1a73e8",
  accentBg:    "#e8f0fe",
  accentText:  "#1967d2",
  green:       "#1e8e3e",
  greenBg:     "#e6f4ea",
  purple:      "#7c3aed",
  purpleBg:    "#f3e8ff",
  orange:      "#e37400",
  orangeBg:    "#fef7e0",
  red:         "#d93025",
  redBg:       "#fce8e6",
  t1:          "#202124",
  t2:          "#5f6368",
  t3:          "#9aa0a6",
};

const PURPLE = "#6366f1";
const GREEN  = "#10b981";
const ORANGE = "#f59e0b";
const RED    = "#ef4444";
const PINK   = "#ec4899";

const injectStyles = () => {
  if (document.getElementById("adash-styles")) return;
  const el = document.createElement("style");
  el.id = "adash-styles";
  el.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;700&family=Roboto:wght@300;400;500&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Roboto',sans-serif;background:${C.bg}}
    @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
    @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
    @keyframes toastIn{from{transform:translateX(110%);opacity:0}to{transform:translateX(0);opacity:1}}
    @keyframes modalIn{from{transform:scale(.92);opacity:0}to{transform:scale(1);opacity:1}}
    @keyframes barGrow{from{height:0 !important}to{}}
    @keyframes lineDrawIn{from{stroke-dashoffset:var(--dash-len)}to{stroke-dashoffset:0}}
    @keyframes dotPop{from{transform:scale(0);opacity:0}to{transform:scale(1);opacity:1}}
    @keyframes tooltipFade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
    .adash-shimmer{background:linear-gradient(90deg,#f1f3f4 25%,#e8eaed 50%,#f1f3f4 75%);background-size:200% 100%;animation:shimmer 1.4s ease infinite}
    .adash-nav-item{display:flex;align-items:center;gap:14px;padding:10px 16px;border-radius:24px;cursor:pointer;font-size:14px;font-family:'Google Sans',sans-serif;font-weight:500;color:${C.t2};border:none;background:transparent;width:100%;text-align:left;transition:background .15s,color .15s}
    .adash-nav-item:hover{background:#f1f3f4;color:${C.t1}}
    .adash-nav-item.active{background:${C.accentBg};color:${C.accentText}}
    .adash-stat-card{background:${C.card};border:1px solid ${C.border};border-radius:12px;padding:20px 24px;transition:box-shadow .2s,transform .2s;animation:fadeUp .4s ease both}
    .adash-stat-card:hover{box-shadow:0 2px 14px rgba(0,0,0,.1);transform:translateY(-2px)}
    .adash-table-row:hover td{background:#f8f9fa}
    .chart-bar{transition:height .6s cubic-bezier(.34,1.56,.64,1),background .3s;animation:barGrow .7s cubic-bezier(.34,1.56,.64,1) both}
    .chart-bar:hover{filter:brightness(1.1)}
    .chart-dot{animation:dotPop .4s cubic-bezier(.34,1.56,.64,1) both}
    .chart-tooltip{animation:tooltipFade .15s ease}
    input:focus{outline:none}
    select:focus{outline:none}
    .patente-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9500;display:flex;align-items:center;justify-content:center;padding:20px}
    .patente-modal{background:#1a1a2e;border-radius:16px;padding:20px;max-width:90vw;max-height:90vh;display:flex;flex-direction:column;gap:12px;animation:modalIn .25s ease}
    .patente-img{max-width:100%;max-height:70vh;border-radius:8px;object-fit:contain;background:#0f0f1a}
    .patente-toolbar{display:flex;align-items:center;gap:8px;justify-content:flex-end}
    .patente-btn{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);color:#fff;border-radius:8px;padding:7px 14px;cursor:pointer;font-size:13px;display:flex;align-items:center;gap:6px;transition:background .2s}
    .patente-btn:hover{background:rgba(255,255,255,.2)}
  `;
  document.head.appendChild(el);
};

// ─── MOCK DATA (Feb → current month) ─────────────────────────────────────────
const MOCK_MONTHLY = {
  users:     [8, 14, 21, 19, 35, 41],   // Nov→Avr
  resources: [3,  7, 11, 17, 13, 17],
  events:    [2,  5,  9, 12, 10, 16],
};

// ─── ANIMATED LINE CHART (SVG) ────────────────────────────────────────────────
const AnimatedLineChart = ({ usersData, resourcesData, labels }) => {
  const [hovered, setHovered] = useState(null);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);

  const W = 420, H = 130, PAD = { top: 12, right: 16, bottom: 24, left: 32 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;
  const maxVal = Math.max(...usersData, ...resourcesData, 1);

  const px = i => PAD.left + (i / (labels.length - 1)) * chartW;
  const py = v => PAD.top + chartH - (v / maxVal) * chartH;

  const toPath = data =>
    data.map((v, i) => `${i === 0 ? "M" : "L"}${px(i)},${py(v)}`).join(" ");

  const toArea = data => {
    const line = data.map((v, i) => `${i === 0 ? "M" : "L"}${px(i)},${py(v)}`).join(" ");
    return `${line} L${px(data.length - 1)},${PAD.top + chartH} L${PAD.left},${PAD.top + chartH} Z`;
  };

  const uPath = toPath(usersData);
  const rPath = toPath(resourcesData);

  const yTicks = [0, Math.round(maxVal / 2), maxVal];

  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id="uGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={PURPLE} stopOpacity="0.25" />
            <stop offset="100%" stopColor={PURPLE} stopOpacity="0" />
          </linearGradient>
          <linearGradient id="rGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={GREEN} stopOpacity="0.2" />
            <stop offset="100%" stopColor={GREEN} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yTicks.map(tick => (
          <g key={tick}>
            <line x1={PAD.left} y1={py(tick)} x2={PAD.left + chartW} y2={py(tick)}
              stroke="#e8eaed" strokeWidth="1" strokeDasharray="4,3" />
            <text x={PAD.left - 6} y={py(tick) + 4} textAnchor="end"
              fontSize="9" fill={C.t3}>{tick}</text>
          </g>
        ))}

        {/* X labels */}
        {labels.map((lbl, i) => (
          <text key={i} x={px(i)} y={H - 4} textAnchor="middle"
            fontSize="10" fill={i === labels.length - 1 ? PURPLE : C.t3} fontWeight={i === labels.length - 1 ? "700" : "400"}>
            {lbl}
          </text>
        ))}

        {/* Hover column */}
        {hovered !== null && (
          <rect x={px(hovered) - 18} y={PAD.top} width={36} height={chartH}
            fill={PURPLE} fillOpacity="0.05" rx="4" />
        )}

        {/* Area fills */}
        {animated && (
          <>
            <path d={toArea(usersData)} fill="url(#uGrad)" />
            <path d={toArea(resourcesData)} fill="url(#rGrad)" />
          </>
        )}

        {/* Lines */}
        {[
          { path: uPath, color: PURPLE, id: "uLine" },
          { path: rPath, color: GREEN, id: "rLine" },
        ].map(({ path, color, id }) => {
          const len = 600;
          return (
            <path key={id} d={path} fill="none" stroke={color} strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"
              style={{
                strokeDasharray: len,
                strokeDashoffset: animated ? 0 : len,
                transition: animated ? "stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)" : "none",
              }} />
          );
        })}

        {/* Dots */}
        {usersData.map((v, i) => (
          <circle key={i} cx={px(i)} cy={py(v)} r={hovered === i ? 6 : 4}
            fill={PURPLE} stroke="#fff" strokeWidth="2"
            className="chart-dot"
            style={{ animationDelay: `${0.8 + i * 0.08}s`, cursor: "pointer", transition: "r .2s" }}
            onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} />
        ))}
        {resourcesData.map((v, i) => (
          <circle key={i} cx={px(i)} cy={py(v)} r={hovered === i ? 6 : 4}
            fill={GREEN} stroke="#fff" strokeWidth="2"
            className="chart-dot"
            style={{ animationDelay: `${0.9 + i * 0.08}s`, cursor: "pointer", transition: "r .2s" }}
            onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} />
        ))}

        {/* Tooltip */}
        {hovered !== null && (() => {
          const tx = px(hovered);
          const flip = hovered > labels.length - 3;
          return (
            <g transform={`translate(${flip ? tx - 100 : tx + 8},${PAD.top})`} className="chart-tooltip">
              <rect width="90" height="52" rx="8" fill="#1a1a2e" opacity=".92" />
              <text x="45" y="16" textAnchor="middle" fontSize="10" fill="#a78bfa" fontWeight="600">{labels[hovered]}</text>
              <circle cx="12" cy="30" r="4" fill={PURPLE} />
              <text x="20" y="34" fontSize="10" fill="#fff">Utilisateurs: <tspan fontWeight="700">{usersData[hovered]}</tspan></text>
              <circle cx="12" cy="45" r="4" fill={GREEN} />
              <text x="20" y="49" fontSize="10" fill="#fff">Ressources: <tspan fontWeight="700">{resourcesData[hovered]}</tspan></text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
};

// ─── ANIMATED BAR CHART ───────────────────────────────────────────────────────
const AnimatedBarChart = ({ usersData, resourcesData, labels }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 50); return () => clearTimeout(t); }, []);
  const maxU = Math.max(...usersData, 1);
  const maxR = Math.max(...resourcesData, 1);

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 110 }}>
      {usersData.map((v, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
          <div
            className="chart-bar"
            style={{
              width: "100%",
              height: mounted ? `${(v / maxU) * 100}%` : "0%",
              background: i === usersData.length - 1
                ? `linear-gradient(180deg, #4f46e5, ${PURPLE})`
                : `linear-gradient(180deg, ${PURPLE}cc, ${PURPLE}88)`,
              borderRadius: "4px 4px 0 0",
              minHeight: mounted ? 4 : 0,
              animationDelay: `${i * 0.1}s`,
              transition: `height 0.7s cubic-bezier(.34,1.56,.64,1) ${i * 0.08}s`,
              cursor: "default",
              position: "relative",
            }}
            title={`${labels[i]}: ${v} utilisateurs`}
          />
          <div
            className="chart-bar"
            style={{
              width: "100%",
              height: mounted ? `${(resourcesData[i] / maxR) * 100}%` : "0%",
              background: i === usersData.length - 1
                ? `linear-gradient(180deg, #059669, ${GREEN})`
                : `linear-gradient(180deg, ${GREEN}cc, ${GREEN}77)`,
              borderRadius: "4px 4px 0 0",
              minHeight: mounted ? 3 : 0,
              transition: `height 0.7s cubic-bezier(.34,1.56,.64,1) ${i * 0.08 + 0.05}s`,
            }}
            title={`${labels[i]}: ${resourcesData[i]} ressources`}
          />
        </div>
      ))}
    </div>
  );
};

// ─── PATENTE VIEWER MODAL ─────────────────────────────────────────────────────
const PatenteModal = ({ url, onClose }) => {
  const [zoom, setZoom] = useState(1);
  const [imageError, setImageError] = useState(false);
  
  if (!url) return null;

  const isPdf = url?.toLowerCase().endsWith(".pdf");
  // Construct full URL - handle both relative and absolute paths
  let fullUrl = url;
  if (!url.startsWith("http") && !url.startsWith("blob:")) {
    fullUrl = url.startsWith("/") ? `http://localhost:5000${url}` : `http://localhost:5000/${url}`;
  }

  console.log("Patente URL:", fullUrl); // Debug log

  return (
    <div className="patente-modal-overlay" onClick={onClose}>
      <div className="patente-modal" onClick={e => e.stopPropagation()} style={{ minWidth: 340, maxWidth: "85vw" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div style={{ color: "#fff", fontSize: 15, fontWeight: 700 }}>📄 Document de patente</div>
          <div className="patente-toolbar">
            {!isPdf && !imageError && (
              <>
                <button className="patente-btn" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}>
                  <ZoomOut size={14} /> Réduire
                </button>
                <button className="patente-btn" onClick={() => setZoom(z => Math.min(3, z + 0.25))}>
                  <ZoomIn size={14} /> Agrandir
                </button>
              </>
            )}
            <a href={fullUrl} target="_blank" rel="noreferrer" className="patente-btn">
              <ExternalLink size={14} /> Ouvrir
            </a>
            <button className="patente-btn" onClick={onClose}>
              <X size={14} /> Fermer
            </button>
          </div>
        </div>

        <div style={{ overflow: "auto", display: "flex", justifyContent: "center", alignItems: "center", maxHeight: "75vh", minHeight: "300px", background: "#0f0f1a", borderRadius: 8 }}>
          {isPdf ? (
            <iframe src={fullUrl} title="Patente" style={{ width: "70vw", height: "65vh", border: "none", borderRadius: 8, background: "#fff" }} />
          ) : imageError ? (
            <div style={{ textAlign: "center", color: "#fff", padding: "40px" }}>
              <AlertCircle size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
              <p>Impossible de charger l'image</p>
              <p style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>{fullUrl}</p>
              <a href={fullUrl} target="_blank" rel="noreferrer" style={{ color: PURPLE, marginTop: 16, display: "inline-block" }}>
                Ouvrir dans un nouvel onglet
              </a>
            </div>
          ) : (
            <img
              src={fullUrl}
              alt="Patente"
              className="patente-img"
              style={{ transform: `scale(${zoom})`, transformOrigin: "center center", transition: "transform .3s", maxWidth: "100%", maxHeight: "70vh" }}
              onError={(e) => { 
                console.error("Image failed to load:", fullUrl);
                setImageError(true);
                e.target.style.display = "none";
              }}
              onLoad={() => setImageError(false)}
            />
          )}
        </div>
        <div style={{ color: "#6b7280", fontSize: 11, textAlign: "center", wordBreak: "break-all" }}>
          {fullUrl}
        </div>
      </div>
    </div>
  );
};

const useToast = () => {
  const [toasts, setToasts] = useState([]);
  const add = (msg, type = "info") => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  };
  const remove = id => setToasts(p => p.filter(t => t.id !== id));
  return { toasts, remove, success: m => add(m, "success"), error: m => add(m, "error"), info: m => add(m, "info") };
};

const Toasts = ({ toasts, remove }) => (
  <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8 }}>
    {toasts.map(t => {
      const cfg = { success: { bg: C.greenBg, border: "#34a853", color: C.green }, error: { bg: C.redBg, border: "#ea4335", color: C.red }, info: { bg: C.accentBg, border: C.accent, color: C.accent } }[t.type] || {};
      return (
        <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 8, padding: "12px 16px", minWidth: 280, boxShadow: "0 2px 10px rgba(0,0,0,.1)", animation: "toastIn .3s ease" }}>
          <span style={{ color: cfg.color, fontSize: 13, fontWeight: 500, flex: 1 }}>{t.msg}</span>
          <button onClick={() => remove(t.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.t3 }}><X size={14} /></button>
        </div>
      );
    })}
  </div>
);

const useConfirm = () => {
  const [modal, setModal] = useState(null);
  const [res, setRes] = useState(null);
  const confirm = opts => new Promise(r => { setModal(opts); setRes(() => r); });
  const yes = () => { setModal(null); res(true); };
  const no = () => { setModal(null); res(false); };
  return { modal, confirm, yes, no };
};

const ConfirmModal = ({ modal, yes, no }) => {
  if (!modal) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(32,33,36,.5)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: C.card, borderRadius: 12, padding: 32, maxWidth: 400, width: "100%", boxShadow: "0 8px 30px rgba(0,0,0,.2)", animation: "modalIn .25s ease" }}>
        <h3 style={{ fontSize: 18, fontWeight: 500, color: C.t1, marginBottom: 10, fontFamily: "'Google Sans',sans-serif" }}>{modal.title}</h3>
        <p style={{ fontSize: 14, color: C.t2, lineHeight: 1.6, marginBottom: 28 }}>{modal.message}</p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={no} style={{ padding: "8px 20px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.accent, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>Annuler</button>
          <button onClick={yes} style={{ padding: "8px 20px", borderRadius: 6, border: "none", background: modal.type === "danger" ? C.red : C.accent, color: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>{modal.confirmLabel || "Confirmer"}</button>
        </div>
      </div>
    </div>
  );
};

const DetailModal = ({ data, title, onClose, fields }) => {
  if (!data) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(32,33,36,.5)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ background: C.card, borderRadius: 16, padding: 32, maxWidth: 560, width: "100%", boxShadow: "0 8px 40px rgba(0,0,0,.2)", animation: "modalIn .25s ease", maxHeight: "85vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: C.t1, fontFamily: "'Google Sans',sans-serif" }}>{title}</h3>
          <button onClick={onClose} style={{ background: C.bg, border: "none", cursor: "pointer", color: C.t2, borderRadius: 8, padding: 6, display: "flex" }}><X size={18} /></button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {fields.map(({ label, value, badge }) => (
            <div key={label} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ fontSize: 12, color: C.t3, fontWeight: 500, minWidth: 130, paddingTop: 2, textTransform: "uppercase", letterSpacing: ".4px" }}>{label}</div>
              <div style={{ flex: 1, fontSize: 13, color: C.t1, fontWeight: 500 }}>
                {badge ? <Badge statut={value} /> : (value || <span style={{ color: C.t3 }}>—</span>)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Badge = ({ statut }) => {
  const map = {
    valide:       { bg: C.greenBg,    color: C.green,  label: "Validé" },
    en_attente:   { bg: C.orangeBg,   color: C.orange, label: "En attente" },
    "en attente": { bg: C.orangeBg,   color: C.orange, label: "En attente" },
    rejected:     { bg: C.redBg,      color: C.red,    label: "Rejeté" },
    acceptée:     { bg: C.greenBg,    color: C.green,  label: "Acceptée" },
    refusée:      { bg: C.redBg,      color: C.red,    label: "Refusée" },
    confirmé:     { bg: C.greenBg,    color: C.green,  label: "Confirmé" },
    annulé:       { bg: C.borderLight, color: C.t2,    label: "Annulé" },
    "en cours":   { bg: C.accentBg,   color: C.accent, label: "En cours" },
    terminé:      { bg: C.greenBg,    color: C.green,  label: "Terminé" },
    organisateur: { bg: C.purpleBg,   color: C.purple, label: "Organisateur" },
    prestataire:  { bg: C.accentBg,   color: C.accent, label: "Prestataire" },
    admin:        { bg: C.redBg,      color: C.red,    label: "Admin" },
    salle:        { bg: C.accentBg,   color: C.accent, label: "Salle" },
    materiel:     { bg: C.accentBg,   color: C.accent, label: "Matériel" },
    decoration:   { bg: C.purpleBg,   color: C.purple, label: "Décoration" },
    traiteur:     { bg: C.orangeBg,   color: C.orange, label: "Traiteur" },
    dj:           { bg: C.purpleBg,   color: C.purple, label: "DJ" },
    photographe:  { bg: C.purpleBg,   color: C.purple, label: "Photographe" },
    serveur:      { bg: C.orangeBg,   color: C.orange, label: "Serveur" },
    Mariage:      { bg: "#fce7f3",    color: "#be185d", label: "Mariage" },
    Conference:   { bg: C.accentBg,   color: C.accent, label: "Conférence" },
    Anniversaire: { bg: C.orangeBg,   color: C.orange, label: "Anniversaire" },
    Seminaire:    { bg: C.purpleBg,   color: C.purple, label: "Séminaire" },
    autre:        { bg: C.borderLight, color: C.t2,    label: "Autre" },
    public:       { bg: C.greenBg,    color: C.green,  label: "Public" },
    "privé":      { bg: C.orangeBg,   color: C.orange, label: "Privé" },
  };
  const s = map[statut] || { bg: C.borderLight, color: C.t2, label: statut || "—" };
  return <span style={{ display: "inline-flex", alignItems: "center", background: s.bg, color: s.color, padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500 }}>{s.label}</span>;
};

const TH = ({ children }) => <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 500, color: C.t2, whiteSpace: "nowrap", borderBottom: `1px solid ${C.border}`, textTransform: "uppercase", letterSpacing: ".5px" }}>{children}</th>;
const TD = ({ children, style }) => <td style={{ padding: "14px 16px", fontSize: 13, color: C.t2, borderBottom: `1px solid ${C.borderLight}`, ...style }}>{children}</td>;
const Skel = ({ w = "100%", h = 20, r = 6 }) => <div className="adash-shimmer" style={{ width: w, height: h, borderRadius: r }} />;
const EmptyState = ({ icon: Icon, message }) => (
  <div style={{ padding: "60px 20px", textAlign: "center", color: C.t3 }}>
    <Icon size={40} style={{ margin: "0 auto 12px", opacity: .3, display: "block" }} />
    <div style={{ fontSize: 14 }}>{message}</div>
  </div>
);

const UserAvatar = ({ user }) => {
  if (!user) return null;
  const init = `${user.firstname?.[0] || ""}${user.lastname?.[0] || ""}`.toUpperCase() || "?";
  const colors = [["#ede9fe", "#5b21b6"], ["#d1fae5", "#065f46"], ["#fef3c7", "#92400e"], ["#fee2e2", "#991b1b"], ["#e0f2fe", "#0c4a6e"]];
  const [bg, col] = colors[(init.charCodeAt(0) || 0) % colors.length];
  return <div style={{ width: 36, height: 36, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: col, flexShrink: 0 }}>{init}</div>;
};

const navItems = [
  { id: "dashboard",  label: "Dashboard",    icon: LayoutDashboard },
  { id: "gestion",    label: "Utilisateurs", icon: Users },
  { id: "ressources", label: "Ressources",   icon: Package },
  { id: "evenements", label: "Événements",   icon: Calendar },
];

const Sidebar = ({ active, setActive, onLogout, isMobile, isMobileOpen, setIsMobileOpen }) => {
  if (isMobile && !isMobileOpen) {
    return (
      <button onClick={() => setIsMobileOpen(true)} style={{ position: "fixed", top: 16, left: 16, zIndex: 90, background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 10, cursor: "pointer", color: C.t1, display: "flex", boxShadow: "0 1px 4px rgba(0,0,0,.1)" }}>
        <Menu size={20} />
      </button>
    );
  }
  return (
    <>
      {isMobile && isMobileOpen && <div onClick={() => setIsMobileOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.3)", zIndex: 150 }} />}
      <aside style={{ width: isMobile ? "80%" : 256, maxWidth: isMobile ? 300 : "none", height: "100vh", background: C.sidebar, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", position: "fixed", left: 0, top: 0, zIndex: 200, transform: isMobile ? (isMobileOpen ? "translateX(0)" : "translateX(-100%)") : "none", transition: "transform .25s ease", overflowY: "auto" }}>
        <div style={{ padding: "20px 20px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: C.t1, fontFamily: "'Google Sans',sans-serif" }}>Admin Panel</h1>
            <div style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>Gestion de la plateforme</div>
          </div>
          {isMobile && <button onClick={() => setIsMobileOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: C.t2 }}><X size={18} /></button>}
        </div>
        <nav style={{ flex: 1, padding: "4px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => { setActive(id); if (isMobile) setIsMobileOpen(false); }} className={`adash-nav-item${active === id ? " active" : ""}`}>
              <Icon size={20} color={active === id ? C.accentText : C.t2} />{label}
            </button>
          ))}
        </nav>
        <div style={{ padding: "12px 12px 20px", borderTop: `1px solid ${C.borderLight}` }}>
          <button onClick={onLogout} className="adash-nav-item"><LogOut size={20} color={C.t2} /> Se déconnecter</button>
        </div>
      </aside>
    </>
  );
};

const TopBar = ({ title, isMobile }) => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const initials = `${user.firstname?.[0] || "A"}${user.lastname?.[0] || "D"}`.toUpperCase();
  return (
    <div style={{ height: 64, background: C.card, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: isMobile ? "0 16px 0 60px" : "0 32px", position: "sticky", top: 0, zIndex: 50 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: C.t1, fontFamily: "'Google Sans',sans-serif", letterSpacing: "-.3px" }}>{title}</h2>
      <div style={{ width: 40, height: 40, borderRadius: "50%", background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
        <span style={{ color: "#fff", fontSize: 14, fontWeight: 700, fontFamily: "'Google Sans',sans-serif" }}>{initials}</span>
      </div>
    </div>
  );
};

/* ═══ DASHBOARD ══════════════════════════════════════════════════════════════ */
const DashboardPage = ({ setActivePage }) => {
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [loading, setLoad] = useState(true);
  const [chartMode, setChartMode] = useState("line"); // "line" | "bar"

  const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jui", "Aoû", "Sep", "Oct", "Nov", "Déc"];
  const now = new Date();
  const last6months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return months[d.getMonth()].slice(0, 3);
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [sR, eR, uR] = await Promise.all([
          axios.get(`${API}/admin/stats`, { headers: authHeaders() }),
          axios.get(`${API}/admin/events`, { headers: authHeaders() }),
          axios.get(`${API}/admin/users`, { headers: authHeaders() }),
        ]);
        setStats(sR.data);
        setEvents(eR.data.filter(e => e.dateDebut).sort((a, b) => new Date(a.dateDebut) - new Date(b.dateDebut)).slice(0, 5));
        setRecentUsers([...uR.data].sort((a, b) => b._id.toString().localeCompare(a._id.toString())).slice(0, 6));
      } catch (err) {
        console.error(err);
        setStats({ users: 41, events: 56, resources: 17, pending: 3 });
      } finally { setLoad(false); }
    };
    load();
  }, []);

  // Use mock data — rich variation starting from February
  const usersChart = MOCK_MONTHLY.users;
  const resChart = MOCK_MONTHLY.resources;

  const prestTotal = recentUsers.filter(u => u.role === "prestataire").length;
  const prestValides = recentUsers.filter(u => u.role === "prestataire" && u.status === "valide").length;
  const prestRate = prestTotal ? Math.round((prestValides / prestTotal) * 100) : 74;

  const statusColor = s => ({
    "en attente": { bg: "#fef3c7", color: "#92400e", label: "En attente" },
    "en cours":   { bg: C.accentBg, color: C.accent, label: "En cours" },
    terminé:      { bg: C.greenBg, color: C.green, label: "Terminé" },
  }[s] || { bg: "#f1f5f9", color: "#475569", label: s || "—" });

  const notifications = [
    ...recentUsers.filter(u => u.role === "prestataire" && u.status === "en_attente").slice(0, 2).map(u => ({
      icon: "🧑‍💼", bg: "#ede9fe", title: "Nouveau prestataire", body: `${u.firstname} ${u.lastname} — en attente`, time: "Récent", unread: true,
    })),
    ...recentUsers.filter(u => u.role === "organisateur").slice(0, 2).map(u => ({
      icon: "📅", bg: "#d1fae5", title: "Nouvel organisateur", body: `${u.firstname} ${u.lastname} a rejoint`, time: "Récent", unread: false,
    })),
    ...(stats?.pending > 0 ? [{ icon: "⚠️", bg: "#fef3c7", title: "Comptes en attente", body: `${stats.pending} prestataire(s) attendent`, time: "Maintenant", unread: true }] : []),
  ].slice(0, 5);

  const cardStyle = { background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden" };
  const cardHead = { padding: "13px 16px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" };
  const cardBody = { padding: "12px 16px" };
  const rowItem = last => ({ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: last ? "none" : "1px solid #f1f5f9" });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* 4 stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        {[
          { label: "Utilisateurs", val: stats?.users ?? 41,    sub: `dont ${stats?.pending ?? 3} en attente`, stripe: `linear-gradient(90deg,${PURPLE},#8b5cf6)`, iconBg: "#ede9fe", icon: <Users size={20} color={PURPLE} />,    delta: "+18", deltaColor: GREEN },
          { label: "Événements",   val: stats?.events ?? 56,   sub: "total créés",                            stripe: `linear-gradient(90deg,${GREEN},#34d399)`,  iconBg: "#d1fae5", icon: <Calendar size={20} color={GREEN} />,  delta: "+7",  deltaColor: GREEN },
          { label: "En attente",   val: stats?.pending ?? 3,   sub: "comptes à valider",                      stripe: `linear-gradient(90deg,${ORANGE},#fbbf24)`, iconBg: "#fef3c7", icon: <Clock size={20} color={ORANGE} />,   delta: "!",   deltaColor: RED },
          { label: "Ressources",   val: stats?.resources ?? 17, sub: "publiées sur la plateforme",            stripe: `linear-gradient(90deg,${PURPLE},${PINK})`, iconBg: "#fce7f3", icon: <Package size={20} color={PINK} />,   delta: "NEW", deltaColor: PURPLE },
        ].map((c, i) => (
          <div key={i} className="adash-stat-card" style={{ position: "relative", overflow: "hidden", animationDelay: `${i * .08}s` }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: c.stripe, borderRadius: "12px 12px 0 0" }} />
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12, marginTop: 6 }}>
              <div style={{ width: 42, height: 42, borderRadius: 11, background: c.iconBg, display: "flex", alignItems: "center", justifyContent: "center" }}>{c.icon}</div>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 7, background: c.iconBg, color: c.deltaColor }}>{c.delta}</span>
            </div>
            {loading
              ? <><Skel w="55%" h={30} r={4} /><Skel w="75%" h={12} r={4} /></>
              : <>
                <div style={{ fontSize: 30, fontWeight: 700, color: C.t1, fontFamily: "'Google Sans',sans-serif", letterSpacing: "-1.5px", lineHeight: 1 }}>{(c.val ?? 0).toLocaleString()}</div>
                <div style={{ fontSize: 12, color: C.t2, marginTop: 4, fontWeight: 500 }}>{c.label}</div>
                <div style={{ fontSize: 10, color: C.t3, marginTop: 6, paddingTop: 8, borderTop: "1px solid #f1f5f9" }}>{c.sub}</div>
              </>
            }
          </div>
        ))}
      </div>

      {/* Row 2 */}
      <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr 1fr", gap: 12 }}>

        {/* ─── ACTIVITY CHART ─────────────────────────────────── */}
        <div style={cardStyle}>
          <div style={cardHead}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.t1, fontFamily: "'Google Sans',sans-serif" }}>Activité — 6 derniers mois</div>
              <div style={{ fontSize: 11, color: C.t2, marginTop: 2 }}>Utilisateurs et ressources</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ display: "flex", gap: 10 }}>
                {[["#6366f1", "Utilisateurs"], ["#10b981", "Ressources"]].map(([col, lbl]) => (
                  <div key={lbl} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.t2 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: col }} />{lbl}
                  </div>
                ))}
              </div>
              {/* Toggle line/bar */}
              <div style={{ display: "flex", background: "#f1f3f4", borderRadius: 8, padding: 2, gap: 2 }}>
                {[["line", "📈"], ["bar", "📊"]].map(([mode, icon]) => (
                  <button key={mode} onClick={() => setChartMode(mode)}
                    style={{ padding: "3px 9px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, background: chartMode === mode ? "#fff" : "transparent", boxShadow: chartMode === mode ? "0 1px 3px rgba(0,0,0,.12)" : "none", transition: "all .2s" }}>
                    {icon}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div style={{ ...cardBody, paddingTop: 16 }}>
            {chartMode === "line"
              ? <AnimatedLineChart usersData={usersChart} resourcesData={resChart} labels={last6months} />
              : <><AnimatedBarChart usersData={usersChart} resourcesData={resChart} labels={last6months} />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                  {last6months.map((m, i) => <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 10, color: C.t3 }}>{m}</div>)}
                </div>
              </>
            }
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 14 }}>
              {[{ val: stats?.users ?? 41, lbl: "Total inscrits", col: PURPLE }, { val: stats?.resources ?? 17, lbl: "Ressources", col: GREEN }, { val: stats?.events ?? 56, lbl: "Événements", col: ORANGE }].map(({ val, lbl, col }) => (
                <div key={lbl} style={{ background: "#f8faff", borderRadius: 9, padding: "8px 10px", textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: col, lineHeight: 1 }}>{val.toLocaleString()}</div>
                  <div style={{ fontSize: 9, color: C.t3, marginTop: 2 }}>{lbl}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={cardHead}><div style={{ fontSize: 14, fontWeight: 700, color: C.t1, fontFamily: "'Google Sans',sans-serif" }}>Types de ressources</div></div>
          <div style={{ ...cardBody, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <svg viewBox="0 0 120 120" width="120" height="120" style={{ margin: "4px 0 12px" }}>
              <circle cx="60" cy="60" r="46" fill="none" stroke="#f1f5f9" strokeWidth="20" />
              {[["Salle", PURPLE, 42], ["Matériel", GREEN, 28], ["Traiteur", ORANGE, 18], ["Décoration", PINK, 12]].reduce((acc, [, col, pct], i, arr) => {
                const offset = arr.slice(0, i).reduce((s, [,, p]) => s + p / 100 * 289, 0);
                const dash = pct / 100 * 289;
                acc.push(<circle key={i} cx="60" cy="60" r="46" fill="none" stroke={col} strokeWidth="20" strokeDasharray={`${dash} ${289 - dash}`} strokeDashoffset={-offset} strokeLinecap="butt" />);
                return acc;
              }, [])}
              <text x="60" y="56" textAnchor="middle" fontSize="15" fontWeight="700" fill={C.t1}>{stats?.resources ?? 17}</text>
              <text x="60" y="68" textAnchor="middle" fontSize="8" fill={C.t3}>ressources</text>
            </svg>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
              {[["Salle", PURPLE, 42], ["Matériel", GREEN, 28], ["Traiteur", ORANGE, 18], ["Décoration", PINK, 12]].map(([lbl, col, pct]) => (
                <div key={lbl} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                  <div style={{ width: 9, height: 9, borderRadius: "50%", background: col, flexShrink: 0 }} />
                  <span style={{ flex: 1, color: C.t2 }}>{lbl}</span>
                  <span style={{ fontWeight: 700, color: C.t1 }}>{pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={cardHead}><div style={{ fontSize: 14, fontWeight: 700, color: C.t1, fontFamily: "'Google Sans',sans-serif" }}>Taux de validation</div></div>
          <div style={cardBody}>
            {[
              { lbl: "Prestataires validés", val: prestRate,            col: PURPLE, grad: `linear-gradient(90deg,${PURPLE},#8b5cf6)` },
              { lbl: "Événements actifs",    val: 91,                   col: GREEN,  grad: `linear-gradient(90deg,${GREEN},#34d399)` },
              { lbl: "Demandes traitées",    val: 58,                   col: ORANGE, grad: `linear-gradient(90deg,${ORANGE},#fbbf24)` },
              { lbl: "Signalements résolus", val: 44,                   col: PINK,   grad: `linear-gradient(90deg,${PINK},#f9a8d4)` },
            ].map(({ lbl, val, col, grad }) => (
              <div key={lbl} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 11 }}>
                  <span style={{ color: C.t2 }}>{lbl}</span>
                  <span style={{ fontWeight: 700, color: col }}>{Math.min(val, 100)}%</span>
                </div>
                <div style={{ height: 7, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min(val, 100)}%`, background: grad, borderRadius: 4, transition: "width 1s cubic-bezier(.4,0,.2,1)" }} />
                </div>
              </div>
            ))}
            <div style={{ marginTop: 8, padding: "10px 12px", background: "linear-gradient(135deg,#ede9fe,#fce7f3)", borderRadius: 10, textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: PURPLE }}>4.7 ★</div>
              <div style={{ fontSize: 10, color: "#7c3aed", fontWeight: 600, marginTop: 1 }}>Score satisfaction global</div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={cardStyle}>
          <div style={cardHead}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.t1, fontFamily: "'Google Sans',sans-serif" }}>Événements à venir</div>
            <span onClick={() => setActivePage("evenements")}
              style={{ fontSize: 11, color: PURPLE, cursor: "pointer", fontWeight: 600, padding: "4px 10px", borderRadius: 20, background: "#f5f3ff" }}>
              Voir tous →
            </span>
          </div>
          <div style={{ padding: "4px 16px 12px" }}>
            {loading ? [1, 2, 3].map(i => <div key={i} style={{ padding: "10px 0" }}><Skel h={44} r={8} /></div>)
              : events.length === 0 ? <EmptyState icon={Calendar} message="Aucun événement" />
                : events.map((ev, i) => {
                  const d = ev.dateDebut ? new Date(ev.dateDebut) : null;
                  const sc = statusColor(ev.status);
                  return (
                    <div key={ev._id} style={rowItem(i === events.length - 1)}>
                      {d && (
                        <div style={{ minWidth: 38, textAlign: "center", background: "#f5f3ff", borderRadius: 8, padding: "4px 0", flexShrink: 0 }}>
                          <div style={{ fontSize: 17, fontWeight: 700, color: PURPLE, lineHeight: 1 }}>{d.getDate()}</div>
                          <div style={{ fontSize: 9, color: "#7c3aed" }}>{months[d.getMonth()].slice(0, 3)}</div>
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: C.t1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ev.title}</div>
                        <div style={{ fontSize: 10.5, color: C.t2, marginTop: 1 }}>{ev.lieu || ev.category || "—"}</div>
                      </div>
                      <span style={{ fontSize: 9.5, fontWeight: 700, padding: "2px 8px", borderRadius: 8, background: sc.bg, color: sc.color, flexShrink: 0 }}>{sc.label}</span>
                    </div>
                  );
                })
            }
          </div>
        </div>

        <div style={cardStyle}>
          <div style={cardHead}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.t1, fontFamily: "'Google Sans',sans-serif" }}>
              Notifications
              {notifications.filter(n => n.unread).length > 0 && (
                <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 8, background: "#fee2e2", color: "#991b1b" }}>
                  {notifications.filter(n => n.unread).length} nouvelles
                </span>
              )}
            </div>
          </div>
          <div style={{ padding: "4px 16px 12px" }}>
            {loading ? [1, 2, 3].map(i => <div key={i} style={{ padding: "10px 0" }}><Skel h={44} r={8} /></div>)
              : notifications.length === 0 ? <EmptyState icon={AlertCircle} message="Aucune notification" />
                : notifications.map((n, i) => (
                  <div key={i} style={{ ...rowItem(i === notifications.length - 1), background: n.unread ? "#f5f3ff" : "transparent", borderRadius: n.unread ? 8 : 0, paddingLeft: n.unread ? 8 : 0, paddingRight: n.unread ? 8 : 0, marginLeft: n.unread ? -8 : 0, marginRight: n.unread ? -8 : 0 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: n.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 15 }}>{n.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: C.t1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.title}</div>
                      <div style={{ fontSize: 10.5, color: C.t2, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.body}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
                      <div style={{ fontSize: 9, color: C.t3 }}>{n.time}</div>
                      {n.unread && <div style={{ width: 7, height: 7, borderRadius: "50%", background: PURPLE }} />}
                    </div>
                  </div>
                ))
            }
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══ UTILISATEURS ═══════════════════════════════════════════════════════════ */
const ComptesPage = () => {
  const [_users, _setUsers] = useState([]);
  const [loading, setLoad] = useState(true);
  const [tab, setTab] = useState("tous");
  const [search, setSearch] = useState("");
  const [actionLoading, setAL] = useState(null);
  const [patenteUrl, setPatenteUrl] = useState(null);
  const toast = useToast();
  const { modal, confirm, yes, no } = useConfirm();

  const load = useCallback(async () => {
    try {
      setLoad(true);
      const { data } = await axios.get(`${API}/admin/users`, { headers: authHeaders() });
      _setUsers(data);
    } catch { _setUsers([]); } finally { setLoad(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleValidate = async (id, name) => {
    try {
      setAL(id + "_v");
      await axios.patch(`${API}/admin/users/${id}/status`, { status: "valide" }, { headers: authHeaders() });
      _setUsers(p => p.map(u => u._id === id ? { ...u, status: "valide" } : u));
      toast.success(`${name} validé`);
    } catch { toast.error("Erreur"); } finally { setAL(null); }
  };
  const handleReject = async (id, name) => {
    if (!await confirm({ type: "warning", title: "Rejeter ce compte ?", message: `"${name}" ne pourra pas accéder à la plateforme.`, confirmLabel: "Rejeter" })) return;
    try {
      setAL(id + "_r");
      await axios.patch(`${API}/admin/users/${id}/status`, { status: "rejected" }, { headers: authHeaders() });
      _setUsers(p => p.map(u => u._id === id ? { ...u, status: "rejected" } : u));
      toast.info(`${name} rejeté`);
    } catch { toast.error("Erreur"); } finally { setAL(null); }
  };
  const handleDelete = async (id, name) => {
    if (!await confirm({ type: "danger", title: "Supprimer ce compte ?", message: `Le compte de "${name}" sera définitivement supprimé.`, confirmLabel: "Supprimer" })) return;
    try {
      setAL(id + "_d");
      await axios.delete(`${API}/admin/users/${id}`, { headers: authHeaders() });
      _setUsers(p => p.filter(u => u._id !== id));
      toast.success(`${name} supprimé`);
    } catch { toast.error("Erreur"); } finally { setAL(null); }
  };

  const tabs = [
    { k: "tous",         l: "Tous",          count: _users.length },
    { k: "prestataire",  l: "Prestataires",  count: _users.filter(u => u.role === "prestataire").length },
    { k: "organisateur", l: "Organisateurs", count: _users.filter(u => u.role === "organisateur").length },
    { k: "en_attente",   l: "En attente",    count: _users.filter(u => u.role === "prestataire" && u.status === "en_attente").length },
  ];

  const filtered = _users.filter(u => {
    const mt = tab === "tous" ? true : tab === "en_attente" ? (u.role === "prestataire" && u.status === "en_attente") : u.role === tab;
    const ms = search === "" || `${u.firstname} ${u.lastname} ${u.email}`.toLowerCase().includes(search.toLowerCase());
    return mt && ms;
  });

  const pendingCount = _users.filter(u => u.role === "prestataire" && u.status === "en_attente").length;

  return (
    <div>
      <ConfirmModal modal={modal} yes={yes} no={no} />
      <Toasts toasts={toast.toasts} remove={toast.remove} />
      {patenteUrl && <PatenteModal url={patenteUrl} onClose={() => setPatenteUrl(null)} />}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: C.t1, fontFamily: "'Google Sans',sans-serif", margin: 0 }}></h2>
          <p style={{ fontSize: 13, color: C.t2, margin: "4px 0 0" }}>{_users.length} utilisateurs au total</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.card, border: `1px solid ${C.border}`, borderRadius: 24, padding: "8px 16px", width: 240 }}>
          <Search size={14} color={C.t3} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." style={{ border: "none", background: "transparent", fontSize: 13, color: C.t1, width: "100%", fontFamily: "inherit" }} />
        </div>
      </div>

      <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, marginBottom: 20 }}>
        {tabs.map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} style={{ padding: "10px 20px", border: "none", background: "transparent", cursor: "pointer", fontSize: 14, fontWeight: 500, fontFamily: "'Google Sans',sans-serif", color: tab === t.k ? C.accent : C.t2, borderBottom: tab === t.k ? `2px solid ${C.accent}` : "2px solid transparent", marginBottom: "-1px", display: "flex", alignItems: "center", gap: 7 }}>
            {t.l}{t.count > 0 && <span style={{ background: tab === t.k ? C.accentBg : C.borderLight, color: tab === t.k ? C.accent : C.t3, borderRadius: 10, padding: "1px 8px", fontSize: 12, fontWeight: 600 }}>{t.count}</span>}
          </button>
        ))}
      </div>

      {pendingCount > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: C.orangeBg, border: `1px solid #fbbc04`, borderRadius: 8, padding: "10px 16px", marginBottom: 16, fontSize: 13, color: C.orange }}>
          <AlertCircle size={15} /><strong>{pendingCount} prestataire{pendingCount > 1 ? "s" : ""}</strong>&nbsp;en attente de validation
        </div>
      )}

      <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" }}>
        {loading
          ? <div style={{ padding: 24 }}>{[1, 2, 3, 4, 5].map(i => <div key={i} style={{ marginBottom: 12 }}><Skel h={52} r={8} /></div>)}</div>
          : filtered.length === 0 ? <EmptyState icon={Users} message="Aucun utilisateur trouvé" />
            : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.border}`, background: C.bg }}>
                      <TH>Nom</TH><TH>Email</TH><TH>Téléphone</TH><TH>Rôle</TH><TH>Statut</TH><TH>Actions</TH>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(u => {
                      const name = `${u.firstname} ${u.lastname}`;
                      const isPrest = u.role === "prestataire";
                      const hasPatente = isPrest && u.patente;
                      return (
                        <tr key={u._id} className="adash-table-row">
                          <TD>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <UserAvatar user={u} />
                              <div>
                                <div style={{ fontWeight: 500, color: C.t1, fontSize: 14 }}>{name}</div>
                                <div style={{ fontSize: 12, color: C.t3 }}>{u.locationName || u.region || "—"}</div>
                              </div>
                            </div>
                          </TD>
                          <TD>{u.email}</TD>
                          <TD>{u.numTel || "—"}</TD>
                          <TD><Badge statut={u.role} /></TD>
                          <TD>
                            {isPrest
                              ? <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                  <Badge statut={u.status || "en_attente"} />
                                  {hasPatente
                                    ? <span style={{ fontSize: 10, color: C.green, fontWeight: 600, cursor: "pointer", textDecoration: "underline" }} onClick={() => setPatenteUrl(u.patente)}>✓ Patente fournie</span>
                                    : <span style={{ fontSize: 10, color: C.orange, fontWeight: 600 }}>⚠ Pas de patente</span>
                                  }
                                </div>
                              : <span style={{ color: C.t3 }}>—</span>
                            }
                          </TD>
                          <TD>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                              {/* Patente button removed - now integrated in status column */}
                              {isPrest && u.status === "en_attente" && (
                                <>
                                  <button onClick={() => handleValidate(u._id, name)} disabled={actionLoading === u._id + "_v"} title="Valider" style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: C.greenBg, color: C.green, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><CheckCircle size={16} /></button>
                                  <button onClick={() => handleReject(u._id, name)} disabled={actionLoading === u._id + "_r"} title="Rejeter" style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: C.orangeBg, color: C.orange, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><XCircle size={16} /></button>
                                </>
                              )}
                              {isPrest && u.status === "rejected" && (
                                <button onClick={() => handleValidate(u._id, name)} disabled={actionLoading === u._id + "_v"} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: C.greenBg, color: C.green, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><CheckCircle size={16} /></button>
                              )}
                              <button onClick={() => handleDelete(u._id, name)} disabled={actionLoading === u._id + "_d"} title="Supprimer" style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: C.redBg, color: C.red, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Trash2 size={16} /></button>
                            </div>
                          </TD>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
        }
      </div>
    </div>
  );
};

/* ═══ RESSOURCES — sans Prestataire, Note, ni suppression ═══════════════════ */
const RessourcesPage = () => {
  const [resources, setResources] = useState([]);
  const [loading, setLoad] = useState(true);
  const [filter, setFilter] = useState("tous");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [comments, setComments] = useState({});
  const toast = useToast();

  useEffect(() => {
    const load = async () => {
      try {
        setLoad(true);
        const { data } = await axios.get(`${API}/admin/resources`, { headers: authHeaders() });
        setResources(data);
      } catch { setResources([]); } finally { setLoad(false); }
    };
    load();
  }, []);

  const loadComments = async id => {
    if (comments[id] !== undefined) { setExpanded(expanded === id ? null : id); return; }
    try {
      const { data } = await axios.get(`${API}/admin/resources/${id}/commentaires`, { headers: authHeaders() });
      setComments(p => ({ ...p, [id]: data }));
      setExpanded(id);
    } catch { setComments(p => ({ ...p, [id]: [] })); setExpanded(id); }
  };

  const types = ["tous", "salle", "materiel", "decoration", "traiteur", "dj", "photographe", "serveur"];
  const typeLabels = { tous: "Toutes", salle: "Salle", materiel: "Matériel", decoration: "Décoration", traiteur: "Traiteur", dj: "DJ", photographe: "Photo", serveur: "Serveur" };

  const filtered = resources.filter(r => {
    const mt = filter === "tous" || r.category === filter || r.type === filter;
    const ms = search === "" || `${r.name}`.toLowerCase().includes(search.toLowerCase());
    return mt && ms;
  });

  return (
    <div>
      <Toasts toasts={toast.toasts} remove={toast.remove} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: C.t1, fontFamily: "'Google Sans',sans-serif", margin: 0 }}></h2>
          <p style={{ fontSize: 13, color: C.t2, margin: "4px 0 0" }}>{resources.length} ressources au total</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.card, border: `1px solid ${C.border}`, borderRadius: 24, padding: "8px 16px", width: 220 }}>
          <Search size={14} color={C.t3} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." style={{ border: "none", background: "transparent", fontSize: 13, color: C.t1, width: "100%", fontFamily: "inherit" }} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {types.map(t => (
          <button key={t} onClick={() => setFilter(t)} style={{ padding: "6px 16px", borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", background: filter === t ? C.accentBg : C.card, color: filter === t ? C.accent : C.t2, border: filter === t ? `1.5px solid ${C.accent}` : `1px solid ${C.border}` }}>
            {typeLabels[t]}
          </button>
        ))}
      </div>

      <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" }}>
        {loading
          ? <div style={{ padding: 24 }}>{[1, 2, 3, 4, 5].map(i => <div key={i} style={{ marginBottom: 12 }}><Skel h={52} r={8} /></div>)}</div>
          : filtered.length === 0 ? <EmptyState icon={Package} message="Aucune ressource trouvée" />
            : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
                  <thead>
                    <tr style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}>
                      <TH>Ressource</TH><TH>Catégorie</TH><TH>Type</TH><TH>Prix</TH><TH>Commentaires</TH>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(r => (
                      <>
                        <tr key={r._id} className="adash-table-row">
                          <TD style={{ fontWeight: 600, color: C.t1, fontSize: 14 }}>
                            <div>{r.name}</div>
                            <div style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>Stock: {r.stock ?? "—"}</div>
                          </TD>
                          <TD><Badge statut={r.category} /></TD>
                          <TD><Badge statut={r.type} /></TD>
                          <TD style={{ fontWeight: 700, color: C.purple, fontSize: 14 }}>{Number(r.price).toFixed(2)} €</TD>
                          <TD>
                            <button onClick={() => loadComments(r._id)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 20, background: C.accentBg, border: "none", color: C.accent, cursor: "pointer", fontSize: 13, fontWeight: 500, fontFamily: "inherit" }}>
                              <Eye size={14} />Voir<ChevronDown size={13} style={{ transform: expanded === r._id ? "rotate(180deg)" : "none", transition: "transform .25s" }} />
                            </button>
                          </TD>
                        </tr>
                        {expanded === r._id && (
                          <tr key={r._id + "_exp"}>
                            <td colSpan={5} style={{ padding: "0 20px 16px", background: "#f8f9ff" }}>
                              <div style={{ borderRadius: 10, border: `1px solid ${C.accentBg}`, overflow: "hidden", marginTop: 4 }}>
                                <div style={{ padding: "10px 16px", background: C.accentBg, fontSize: 13, fontWeight: 600, color: C.accentText }}>Commentaires pour « {r.name} »</div>
                                {!comments[r._id] || comments[r._id].length === 0
                                  ? <div style={{ padding: "16px", fontSize: 13, color: C.t3 }}>Aucun commentaire.</div>
                                  : (
                                    <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                                      {comments[r._id].map(c => {
                                        const stars = c.nbr_stars || 0;
                                        const user = c.C_user;
                                        const init = user ? `${user.firstname?.[0] || ""}${user.lastname?.[0] || ""}`.toUpperCase() : "?";
                                        return (
                                          <div key={c._id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                                              <div style={{ width: 34, height: 34, borderRadius: "50%", background: C.accentBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: C.accent, flexShrink: 0 }}>{init}</div>
                                              <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 600, fontSize: 13, color: C.t1 }}>{user ? `${user.firstname} ${user.lastname}` : "Inconnu"}</div>
                                                <div style={{ fontSize: 11, color: C.t3 }}>{user?.email}</div>
                                              </div>
                                              <div style={{ display: "flex", gap: 2 }}>{[1, 2, 3, 4, 5].map(s => <span key={s} style={{ fontSize: 16, color: s <= stars ? "#f59e0b" : "#e8eaed" }}>&#9733;</span>)}</div>
                                              <div style={{ fontSize: 11, color: C.t3 }}>{new Date(c.createdAt).toLocaleDateString("fr-FR")}</div>
                                            </div>
                                            <p style={{ fontSize: 13, color: C.t2, margin: 0, lineHeight: 1.5 }}>{c.contenue}</p>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )
                                }
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            )
        }
      </div>
    </div>
  );
};

/* ═══ ÉVÉNEMENTS ════════════════════════════════════════════════════════════ */
const EvenementsPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoad] = useState(true);
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [categoryFilter, setCategoryFilter] = useState("tous");
  const toast = useToast();
  const { modal, confirm, yes, no } = useConfirm();

  const load = useCallback(async () => {
    try { setLoad(true); const { data } = await axios.get(`${API}/admin/events`, { headers: authHeaders() }); setEvents(data); }
    catch { setEvents([]); } finally { setLoad(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const categories = ["tous", "Mariage", "Conference", "Anniversaire", "Seminaire", "autre"];

  const filtered = events.filter(e => {
    const ms = search === "" || `${e.title} ${e.lieu} ${e.category}`.toLowerCase().includes(search.toLowerCase());
    const mc = categoryFilter === "tous" || e.category === categoryFilter;
    
    // Date filter
    let md = true;
    if (dateRange.start && e.dateDebut) {
      const eventDate = new Date(e.dateDebut);
      const startDate = new Date(dateRange.start);
      if (eventDate < startDate) md = false;
    }
    if (dateRange.end && e.dateFin) {
      const eventDate = new Date(e.dateFin);
      const endDate = new Date(dateRange.end);
      if (eventDate > endDate) md = false;
    }
    
    return ms && mc && md;
  });

  return (
    <div>
      <ConfirmModal modal={modal} yes={yes} no={no} />
      <Toasts toasts={toast.toasts} remove={toast.remove} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: C.t1, fontFamily: "'Google Sans',sans-serif", margin: 0 }}></h2>
          <p style={{ fontSize: 13, color: C.t2, margin: "4px 0 0" }}>{events.length} événements au total</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.card, border: `1px solid ${C.border}`, borderRadius: 24, padding: "8px 16px", width: 240 }}>
          <Search size={14} color={C.t3} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." style={{ border: "none", background: "transparent", fontSize: 13, color: C.t1, width: "100%", fontFamily: "inherit" }} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: C.t3, marginRight: 4 }}>Date début:</span>
          <input 
            type="date" 
            value={dateRange.start} 
            onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
            style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12 }}
          />
          <span style={{ fontSize: 12, color: C.t3, marginLeft: 8, marginRight: 4 }}>Date fin:</span>
          <input 
            type="date" 
            value={dateRange.end} 
            onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
            style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12 }}
          />
          {(dateRange.start || dateRange.end) && (
            <button 
              onClick={() => setDateRange({ start: "", end: "" })}
              style={{ padding: "6px 12px", borderRadius: 20, fontSize: 11, background: C.bg, border: `1px solid ${C.border}`, cursor: "pointer" }}
            >
              Réinitialiser
            </button>
          )}
        </div>
        
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: C.t3, alignSelf: "center", marginRight: 4 }}>Catégorie:</span>
          {categories.map(c => (
            <button key={c} onClick={() => setCategoryFilter(c)} style={{ padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", background: categoryFilter === c ? "#f3e8ff" : C.card, color: categoryFilter === c ? C.purple : C.t2, border: categoryFilter === c ? `1.5px solid ${C.purple}` : `1px solid ${C.border}` }}>
              {c === "tous" ? "Toutes" : c}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" }}>
        {loading
          ? <div style={{ padding: 24 }}>{[1, 2, 3, 4, 5].map(i => <div key={i} style={{ marginBottom: 12 }}><Skel h={52} r={8} /></div>)}</div>
          : filtered.length === 0 ? <EmptyState icon={Calendar} message="Aucun événement trouvé" />
            : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 650 }}>
                  <thead>
                    <tr style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}>
                      <TH>Événement</TH><TH>Catégorie</TH><TH>Type</TH><TH>Dates</TH><TH>Lieu</TH>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(ev => (
                      <tr key={ev._id} className="adash-table-row">
                        <TD>
                          <div style={{ fontWeight: 600, color: C.t1, fontSize: 14 }}>{ev.title}</div>
                        </TD>
                        <TD><Badge statut={ev.category} /></TD>
                        <TD><Badge statut={ev.type} /></TD>
                        <TD>
                          <div style={{ fontSize: 12, color: C.t1 }}>{ev.dateDebut ? new Date(ev.dateDebut).toLocaleDateString("fr-FR") : "—"}</div>
                          <div style={{ fontSize: 11, color: C.t3 }}>{ev.dateFin ? `→ ${new Date(ev.dateFin).toLocaleDateString("fr-FR")}` : ""}</div>
                        </TD>
                        <TD>
                          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: C.t2 }}>
                            <MapPin size={13} color={C.t3} />{ev.lieu || "—"}
                          </div>
                        </TD>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
        }
      </div>
    </div>
  );
};

/* ═══ ROOT ══════════════════════════════════════════════════════════════════ */
const pageTitles = {
  dashboard: "Dashboard", gestion: "Utilisateurs",
  ressources: "Ressources", evenements: "Événements",
};

export default function AdminDashboard() {
  useEffect(() => { injectStyles(); }, []);
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState("dashboard");
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const h = () => { setWindowWidth(window.innerWidth); if (window.innerWidth > 768) setIsMobileOpen(false); };
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  const isMobile = windowWidth <= 768;
  const handleLogout = () => { localStorage.removeItem("token"); localStorage.removeItem("user"); navigate("/"); };

  const pages = {
    dashboard:  <DashboardPage setActivePage={setActivePage} />,
    gestion:    <ComptesPage />,
    ressources: <RessourcesPage />,
    evenements: <EvenementsPage />,
  };

  return (
    <div style={{ fontFamily: "Roboto,sans-serif", background: C.bg, minHeight: "100vh" }}>
      <Sidebar active={activePage} setActive={setActivePage} onLogout={handleLogout} isMobile={isMobile} isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />
      <div style={{ marginLeft: isMobile ? 0 : 256, transition: "margin-left .25s ease" }}>
        <TopBar title={pageTitles[activePage] || ""} isMobile={isMobile} />
        <main style={{ padding: isMobile ? 16 : 28 }}>
          {pages[activePage]}
        </main>
      </div>
    </div>
  );
}
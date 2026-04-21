import React, { useState, useEffect } from "react";
import axios from "axios";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Navbar from "../components/navbar";
import AuthModal from "../components/AuthModal";
import SelectEventModal from "../components/SelectEventModal";
import QuickEventModal from "../components/QuickEventModal";
import { useNavigate } from "react-router-dom";



/* ═══════════════════════════════════════════
   SVG ICONS (rajout de l'icône manquante)
═══════════════════════════════════════════ */
const Ic = {
  bag: (p) => <svg {...p} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" /></svg>,
  box: (p) => <svg {...p} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>,
  service: (p) => <svg {...p} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>,
  send: (p) => <svg {...p} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>,
  trash: (p) => <svg {...p} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6M9 6V4h6v2" /></svg>,
  plus: (p) => <svg {...p} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  minus: (p) => <svg {...p} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  close: (p) => <svg {...p} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  clock: (p) => <svg {...p} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
  check: (p) => <svg {...p} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>,
  xmark: (p) => <svg {...p} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  card: (p) => <svg {...p} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>,
  info: (p) => <svg {...p} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>,
  upload: (p) => <svg {...p} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>,
  user: (p) => <svg {...p} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
  calendar: (p) => <svg {...p} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
  search: (p) => <svg {...p} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
  lock: (p) => <svg {...p} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>,
};

const cx = (...a) => a.filter(Boolean).join(" ");

/* ═══════════════════════════════════════════
   TOAST
═══════════════════════════════════════════ */
function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 3800);
    return () => clearTimeout(t);
  }, [toast, onClose]);
  if (!toast) return null;
  const colors = { success: "#10B981", error: "#EF4444", info: "#6366F1", warning: "#F59E0B" };
  return (
    <div className="fixed top-5 right-5 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-2xl text-white text-sm font-semibold shadow-2xl"
      style={{ background: colors[toast.type] || colors.info, animation: "toastIn .28s cubic-bezier(.34,1.56,.64,1)", maxWidth: 360 }}>
      {toast.type === "success" ? <Ic.check width={16} height={16} /> : toast.type === "error" ? <Ic.xmark width={16} height={16} /> : <Ic.info width={16} height={16} />}
      <span className="flex-1">{toast.message}</span>
      <button onClick={onClose} className="opacity-60 hover:opacity-100"><Ic.close width={15} height={15} /></button>
    </div>
  );
}

/* ═══════════════════════════════════════════
   STATUS PILL
═══════════════════════════════════════════ */
function StatusPill({ status }) {
  const cfg = {
    "en attente": { bg: "#FEF3C7", fg: "#92400E", Icon: Ic.clock, label: "En attente" },
    "acceptée": { bg: "#D1FAE5", fg: "#065F46", Icon: Ic.check, label: "Acceptée" },
    "refusée": { bg: "#FEE2E2", fg: "#991B1B", Icon: Ic.xmark, label: "Refusée" },
  };
  const c = cfg[status] || cfg["en attente"];
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
      style={{ background: c.bg, color: c.fg }}>
      <c.Icon width={11} height={11} /> {c.label}
    </span>
  );
}

/* ═══════════════════════════════════════════
   TYPE BADGE
═══════════════════════════════════════════ */
function TypeBadge({ type }) {
  return type === "product" ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold"
      style={{ background: "#DCFCE7", color: "#166534" }}>
      <Ic.box width={11} height={11} /> Produit
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold"
      style={{ background: "#EDE9FE", color: "#5B21B6" }}>
      <Ic.service width={11} height={11} /> Service
    </span>
  );
}

/* ═══════════════════════════════════════════
   CART ROW
═══════════════════════════════════════════ */
function CartRow({ item, stockMax, onQty, onRemove, onSend, isSending }) {
  const isService = item.type === "service";
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 px-5 py-4 hover:bg-slate-50/60 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <TypeBadge type={item.type || "product"} />
          <span className="text-sm font-bold text-gray-800 truncate">{item.resourceName}</span>
        </div>
        <div className="text-xs text-gray-400">
          {item.price}€ / {isService ? "prestation" : "unité"}
          {!isService && ` · Stock : ${stockMax}`}
          {item.selectedDate && ` · ${new Date(item.selectedDate).toLocaleDateString("fr-FR")}`}
          {item.selectedTimes?.length > 0 && ` · ${item.selectedTimes.length} créneau(x)`}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {!isService ? (
          <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
            <button onClick={() => onQty(item.resourceId, item.quantity - 1)} disabled={item.quantity <= 1}
              className="px-2.5 py-2 hover:bg-gray-50 disabled:opacity-30 transition text-gray-400 border-r border-gray-200">
              <Ic.minus width={13} height={13} />
            </button>
            <span className="px-4 py-2 text-sm font-black text-gray-900 tabular-nums min-w-[2.5rem] text-center">
              {item.quantity}
            </span>
            <button onClick={() => onQty(item.resourceId, item.quantity + 1)} disabled={item.quantity >= stockMax}
              className="px-2.5 py-2 hover:bg-gray-50 disabled:opacity-30 transition text-gray-400 border-l border-gray-200">
              <Ic.plus width={13} height={13} />
            </button>
          </div>
        ) : (
          <span className="text-xs text-gray-400 border border-gray-200 rounded-xl px-3 py-2 font-medium">1 prestation</span>
        )}
        <span className="text-sm font-black tabular-nums min-w-[56px] text-right" style={{ color: "#4338CA" }}>
          {item.totalPrice}€
        </span>
        <button onClick={() => onSend(item)} disabled={isSending || stockMax === 0}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(135deg,#4338CA,#6366F1)" }}>
          {isSending
            ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Envoi...</>
            : <><Ic.send width={13} height={13} />Envoyer la demande</>}
        </button>
        <button onClick={() => onRemove(item.resourceId)}
          className="p-2 rounded-xl text-gray-300 hover:text-rose-500 hover:bg-rose-50 transition">
          <Ic.trash width={14} height={14} />
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   RESERVATION CARD
═══════════════════════════════════════════ */
function ReservationCard({ res, onPay }) {
  const accepted = res.status === "acceptée";
  const navigate = useNavigate();
  const pending = res.status === "en attente";
  const isPaid = res.payer === "payer"; // ✅ nouveau

  const handleViewInvoice = () => {
    if (res.invoice) {
      window.open(`http://localhost:5000/${res.invoice}`, "_blank");
    }
  };

  return (
    <div className={cx(
      "bg-white rounded-2xl border px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4 transition hover:shadow-md",
      isPaid ? "border-violet-200"
        : accepted ? "border-emerald-200"
          : res.status === "refusée" ? "border-rose-100"
            : "border-gray-100"
    )}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2.5 flex-wrap mb-2">
          <span className="font-bold text-sm text-gray-900 truncate">{res.resource?.name || "Ressource"}</span>
          <StatusPill status={res.status} />
          {res.resource?.type && <TypeBadge type={res.resource.type} />}

          {/* ✅ Badge "Payé" */}
          {isPaid && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold"
              style={{ background: "#EDE9FE", color: "#6D28D9" }}>
              <Ic.check width={10} height={10} /> Payé
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <Ic.calendar width={12} height={12} />
            {format(new Date(res.dateDebut), "dd MMM yyyy", { locale: fr })}
            {" → "}
            {format(new Date(res.dateFin), "dd MMM yyyy", { locale: fr })}
          </span>
          <span className="font-bold" style={{ color: isPaid ? "#6D28D9" : "#4338CA" }}>
            {res.resource?.price}€
          </span>
          {res.event?.title && <span className="text-gray-300">· {res.event.title}</span>}
          {/* ✅ Date de paiement */}
          {isPaid && res.paymentDate && (
            <span className="text-violet-400">
              · Payé le {format(new Date(res.paymentDate), "dd MMM yyyy", { locale: fr })}
            </span>
          )}
        </div>
      </div>

      {/* ✅ Bouton dynamique selon état */}
      {isPaid ? (
        // Payé → voir la facture
        <button
          onClick={handleViewInvoice}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white whitespace-nowrap transition hover:opacity-90"
          style={{ background: "linear-gradient(135deg,#7C3AED,#6D28D9)" }}
        >
          <svg width={14} height={14} fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          Voir la facture
        </button>
      ) : accepted ? (
        // Acceptée non payée → payer
        <button
          onClick={() => navigate("/payer", {
            state: { amount: res.resource?.price, locationId: res._id }
          })}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white whitespace-nowrap transition hover:opacity-90"
          style={{ background: "linear-gradient(135deg,#059669,#10B981)" }}
        >
          <Ic.card width={14} height={14} /> Payer {res.resource?.price}€
        </button>
      ) : pending ? (
        // En attente
        <span className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-400 border border-gray-200 whitespace-nowrap">
          En attente de réponse
        </span>
      ) : null}
    </div>
  );
}
/* ═══════════════════════════════════════════
   STAT CARD
═══════════════════════════════════════════ */
function StatCard({ label, value, accent }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4 shadow-sm">
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-3xl font-black tabular-nums" style={{ color: accent }}>{value}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PAGE PRINCIPALE
═══════════════════════════════════════════════════════════════ */
export default function MesReservations() {
  const navigate = useNavigate();

  const [reservations, setReservations] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(null);
  const [userEvents, setUserEvents] = useState([]);

  /* Modals */
  const [authModal, setAuthModal] = useState({ open: false, item: null });
  const [selectModal, setSelectModal] = useState({ open: false, item: null });
  const [quickEventModal, setQuickEventModal] = useState({ open: false, item: null });

  const [toast, setToast] = useState(null);
  const [stockLimits, setStockLimits] = useState({});

  const notify = (message, type = "info") => setToast({ message, type });

  /* Auth state */
  const [authToken, setAuthToken] = useState(() => localStorage.getItem("token"));
  const [authUser, setAuthUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user") || "null"); }
    catch { return null; }
  });

  useEffect(() => {
    loadCart();
    if (authToken) {
      fetchReservations(authToken);
      fetchUserEvents(authToken);
    } else {
      setLoading(false);
    }
  }, [authToken]);

  /* ── PANIER ── */
  const loadCart = async () => {
    const raw = localStorage.getItem("reservationCart");
    if (!raw) return;
    const items = JSON.parse(raw);
    const validItems = items.filter(item => item.resourceId && item.resourceId !== "undefined");
    if (validItems.length !== items.length) {
      console.warn("Des items avec resourceId undefined ont été filtrés");
      saveCart(validItems);
    }
    setCartItems(validItems);
    const stocks = {};
    await Promise.all(validItems.map(async (i) => {
      try {
        const r = await axios.get(`http://localhost:5000/api/ressources/get_by_id/${i.resourceId}`);
        stocks[i.resourceId] = r.data.quantity ?? 999;
      } catch (err) {
        console.error(`Erreur chargement stock pour ${i.resourceId}:`, err);
        stocks[i.resourceId] = i.type === "service" ? 1 : 999;
      }
    }));
    setStockLimits(s => ({ ...s, ...stocks }));
  };

  const saveCart = (items) => {
    localStorage.setItem("reservationCart", JSON.stringify(items));
    setCartItems(items);
  };

  const removeItem = (id) => {
    if (!id) return;
    saveCart(cartItems.filter(i => i.resourceId !== id));
  };

  const updateQty = (resourceId, newQty) => {
    if (!resourceId) return;
    const max = stockLimits[resourceId] ?? 999;
    if (newQty < 1) { removeItem(resourceId); return; }
    if (newQty > max) { notify(`Stock maximum : ${max}`, "error"); return; }
    saveCart(cartItems.map(i =>
      i.resourceId === resourceId
        ? { ...i, quantity: newQty, totalPrice: newQty * i.price }
        : i
    ));
  };

  /* ── EVENTS UTILISATEUR ── */
  const fetchUserEvents = async (tok) => {
    const t = tok || authToken;
    const currentUser = authUser || JSON.parse(localStorage.getItem("user") || "null");
    const uid = currentUser?._id || currentUser?.id;
    if (!t || !uid) return;
    try {
      const res = await axios.get(
        `http://localhost:5000/api/event/user_event/${uid}`,
        { headers: { Authorization: `Bearer ${t}` } }
      );
      setUserEvents(res.data || []);
    } catch (e) { console.error(e); }
  };

  /* ── OUVRIR LE MODAL D'ENVOI ── */
  const openSendModal = (item) => {
    if (!item || !item.resourceId || item.resourceId === "undefined") {
      notify("Erreur: cet article n'a pas d'identifiant valide", "error");
      return;
    }
    const tok = localStorage.getItem("token");
    if (!tok) {
      setAuthModal({ open: true, item });
      return;
    }
    setSelectModal({ open: true, item });
  };

  /* ── AUTH SUCCESS ── */
  const handleAuthSuccess = (token, user) => {
    setAuthToken(token);
    setAuthUser(user);
    const pendingItem = authModal.item;
    setAuthModal({ open: false, item: null });
    notify(`Bienvenue ${user.firstname || ""} !`, "success");
    fetchReservations(token);
    fetchUserEvents(token);
    if (pendingItem) {
      setTimeout(() => setSelectModal({ open: true, item: pendingItem }), 280);
    }
  };

  /* ── RÉSERVATIONS ── */
  const fetchReservations = async (tok) => {
    const t = tok || authToken;
    if (!t) { setLoading(false); return; }
    try {
      const res = await axios.get("http://localhost:5000/api/location/get_my_locations", {
        headers: { Authorization: `Bearer ${t}` },
      });
      setReservations(res.data);
      const stocks = {};
      await Promise.all(res.data.map(async (r) => {
        if (!r.resource?._id) return;
        try {
          const sr = await axios.get(`http://localhost:5000/api/ressources/get_by_id/${r.resource._id}`);
          stocks[r.resource._id] = sr.data.stock ?? 999;
        } catch { stocks[r.resource._id] = 999; }
      }));
      setStockLimits(s => ({ ...s, ...stocks }));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  /* ══════════════════════════════════════════════════════
     ✅ ENVOI DIRECT — JSON uniquement, pas de FormData
     Le CIN est déjà lié à l'événement lors de sa création
  ══════════════════════════════════════════════════════ */
  const sendRequestWithData = async (eventId) => {
    const cartItem = selectModal.item || quickEventModal.item;

    if (!cartItem) {
      notify("Erreur: aucun article sélectionné", "error");
      setSending(null);
      return;
    }

    if (!cartItem.resourceId || cartItem.resourceId === "undefined") {
      notify("Erreur: ID de ressource invalide", "error");
      setSending(null);
      return;
    }

    if (!eventId) {
      notify("Erreur: aucun événement sélectionné", "error");
      setSending(null);
      return;
    }

    const tok = authToken || localStorage.getItem("token");
    const itemDate = cartItem.selectedDate || new Date().toISOString();

    setSending(cartItem.resourceId);
    setSelectModal(m => ({ ...m, open: false }));
    setQuickEventModal({ open: false, item: null });

    try {
      const slots = cartItem.selectedTimes?.length > 0
        ? cartItem.selectedTimes
        : [{ start: itemDate, end: itemDate }];

      for (const slot of slots) {
        // ✅ JSON simple — req.body sera correctement parsé par Express
        await axios.post(
          "http://localhost:5000/api/location/create",
          {
            event: eventId,
            resource: cartItem.resourceId,
            dateDebut: slot.start || itemDate,
            dateFin: slot.end || itemDate,
          },
          {
            headers: {
              Authorization: `Bearer ${tok}`,
              // ✅ Pas de Content-Type manuel — axios met application/json automatiquement
            },
          }
        );
      }

      removeItem(cartItem.resourceId);
      notify(`Demande envoyée pour "${cartItem.resourceName || "la ressource"}" !`, "success");
      await fetchReservations(tok);
    } catch (e) {
      console.error("Erreur détaillée:", e.response?.data || e.message);
      notify(e.response?.data?.message || "Erreur lors de l'envoi.", "error");
    } finally {
      setSending(null);
    }
  };

  /* ── ENVOI DEMANDE (appelé depuis SelectEventModal) ── */
  // ✅ cinFile ignoré ici — plus besoin de le transmettre à /location/create
  const sendRequest = async (eventId) => {
    await sendRequestWithData(eventId);
  };

  /* ── QUAND UN NOUVEL ÉVÉNEMENT EST CRÉÉ ── */
  // ✅ cinFile ignoré ici aussi — il a déjà été uploadé dans addEvent
  const handleEventCreated = (newEventId) => {
    if (!newEventId) {
      notify("Erreur: événement créé sans ID", "error");
      setQuickEventModal({ open: false, item: null });
      return;
    }
    sendRequestWithData(newEventId);
  };

  /* ── OUVRIR LE MODAL DE CRÉATION D'ÉVÉNEMENT RAPIDE ── */
  const openQuickEventModal = () => {
    if (!selectModal.item) {
      notify("Erreur: aucun article sélectionné", "error");
      return;
    }
    setQuickEventModal({ open: true, item: selectModal.item });
    setSelectModal(m => ({ ...m, open: false }));
  };

  /* ── Stats ── */
  const totalCart = cartItems.reduce((s, i) => s + (i.quantity || 1), 0);
  const totalSent = reservations.length;
  const totalAccepted = reservations.filter(r => r.status === "acceptée").length;
  const isEmpty = !cartItems.length && !reservations.length;

  if (loading) return (
    <>
      <Navbar />
      <div className="min-h-screen flex items-center justify-center pt-24">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-xs text-gray-400">Chargement...</p>
        </div>
      </div>
    </>
  );

  return (
    <>
      <Navbar />

      <style>{`
        @keyframes toastIn { from { opacity:0; transform:translateY(-14px) scale(.94); } to { opacity:1; transform:none; } }
        @keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }
      `}</style>

      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* AUTH MODAL */}
      <AuthModal
        isOpen={authModal.open}
        onClose={() => setAuthModal({ open: false, item: null })}
        pendingItem={authModal.item}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* SELECT EVENT MODAL */}
      <SelectEventModal
        isOpen={selectModal.open}
        onClose={() => setSelectModal(m => ({ ...m, open: false }))}
        onConfirm={sendRequest}
        events={userEvents}
        onCreateNew={openQuickEventModal}
        resourceDate={selectModal.item?.selectedDate || null} 
      />

      {/* QUICK EVENT MODAL */}
      <QuickEventModal
        isOpen={quickEventModal.open}
        onClose={() => setQuickEventModal({ open: false, item: null })}
        onEventCreated={handleEventCreated}
      />

      <div className="min-h-screen pt-24 pb-16 px-4" style={{ background: "#F7F8FF" }}>
        <div className="max-w-4xl mx-auto">

          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-lg"
              style={{ background: "linear-gradient(135deg,#4338CA,#6366F1)" }}>
              <Ic.bag width={20} height={20} />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900">Mes réservations</h1>
              <p className="text-xs text-gray-400">Gérez votre panier et vos demandes</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <StatCard label="Dans le panier" value={totalCart} accent="#4338CA" />
            <StatCard label="Demandes envoyées" value={totalSent} accent="#7C3AED" />
            <StatCard label="Acceptées" value={totalAccepted} accent="#059669" />
          </div>

          {/* Banner non connecté */}
          {!authToken && cartItems.length > 0 && (
            <div className="mb-6 flex items-center gap-3 px-5 py-4 rounded-2xl border"
              style={{ background: "#EEF2FF", borderColor: "#C7D2FE" }}>
              <Ic.lock width={18} height={18} className="text-indigo-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-indigo-800">Connexion requise pour envoyer</p>
                <p className="text-xs text-indigo-500">Cliquez "Envoyer la demande" sur n'importe quel article pour vous connecter.</p>
              </div>
            </div>
          )}

          {/* Empty */}
          {isEmpty && (
            <div className="bg-white rounded-3xl border border-gray-100 p-16 text-center shadow-sm">
              <div className="w-16 h-16 rounded-3xl mx-auto mb-5 flex items-center justify-center"
                style={{ background: "#F3F4F6" }}>
                <Ic.bag width={28} height={28} className="text-gray-200" />
              </div>
              <h3 className="font-black text-gray-700 mb-1">Aucune réservation</h3>
              <p className="text-sm text-gray-400 mb-6">Vous n'avez encore rien dans votre panier.</p>
              <button onClick={() => navigate("/les_ressources")}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition hover:opacity-90"
                style={{ background: "linear-gradient(135deg,#4338CA,#6366F1)" }}>
                <Ic.search width={14} height={14} /> Découvrir les ressources
              </button>
            </div>
          )}

          {/* Panier */}
          {cartItems.length > 0 && (
            <section className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-black text-gray-800">Produits & services dans le panier</span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                  style={{ background: "#DCFCE7", color: "#166634" }}>
                  {totalCart} article{totalCart > 1 ? "s" : ""}
                </span>
              </div>
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
                {cartItems.map((item) => (
                  <CartRow
                    key={item.resourceId || item.id || Math.random().toString()}
                    item={item}
                    stockMax={item.type === "service" ? 1 : (stockLimits[item.resourceId] ?? 999)}
                    onQty={updateQty}
                    onRemove={removeItem}
                    onSend={openSendModal}
                    isSending={sending === item.resourceId}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Demandes envoyées */}
          {authToken && reservations.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-black text-gray-800">Mes demandes envoyées</span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                  style={{ background: "#EDE9FE", color: "#5B21B6" }}>
                  {totalSent} demande{totalSent > 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {reservations.map((res) => (
                  <ReservationCard
                    key={res._id}
                    res={res}
                    onPay={(r) => notify(`Paiement pour ${r.resource?.name} — ${r.resource?.price}€`, "info")}
                  />
                ))}
              </div>
            </section>
          )}

        </div>
      </div>
    </>
  );
}
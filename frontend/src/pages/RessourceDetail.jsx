import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import {
  MapPin, Mail, Users, Phone, ArrowLeft, CheckCircle2,
  ChevronLeft, ChevronRight, Maximize2, X, Calendar, Clock,
  CalendarRange, Star, MessageCircle, ThumbsUp, Send, Map,
  User, Clock3, CalendarClock, Check, AlertCircle, Info,
  Edit3, Trash2, Flag, Zap, Ruler, Palette, Weight, Tag,
  Building, ShoppingCart, Package, ChevronDown
} from "lucide-react";
import AuthModal from "../components/AuthModal";

/* ─────────────────────────────────────────────────
   MINI CART SIDEBAR (popup droite)
───────────────────────────────────────────────── */
function CartSidebar({ isOpen, onClose, cartItems, onRemove, onNavigate }) {
  const total = cartItems.reduce((s, i) => s + (i.totalPrice || i.price), 0);

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={onClose} />
      )}
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col shadow-2xl transition-all duration-300"
        style={{
          width: 340,
          background: "#fff",
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          borderLeft: "0.5px solid #e5e7eb",
        }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-indigo-600" />
            <span className="font-bold text-gray-900">Mon panier</span>
            {cartItems.length > 0 && (
              <span className="bg-indigo-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {cartItems.length}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full transition">
            <X size={16} className="text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {cartItems.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <ShoppingCart size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Votre panier est vide</p>
            </div>
          ) : cartItems.map((item) => (
            <div key={item.resourceId}
              className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={item.type === "product"
                      ? { background: "#DCFCE7", color: "#166534" }
                      : { background: "#EDE9FE", color: "#5B21B6" }}>
                    {item.type === "product" ? "Produit" : "Service"}
                  </span>
                  <span className="text-xs font-semibold text-gray-800 truncate">{item.resourceName}</span>
                </div>
                {item.selectedDate && (
                  <p className="text-[10px] text-gray-400">
                    {new Date(item.selectedDate).toLocaleDateString("fr-FR")}
                    {item.selectedTimes?.length > 0 && ` · ${item.selectedTimes.length} créneau(x)`}
                  </p>
                )}
                <p className="text-xs font-bold text-indigo-600 mt-1">{item.totalPrice || item.price}DT</p>
              </div>
              <button onClick={() => onRemove(item.resourceId)}
                className="p-1 text-gray-300 hover:text-rose-500 transition flex-shrink-0">
                <X size={13} />
              </button>
            </div>
          ))}
        </div>

        {cartItems.length > 0 && (
          <div className="px-4 py-4 border-t border-gray-100 space-y-3">
            <div className="flex items-center justify-between text-sm font-bold text-gray-900">
              <span>Total estimé</span>
              <span className="text-indigo-600">{total}DT</span>
            </div>
            <button
              onClick={onNavigate}
              className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 hover:opacity-90 transition"
              style={{ background: "linear-gradient(135deg,#4338CA,#6366F1)" }}>
              <Send size={14} /> Envoyer les demandes
            </button>
            <p className="text-[10px] text-gray-400 text-center">
              Connexion requise pour envoyer
            </p>
          </div>
        )}
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────
   PAGE PRINCIPALE
───────────────────────────────────────────────── */
export default function ResourceDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addedToCart, setAddedToCart] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Auth Modal states
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [pendingCartItem, setPendingCartItem] = useState(null);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [selectedTimes, setSelectedTimes] = useState([]);
  const [selectionMode, setSelectionMode] = useState("single");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [unavailableDates, setUnavailableDates] = useState([]);
  const [unavailableSlots, setUnavailableSlots] = useState([]);
  const [showTimeSlots, setShowTimeSlots] = useState(false);
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [newRating, setNewRating] = useState(5);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingContent, setEditingContent] = useState("");
  const [editingRating, setEditingRating] = useState(5);
  const [commentFilter, setCommentFilter] = useState("all");

  const [showTermsPopup, setShowTermsPopup] = useState(false);

  /* ── init ── */
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    setCurrentUser(user);
    loadCartFromStorage();
  }, []);

  // Écouter les changements de connexion
  useEffect(() => {
    const handleStorageChange = () => {
      const user = JSON.parse(localStorage.getItem("user"));
      setCurrentUser(user);
      loadCartFromStorage();
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const isPrestataire = currentUser?.role === "prestataire";

  const loadCartFromStorage = () => {
    const raw = localStorage.getItem("reservationCart");
    if (raw) setCartItems(JSON.parse(raw));
  };

  const saveCart = (items) => {
    localStorage.setItem("reservationCart", JSON.stringify(items));
    setCartItems(items);
  };

  const removeFromCart = (resourceId) => {
    saveCart(cartItems.filter(i => i.resourceId !== resourceId));
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/ressources/get_by_id/${id}`);
        const data = await res.json();
        setResource(data);

        if (data.availability?.length > 0) {
          const unavailableFullDays = new Set();
          const tempSlots = [];
          data.availability.forEach((period) => {
            if (!period.satut_disp) {
              const start = new Date(period.date_deb);
              const end = new Date(period.date_fin);
              tempSlots.push({ start, end });
              if (start.getHours() === 0 && end.getHours() >= 23) {
                const cur = new Date(start);
                while (cur <= end) { unavailableFullDays.add(cur.toDateString()); cur.setDate(cur.getDate() + 1); }
              }
            }
          });
          setUnavailableDates(Array.from(unavailableFullDays));
          setUnavailableSlots(tempSlots);
        }
        await fetchComments();
      } catch (error) { console.error(error); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [id]);

  /* ── FONCTION POUR AJOUTER AU PANIER (RÉUTILISABLE) ── */
  const performAddToCart = (cartItemToAdd) => {
    const existing = JSON.parse(localStorage.getItem("reservationCart") || "[]");
    if (existing.some(i => i.resourceId === cartItemToAdd.resourceId)) {
      setSidebarOpen(true);
      return false;
    }
    const updated = [...existing, cartItemToAdd];
    saveCart(updated);
    setAddedToCart(true);
    setSidebarOpen(true);
    setTimeout(() => setAddedToCart(false), 2500);
    return true;
  };

  /* ── AJOUTER AU PANIER AVEC VÉRIFICATION CONNEXION ── */
  const addToCart = () => {
    // Vérifier si l'utilisateur est connecté
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");

    if (!token || !user) {
      // Stocker l'item pour après connexion
      const cartItem = {
        resourceId: resource._id,
        resourceName: resource.name,
        price: resource.price,
        type: resource.type,
        category: resource.category,
        quantity: 1,
        totalPrice: resource.type === "service"
          ? calculateTotalPrice() || resource.price
          : resource.price,
        stock: resource.stock ?? 999,
        selectedTimes: selectedTimes.map(s => ({
          display: s.display,
          start: s.start.toISOString(),
          end: s.end.toISOString(),
          price: s.price,
        })),
        selectedDate: selectedDate ? selectedDate.toISOString() : null,
      };
      setPendingCartItem(cartItem);
      setAuthModalOpen(true);
      return;
    }

    const cartItem = {
      resourceId: resource._id,
      resourceName: resource.name,
      price: resource.price,
      type: resource.type,
      category: resource.category,
      quantity: 1,
      totalPrice: resource.type === "service"
        ? calculateTotalPrice() || resource.price
        : resource.price,
      stock: resource.stock ?? 999,
      selectedTimes: selectedTimes.map(s => ({
        display: s.display,
        start: s.start.toISOString(),
        end: s.end.toISOString(),
        price: s.price,
      })),
      selectedDate: selectedDate ? selectedDate.toISOString() : null,
    };

    performAddToCart(cartItem);
  };
  

  /* ── AUTH SUCCESS ── */
  const handleAuthSuccess = (token, user) => {
    setAuthModalOpen(false);
    setCurrentUser(user);

    // Si un item était en attente, l'ajouter au panier maintenant
    if (pendingCartItem) {
      performAddToCart(pendingCartItem);
      setPendingCartItem(null);
    }
  };

  /* ── disponibilités ── */
  const isDateAvailable = (date) => {
    if (!date) return false;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const check = new Date(date); check.setHours(0, 0, 0, 0);
    if (check < today) return false;
    return !unavailableDates.includes(check.toDateString());
  };

  const isPartiallyUnavailable = (date) => {
    const d = new Date(date); d.setHours(0, 0, 0, 0);
    return unavailableSlots.some(s =>
      d.toDateString() === new Date(s.start).toDateString() ||
      d.toDateString() === new Date(s.end).toDateString()
    );
  };

  const getDayAvailabilityStatus = (date) => {
    if (!isDateAvailable(date)) return false;
    if (isPartiallyUnavailable(date)) return "partial";
    return true;
  };

  const fetchAvailableTimeSlots = async (date) => {
    if (!date) return;
    setLoadingTimeSlots(true);
    try {
      const slots = [];
      const base = new Date(date); base.setHours(0, 0, 0, 0);
      for (let h = 0; h < 24; h++) {
        const start = new Date(base); start.setHours(h);
        const end = new Date(base); end.setHours(h + 1);
        const unavail = unavailableSlots.some(s => start < new Date(s.end) && end > new Date(s.start));
        if (!unavail) slots.push({ id: `${start.toISOString()}-${end.toISOString()}`, start, end, display: `${h}:00 - ${h + 1}:00`, price: resource?.price || 0 });
      }
      setAvailableTimeSlots(slots);
    } catch (e) { console.error(e); }
    finally { setLoadingTimeSlots(false); }
  };

  const handleTimeSlotSelect = (slot) => {
    if (selectionMode === "single") { setSelectedTime(slot); setSelectedTimes([slot]); }
    else setSelectedTimes(prev => prev.some(t => t.id === slot.id) ? prev.filter(t => t.id !== slot.id) : [...prev, slot]);
  };

  const removeTimeSlot = (slotId) => {
    setSelectedTimes(prev => prev.filter(t => t.id !== slotId));
    if (selectedTime?.id === slotId) setSelectedTime(null);
  };

  const calculateTotalPrice = () => selectedTimes.reduce((s, slot) => s + slot.price, 0);

  const handleDateClick = (date) => {
    if (!isDateAvailable(date)) return;
    setSelectedDate(date); setSelectedTime(null); setSelectedTimes([]);
    setShowTimeSlots(true); fetchAvailableTimeSlots(date);
    if (!startDate || (startDate && endDate)) { setStartDate(date); setEndDate(null); }
    else if (startDate && !endDate) {
      if (date < startDate) { setEndDate(startDate); setStartDate(date); }
      else setEndDate(date);
    }
  };

  const resetSelection = () => {
    setSelectedDate(null); setSelectedTime(null); setSelectedTimes([]);
    setStartDate(null); setEndDate(null);
    setShowTimeSlots(false); setAvailableTimeSlots([]);
    setSelectionMode("single");
  };

  const isDateInRange = (date) => {
    if (!startDate) return false;
    if (!endDate) return date.toDateString() === startDate.toDateString();
    return date >= startDate && date <= endDate;
  };

  const isRangeValid = () => {
    if (!startDate || !endDate) return false;
    const cur = new Date(Math.min(startDate, endDate));
    const end = new Date(Math.max(startDate, endDate));
    while (cur <= end) { if (!isDateAvailable(cur)) return false; cur.setDate(cur.getDate() + 1); }
    return true;
  };

  const getNumberOfDays = () => {
    if (!startDate || !endDate) return 0;
    return Math.ceil(Math.abs(endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
  };

  /* ── commentaires ── */
  const fetchComments = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/comment/ressource/${id}`);
      const data = await res.json();
      let sorted = [...data];
      if (commentFilter === "recent") sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      if (commentFilter === "highest") sorted.sort((a, b) => b.nbr_stars - a.nbr_stars);
      if (commentFilter === "lowest") sorted.sort((a, b) => a.nbr_stars - b.nbr_stars);
      setComments(sorted);
    } catch (e) { console.error(e); }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token || !currentUser) { navigate("/login"); return; }
    if (newComment.length < 10) { alert("Minimum 10 caractères"); return; }
    setSubmitting(true);
    try {
      await fetch("http://localhost:5000/api/comment/add", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ contenue: newComment, nbr_stars: newRating, C_res: id }),
      });
      setNewComment(""); setNewRating(5); setShowCommentForm(false);
      await fetchComments();
    } catch (e) { console.error(e); }
    finally { setSubmitting(false); }
  };

  const handleEditComment = async (commentId, content, stars) => {
    try {
      await fetch(`http://localhost:5000/api/comments/${commentId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contenue: content, nbr_stars: stars }),
      });
      setEditingCommentId(null); await fetchComments();
    } catch (e) { console.error(e); }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Supprimer ce commentaire ?")) return;
    await fetch(`http://localhost:5000/api/comments/${commentId}`, { method: "DELETE" });
    await fetchComments();
  };

  const handleReportComment = (commentId) => {
    if (!currentUser) { navigate("/login"); return; }
    if (window.confirm("Signaler ce commentaire ?")) alert("Commentaire signalé, merci !");
  };

  /* ── utilitaires ── */
  const formatRelativeDate = (d) => {
    const diff = Math.ceil(Math.abs(new Date() - new Date(d)) / (1000 * 60 * 60 * 24));
    if (diff === 0) return "Aujourd'hui";
    if (diff === 1) return "Hier";
    if (diff < 7) return `Il y a ${diff} jours`;
    if (diff < 30) return `Il y a ${Math.floor(diff / 7)} semaine(s)`;
    return new Date(d).toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" });
  };

  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));

  const getDaysInMonth = (date) => {
    const y = date.getFullYear(), m = date.getMonth();
    const first = new Date(y, m, 1), last = new Date(y, m + 1, 0);
    const days = [];
    const fdow = first.getDay();
    for (let i = 0; i < (fdow === 0 ? 6 : fdow - 1); i++) days.unshift({ date: new Date(y, m, -i), currentMonth: false });
    for (let i = 1; i <= last.getDate(); i++) days.push({ date: new Date(y, m, i), currentMonth: true });
    for (let i = 1; i <= 42 - days.length; i++) days.push({ date: new Date(y, m + 1, i), currentMonth: false });
    return days;
  };

  const averageRating = comments.reduce((acc, c) => acc + c.nbr_stars, 0) / comments.length || 0;
  const days = getDaysInMonth(currentMonth);
  const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
  const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  const images = resource?.media?.flatMap(m => m.img_vd.map(img => img.startsWith("http") ? img : `http://localhost:5000/${img}`)) || [];
  const nextImage = () => setCurrentImageIndex(p => (p + 1) % images.length);
  const prevImage = () => setCurrentImageIndex(p => (p - 1 + images.length) % images.length);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "ArrowLeft") prevImage();
      if (e.key === "ArrowRight") nextImage();
      if (e.key === "Escape") setShowLightbox(false);
    };
    if (showLightbox) { document.addEventListener("keydown", handleKey); document.body.style.overflow = "hidden"; }
    return () => { document.removeEventListener("keydown", handleKey); document.body.style.overflow = "unset"; };
  }, [showLightbox, currentImageIndex]);

  const cartTotal = cartItems.reduce((s, i) => s + (i.totalPrice || i.price), 0);
  const isService = resource?.type === "service";
  const canAddToCart = (selectedTimes.length > 0 || (startDate && endDate && isRangeValid()));
  const alreadyInCart = cartItems.some(i => i.resourceId === id);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );

  if (!resource) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center"><p className="text-gray-600 mb-4">Ressource non trouvée.</p>
        <button onClick={() => navigate("/")} className="bg-black text-white px-6 py-2 rounded-lg">Retour</button>
      </div>
    </div>
  );

  /* ═══════════════════════════════════════════════ RENDER ════ */
  return (
    <div className="min-h-screen bg-gray-50">

      {/* Cart Sidebar */}
      <CartSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        cartItems={cartItems}
        onRemove={(id) => { removeFromCart(id); }}
        onNavigate={() => { setSidebarOpen(false); navigate("/mes-reservations"); }}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => {
          setAuthModalOpen(false);
          setPendingCartItem(null);
        }}
        pendingItem={pendingCartItem ? {
          resourceName: pendingCartItem.resourceName,
          type: pendingCartItem.type,
        } : null}
        onAuthSuccess={handleAuthSuccess}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">

        {/* ══ HEADER avec retour + bouton panier intégré ══ */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-black border border-gray-200 rounded-xl px-4 py-2.5 hover:bg-white hover:shadow-sm transition-all group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            Retour
          </button>

          {/* Bouton panier — visible seulement si items dans le panier */}
          {cartItems.length > 0 && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:shadow-sm transition-all text-sm font-medium text-gray-800"
            >
              <ShoppingCart className="h-4 w-4 text-indigo-600" />
              <span>Panier</span>
              <span className="bg-indigo-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full leading-none">
                {cartItems.length}
              </span>
              <span className="text-gray-300">|</span>
              <span className="text-indigo-600 font-bold text-sm">{cartTotal}DT</span>
            </button>
          )}
        </div>

        <div className="grid gap-8 lg:grid-cols-3">

          {/* ════ COLONNE GAUCHE ════ */}
          <div className="lg:col-span-2 space-y-6">

            {/* Carrousel */}
            <div className="relative group">
              <div className="relative rounded-2xl overflow-hidden bg-gray-100 shadow-lg cursor-pointer"
                onClick={() => setShowLightbox(true)}>
                <img src={images[currentImageIndex] || "/placeholder-image.jpg"} alt={resource.name}
                  className="w-full aspect-[16/9] object-cover transition duration-500 hover:scale-105" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                  <Maximize2 className="h-8 w-8 text-white drop-shadow-lg opacity-0 group-hover:opacity-100 transition" />
                </div>
                <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1.5 rounded-full text-sm backdrop-blur-sm">
                  {currentImageIndex + 1} / {images.length}
                </div>
                {images.length > 1 && (<>
                  <button onClick={e => { e.stopPropagation(); prevImage(); }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition">
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button onClick={e => { e.stopPropagation(); nextImage(); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition">
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>)}
              </div>
              {images.length > 1 && (
                <div className="mt-4 grid grid-cols-5 gap-3">
                  {images.map((img, i) => (
                    <button key={i} onClick={() => setCurrentImageIndex(i)}
                      className={`rounded-lg overflow-hidden aspect-[4/3] transition-all ${i === currentImageIndex ? "ring-2 ring-black scale-105 shadow-lg" : "opacity-70 hover:opacity-100"}`}>
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Infos principales */}
            <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{resource.name}</h1>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex">{[1, 2, 3, 4, 5].map(s => <Star key={s} className={`h-5 w-5 ${s <= Math.round(averageRating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />)}</div>
                    <span className="text-sm text-gray-600">{averageRating.toFixed(1)} ({comments.length} avis)</span>
                  </div>
                </div>
                <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium capitalize">{resource.type}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-500"><MapPin className="h-4 w-4" /><span>{resource.locationname}</span></div>
              <div className="border-t border-gray-100 pt-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Description</h2>
                <p className="text-gray-600 leading-relaxed">{resource.description}</p>
              </div>
            </div>

            {/* Prestataire */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <Building className="h-5 w-5 text-indigo-500" /> Informations du prestataire
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { icon: <Building className="h-4 w-4 text-indigo-500" />, label: "Fournisseur", value: resource?.prestataire?.lastname },
                  { icon: <Mail className="h-4 w-4 text-sky-500" />, label: "Email", value: resource?.prestataire?.email },
                  { icon: <Phone className="h-4 w-4 text-emerald-500" />, label: "Téléphone", value: resource?.prestataire?.numTel },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    {item.icon}
                    <div><p className="text-xs text-gray-500">{item.label}</p>
                      <p className="font-semibold text-gray-800 truncate">{item.value || "Non disponible"}</p></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Caractéristiques */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" /> Caractéristiques
              </h2>
              <div className="flex flex-wrap gap-3">
                {resource.attributes && Object.entries(resource.attributes).map(([key, value]) => {
                  const iconMap = { capacity: <Users className="h-4 w-4" />, power: <Zap className="h-4 w-4" />, size: <Ruler className="h-4 w-4" />, color: <Palette className="h-4 w-4" />, weight: <Weight className="h-4 w-4" /> };
                  return (
                    <div key={key} className="flex items-center gap-2 bg-amber-50 text-amber-700 border border-amber-200 px-4 py-2 rounded-full text-sm font-medium">
                      <span className="text-amber-500">{iconMap[key] || <Tag className="h-4 w-4" />}</span>
                      <span className="capitalize">{key}</span><span className="text-amber-400">·</span>
                      <span>{typeof value === "boolean" ? (value ? "Oui" : "Non") : value}</span>
                    </div>
                  );
                })}
                {resource.customAttributes?.map((attr, i) => (
                  <div key={i} className="flex items-center gap-2 bg-amber-50 text-amber-700 border border-amber-200 px-4 py-2 rounded-full text-sm font-medium">
                    <span className="text-amber-500"><Tag className="h-4 w-4" /></span>
                    <span className="capitalize">{attr.name}</span><span className="text-amber-400">·</span>
                    <span>{typeof attr.value === "boolean" ? (attr.value ? "Oui" : "Non") : attr.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Commentaires */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2"><MessageCircle className="h-5 w-5" />Avis ({comments.length})</h2>
                  {comments.length > 0 && <p className="text-sm text-gray-500 mt-1">Note moyenne : {averageRating.toFixed(1)}/5</p>}
                </div>
                <div className="flex items-center gap-3">
                  <select value={commentFilter} onChange={e => setCommentFilter(e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-black">
                    <option value="all">Tous les avis</option>
                    <option value="recent">Plus récents</option>
                    <option value="highest">Meilleures notes</option>
                    <option value="lowest">Moins bonnes notes</option>
                  </select>
                  {currentUser ? (
                    <button onClick={() => setShowCommentForm(!showCommentForm)}
                      className="flex items-center gap-2 text-sm bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition">
                      <Edit3 className="h-4 w-4" />{showCommentForm ? "Annuler" : "Donner mon avis"}
                    </button>
                  ) : (
                    <button onClick={() => navigate("/login")}
                      className="flex items-center gap-2 text-sm bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition">
                      <User className="h-4 w-4" />Connectez-vous
                    </button>
                  )}
                </div>
              </div>

              {showCommentForm && currentUser && (
                <form onSubmit={handleAddComment} className="mb-8 bg-gray-50 p-6 rounded-xl border border-gray-100">
                  <h3 className="text-lg font-semibold mb-4">Partagez votre expérience</h3>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Votre note</label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map(s => (
                        <button key={s} type="button" onClick={() => setNewRating(s)} className="focus:outline-none transition transform hover:scale-110">
                          <Star className={`h-8 w-8 ${s <= newRating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                        </button>
                      ))}
                      <span className="text-sm text-gray-500 ml-2">{newRating}/5</span>
                    </div>
                  </div>
                  <textarea value={newComment} onChange={e => setNewComment(e.target.value)} rows="4"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black resize-none mb-2"
                    placeholder="Minimum 10 caractères..." minLength="10" required />
                  <p className="text-xs text-gray-500 mb-4">{newComment.length}/500</p>
                  <div className="flex justify-end gap-3">
                    <button type="button" onClick={() => { setShowCommentForm(false); setNewComment(""); setNewRating(5); }}
                      className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">Annuler</button>
                    <button type="submit" disabled={submitting || newComment.length < 10}
                      className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 disabled:opacity-50">
                      <Send className="h-4 w-4" />{submitting ? "Publication..." : "Publier"}
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-6">
                {comments.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <MessageCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Aucun avis pour le moment</p>
                  </div>
                ) : comments.map(comment => (
                  <div key={comment._id} className="border-b border-gray-100 last:border-0 pb-6 last:pb-0 hover:bg-gray-50/50 p-4 rounded-xl transition group">
                    {editingCommentId === comment._id ? (
                      <div className="space-y-4">
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map(s => <button key={s} type="button" onClick={() => setEditingRating(s)}><Star className={`h-6 w-6 ${s <= editingRating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} /></button>)}
                        </div>
                        <textarea value={editingContent} onChange={e => setEditingContent(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black" rows="3" />
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setEditingCommentId(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Annuler</button>
                          <button onClick={() => handleEditComment(comment._id, editingContent, editingRating)} className="px-4 py-2 text-sm bg-black text-white rounded-lg">Sauvegarder</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex-shrink-0 flex items-center justify-center text-white font-semibold shadow-md overflow-hidden">
                          {comment.C_user?.image
                            ? <img src={comment.C_user.image} alt="" className="w-full h-full object-cover" />
                            : <span>{comment.C_user?.firstname?.charAt(0).toUpperCase() || "U"}</span>}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-gray-900">{comment.C_user?.firstname || "Utilisateur"} {comment.C_user?.lastname || ""}</h4>
                                {comment.C_user?._id === currentUser?.id && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Vous</span>}
                              </div>
                              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Calendar className="h-3 w-3" />{formatRelativeDate(comment.createdAt)}</p>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                              {currentUser?.id === comment.C_user?._id && (<>
                                <button onClick={() => { setEditingCommentId(comment._id); setEditingContent(comment.contenue); setEditingRating(comment.nbr_stars); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full"><Edit3 className="h-4 w-4" /></button>
                                <button onClick={() => handleDeleteComment(comment._id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full"><Trash2 className="h-4 w-4" /></button>
                              </>)}
                              <button onClick={() => handleReportComment(comment._id)} className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-full"><Flag className="h-4 w-4" /></button>
                            </div>
                          </div>
                          <div className="flex mb-2">{[1, 2, 3, 4, 5].map(s => <Star key={s} className={`h-4 w-4 ${s <= comment.nbr_stars ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />)}</div>
                          <p className="text-gray-700 leading-relaxed">{comment.contenue}</p>
                          <div className="flex gap-4 mt-3">
                            <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"><ThumbsUp className="h-3 w-3" />Utile</button>
                            <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"><MessageCircle className="h-3 w-3" />Répondre</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Localisation */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2 mb-4"><Map className="h-5 w-5" />Localisation</h2>
              <div className="flex items-start gap-3 text-gray-600 mb-4"><MapPin className="h-5 w-5 text-gray-400 flex-shrink-0" /><div><p className="font-medium text-gray-900">Adresse</p><p>  {resource.locationname}</p></div></div>
              <div className="relative h-[300px] rounded-xl overflow-hidden">
                <iframe width="100%" height="100%" style={{ border: 0 }} loading="lazy" allowFullScreen
                  src={`https://www.google.com/maps?q=${resource.locationname}&output=embed`} />
              </div>
            </div>
          </div>

          {/* ════ COLONNE DROITE ════ */}
          <div className="lg:col-span-1 space-y-6">

            {/* Calendrier */}
            <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><CalendarRange className="h-5 w-5" />Sélectionner une période</h3>
                {(startDate || selectedDate) && <button onClick={resetSelection} className="text-xs text-gray-500 underline">Réinitialiser</button>}
              </div>
              <div className="flex items-center justify-between mb-4">
                <button onClick={prevMonth} className="p-1.5 hover:bg-gray-100 rounded-full"><ChevronLeft className="h-4 w-4" /></button>
                <span className="text-sm font-medium">{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</span>
                <button onClick={nextMonth} className="p-1.5 hover:bg-gray-100 rounded-full"><ChevronRight className="h-4 w-4" /></button>
              </div>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {weekDays.map(d => <div key={d} className="text-center text-xs font-medium text-gray-500 py-2">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {days.map(({ date, currentMonth: cm }, i) => {
                  const status = cm ? getDayAvailabilityStatus(date) : null;
                  const isAvail = status === true, isPartial = status === "partial", isUnavail = status === false;
                  const inRange = isDateInRange(date);
                  const isStart = startDate?.toDateString() === date.toDateString();
                  const isEnd = endDate?.toDateString() === date.toDateString();
                  const isToday = date.toDateString() === new Date().toDateString();
                  const isSelected = selectedDate?.toDateString() === date.toDateString();
                  let bg = "";
                  if (!cm) bg = "text-gray-300";
                  else if (inRange) bg = isStart || isEnd ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-700";
                  else if (isSelected) bg = "bg-purple-600 text-white";
                  else if (isUnavail) bg = "text-red-400 cursor-not-allowed opacity-60 bg-red-50";
                  else if (isPartial) bg = "bg-yellow-50 text-yellow-700 border border-yellow-300";
                  else if (isAvail) bg = "hover:bg-green-50 text-gray-700";
                  return (
                    <button key={i} onClick={() => cm && handleDateClick(date)} disabled={!cm || isUnavail}
                      className={`aspect-square p-1 rounded-lg text-sm transition-all relative ${bg} ${isToday && cm && isAvail ? "font-bold border-2 border-gray-300" : ""}`}>
                      <div className="flex flex-col items-center">
                        <span>{date.getDate()}</span>
                        {isAvail && cm && !inRange && !isSelected && <span className="text-[8px] text-green-600">●</span>}
                        {isPartial && cm && !inRange && !isSelected && <span className="text-[8px] text-yellow-500">●</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                {[["bg-green-500", "Disponible"], ["bg-yellow-400", "Partiel"], ["bg-red-400", "Indisponible"]].map(([c, l]) => (
                  <div key={l} className="flex items-center gap-1.5"><div className={`w-3 h-3 rounded-full ${c}`} /><span className="text-xs text-gray-600">{l}</span></div>
                ))}
              </div>
            </div>

            {/* Créneaux horaires */}
            {showTimeSlots && selectedDate && (
              <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2"><Clock3 className="h-5 w-5 text-purple-600" /><h3 className="text-lg font-semibold">Créneaux disponibles</h3></div>
                  {selectedTimes.length > 0 && <button onClick={() => setSelectedTimes([])} className="text-xs text-gray-500 underline">Tout désélectionner</button>}
                </div>
                <div className="mb-4 p-3 bg-purple-50 rounded-xl">
                  <p className="text-sm font-medium text-purple-700 flex items-center gap-2"><Calendar className="h-4 w-4" />{selectedDate.toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
                </div>
                <div className="mb-4 flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                  {["single", "multiple"].map(mode => (
                    <button key={mode} onClick={() => setSelectionMode(mode)}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${selectionMode === mode ? "bg-purple-600 text-white" : "text-gray-600 hover:bg-gray-200"}`}>
                      {mode === "single" ? "Simple" : "Multiple"}
                    </button>
                  ))}
                </div>
                {loadingTimeSlots ? (
                  <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-gray-200 border-t-purple-600 rounded-full animate-spin" /></div>
                ) : availableTimeSlots.length > 0 ? (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                    {availableTimeSlots.map(slot => {
                      const isSel = selectionMode === "single" ? selectedTime?.id === slot.id : selectedTimes.some(t => t.id === slot.id);
                      return (
                        <button key={slot.id} onClick={() => handleTimeSlotSelect(slot)}
                          className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between ${isSel ? "border-purple-600 bg-purple-50" : "border-gray-200 hover:border-purple-300 hover:bg-gray-50"}`}>
                          <div className="flex items-center gap-3">
                            <Clock className={`h-5 w-5 ${isSel ? "text-purple-600" : "text-gray-400"}`} />
                            <div className="text-left"><p className="font-medium text-gray-900">{slot.display}</p><p className="text-sm text-gray-500">{slot.price}DT</p></div>
                          </div>
                          {isSel && <Check className="h-5 w-5 text-purple-600" />}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8"><AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">Aucun créneau disponible</p></div>
                )}
                {selectedTimes.length > 0 && (
                  <div className="mt-4 p-4 bg-purple-50 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-purple-700">{selectedTimes.length} créneau(x)</span>
                      <span className="text-sm font-bold text-purple-700">Total : {calculateTotalPrice()}DT</span>
                    </div>
                    {selectionMode === "multiple" && selectedTimes.map(slot => (
                      <div key={slot.id} className="flex items-center justify-between text-xs text-purple-600">
                        <span>{slot.display}</span>
                        <button onClick={e => { e.stopPropagation(); removeTimeSlot(slot.id); }} className="text-purple-400 hover:text-purple-600"><X className="h-3 w-3" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Carte réservation */}
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-6 hover:shadow-xl transition-all">
              <div className="text-center pb-6 border-b border-gray-100">
                <span className="text-4xl font-bold text-gray-900">{resource.price}DT</span>
                <span className="text-lg text-gray-500 ml-2">/heure</span>
              </div>

              {(startDate || selectedDate) && (
                <div className="mt-4 space-y-3">
                  {selectedDate && (
                    <div className="p-3 bg-purple-50 rounded-xl">
                      <div className="flex items-center gap-2 mb-1"><Calendar className="h-4 w-4 text-purple-600" /><span className="text-sm font-medium text-purple-700">Date sélectionnée</span></div>
                      <p className="text-sm text-purple-600">{selectedDate.toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
                    </div>
                  )}
                  {selectedTimes.length > 0 && (
                    <div className="p-3 bg-blue-50 rounded-xl">
                      <div className="flex items-center gap-2 mb-1"><Clock className="h-4 w-4 text-blue-600" /><span className="text-sm font-medium text-blue-700">{selectedTimes.length} créneau(x) — {calculateTotalPrice()}DT</span></div>
                      {selectedTimes.map(s => <p key={s.id} className="text-sm text-blue-600">{s.display}</p>)}
                    </div>
                  )}
                  {startDate && endDate && (
                    <div className="p-3 bg-blue-50 rounded-xl">
                      <div className="flex items-center gap-2 mb-1"><CalendarRange className="h-4 w-4 text-blue-600" /><span className="text-sm font-medium text-blue-700">Période</span></div>
                      <p className="text-sm text-blue-600">Du {startDate.toLocaleDateString("fr-FR")} au {endDate.toLocaleDateString("fr-FR")}</p>
                      <p className="text-sm font-medium text-blue-700 mt-1">Total : {resource.price * getNumberOfDays() * 24}DT</p>
                    </div>
                  )}
                </div>
              )}

              <div className="py-4 space-y-3 border-b border-gray-100">
                <div className="flex justify-between"><span className="text-gray-500">Type</span><span className="font-medium capitalize bg-gray-100 px-3 py-1 rounded-full">{resource.type}</span></div>
                {resource.capacity && <div className="flex justify-between"><span className="text-gray-500">Capacité</span><span className="font-medium flex items-center gap-1"><Users className="h-4 w-4" />{resource.capacity} personnes</span></div>}
              </div>

              {/* Conditions */}


              {/* ════ BOUTON AJOUTER AU PANIER ════ */}
              {alreadyInCart ? (
                <div className="bg-indigo-50 p-4 rounded-xl text-center">
                  <CheckCircle2 className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
                  <p className="font-medium text-indigo-800 text-sm">Déjà dans votre panier</p>
                  <button onClick={() => setSidebarOpen(true)} className="mt-2 text-xs underline text-indigo-600">Voir le panier →</button>
                </div>
              ) : addedToCart ? (
                <div className="bg-green-50 p-4 rounded-xl text-center">
                  <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="font-medium text-green-800 text-sm">Ajouté au panier !</p>
                  <button onClick={() => setSidebarOpen(true)} className="mt-2 text-xs underline text-green-600">Voir le panier →</button>
                </div>
              ) : (
                <>
                  <button
                    onClick={addToCart}
                    disabled={!canAddToCart || currentUser?.role === "prestataire"}
                    className={`w-full py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2
                    ${(!canAddToCart || currentUser?.role === "prestataire")
                        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                        : "bg-black text-white hover:bg-gray-800 hover:scale-[1.02] active:scale-[0.98]"}`}
                  >
                    <ShoppingCart className="h-5 w-5" />
                    {currentUser?.role === "prestataire"
                      ? "Action non autorisée pour un prestataire"
                      : !selectedDate
                        ? "Sélectionnez une date"
                        : selectedTimes.length === 0 && !endDate
                          ? "Choisissez des créneaux"
                          : `Ajouter au panier${selectedTimes.length > 0 ? ` (${calculateTotalPrice()}DT)` : ""}`}
                  </button>
                  {currentUser?.role === "prestataire" && (
                    <p className="text-xs text-amber-600 text-center mt-2">
                      ⚠️ Les prestataires ne peuvent pas réserver de ressources.
                    </p>
                  )}
                </>
              )}
              <p className="text-xs text-gray-400 text-center mt-3">
                Connexion requise uniquement pour envoyer la demande
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {
        showLightbox && (
          <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center" onClick={() => setShowLightbox(false)}>
            <button onClick={() => setShowLightbox(false)} className="absolute top-6 right-6 text-white/70 hover:text-white p-2 hover:bg-white/10 rounded-full"><X className="h-8 w-8" /></button>
            <div className="relative max-w-7xl mx-auto px-4" onClick={e => e.stopPropagation()}>
              <img src={images[currentImageIndex]} alt="" className="max-h-[85vh] w-auto mx-auto rounded-lg shadow-2xl" />
              {images.length > 1 && (<>
                <button onClick={e => { e.stopPropagation(); prevImage(); }} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full"><ChevronLeft className="h-6 w-6" /></button>
                <button onClick={e => { e.stopPropagation(); nextImage(); }} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full"><ChevronRight className="h-6 w-6" /></button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full text-sm">{currentImageIndex + 1} / {images.length}</div>
              </>)}
            </div>
          </div>
        )
      }

      {/* Conditions popup */}
      {
        showTermsPopup && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowTermsPopup(false)}>
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold">Conditions Générales</h2>
                <button onClick={() => setShowTermsPopup(false)} className="p-2 hover:bg-gray-100 rounded-full"><X className="h-5 w-5" /></button>
              </div>
              <div className="p-6 space-y-4 text-gray-700">
                {[["1. Objet", "Les présentes conditions générales régissent l'utilisation de la plateforme de réservation."],
                ["2. Réservation", "La réservation devient définitive après validation du prestataire."],
                ["3. Annulation", "Les annulations plus de 48h avant donnent droit à un remboursement intégral."],
                ["4. Utilisation", "L'utilisateur s'engage à utiliser la ressource conformément à sa destination."],
                ["5. Responsabilité", "L'utilisateur est responsable de tout dommage causé pendant la réservation."],
                ].map(([title, text]) => <div key={title}><p className="font-semibold text-gray-900 mb-1">{title}</p><p>{text}</p></div>)}
                <p className="text-sm text-gray-500 mt-6">Dernière mise à jour : 29 mars 2026</p>
              </div>
              <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t flex justify-end">
                <button onClick={() => setShowTermsPopup(false)} className="px-4 py-2 bg-black text-white rounded-lg">Fermer</button>
              </div>
            </div>
          </div>
        )
      }

      <style>{`
        @keyframes fade-in { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:none; } }
        .animate-fade-in { animation: fade-in .3s ease-out; }
      `}</style>
    </div >
  );
}
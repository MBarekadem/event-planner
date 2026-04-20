import {
  Shield, Menu, X, ChevronDown, LogOut, User,
  ShoppingCart, LayoutDashboard, PlusCircle, Bell, BellRing,
  CheckCircle, AlertCircle, Info, Package
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

// ─── API ──────────────────────────────────────────────────────────────────────
const API_URL = "http://localhost:5000/api";
const getToken = () => localStorage.getItem("token");
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

// Mapping des types d'icônes
const getIconForType = (type) => {
  switch (type) {
    case 'success': return <CheckCircle size={18} className="text-green-600" />;
    case 'warning': return <AlertCircle size={18} className="text-orange-600" />;
    case 'error': return <AlertCircle size={18} className="text-red-600" />;
    case 'event': return <BellRing size={18} className="text-purple-600" />;
    case 'validation': return <CheckCircle size={18} className="text-blue-600" />;
    case 'resource': return <Package size={18} className="text-green-600" />;
    default: return <Bell size={18} className="text-blue-600" />;
  }
};

const getBgForType = (type) => {
  switch (type) {
    case 'success': return 'bg-green-100';
    case 'warning': return 'bg-orange-100';
    case 'error': return 'bg-red-100';
    case 'event': return 'bg-purple-100';
    case 'validation': return 'bg-blue-100';
    case 'resource': return 'bg-green-100';
    default: return 'bg-blue-100';
  }
};

// ─── UserAvatar ───────────────────────────────────────────────────────────────
const UserAvatar = ({ user, size = "md", showOnlineStatus = true, hasPendingRequests = false }) => {
  const sizeClasses = { sm: "w-8 h-8 text-sm", md: "w-10 h-10 text-lg", lg: "w-12 h-12 text-xl" };
  const [imgError, setImgError] = useState(false);

  const getImageUrl = () => {
    if (!user?.image) return null;
    if (user.image.startsWith("http")) return user.image;
    const fileName = user.image.replace(/\\/g, "/").split("/").pop();
    return `http://localhost:5000/uploads/${fileName}`;
  };

  const imageUrl = getImageUrl();
  const initials = `${user?.firstname?.charAt(0) ?? ""}${user?.lastname?.charAt(0) ?? ""}`.toUpperCase();

  return (
    <div className="relative">
      {imageUrl && !imgError ? (
        <img
          src={imageUrl}
          alt={`${user?.firstname} ${user?.lastname}`}
          className={`${sizeClasses[size]} rounded-full object-cover border-2 border-white shadow-lg`}
          onError={() => setImgError(true)}
        />
      ) : (
        <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white font-semibold shadow-lg`}>
          {initials || "?"}
        </div>
      )}
      {showOnlineStatus && (
        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
      )}
      {hasPendingRequests && (
        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-orange-500 border-2 border-white rounded-full animate-pulse" />
      )}
    </div>
  );
};

// ─── AdminAvatar ──────────────────────────────────────────────────────────────
const AdminAvatar = ({ size = "md", showOnlineStatus = true }) => {
  const sizeClasses = { sm: "w-8 h-8 text-sm", md: "w-10 h-10 text-lg", lg: "w-12 h-12 text-xl" };
  return (
    <div className="relative">
      <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center text-white font-bold shadow-lg`}>
        <Shield className="w-5 h-5" />
      </div>
      {showOnlineStatus && (
        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
      )}
    </div>
  );
};

// ─── Navbar principale ────────────────────────────────────────────────────────
export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const profileMenuRef = useRef(null);
  const notificationsRef = useRef(null);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotif, setLoadingNotif] = useState(false);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const role = user?.role;
  const isAdmin = role === "admin";
  const isPrestataire = role === "prestataire";
  const isOrganisateur = role === "organisateur";
  const isLoggedIn = !!localStorage.getItem("token");
  const token = localStorage.getItem("token");

  // ==================== NOTIFICATIONS ====================
  const loadNotifications = async () => {
    if (!token || !isLoggedIn) return;
    try {
      setLoadingNotif(true);
      const response = await axios.get(`${API_URL}/notifications`, {
        headers: authHeaders(),
        params: { page: 1, limit: 30 }
      });
      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unreadCount || 0);
    } catch (error) {
      console.error("Erreur chargement notifications:", error);
    } finally {
      setLoadingNotif(false);
    }
  };

  const markAsRead = async (id) => {
    if (!token) return;
    try {
      await axios.put(`${API_URL}/notifications/${id}/read`, {}, { headers: authHeaders() });
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Erreur:", error);
    }
  };

  const markAllAsRead = async () => {
    if (!token) return;
    try {
      await axios.put(`${API_URL}/notifications/read-all`, {}, { headers: authHeaders() });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Erreur:", error);
    }
  };

  const deleteNotification = async (id, e) => {
    e.stopPropagation();
    if (!token) return;
    try {
      await axios.delete(`${API_URL}/notifications/${id}`, { headers: authHeaders() });
      const deleted = notifications.find(n => n._id === id);
      setNotifications(prev => prev.filter(n => n._id !== id));
      if (!deleted?.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Erreur:", error);
    }
  };

  // ✅ FONCTION CORRIGÉE : Gère la navigation depuis les notifications
  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsRead(notification._id);
    }
    
    let link = notification.link;
    
    // ✅ CORRECTION DES LIENS (fallback au cas où le backend n'a pas corrigé)
    if (link) {
      // Corriger les liens de ressources : /les_ressources/:id → /RessourceDetail/:id
      if (link.match(/\/les_ressources\/[a-fA-F0-9]{24}/)) {
        link = link.replace('/les_ressources/', '/RessourceDetail/');
        console.log('🔗 Lien ressource corrigé (frontend):', link);
      }
      
      // Corriger les liens de demandes prestataire
      if (link === '/demandes' || link === '/demande') {
        link = '/mes-demandes';
        console.log('🔗 Lien demande corrigé (frontend):', link);
      }
      
      // Corriger les liens de réservations organisateur
      if (link === '/reservations' || link === '/mes-reservations-old') {
        link = '/mes-reservations';
        console.log('🔗 Lien réservation corrigé (frontend):', link);
      }
    }
    
    if (link) {
      navigate(link);
    }
    
    setShowNotifications(false);
  };

  // ==================== DEMANDES EN ATTENTE (prestataire) ====================
  const fetchPendingRequests = async () => {
    if (!isPrestataire || !token) return;
    try {
      const response = await axios.get(`${API_URL}/location/get_pres`, {
        headers: authHeaders()
      });
      const locations = response.data;
      const pending = locations.filter((loc) => loc.status === "en_attente").length;
      setPendingRequestsCount(pending);
    } catch (err) {
      console.error("Erreur lors de la récupération des demandes:", err);
    }
  };

  useEffect(() => {
    if (token && isLoggedIn) {
      loadNotifications();
      if (isPrestataire) {
        fetchPendingRequests();
        const interval = setInterval(fetchPendingRequests, 30000);
        return () => clearInterval(interval);
      }
    }
  }, [token, isPrestataire, isLoggedIn]);

  useEffect(() => {
    if (!token || !isLoggedIn) return;
    const interval = setInterval(() => {
      loadNotifications();
    }, 30000);
    return () => clearInterval(interval);
  }, [token, isLoggedIn]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  const handleLogoClick = () => {
    navigate("/");
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 100);
  };

  const handleNavClick = (path) => {
    setIsOpen(false);
    setIsProfileMenuOpen(false);
    setShowNotifications(false);
    if (path.startsWith("#")) {
      if (location.pathname !== "/") {
        navigate("/");
        setTimeout(() => {
          document.getElementById(path.substring(1))?.scrollIntoView({ behavior: "smooth" });
        }, 300);
      } else {
        document.getElementById(path.substring(1))?.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      navigate(path);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setIsOpen(false);
    setIsProfileMenuOpen(false);
    setShowNotifications(false);
  }, [location.pathname]);

  const navLinks = [
    { name: "Accueil", path: "/" },
    { name: "Ressources", path: "/les_ressources" },
    { name: "Contact", path: "#contact" },
  ];

  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    if (path === "/les_ressources") {
      return location.pathname === "/les_ressources" || location.pathname.startsWith("/RessourceDetail/");
    }
    return location.pathname.startsWith(path);
  };

  const formatDate = (date) => {
    const now = new Date();
    const notifDate = new Date(date);
    const diffMs = now - notifDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "à l'instant";
    if (diffMins < 60) return `il y a ${diffMins} min`;
    if (diffHours < 24) return `il y a ${diffHours} h`;
    if (diffDays < 7) return `il y a ${diffDays} j`;
    return notifDate.toLocaleDateString('fr-FR');
  };

  const NotificationsPanel = () => {
    if (!isLoggedIn) return null;
    return (
      <AnimatePresence>
        {showNotifications && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50"
            style={{ top: '100%' }}
          >
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50">
              <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                <Bell size={16} className="text-blue-600" /> Notifications
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 bg-white rounded-lg"
                >
                  Tout marquer
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {loadingNotif ? (
                <div className="p-8 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                  Chargement...
                </div>
              ) : notifications.length > 0 ? (
                notifications.map((notif) => (
                  <div
                    key={notif._id}
                    className={`p-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-all ${!notif.read ? 'bg-blue-50/30' : ''}`}
                    onClick={() => handleNotificationClick(notif)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getBgForType(notif.type)}`}>
                        {getIconForType(notif.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">{notif.title}</p>
                        <p className="text-gray-500 text-xs mt-1 line-clamp-2">{notif.message}</p>
                        <p className="text-gray-400 text-[10px] mt-1">{formatDate(notif.createdAt)}</p>
                      </div>
                      {!notif.read && <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2" />}
                      <button
                        onClick={(e) => deleteNotification(notif._id, e)}
                        className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <Bell size={32} className="mx-auto mb-2 text-gray-300" />
                  Aucune notification
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  const ProfileMenu = () => {
    if (!isLoggedIn) return null;
    return (
      <div className="relative" ref={profileMenuRef}>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
          className="flex items-center gap-2 focus:outline-none"
        >
          {isAdmin ? (
            <AdminAvatar size="md" showOnlineStatus={true} />
          ) : (
            <UserAvatar
              user={user}
              size="md"
              showOnlineStatus={true}
              hasPendingRequests={isPrestataire && pendingRequestsCount > 0}
            />
          )}
          <span className="text-gray-700 font-medium hidden lg:block">
            {isAdmin ? "Admin" : user?.firstname}
          </span>
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isProfileMenuOpen ? "rotate-180" : ""}`} />
        </motion.button>

        <AnimatePresence>
          {isProfileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50"
            >
              <div className={`px-4 py-3 border-b border-gray-100 ${isAdmin ? "bg-gradient-to-r from-red-50 to-orange-50" : "bg-gradient-to-r from-blue-50 to-purple-50"}`}>
                <div className="flex items-center gap-3">
                  {isAdmin ? (
                    <AdminAvatar size="sm" showOnlineStatus={false} />
                  ) : (
                    <UserAvatar user={user} size="sm" showOnlineStatus={false} />
                  )}
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">Connecté en tant que</p>
                    <p className="font-semibold text-gray-900">
                      {isAdmin ? "Administrateur" : `${user?.firstname} ${user?.lastname}`}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 truncate">{user?.email}</p>
                    {isAdmin && (
                      <span className="inline-block mt-1 bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">ADMIN</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="py-2">
                {isAdmin && (
                  <motion.button whileHover={{ x: 5 }}
                    onClick={() => { navigate("/dashboard-admin"); setIsProfileMenuOpen(false); }}
                    className="w-full px-4 py-3 flex items-center gap-3 text-gray-700 hover:bg-red-50 transition-colors"
                  >
                    <LayoutDashboard className="w-5 h-5 text-red-500" />
                    <span className="font-semibold">Panel Administrateur</span>
                    <span className="ml-auto bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">ADMIN</span>
                  </motion.button>
                )}

                {isPrestataire && (
                  <motion.button whileHover={{ x: 5 }}
                    onClick={() => { navigate("/profileP"); setIsProfileMenuOpen(false); }}
                    className="w-full px-4 py-3 flex items-center gap-3 text-gray-700 hover:bg-blue-50 transition-colors"
                  >
                    <User className="w-5 h-5 text-blue-600" />
                    <span>Mon Profil</span>
                  </motion.button>
                )}
                {isPrestataire && (
                  <motion.button whileHover={{ x: 5 }}
                    onClick={() => { navigate("/mes-demandes"); setIsProfileMenuOpen(false); }}
                    className="w-full px-4 py-3 flex items-center gap-3 text-gray-700 hover:bg-blue-50 transition-colors"
                  >
                    <Bell className="w-5 h-5 text-orange-500" />
                    <span>Mes demandes</span>
                    {pendingRequestsCount > 0 && (
                      <span className="ml-auto bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        {pendingRequestsCount}
                      </span>
                    )}
                  </motion.button>
                )}

                {isOrganisateur && (
                  <motion.button whileHover={{ x: 5 }}
                    onClick={() => { navigate("/profileO"); setIsProfileMenuOpen(false); }}
                    className="w-full px-4 py-3 flex items-center gap-3 text-gray-700 hover:bg-blue-50 transition-colors"
                  >
                    <User className="w-5 h-5 text-blue-600" />
                    <span>Mon Profil</span>
                  </motion.button>
                )}

                {isOrganisateur && (
                  <motion.button whileHover={{ x: 5 }}
                    onClick={() => { navigate("/mes-reservations"); setIsProfileMenuOpen(false); }}
                    className="w-full px-4 py-3 flex items-center gap-3 text-gray-700 hover:bg-blue-50 transition-colors"
                  >
                    <ShoppingCart className="w-5 h-5 text-purple-600" />
                    <span>Mes réservations</span>
                  </motion.button>
                )}

                {isPrestataire && (
                  <motion.button whileHover={{ x: 5 }}
                    onClick={() => { navigate("/add-resource"); setIsProfileMenuOpen(false); }}
                    className="w-full px-4 py-3 flex items-center gap-3 text-gray-700 hover:bg-blue-50 transition-colors"
                  >
                    <PlusCircle className="w-5 h-5 text-orange-600" />
                    <span>Publier une ressource</span>
                  </motion.button>
                )}

                <div className="my-2 border-t border-gray-100" />

                <motion.button whileHover={{ x: 5 }}
                  onClick={() => { handleLogout(); setIsProfileMenuOpen(false); }}
                  className="w-full px-4 py-3 flex items-center gap-3 text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Déconnexion</span>
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? "bg-white/90 backdrop-blur-lg shadow-lg py-4" : "bg-white/80 py-6"}`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">

        {/* Logo */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="flex items-center space-x-2 cursor-pointer"
          onClick={handleLogoClick}
        >
          <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            YallaEvents
          </span>
        </motion.div>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((item, index) => (
            <motion.button
              key={item.name}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => handleNavClick(item.path)}
              className={`relative font-medium group transition-colors ${
                isActive(item.path)
                  ? "text-blue-600"
                  : "text-gray-700 hover:text-blue-600"
              }`}
            >
              {item.name}
              <span className={`absolute -bottom-1 left-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-300 ${
                isActive(item.path) ? "w-full" : "w-0 group-hover:w-full"
              }`} />
            </motion.button>
          ))}

          {!isLoggedIn ? (
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/login")}
                className="px-6 py-2.5 border-2 border-blue-600 text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-all"
              >
                Se connecter
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/signup")}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl transition-all"
              >
                S'inscrire
              </motion.button>
            </div>
          ) : (
            <>
              <div className="relative" ref={notificationsRef}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  {unreadCount > 0 ? (
                    <>
                      <BellRing size={20} className="text-blue-600" />
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center font-bold">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    </>
                  ) : (
                    <Bell size={20} className="text-gray-600 hover:text-blue-600 transition-colors" />
                  )}
                </motion.button>
                <NotificationsPanel />
              </div>

              <ProfileMenu />
            </>
          )}
        </div>

        {/* Burger mobile */}
        <button className="md:hidden" onClick={() => setIsOpen(!isOpen)}>
          {isOpen
            ? <X className="w-6 h-6 text-gray-700" />
            : <Menu className="w-6 h-6 text-gray-700" />
          }
        </button>
      </div>

      {/* Mobile nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden bg-white/95 backdrop-blur-lg"
          >
            <div className="px-6 py-4 space-y-3">

              {!isLoggedIn ? (
                <div className="flex flex-col gap-3 pt-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    onClick={() => { navigate("/login"); setIsOpen(false); }}
                    className="w-full px-4 py-3 border-2 border-blue-600 text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-all"
                  >
                    Se connecter
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    onClick={() => { navigate("/signup"); setIsOpen(false); }}
                    className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold"
                  >
                    S'inscrire
                  </motion.button>
                </div>
              ) : (
                <>
                  {/* Profil mobile */}
                  <div className={`mb-4 p-4 rounded-xl ${isAdmin ? "bg-gradient-to-r from-red-50 to-orange-50" : "bg-gradient-to-r from-blue-50 to-purple-50"}`}>
                    <div className="flex items-center gap-3">
                      {isAdmin ? (
                        <AdminAvatar size="lg" showOnlineStatus={true} />
                      ) : (
                        <UserAvatar
                          user={user}
                          size="lg"
                          showOnlineStatus={true}
                          hasPendingRequests={isPrestataire && pendingRequestsCount > 0}
                        />
                      )}
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">
                          {isAdmin ? "Administrateur" : `${user?.firstname} ${user?.lastname}`}
                        </p>
                        <p className="text-sm text-gray-500 truncate">{user?.email}</p>
                        {isAdmin && (
                          <span className="inline-block mt-1 bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">ADMIN</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {navLinks.map((item) => (
                    <motion.button
                      key={item.name}
                      whileHover={{ x: 10 }}
                      onClick={() => handleNavClick(item.path)}
                      className={`block w-full text-left py-2 px-4 rounded-lg transition ${
                        isActive(item.path)
                          ? "bg-blue-50 text-blue-600 font-semibold"
                          : "text-gray-700 hover:bg-blue-50"
                      }`}
                    >
                      {item.name}
                    </motion.button>
                  ))}

                  <div className="border-t border-gray-100 my-2" />

                  {isAdmin && (
                    <motion.button whileHover={{ x: 10 }}
                      onClick={() => { navigate("/dashboard-admin"); setIsOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-red-50 rounded-lg"
                    >
                      <LayoutDashboard className="w-5 h-5 text-red-500" />
                      <span className="font-semibold">Panel Administrateur</span>
                      <span className="ml-auto bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">ADMIN</span>
                    </motion.button>
                  )}

                  {isPrestataire && (
                    <motion.button whileHover={{ x: 10 }}
                      onClick={() => { navigate("/profileP"); setIsOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 rounded-lg"
                    >
                      <User className="w-5 h-5 text-blue-600" />
                      <span>Mon Profil</span>
                    </motion.button>
                  )}
                  {isPrestataire && (
                    <motion.button whileHover={{ x: 10 }}
                      onClick={() => { navigate("/mes-demandes"); setIsOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 rounded-lg"
                    >
                      <Bell className="w-5 h-5 text-orange-500" />
                      <span>Mes demandes</span>
                      {pendingRequestsCount > 0 && (
                        <span className="ml-auto bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          {pendingRequestsCount}
                        </span>
                      )}
                    </motion.button>
                  )}

                  {isOrganisateur && (
                    <motion.button whileHover={{ x: 10 }}
                      onClick={() => { navigate("/profileO"); setIsOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 rounded-lg"
                    >
                      <User className="w-5 h-5 text-blue-600" />
                      <span>Mon Profil</span>
                    </motion.button>
                  )}

                  {isOrganisateur && (
                    <motion.button whileHover={{ x: 10 }}
                      onClick={() => { navigate("/mes-reservations"); setIsOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 rounded-lg"
                    >
                      <ShoppingCart className="w-5 h-5 text-purple-600" />
                      <span>Mes réservations</span>
                    </motion.button>
                  )}

                  {isPrestataire && (
                    <motion.button whileHover={{ x: 10 }}
                      onClick={() => { navigate("/add-resource"); setIsOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 rounded-lg"
                    >
                      <PlusCircle className="w-5 h-5 text-orange-600" />
                      <span>Publier une ressource</span>
                    </motion.button>
                  )}

                  <motion.button whileHover={{ x: 10 }}
                    onClick={() => { handleLogout(); setIsOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Déconnexion</span>
                  </motion.button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
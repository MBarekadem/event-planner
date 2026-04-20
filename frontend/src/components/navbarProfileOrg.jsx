// components/NavbarProfileOrg.jsx - Version avec tous les éléments à droite

import {
  Menu, X, ChevronDown, LogOut, User,
  Bell, BellRing, CheckCircle, AlertCircle, ShoppingCart
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";

// ─── UserAvatar ───────────────────────────────────────────────────────────────
const UserAvatar = ({ user, size = "md", showOnlineStatus = true }) => {
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
          {initials}
        </div>
      )}
      {showOnlineStatus && (
        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
      )}
    </div>
  );
};

// ─── NavbarProfileOrg ─────────────────────────────────────────────────────────
export default function NavbarProfileOrg({ 
  notifications = [], 
  unreadCount = 0, 
  onMarkAsRead, 
  onMarkAllAsRead 
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const profileMenuRef = useRef(null);
  const notificationsRef = useRef(null);

  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.role;

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

  const markAsRead = (id) => {
    if (onMarkAsRead) onMarkAsRead(id);
  };

  const markAllAsRead = () => {
    if (onMarkAllAsRead) onMarkAllAsRead();
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

  // Liens de navigation pour l'organisateur
  const navLinks = [
    { name: "Accueil", path: "/" },
    { name: "Ressources", path: "/les_ressources" },
  ];

  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  // Composant Notifications Panel
  const NotificationsPanel = () => (
    <AnimatePresence>
      {showNotifications && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50"
        >
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50">
            <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
              <Bell size={16} className="text-blue-600" /> Notifications
            </h3>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 bg-white rounded-lg">
                Tout marquer
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-all ${!notif.read ? 'bg-blue-50/30' : ''}`}
                  onClick={() => markAsRead(notif.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${notif.type === 'success' ? 'bg-green-100' : 'bg-blue-100'}`}>
                      {notif.type === 'success' ? <CheckCircle size={18} className="text-green-600" /> : <Bell size={18} className="text-blue-600" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm truncate">{notif.title}</p>
                      <p className="text-gray-500 text-xs mt-1">{notif.message}</p>
                      <p className="text-gray-400 text-[10px] mt-1">il y a {notif.time}</p>
                    </div>
                    {!notif.read && <div className="w-2 h-2 bg-blue-600 rounded-full" />}
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

  // Composant Profile Menu
  const ProfileMenu = () => (
    <div className="relative" ref={profileMenuRef}>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
        className="flex items-center gap-2 focus:outline-none"
      >
        <UserAvatar user={user} size="md" showOnlineStatus={true} />
        <span className="text-gray-700 font-medium hidden lg:block">
          {user?.firstname}
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
            <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex items-center gap-3">
                <UserAvatar user={user} size="sm" showOnlineStatus={false} />
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Connecté en tant que</p>
                  <p className="font-semibold text-gray-900">
                    {user?.firstname} {user?.lastname}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 truncate">{user?.email}</p>
                </div>
              </div>
            </div>

            <div className="py-2">
              <motion.button whileHover={{ x: 5 }}
                onClick={() => { navigate("/profileO"); setIsProfileMenuOpen(false); }}
                className="w-full px-4 py-3 flex items-center gap-3 text-gray-700 hover:bg-blue-50 transition-colors"
              >
                <User className="w-5 h-5 text-blue-600" />
                <span>Mon Profil</span>
              </motion.button>

              {/* ✅ Lien vers Mes réservations (ex-panier) */}
              <motion.button whileHover={{ x: 5 }}
                onClick={() => { navigate("/mes-reservations"); setIsProfileMenuOpen(false); }}
                className="w-full px-4 py-3 flex items-center gap-3 text-gray-700 hover:bg-blue-50 transition-colors"
              >
                <ShoppingCart className="w-5 h-5 text-purple-600" />
                <span>Mes réservations</span>
              </motion.button>

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

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? "bg-white/90 backdrop-blur-lg shadow-lg py-4" : "bg-white/80 py-6"}`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">

        {/* Logo à GAUCHE */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="flex items-center space-x-2 cursor-pointer"
          onClick={handleLogoClick}
        >
          <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            YallaEvents
          </span>
        </motion.div>

        {/* ============ TOUS LES ÉLÉMENTS À DROITE ============ */}
        <div className="hidden md:flex items-center gap-6">
          {/* Liens de navigation */}
          {navLinks.map((item, index) => (
            <motion.button
              key={item.name}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => handleNavClick(item.path)}
              className={`relative font-medium group transition-colors ${isActive(item.path) && !item.path.startsWith("#")
                  ? "text-blue-600"
                  : "text-gray-700 hover:text-blue-600"
                }`}
            >
              {item.name}
              <span className={`absolute -bottom-1 left-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-300 ${isActive(item.path) && !item.path.startsWith("#") ? "w-full" : "w-0 group-hover:w-full"
                }`} />
            </motion.button>
          ))}

          {/* ICÔNE NOTIFICATION */}
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

          {/* MENU PROFIL */}
          <ProfileMenu />
        </div>

        {/* Burger mobile */}
        <button className="md:hidden" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X className="w-6 h-6 text-gray-700" /> : <Menu className="w-6 h-6 text-gray-700" />}
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

              {/* Profil mobile */}
              {user && (
                <div className="mb-4 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50">
                  <div className="flex items-center gap-3">
                    <UserAvatar user={user} size="lg" showOnlineStatus={true} />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        {user?.firstname} {user?.lastname}
                      </p>
                      <p className="text-sm text-gray-500 truncate">{user?.email}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Liens */}
              {navLinks.map((item) => (
                <motion.button
                  key={item.name}
                  whileHover={{ x: 10 }}
                  onClick={() => handleNavClick(item.path)}
                  className={`block w-full text-left py-2 px-4 rounded-lg transition ${isActive(item.path) && !item.path.startsWith("#")
                      ? "bg-blue-50 text-blue-600 font-semibold"
                      : "text-gray-700 hover:bg-blue-50"
                    }`}
                >
                  {item.name}
                </motion.button>
              ))}

              {/* Actions utilisateur */}
              {user && (
                <>
                  <div className="border-t border-gray-100 my-2" />

                  <motion.button whileHover={{ x: 10 }}
                    onClick={() => { navigate("/profileO"); setIsOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 rounded-lg"
                  >
                    <User className="w-5 h-5 text-blue-600" />
                    <span>Mon Profil</span>
                  </motion.button>

                  {/* ✅ Lien mobile vers Mes réservations */}
                  <motion.button whileHover={{ x: 10 }}
                    onClick={() => { navigate("/mes-reservations"); setIsOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 rounded-lg"
                  >
                    <ShoppingCart className="w-5 h-5 text-purple-600" />
                    <span>Mes réservations</span>
                  </motion.button>

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
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiUpload, FiDollarSign, FiMapPin, FiUsers, FiTag,
  FiCheckCircle, FiXCircle, FiClock, FiMousePointer,
  FiChevronLeft, FiChevronRight, FiSun, FiMoon, FiCloud, FiStar, FiHeart,
  FiGift, FiArrowLeft, FiPlus, FiTrash2, FiFileText, FiEye, FiChevronDown
} from 'react-icons/fi';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";
import axios from 'axios';

const localizer = momentLocalizer(moment);

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// ================= Composant Carte =================
const LocationPicker = ({ centerLat, centerLng, onLocationChange }) => {
  const [markerPos, setMarkerPos] = useState(
    centerLat && centerLng ? { lat: centerLat, lng: centerLng } : null
  );
  const prevRef = useRef({ lat: centerLat, lng: centerLng });

  useEffect(() => {
    if (
      centerLat && centerLng &&
      (prevRef.current.lat !== centerLat || prevRef.current.lng !== centerLng)
    ) {
      prevRef.current = { lat: centerLat, lng: centerLng };
      setMarkerPos({ lat: centerLat, lng: centerLng });
    }
  }, [centerLat, centerLng]);

  const handleMove = useCallback((lat, lng) => {
    setMarkerPos({ lat, lng });
    onLocationChange(lat, lng);
  }, [onLocationChange]);

  const MapClickHandler = () => {
    useMapEvents({
      click(e) { handleMove(e.latlng.lat, e.latlng.lng); },
    });
    return null;
  };

  const mapCenter = centerLat && centerLng ? [centerLat, centerLng] : [36.8065, 10.1815];

  return (
    <MapContainer center={mapCenter} zoom={13}
      style={{ height: "280px", width: "100%", borderRadius: "16px", zIndex: 0 }}>
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; OSM &copy; CartoDB'
      />
      <MapClickHandler />
      {markerPos && (
        <Marker position={[markerPos.lat, markerPos.lng]} draggable
          eventHandlers={{
            dragend: (e) => {
              const { lat, lng } = e.target.getLatLng();
              handleMove(lat, lng);
            },
          }}
        />
      )}
    </MapContainer>
  );
};

// ================= Composants UI =================
const Tooltip = ({ children, text }) => (
  <div className="relative group">
    {children}
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50"
    >
      {text}
      <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-800" />
    </motion.div>
  </div>
);

const CustomToolbar = (toolbar) => {
  const goToBack = () => toolbar.onNavigate('PREV');
  const goToNext = () => toolbar.onNavigate('NEXT');
  const goToToday = () => toolbar.onNavigate('TODAY');
  const goToDayView = () => toolbar.onView('day');
  const goToWeekView = () => toolbar.onView('week');
  const label = () => moment(toolbar.date).format('MMMM YYYY');

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100"
    >
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={goToToday}
        className="px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100"
      >
        Aujourd'hui
      </motion.button>
      <div className="flex items-center space-x-4">
        <motion.button whileHover={{ scale: 1.1, x: -3 }} whileTap={{ scale: 0.9 }} onClick={goToBack} className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-full">
          <FiChevronLeft className="w-5 h-5" />
        </motion.button>
        <motion.span key={toolbar.date} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-lg font-semibold text-gray-800 min-w-[200px] text-center">
          {label()}
        </motion.span>
        <motion.button whileHover={{ scale: 1.1, x: 3 }} whileTap={{ scale: 0.9 }} onClick={goToNext} className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-full">
          <FiChevronRight className="w-5 h-5" />
        </motion.button>
      </div>
      <div className="flex items-center space-x-2">
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={goToWeekView} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${toolbar.view === 'week' ? 'bg-purple-600 text-white shadow-lg shadow-purple-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          Semaine
        </motion.button>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={goToDayView} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${toolbar.view === 'day' ? 'bg-purple-600 text-white shadow-lg shadow-purple-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          Jour
        </motion.button>
      </div>
    </motion.div>
  );
};

const AvailabilityEvent = ({ event }) => {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.02, y: -2 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={`h-full w-full rounded-md px-2 py-1 text-xs font-medium relative overflow-hidden ${event.type === 'available'
        ? 'bg-gradient-to-r from-green-100 to-green-50 text-green-800 border-l-4 border-green-500'
        : 'bg-gradient-to-r from-red-100 to-red-50 text-red-800 border-l-4 border-red-500'
        }`}
    >
      <motion.div className="absolute inset-0 bg-white opacity-0" animate={{ opacity: isHovered ? 0.1 : 0 }} />
      <div className="flex items-center space-x-1">
        <FiClock className="w-3 h-3" />
        <span>{moment(event.start).format('HH:mm')} - {moment(event.end).format('HH:mm')}</span>
      </div>
      <div className="font-semibold mt-0.5 flex items-center space-x-1">
        {event.type === 'available' ? <><FiCheckCircle className="w-3 h-3" /><span>Disponible</span></> : <><FiXCircle className="w-3 h-3" /><span>Indisponible</span></>}
      </div>
    </motion.div>
  );
};

const TimeSlotWrapper = ({ children, value, onSelectSlot }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [ripple, setRipple] = useState({ show: false, x: 0, y: 0 });

  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setRipple({ show: true, x, y });
    setTimeout(() => setRipple({ show: false, x: 0, y: 0 }), 500);
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 300);
    const endTime = moment(value).add(30, 'minutes').toDate();
    onSelectSlot({ start: value, end: endTime });
  };

  return (
    <motion.div
      className="relative cursor-pointer overflow-hidden"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={handleClick}
      animate={{ scale: isClicked ? 0.98 : 1, backgroundColor: isHovered ? 'rgba(139, 92, 246, 0.1)' : 'transparent' }}
      transition={{ duration: 0.2 }}
      whileTap={{ scale: 0.98 }}
    >
      {ripple.show && (
        <motion.div
          initial={{ scale: 0, opacity: 0.5 }}
          animate={{ scale: 4, opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute w-5 h-5 bg-purple-400 rounded-full pointer-events-none"
          style={{ left: ripple.x - 10, top: ripple.y - 10 }}
        />
      )}
      {children}
      {isHovered && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full mt-[-8px] px-2 py-1 bg-purple-600 text-white text-xs rounded shadow-lg z-50 pointer-events-none whitespace-nowrap"
        >
          <FiMousePointer className="inline mr-1" />
          Cliquez pour sélectionner {moment(value).format('HH:mm')}
        </motion.div>
      )}
    </motion.div>
  );
};

const TimeColumnWrapper = ({ children }) => {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <motion.div className="relative" onHoverStart={() => setIsHovered(true)} onHoverEnd={() => setIsHovered(false)}>
      {children}
      {isHovered && (
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-purple-400 to-indigo-400 rounded-full" />
      )}
    </motion.div>
  );
};

const DateCellWrapper = ({ children }) => {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <motion.div className="relative h-full" onHoverStart={() => setIsHovered(true)} onHoverEnd={() => setIsHovered(false)} whileHover={{ backgroundColor: 'rgba(139, 92, 246, 0.05)' }}>
      {children}
      {isHovered && <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 border-2 border-purple-200 rounded-lg pointer-events-none" />}
    </motion.div>
  );
};

// ================= Définition des champs par catégorie =================
const resourceFields = {
  salle: [
    { name: "capacity", label: "Capacité (personnes)", type: "number", required: true, icon: FiUsers },
    { name: "surface", label: "Surface (m²)", type: "number", icon: FiMapPin },
    { name: "parking", label: "Parking", type: "boolean" },
    { name: "wifi", label: "Wi-Fi", type: "boolean" },
    { name: "climatisation", label: "Climatisation", type: "boolean" },
    { name: "nombreChaises", label: "Nombre de chaises", type: "number" },
    { name: "nombreTables", label: "Nombre de tables", type: "number" }
  ],
  materiel: [
    { name: "quantite", label: "Quantité", type: "number", required: true, icon: FiTag },
    { name: "etat", label: "État", type: "text", placeholder: "neuf, bon état..." },
    { name: "couleur", label: "Couleur", type: "text" },
    { name: "matiere", label: "Matière", type: "text" },
    { name: "dimensions", label: "Dimensions", type: "text", placeholder: "L x l x h" }
  ],
  decoration: [
    { name: "type", label: "Type", type: "text", placeholder: "naturel, artificiel..." },
    { name: "couleur", label: "Couleur", type: "text" },
    { name: "quantite", label: "Quantité", type: "number" },
    { name: "matiere", label: "Matière", type: "text" }
  ],
  traiteur: [
    { name: "typeCuisine", label: "Type de cuisine", type: "text", required: true, placeholder: "tunisien, italien..." },
    { name: "nombrePersonnes", label: "Nombre de personnes", type: "number", required: true, icon: FiUsers },
    { name: "serveursInclus", label: "Serveurs inclus", type: "boolean" }
  ],
  dj: [
    { name: "styleMusique", label: "Style de musique", type: "text", required: true, placeholder: "House, Electro, Orientale..." },
    { name: "duree", label: "Durée (heures)", type: "number", placeholder: "4" },
    { name: "materielInclus", label: "Matériel inclus", type: "boolean" }
  ],
  photographe: [
    { name: "typePhoto", label: "Type de photo", type: "text", placeholder: "Portrait, Reportage..." },
    { name: "nombrePhotos", label: "Nombre de photos", type: "number", placeholder: "200" },
    { name: "videoInclus", label: "Vidéo incluse", type: "boolean" }
  ],
  serveur: [
    { name: "nombreServeurs", label: "Nombre de serveurs", type: "number", required: true, placeholder: "3" },
    { name: "tenue", label: "Tenue", type: "text", placeholder: "Classique, Moderne..." },
    { name: "experience", label: "Expérience (années)", type: "number", placeholder: "2" },
    { name: "langues", label: "Langues parlées", type: "text", placeholder: "Français, Anglais" }
  ]
};

// ================= Composant principal =================
const AddResourceForm = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // ── flag anti-boucle carte ↔ input ──
  const isUpdatingFromMap = useRef(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "service",
    category: "salle",
    price: "",
    termsText: "",
    termsFile: null
  });

  const [selectedServiceCat, setSelectedServiceCat] = useState("");
  const [attributes, setAttributes] = useState({});
  const [customAttributes, setCustomAttributes] = useState([]);
  const [newCustomAttr, setNewCustomAttr] = useState({ name: "", type: "text", value: "" });

  const [mediaFiles, setMediaFiles] = useState([]);
  const [mediaPreviews, setMediaPreviews] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [message, setMessage] = useState("");

  const [availabilityEvents, setAvailabilityEvents] = useState([]);
  const [selectedRange, setSelectedRange] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calendarView, setCalendarView] = useState('week');
  const [showSelectionTooltip, setShowSelectionTooltip] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(true);
  const [selectedEventType, setSelectedEventType] = useState(null);

  const [resourceLocation, setResourceLocation] = useState(null);
  const [mapLat, setMapLat] = useState(36.8065);
  const [mapLng, setMapLng] = useState(10.1815);
  const [locationName, setLocationName] = useState("");

  const [backgroundTheme, setBackgroundTheme] = useState('gradient');
  const [showConfetti, setShowConfetti] = useState(false);
  const [formProgress, setFormProgress] = useState(0);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [floatingIcons, setFloatingIcons] = useState([]);
  const [isNightMode, setIsNightMode] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);

  // Calcul progression
  useEffect(() => {
    let filled = 0;
    let total = 5;
    if (formData.name) filled++;
    if (formData.description) filled++;
    if (formData.price) filled++;
    if (formData.type) filled++;
    if (formData.category) filled++;
    if (formData.termsText || formData.termsFile) filled++;
    if (resourceLocation) filled++;
    const requiredFields = resourceFields[formData.category]?.filter(f => f.required) || [];
    requiredFields.forEach(field => {
      total++;
      if (attributes[field.name] !== undefined && attributes[field.name] !== "") filled++;
    });
    setFormProgress((filled / total) * 100);
  }, [formData, attributes, resourceLocation]);

  // Icônes flottantes
  useEffect(() => {
    const icons = [FiStar, FiHeart, FiGift, FiSun, FiMoon, FiCloud];
    const newFloatingIcons = [];
    for (let i = 0; i < 10; i++) {
      newFloatingIcons.push({
        id: i,
        Icon: icons[Math.floor(Math.random() * icons.length)],
        x: Math.random() * 100,
        y: Math.random() * 100,
        duration: 15 + Math.random() * 20,
        delay: Math.random() * 5,
        size: 20 + Math.random() * 30
      });
    }
    setFloatingIcons(newFloatingIcons);
  }, []);

  // ── handleLocationChange : carte → input (avec flag anti-boucle) ──
  const handleLocationChange = useCallback(async (lat, lng) => {
    setMapLat(lat);
    setMapLng(lng);
    setResourceLocation({ lat, lng });

    try {
      const res = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      if (res.data?.display_name) {
        isUpdatingFromMap.current = true; // 🛡 bloque le debounce
        setLocationName(res.data.display_name);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  // Géolocalisation automatique au chargement
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setMapLat(coords.latitude);
        setMapLng(coords.longitude);
        setResourceLocation({ lat: coords.latitude, lng: coords.longitude });
      },
      () => console.log("Géolocalisation refusée")
    );
  }, []);

  // ── Debounce input → carte (avec guard anti-boucle) ──
  useEffect(() => {
    // Si la mise à jour vient de la carte, on ignore et on remet le flag à false
    if (isUpdatingFromMap.current) {
      isUpdatingFromMap.current = false;
      return;
    }

    const delayDebounce = setTimeout(async () => {
      if (!locationName || locationName.length < 3) return;

      try {
        const res = await axios.get(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}`
        );
        if (res.data && res.data.length > 0) {
          const { lat, lon, display_name } = res.data[0];
          isUpdatingFromMap.current = true; // 🛡 évite re-déclenchement après setLocationName
          setMapLat(parseFloat(lat));
          setMapLng(parseFloat(lon));
          setResourceLocation({ lat: parseFloat(lat), lng: parseFloat(lon) });
          setLocationName(display_name);
        }
      } catch (err) {
        console.error(err);
      }
    }, 600);

    return () => clearTimeout(delayDebounce);
  }, [locationName]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAttributeChange = (attrName, value, type) => {
    let parsedValue = value;
    if (type === "number") parsedValue = value === "" ? undefined : Number(value);
    if (type === "boolean") parsedValue = value === "true" || value === true;
    setAttributes(prev => ({ ...prev, [attrName]: parsedValue }));
  };

  const handlePdfChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setFormData(prev => ({ ...prev, termsFile: file }));
      const url = URL.createObjectURL(file);
      setPdfPreviewUrl(url);
    } else {
      setMessage("Veuillez sélectionner un fichier PDF valide.");
    }
  };

  const removePdf = () => {
    if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    setFormData(prev => ({ ...prev, termsFile: null }));
    setPdfPreviewUrl(null);
  };

  const addCustomAttribute = () => {
    if (!newCustomAttr.name.trim()) return;
    setCustomAttributes(prev => [...prev, { ...newCustomAttr }]);
    setNewCustomAttr({ name: "", type: "text", value: "" });
  };

  const removeCustomAttribute = (index) => {
    setCustomAttributes(prev => prev.filter((_, i) => i !== index));
  };

  const updateCustomAttribute = (index, field, val) => {
    setCustomAttributes(prev => prev.map((attr, i) =>
      i === index ? { ...attr, [field]: val } : attr
    ));
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    handleFiles(files);
  };

  const handleFiles = (files) => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    setMediaFiles(prev => [...prev, ...imageFiles]);
    const newPreviews = imageFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      id: Math.random().toString(36).substr(2, 9)
    }));
    setMediaPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeMedia = (id) => {
    setMediaPreviews(prev => {
      const file = prev.find(f => f.id === id);
      if (file) URL.revokeObjectURL(file.preview);
      setMediaFiles(current => current.filter(f => f !== file?.file));
      return prev.filter(f => f.id !== id);
    });
  };

  const handleSelectRange = (range) => {
    setSelectedRange(range);
    setShowSelectionTooltip(true);
    setTimeout(() => setShowSelectionTooltip(false), 2000);
  };

  const addAvailabilityRange = (type) => {
    if (!selectedRange) return;
    const newEvent = {
      id: Math.random().toString(36).substr(2, 9),
      title: type === 'available' ? 'Disponible' : 'Indisponible',
      start: selectedRange.start,
      end: selectedRange.end,
      type: type,
      allDay: false
    };
    setAvailabilityEvents(prev => [...prev, newEvent]);
    setSelectedEventType(type);
    setTimeout(() => setSelectedEventType(null), 500);
    setSelectedRange(null);
  };

  const removeAvailabilityEvent = (eventId) => {
    setAvailabilityEvents(prev => prev.filter(e => e.id !== eventId));
  };

  const handleNavigate = (newDate) => setCurrentDate(newDate);

  const resetForm = () => {
    mediaPreviews.forEach(item => URL.revokeObjectURL(item.preview));
    if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    setFormData({
      name: "",
      description: "",
      type: "service",
      category: "salle",
      price: "",
      termsText: "",
      termsFile: null
    });
    setSelectedServiceCat("");
    setAttributes({});
    setCustomAttributes([]);
    setNewCustomAttr({ name: "", type: "text", value: "" });
    setMediaFiles([]);
    setMediaPreviews([]);
    setDragActive(false);
    setMessage("");
    setAvailabilityEvents([]);
    setSelectedRange(null);
    setShowSelectionTooltip(false);
    setPdfPreviewUrl(null);
    setResourceLocation(null);
    setMapLat(36.8065);
    setMapLng(10.1815);
    setLocationName("");
    setCalendarView('week');
    setCurrentDate(new Date());
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) { setMessage("Géolocalisation non supportée"); return; }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setMapLat(coords.latitude);
        setMapLng(coords.longitude);
        setResourceLocation({ lat: coords.latitude, lng: coords.longitude });
        setMessage("📍 Position mise à jour");
        setTimeout(() => setMessage(""), 3000);
      },
      () => setMessage("Impossible de récupérer votre position")
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      setMessage("Vous devez être connecté pour ajouter une ressource");
      return;
    }

    const requiredFields = resourceFields[formData.category]?.filter(f => f.required) || [];
    for (let field of requiredFields) {
      if (!attributes[field.name] && attributes[field.name] !== false) {
        setMessage(`Le champ "${field.label}" est obligatoire pour cette catégorie.`);
        return;
      }
    }

    if (!formData.termsText && !formData.termsFile) {
      setMessage("Veuillez fournir les conditions (texte ou fichier PDF).");
      return;
    }

    try {
      setIsSubmitting(true);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);

      const resourceData = new FormData();
      resourceData.append("name", formData.name);
      resourceData.append("description", formData.description);
      resourceData.append("type", formData.type);
      resourceData.append("price", formData.price);
      resourceData.append("categoryName", formData.category);

      if (resourceLocation) {
        const geoJson = {
          type: "Point",
          coordinates: [resourceLocation.lng, resourceLocation.lat]
        };
        resourceData.append("location", JSON.stringify(geoJson));
      }
      resourceData.append("locationname", locationName);

      if (formData.termsFile) {
        resourceData.append("termsFile", formData.termsFile);
      } else {
        resourceData.append("terms", formData.termsText || "");
      }

      resourceData.append("attributes", JSON.stringify(attributes || {}));
      resourceData.append("customAttributes", JSON.stringify(customAttributes || {}));
      resourceData.append(
        "availability",
        JSON.stringify(
          availabilityEvents.map(e => ({
            start: e.start,
            end: e.end,
            type: e.type
          }))
        )
      );

      mediaFiles.forEach(file => resourceData.append("media", file));

      await axios.post(
        "http://localhost:5000/api/ressources/add_ressource",
        resourceData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      setMessage("Ressource ajoutée avec succès !");
      setShowSuccessAnimation(true);
      resetForm();
      setTimeout(() => setShowSuccessAnimation(false), 2000);
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.message || "Erreur lors de l'ajout");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSearchLocation = async () => {
    if (!locationName) return;
    try {
      const res = await axios.get(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}`
      );
      if (res.data && res.data.length > 0) {
        const { lat, lon, display_name } = res.data[0];
        isUpdatingFromMap.current = true;
        setMapLat(parseFloat(lat));
        setMapLng(parseFloat(lon));
        setResourceLocation({ lat: parseFloat(lat), lng: parseFloat(lon) });
        setLocationName(display_name);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const renderDynamicFields = () => {
    const fields = resourceFields[formData.category];
    if (!fields) return null;
    return (
      <div className="space-y-4">
        <h3 className="text-md font-semibold text-gray-800 border-b pb-2 flex items-center gap-2">
          <FiTag className="text-purple-500" /> Caractéristiques spécifiques
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fields.map(field => (
            <div key={field.name} className="bg-gray-50 p-3 rounded-xl">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
              {field.type === "boolean" ? (
                <div className="flex items-center space-x-4 mt-2">
                  <label className="inline-flex items-center">
                    <input type="radio" name={field.name} checked={attributes[field.name] === true} onChange={() => handleAttributeChange(field.name, true, "boolean")} className="form-radio text-purple-600" />
                    <span className="ml-2">Oui</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input type="radio" name={field.name} checked={attributes[field.name] === false} onChange={() => handleAttributeChange(field.name, false, "boolean")} className="form-radio text-purple-600" />
                    <span className="ml-2">Non</span>
                  </label>
                </div>
              ) : (
                <input
                  type={field.type}
                  value={attributes[field.name] || ""}
                  onChange={(e) => handleAttributeChange(field.name, e.target.value, field.type)}
                  placeholder={field.placeholder || ""}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-200 transition"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderCustomAttributes = () => (
    <div className="space-y-4 border-t pt-4 mt-4">
      <h3 className="text-md font-semibold text-gray-800 flex items-center gap-2">
        <FiPlus className="text-purple-500" /> Caractéristiques personnalisées
      </h3>
      <AnimatePresence>
        {customAttributes.map((attr, idx) => (
          <motion.div key={idx} layout initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="flex flex-wrap gap-2 items-end p-3 bg-gradient-to-r from-gray-50 to-white rounded-xl shadow-sm">
            <div className="flex-1">
              <input type="text" placeholder="Nom" value={attr.name} onChange={(e) => updateCustomAttribute(idx, "name", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200" />
            </div>
            <div className="w-32">
              <select value={attr.type} onChange={(e) => updateCustomAttribute(idx, "type", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200">
                <option value="text">Texte</option>
                <option value="number">Nombre</option>
                <option value="boolean">Booléen</option>
              </select>
            </div>
            <div className="flex-1">
              {attr.type === "boolean" ? (
                <select value={attr.value} onChange={(e) => updateCustomAttribute(idx, "value", e.target.value === "true")} className="w-full px-3 py-2 rounded-lg border border-gray-200">
                  <option value="">Sélectionner</option>
                  <option value="true">Oui</option>
                  <option value="false">Non</option>
                </select>
              ) : (
                <input type={attr.type} placeholder="Valeur" value={attr.value} onChange={(e) => updateCustomAttribute(idx, "value", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200" />
              )}
            </div>
            <button type="button" onClick={() => removeCustomAttribute(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition">
              <FiTrash2 />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
      <div className="flex gap-2 items-end bg-white p-3 rounded-xl shadow-sm">
        <div className="flex-1">
          <input type="text" placeholder="Nom (ex: Couleur spéciale)" value={newCustomAttr.name} onChange={(e) => setNewCustomAttr(prev => ({ ...prev, name: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-200" />
        </div>
        <div className="w-32">
          <select value={newCustomAttr.type} onChange={(e) => setNewCustomAttr(prev => ({ ...prev, type: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-200">
            <option value="text">Texte</option>
            <option value="number">Nombre</option>
            <option value="boolean">Booléen</option>
          </select>
        </div>
        <motion.button type="button" onClick={addCustomAttribute} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="px-4 py-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 flex items-center gap-1">
          <FiPlus /> Ajouter
        </motion.button>
      </div>
    </div>
  );

  const getBackgroundClass = () => {
    if (isNightMode) return 'bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900';
    switch (backgroundTheme) {
      case 'gradient': return 'bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50';
      case 'ocean': return 'bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50';
      case 'sunset': return 'bg-gradient-to-br from-orange-50 via-rose-50 to-red-50';
      case 'forest': return 'bg-gradient-to-br from-green-50 via-emerald-50 to-lime-50';
      default: return 'bg-gradient-to-br from-slate-50 to-slate-100';
    }
  };

  const CalendarComponents = {
    event: AvailabilityEvent,
    timeSlotWrapper: (props) => <TimeSlotWrapper {...props} onSelectSlot={handleSelectRange} />,
    timeGutterWrapper: TimeColumnWrapper,
    dateCellWrapper: DateCellWrapper,
    toolbar: CustomToolbar
  };

  const messages = {
    date: 'Date', time: 'Heure', event: 'Événement', allDay: 'Journée',
    week: 'Semaine', day: 'Jour', previous: 'Précédent', next: 'Suivant',
    yesterday: 'Hier', tomorrow: 'Demain', today: "Aujourd'hui", agenda: 'Agenda',
    showMore: total => `+${total} autres`
  };

  return (
    <>
      <Navbar />
      <div className={`min-h-screen ${getBackgroundClass()} pt-20 relative overflow-hidden transition-colors duration-1000`}>
        {floatingIcons.map(({ id, Icon, x, y, duration, delay, size }) => (
          <motion.div
            key={id}
            className="absolute opacity-10 text-purple-300 pointer-events-none"
            style={{ left: `${x}%`, top: `${y}%` }}
            animate={{ y: [0, -30, 0], rotate: [0, 360], scale: [1, 1.2, 1] }}
            transition={{ duration, delay, repeat: Infinity, ease: "linear" }}
          >
            <Icon size={size} />
          </motion.div>
        ))}

        <AnimatePresence>
          {showSuccessAnimation && (
            <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-green-500 text-white p-8 rounded-full shadow-2xl">
              <FiCheckCircle className="w-16 h-16" />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showConfetti && (
            <motion.div initial={{ y: -100, opacity: 1 }} animate={{ y: window.innerHeight, opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 3 }} className="fixed top-0 left-0 w-full h-full pointer-events-none z-40">
              {[...Array(50)].map((_, i) => (
                <motion.div key={i} initial={{ x: Math.random() * window.innerWidth, y: -50, rotate: 0 }} animate={{ y: window.innerHeight + 50, rotate: 360 * (Math.random() > 0.5 ? 1 : -1) }} transition={{ duration: 2 + Math.random() * 2, delay: Math.random() * 0.5, ease: "linear" }} className="absolute w-3 h-3" style={{ backgroundColor: `hsl(${Math.random() * 360}, 70%, 50%)`, borderRadius: Math.random() > 0.5 ? '50%' : '0%' }} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div className="fixed top-0 left-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500 z-50" initial={{ width: 0 }} animate={{ width: `${formProgress}%` }} transition={{ duration: 0.5 }} />

        <div className="fixed bottom-6 right-6 z-50 flex flex-col space-y-2">
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setIsNightMode(!isNightMode)} className="p-3 bg-white/80 backdrop-blur-sm rounded-full shadow-lg">
            {isNightMode ? <FiSun className="w-5 h-5 text-yellow-500" /> : <FiMoon className="w-5 h-5 text-indigo-500" />}
          </motion.button>
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setBackgroundTheme(prev => {
            const themes = ['gradient', 'ocean', 'sunset', 'forest'];
            const currentIndex = themes.indexOf(prev);
            return themes[(currentIndex + 1) % themes.length];
          })} className="p-3 bg-white/80 backdrop-blur-sm rounded-full shadow-lg">
            <FiCloud className="w-5 h-5 text-purple-500" />
          </motion.button>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto relative z-10 px-4 pb-12">
          <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-8 pt-4">
            <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-2 text-gray-600 hover:text-black transition">
              <FiArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition" /> Retour
            </button>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">Ajouter une ressource</h1>
            <p className="text-gray-600 mt-2">Remplissez les détails pour ajouter une nouvelle ressource</p>
          </motion.div>

          {/* ── GRILLE PRINCIPALE ── */}
          {/* 
            La colonne droite (calendrier) est en position sticky.
            Elle reste visible pendant tout le scroll du formulaire.
            - top-24 = espace sous la Navbar (pt-20 + 1rem de marge)
            - max-h-[calc(100vh-7rem)] + overflow-y-auto = scroll interne si le contenu dépasse
            - self-start est indispensable pour que sticky fonctionne dans une grille
          */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

            {/* ── COLONNE GAUCHE : formulaire ── */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-white/80 backdrop-blur-md rounded-2xl shadow-2xl p-6 border border-white/30">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Type de ressource *</label>
                    <select name="type" value={formData.type} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-400">
                      <option value="service">Service</option>
                      <option value="product">Produit</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Catégorie *</label>
                  {formData.type === 'product' ? (
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { value: 'materiel', label: 'Matériel', icon: FiTag },
                        { value: 'decoration', label: 'Décoration', icon: FiGift }
                      ].map(cat => (
                        <motion.button
                          key={cat.value}
                          type="button"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            setFormData(prev => ({ ...prev, category: cat.value }));
                            setAttributes({});
                            setSelectedServiceCat("");
                          }}
                          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${formData.category === cat.value
                            ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-md'
                            : 'border-gray-200 hover:border-purple-300'
                            }`}
                        >
                          <cat.icon className="w-5 h-5" />
                          <span className="font-medium">{cat.label}</span>
                        </motion.button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-4">
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setFormData(prev => ({ ...prev, category: 'salle' }));
                          setAttributes({});
                          setSelectedServiceCat("");
                        }}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${formData.category === 'salle'
                          ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-md'
                          : 'border-gray-200 hover:border-purple-300'
                          }`}
                      >
                        <FiMapPin className="w-5 h-5" />
                        <span className="font-medium">Salle</span>
                      </motion.button>

                      <div className="flex-1 relative">
                        <select
                          value={selectedServiceCat}
                          onChange={(e) => {
                            const newCat = e.target.value;
                            setSelectedServiceCat(newCat);
                            setFormData(prev => ({ ...prev, category: newCat }));
                            setAttributes({});
                          }}
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 hover:border-purple-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all bg-white appearance-none cursor-pointer"
                        >
                          <option value="" disabled>Personnel</option>
                          <option value="traiteur">🍽️ Traiteur</option>
                          <option value="dj">🎧 DJ</option>
                          <option value="photographe">📸 Photographe</option>
                          <option value="serveur">👔 Serveur</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <FiChevronDown className="w-5 h-5 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="group">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nom de la ressource *</label>
                  <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-200 transition-all duration-300 group-hover:shadow-md" required />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                  <textarea name="description" value={formData.description} onChange={handleChange} rows="3" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-200 transition" required />
                </div>

                {renderDynamicFields()}

                {/* ── LOCALISATION ── */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <FiMapPin className="text-purple-500" /> Localisation géographique *
                  </label>

                  {/* Input texte avec bouton recherche */}
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={locationName}
                      onChange={(e) => setLocationName(e.target.value)}
                      placeholder="Entrer une adresse ou un lieu..."
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:border-purple-400 focus:ring-2 focus:ring-purple-200 transition"
                    />

                  </div>

                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 shadow-sm">
                    <LocationPicker
                      centerLat={mapLat}
                      centerLng={mapLng}
                      onLocationChange={handleLocationChange}
                    />
                    <div className="flex justify-between items-center mt-3">

                      {resourceLocation && (
                        <span className="text-xs text-green-600 bg-green-50 px-3 py-1 rounded-full">
                          ✓ Coordonnées sélectionnées
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      Cliquez sur la carte ou déplacez le marqueur • L'adresse se remplit automatiquement
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Prix (par heure) *</label>
                  <div className="relative">
                    <FiDollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input type="number" name="price" value={formData.price} onChange={handleChange} className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200" required />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <FiFileText className="text-purple-500" /> Conditions de location (Contrat) *
                  </label>
                  <div className="space-y-3">
                    <textarea
                      name="termsText"
                      value={formData.termsText}
                      onChange={handleChange}
                      rows="4"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-400 resize-none"
                      placeholder="Rédigez vos conditions ici (texte libre)..."
                    />
                    <div className="flex items-center gap-3">
                      <label className="flex-1 cursor-pointer bg-gray-100 hover:bg-gray-200 rounded-xl px-4 py-2 text-center transition flex items-center justify-center gap-2">
                        <FiUpload /> Ajouter un PDF
                        <input type="file" accept="application/pdf" onChange={handlePdfChange} className="hidden" />
                      </label>
                      {formData.termsFile && (
                        <div className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-xl">
                          <FiFileText className="text-green-600" />
                          <span className="text-sm truncate max-w-[150px]">{formData.termsFile.name}</span>
                          <button type="button" onClick={removePdf} className="text-red-500 hover:text-red-700"><FiXCircle /></button>
                          {pdfPreviewUrl && (
                            <a href={pdfPreviewUrl} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-800"><FiEye /></a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">💡 Vous pouvez fournir un texte ou un fichier PDF (ou les deux).</p>
                </div>

                {renderCustomAttributes()}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Médias (images)</label>
                  <motion.div
                    animate={{ scale: dragActive ? 1.02 : 1, borderColor: dragActive ? '#a78bfa' : '#d1d5db' }}
                    className={`relative border-2 border-dashed rounded-xl p-6 transition-all ${dragActive ? 'border-purple-400 bg-purple-50' : 'border-gray-300 hover:border-purple-300'}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <input type="file" multiple accept="image/*" onChange={handleFileSelect} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <div className="text-center">
                      <FiUpload className="mx-auto text-3xl text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">Glissez-déposez des images ici, ou cliquez pour sélectionner</p>
                    </div>
                  </motion.div>
                  {mediaPreviews.length > 0 && (
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {mediaPreviews.map((file) => (
                        <div key={file.id} className="relative group">
                          <img src={file.preview} alt="Preview" className="w-full h-20 object-cover rounded-lg border border-gray-200" />
                          <button type="button" onClick={() => removeMedia(file.id)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition">
                            <FiXCircle className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {message && (
                  <div className={`p-3 rounded-xl ${message.includes("succès") ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {message}
                  </div>
                )}

                <motion.button
                  type="submit"
                  disabled={isSubmitting}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-70"
                >
                  {isSubmitting
                    ? <div className="flex items-center justify-center space-x-2">
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }} className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                      <span>Ajout en cours...</span>
                    </div>
                    : "Ajouter la ressource"
                  }
                </motion.button>
              </form>
            </motion.div>

            {/* ── COLONNE DROITE : calendrier STICKY ── */}
            {/*
              sticky + top-24 : le panneau colle sous la navbar dès qu'on scroll
              self-start : obligatoire en CSS Grid pour que sticky fonctionne
                           (sans ça, l'élément s'étire à la hauteur de la colonne gauche)
              max-h-[calc(100vh-7rem)] + overflow-y-auto : si le contenu du panneau
              dépasse la fenêtre, il scroll de façon interne
            */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="self-start flex top-24"
            >
              <motion.div
                animate={{
                  height: isCalendarExpanded ? 'auto' : '60px',
                  overflow: isCalendarExpanded ? 'visible' : 'hidden'
                }}
                className="bg-white/80 backdrop-blur-md rounded-2xl shadow-2xl p-6 border border-white/30 max-h-[calc(100vh-7rem)] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-800">Calendrier de disponibilité</h2>
                  <div className="flex items-center space-x-2">
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => addAvailabilityRange('unavailable')} disabled={!selectedRange} className="p-2 bg-red-100 text-red-600 rounded-lg disabled:opacity-50">
                      <FiXCircle className="w-5 h-5" />
                    </motion.button>

                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setIsCalendarExpanded(!isCalendarExpanded)} className="p-2 bg-gray-100 text-gray-600 rounded-lg">
                      <motion.div animate={{ rotate: isCalendarExpanded ? 180 : 0 }}><FiChevronLeft className="w-5 h-5" /></motion.div>
                    </motion.button>
                  </div>
                </div>

                {showSelectionTooltip && selectedRange && (
                  <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="mb-4 p-3 bg-purple-100 text-purple-700 rounded-lg">
                    Plage sélectionnée : {moment(selectedRange.start).format('MMM DD, HH:mm')} - {moment(selectedRange.end).format('HH:mm')}
                  </motion.div>
                )}

                <motion.div
                  className="calendar-container rounded-lg overflow-hidden border border-gray-200"
                  animate={{ scale: isCalendarExpanded ? 1 : 0.8, opacity: isCalendarExpanded ? 1 : 0 }}
                >
                  <Calendar
                    localizer={localizer}
                    events={availabilityEvents}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: 500 }}
                    selectable
                    onSelectSlot={handleSelectRange}
                    components={CalendarComponents}
                    className="bg-white"
                    popup
                    views={['week', 'day']}
                    defaultView="week"
                    view={calendarView}
                    onView={setCalendarView}
                    date={currentDate}
                    onNavigate={handleNavigate}
                    step={30}
                    timeslots={2}
                    messages={messages}
                    min={moment().hours(0).minutes(0).toDate()}
                    max={moment().hours(23).minutes(59).toDate()}
                    culture='fr'
                  />
                </motion.div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center space-x-6">

                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-red-100 border-l-4 border-red-500 rounded" />
                      <span className="text-sm text-gray-600">Indisponible</span>
                    </div>

                  </div>

                </div>
                {availabilityEvents.length > 0 && (
                  <div className="mt-4 border-t pt-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Plages de disponibilité</h3>

                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {availabilityEvents.map(event => (
                        <div key={event.id} className={`flex items-center justify-between p-2 rounded-lg ${event.type === 'available' ? 'bg-green-50' : 'bg-red-50'}`}>
                          <div className="flex items-center space-x-2">
                            {event.type === 'available' ? <FiCheckCircle className="text-green-500" /> : <FiXCircle className="text-red-500" />}
                            <span className="text-xs">{moment(event.start).format('MMM DD, HH:mm')} - {moment(event.end).format('HH:mm')}</span>
                          </div>
                          <button onClick={() => removeAvailabilityEvent(event.id)} className="text-gray-400 hover:text-gray-600">
                            <FiXCircle className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </motion.div>
            </motion.div>

          </div>
        </motion.div>
      </div>
    </>
  );
};

export default AddResourceForm;
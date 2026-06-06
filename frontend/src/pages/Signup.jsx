import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, Info, AlertTriangle, X } from "lucide-react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../styles/signup.css";

// === Correction des icônes Leaflet ===
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// === Toast ===
const useToast = () => {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((message, type = "info", duration = 4000) => {
    const id = Date.now();
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), duration);
  }, []);
  const remove = useCallback((id) => setToasts(p => p.filter(t => t.id !== id)), []);
  return {
    toasts, remove,
    success: useCallback((m) => add(m, "success"), [add]),
    error: useCallback((m) => add(m, "error"), [add]),
    info: useCallback((m) => add(m, "info"), [add]),
    warning: useCallback((m) => add(m, "warning"), [add]),
  };
};

const ToastContainer = ({ toasts, removeToast }) => (
  <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 10, pointerEvents: "none" }}>
    <AnimatePresence>
      {toasts.map(t => {
        const cfg = {
          success: { bg: "#f0fdf4", border: "#86efac", color: "#16a34a", icon: <CheckCircle size={18} /> },
          error: { bg: "#fef2f2", border: "#fca5a5", color: "#dc2626", icon: <XCircle size={18} /> },
          info: { bg: "#eff6ff", border: "#93c5fd", color: "#2563eb", icon: <Info size={18} /> },
          warning: { bg: "#fffbeb", border: "#fcd34d", color: "#d97706", icon: <AlertTriangle size={18} /> },
        }[t.type] || {};
        return (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 60 }}
            transition={{ duration: 0.3 }}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              background: cfg.bg, border: `1px solid ${cfg.border}`,
              borderRadius: 14, padding: "13px 16px",
              minWidth: 300, maxWidth: 380,
              boxShadow: "0 4px 24px rgba(0,0,0,.1)", pointerEvents: "all",
            }}
          >
            <span style={{ color: cfg.color, flexShrink: 0 }}>{cfg.icon}</span>
            <span style={{ fontSize: 13, color: "#1e293b", fontWeight: 500, flex: 1, lineHeight: 1.4 }}>{t.message}</span>
            <button onClick={() => removeToast(t.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 2 }}>
              <X size={14} />
            </button>
          </motion.div>
        );
      })}
    </AnimatePresence>
  </div>
);

// === Composant message d'erreur ===
const FieldError = ({ error }) =>
  error ? (
    <span style={{ display: "flex", alignItems: "center", gap: 5, color: "#dc2626", fontSize: 12, marginTop: 5 }}>
      <XCircle size={13} />
      {error}
    </span>
  ) : null;

// === Style pour champ en erreur ===
const inputStyle = (hasError) => hasError
  ? { borderColor: "#fca5a5", background: "#fef2f2" }
  : {};

// === Carte ===
const LocationPicker = ({ centerLat, centerLng, onLocationChange }) => {
  const [markerPos, setMarkerPos] = useState(
    centerLat && centerLng ? { lat: centerLat, lng: centerLng } : null
  );
  const prevCenter = useRef({ lat: centerLat, lng: centerLng });
  useEffect(() => {
    if (
      centerLat && centerLng &&
      (prevCenter.current.lat !== centerLat || prevCenter.current.lng !== centerLng)
    ) {
      prevCenter.current = { lat: centerLat, lng: centerLng };
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
    <MapContainer
      center={mapCenter}
      zoom={13}
      style={{ height: "300px", width: "100%", borderRadius: "16px", zIndex: 0 }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; OSM &copy; CartoDB'
      />
      <MapClickHandler />
      {markerPos && (
        <Marker
          position={[markerPos.lat, markerPos.lng]}
          draggable
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

// === Validation ===
const buildValidate = (form, isPrestataire) => () => {
  const errors = {};

  // Email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!form.email || !emailRegex.test(form.email))
    errors.email = "Adresse email invalide.";

  // Mot de passe
  const pwRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
  if (!form.password || !pwRegex.test(form.password))
    errors.password = "Min. 8 caractères, 1 majuscule, 1 chiffre, 1 caractère spécial.";

  // Téléphone
  const telClean = (form.numTel || "").replace(/\s/g, "");
  const telRegex = /^\+?[0-9]{8,12}$/;
  if (!telClean || !telRegex.test(telClean))
    errors.numTel = "Numéro invalide (8 à 12 chiffres, préfixe + autorisé).";

  // Localisation (optionnelle mais si saisie, min 3 chars)
  if (form.locationName && form.locationName.trim().length > 0 && form.locationName.trim().length < 3)
    errors.locationName = "Nom de localisation trop court (min. 3 caractères).";

  // Photo de profil / logo (optionnel)
  if (form.image) {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(form.image.type))
      errors.image = "Format non supporté. Utilisez JPG, PNG ou WEBP.";
    else if (form.image.size > 5 * 1024 * 1024)
      errors.image = "Image trop lourde (max 5 Mo).";
  }

  if (!isPrestataire) {
    // Prénom
    const nameRegex = /^[a-zA-ZÀ-ÿ\s\-]{2,50}$/;
    if (!form.firstname || !nameRegex.test(form.firstname.trim()))
      errors.firstname = "Prénom invalide (2 à 50 lettres, espaces ou tirets).";

    // Nom
    if (!form.lastname || !nameRegex.test(form.lastname.trim()))
      errors.lastname = "Nom invalide (2 à 50 lettres, espaces ou tirets).";
  }

  if (isPrestataire) {
    // Nom de société
    if (!form.nomSociete || form.nomSociete.trim().length < 2)
      errors.nomSociete = "Nom de société requis (min. 2 caractères).";
    else if (/[<>\\/]/.test(form.nomSociete))
      errors.nomSociete = "Caractères interdits dans le nom de société.";
    else if (form.nomSociete.trim().length > 100)
      errors.nomSociete = "Nom de société trop long (max 100 caractères).";

    // Numéro de patente : format XX-000000 (2 lettres, tiret, 6+ chiffres)
    const patenteRegex = /^[A-Z]{2}-\d{6,}$/;
    if (!form.numPatente || !patenteRegex.test(form.numPatente.trim().toUpperCase()))
      errors.numPatente = "Format attendu : XX-000000 (ex: TU-123456).";

    // Fichier patente
    if (!form.patenteFile) {
      errors.patenteFile = "Le document patente est obligatoire.";
    } else {
      if (form.patenteFile.type !== "application/pdf")
        errors.patenteFile = "Le fichier doit être un PDF.";
      else if (form.patenteFile.size > 5 * 1024 * 1024)
        errors.patenteFile = "Fichier trop lourd (max 5 Mo).";
    }
  }

  return errors;
};

// === Page Signup ===
export default function Signup() {
  const navigate = useNavigate();
  const toast = useToast();

  const [role, setRole] = useState("organisateur");
  const [showPendingPopup, setShowPendingPopup] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    firstname: "", lastname: "",
    nomSociete: "",
    email: "", password: "",
    numPatente: "", numTel: "",
    patenteFile: null, image: null,
    locationLat: null, locationLng: null,
    locationName: "",
  });

  useEffect(() => {
    const delay = setTimeout(async () => {
      if (!form.locationName || form.locationName.length < 3) return;
      const coords = await getCoordinates(form.locationName);
      if (coords) {
        setMapLat(coords.lat);
        setMapLng(coords.lng);
        setForm(f => ({ ...f, locationLat: coords.lat, locationLng: coords.lng }));
      }
    }, 600);
    return () => clearTimeout(delay);
  }, [form.locationName]);

  const [preview, setPreview] = useState(null);
  const [mapLat, setMapLat] = useState(36.8065);
  const [mapLng, setMapLng] = useState(10.1815);

  // Efface l'erreur du champ modifié
  const handleChange = (e) => {
    const { name, value } = e.target;
    setErrors(prev => ({ ...prev, [name]: undefined }));
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Validation immédiate à la sélection
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setErrors(prev => ({ ...prev, image: "Format non supporté (JPG, PNG, WEBP)." }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, image: "Image trop lourde (max 5 Mo)." }));
      return;
    }
    setErrors(prev => ({ ...prev, image: undefined }));
    setPreview(URL.createObjectURL(file));
    setForm(f => ({ ...f, image: file }));
  };

  const handlePatenteChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Validation immédiate à la sélection
    if (file.type !== "application/pdf") {
      setErrors(prev => ({ ...prev, patenteFile: "Le fichier doit être un PDF." }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, patenteFile: "Fichier trop lourd (max 5 Mo)." }));
      return;
    }
    setErrors(prev => ({ ...prev, patenteFile: undefined }));
    setForm(f => ({ ...f, patenteFile: file }));
  };

  const getLocationName = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
      );
      const data = await res.json();
      return data.display_name || "";
    } catch {
      return "";
    }
  };

  const getCoordinates = async (name) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${name}&format=json&limit=1`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
      return null;
    } catch {
      return null;
    }
  };

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setErrors({});
    setForm(f => ({ ...f, numPatente: "", numTel: "", patenteFile: null, nomSociete: "" }));
  };

  const handleLocationChange = useCallback(async (lat, lng) => {
    setMapLat(lat);
    setMapLng(lng);
    const name = await getLocationName(lat, lng);
    setErrors(prev => ({ ...prev, locationName: undefined }));
    setForm(f => ({ ...f, locationLat: lat, locationLng: lng, locationName: name }));
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        handleLocationChange(coords.latitude, coords.longitude);
        toast.success("Position détectée 📍");
      },
      () => toast.warning("Position non détectée automatiquement")
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) { toast.warning("Géolocalisation non supportée"); return; }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        handleLocationChange(coords.latitude, coords.longitude);
        toast.success("Position mise à jour 📍");
      },
      () => toast.warning("Impossible de récupérer votre position")
    );
  };

  const isPrestataire = role === "prestataire";

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation complète avant envoi
    const validate = buildValidate(form, isPrestataire);
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast.error("Veuillez corriger les erreurs du formulaire.");
      // Scroll vers le premier champ en erreur
      const firstErrorKey = Object.keys(validationErrors)[0];
      const el = document.querySelector(`[name="${firstErrorKey}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    const formData = new FormData();

    if (isPrestataire) {
      formData.append("firstname", form.nomSociete);
      formData.append("lastname", "");
      formData.append("nomSociete", form.nomSociete);
    } else {
      formData.append("firstname", form.firstname);
      formData.append("lastname", form.lastname);
    }

    if (form.locationLat && form.locationLng) {
      formData.append("location", JSON.stringify({
        type: "Point",
        coordinates: [form.locationLng, form.locationLat],
      }));
    } else {
      formData.append("location", JSON.stringify({
        type: "Point",
        coordinates: [10.1815, 36.8065],
      }));
    }
    formData.append("locationName", form.locationName || "Position sélectionnée");
    formData.append("numTel", form.numTel);
    formData.append("email", form.email);
    formData.append("password", form.password);
    formData.append("role", role);

    if (isPrestataire) {
      formData.append("numPatente", form.numPatente);
      if (form.patenteFile) formData.append("patente", form.patenteFile);
    }
    if (form.image) formData.append("image", form.image);

    try {
      const res = await fetch("http://localhost:5000/api/users/register", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (res.ok) {
        if (isPrestataire) {
          setShowPendingPopup(true);
        } else {
          toast.success("Compte créé avec succès ! 🎉");
          setTimeout(() => navigate("/login"), 1000);
        }
      } else {
        toast.error(data.message || "Erreur lors de la création du compte");
      }
    } catch {
      toast.error("Erreur serveur — veuillez réessayer");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <ToastContainer toasts={toast.toasts} removeToast={toast.remove} />

      <button className="back-btn" onClick={() => navigate(-1)}>
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
        Retour
      </button>

      <div className="auth-left">
        <div className="form-wrapper">
          <div className="auth-card-header">
            <span className="auth-badge">✦ YallaEvents</span>
            <h2>Créer un compte</h2>
            <p className="auth-subtitle">
              {isPrestataire
                ? "Proposez vos services aux organisateurs d'événements."
                : "Gérez et planifiez vos événements."}
            </p>
          </div>

          {/* Toggle rôle */}
          <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 12, padding: 4, gap: 4, marginBottom: 28 }}>
            {["organisateur", "prestataire"].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => handleRoleChange(r)}
                style={{
                  flex: 1, padding: "10px 0", borderRadius: 9, border: "none", cursor: "pointer",
                  fontWeight: 600, fontSize: 14, transition: "all 0.2s",
                  background: role === r ? "#fff" : "transparent",
                  color: role === r ? (r === "prestataire" ? "#7c3aed" : "#2563eb") : "#64748b",
                  boxShadow: role === r ? "0 1px 6px rgba(0,0,0,0.1)" : "none",
                }}
              >
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>

          <form className="signup-form" onSubmit={handleSubmit} noValidate>
            {/* Nom / prénom ou société */}
            {!isPrestataire ? (
              <>
                <div className="field-wrap">
                  <label>Prénom</label>
                  <input
                    name="firstname"
                    placeholder="Votre prénom"
                    value={form.firstname}
                    onChange={handleChange}
                    style={inputStyle(errors.firstname)}
                  />
                  <FieldError error={errors.firstname} />
                </div>
                <div className="field-wrap">
                  <label>Nom</label>
                  <input
                    name="lastname"
                    placeholder="Votre nom"
                    value={form.lastname}
                    onChange={handleChange}
                    style={inputStyle(errors.lastname)}
                  />
                  <FieldError error={errors.lastname} />
                </div>
              </>
            ) : (
              <div className="field-wrap span-2">
                <label>Nom de société</label>
                <input
                  name="nomSociete"
                  placeholder="Ex: Traiteur El Amal, Studio Photo Lumière..."
                  value={form.nomSociete}
                  onChange={handleChange}
                  style={inputStyle(errors.nomSociete)}
                />
                <FieldError error={errors.nomSociete} />
              </div>
            )}

            <div className="field-wrap span-2">
              <label>Numéro de téléphone</label>
              <input
                name="numTel"
                type="tel"
                placeholder="Ex: +216 12 345 678"
                value={form.numTel}
                onChange={handleChange}
                style={inputStyle(errors.numTel)}
              />
              <FieldError error={errors.numTel} />
            </div>

            <div className="field-wrap span-2">
              <label>Email</label>
              <input
                type="email"
                name="email"
                placeholder="exemple@email.com"
                value={form.email}
                onChange={handleChange}
                style={inputStyle(errors.email)}
              />
              <FieldError error={errors.email} />
            </div>

            <div className="field-wrap span-2">
              <label>Mot de passe</label>
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                style={inputStyle(errors.password)}
              />
              <FieldError error={errors.password} />
              {!errors.password && (
                <span style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                  Min. 8 caractères, 1 majuscule, 1 chiffre, 1 caractère spécial
                </span>
              )}
            </div>

            {/* Carte interactive */}
            <div className="field-wrap span-2" style={{ marginTop: 8 }}>
              <label>📍 Votre position sur la carte</label>
              <div className="field-wrap span-2">
                <input
                  type="text"
                  name="locationName"
                  placeholder="Ex: Tunis, Sfax..."
                  value={form.locationName}
                  onChange={(e) => {
                    setErrors(prev => ({ ...prev, locationName: undefined }));
                    setForm(f => ({ ...f, locationName: e.target.value }));
                  }}
                  style={inputStyle(errors.locationName)}
                />
                <FieldError error={errors.locationName} />
              </div>
              <LocationPicker
                centerLat={mapLat}
                centerLng={mapLng}
                onLocationChange={handleLocationChange}
              />
              <button
                type="button"
                onClick={handleUseMyLocation}
                style={{
                  marginTop: 12, padding: "10px 16px", borderRadius: 12,
                  border: "1px solid #cbd5e1", background: "#f8fafc",
                  cursor: "pointer", fontWeight: 500, fontSize: 13,
                  display: "inline-flex", alignItems: "center", gap: 8, color: "#1e293b",
                }}
              >
                📍 Utiliser ma position actuelle
              </button>
              <p style={{ fontSize: 12, color: "#64748b", marginTop: 8 }}>
                Cliquez sur la carte ou déplacez le marqueur pour choisir votre position.
              </p>
            </div>

            {/* Champs prestataire */}
            <AnimatePresence>
              {isPrestataire && (
                <motion.div
                  className="span-2"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  style={{ overflow: "hidden", display: "contents" }}
                >
                  <div className="field-wrap span-2">
                    <label>Numéro de patente</label>
                    <input
                      name="numPatente"
                      placeholder="Ex: TU-123456"
                      value={form.numPatente}
                      onChange={(e) => {
                        setErrors(prev => ({ ...prev, numPatente: undefined }));
                        setForm(f => ({ ...f, numPatente: e.target.value.toUpperCase() }));
                      }}
                      style={inputStyle(errors.numPatente)}
                    />
                    <FieldError error={errors.numPatente} />
                  </div>
                  <div className="field-wrap span-2">
                    <label>Document patente (PDF)</label>
                    <label
                      htmlFor="patenteInput"
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        border: errors.patenteFile
                          ? "1.5px dashed #fca5a5"
                          : "1.5px dashed #a78bfa",
                        borderRadius: 10, padding: "14px 16px",
                        background: errors.patenteFile ? "#fef2f2" : "#faf5ff",
                        cursor: "pointer",
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: 13, color: errors.patenteFile ? "#dc2626" : "#5b21b6", display: "block" }}>
                          {form.patenteFile ? form.patenteFile.name : "Ajouter le document patente"}
                        </strong>
                        <span style={{ fontSize: 11, color: "#94a3b8" }}>
                          {form.patenteFile ? "✅ Fichier sélectionné" : "PDF uniquement — max 5 MB"}
                        </span>
                      </div>
                      <div style={{ background: "#7c3aed", color: "#fff", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600 }}>
                        Parcourir
                      </div>
                    </label>
                    <input id="patenteInput" type="file" accept=".pdf" onChange={handlePatenteChange} style={{ display: "none" }} />
                    <FieldError error={errors.patenteFile} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Photo de profil / logo */}
            <div className="photo-upload-wrap">
              <label className="field-label">
                {isPrestataire ? "Logo de la société" : "Photo de profil"}
              </label>
              <label className={`photo-upload-area ${preview ? "has-photo" : ""}`} htmlFor="imageInput"
                style={errors.image ? { border: "1.5px dashed #fca5a5", background: "#fef2f2" } : {}}
              >
                {!preview ? (
                  <div className="photo-placeholder">
                    <div className="photo-placeholder-icon">
                      <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                      </svg>
                    </div>
                    <div className="photo-placeholder-text">
                      <strong>{isPrestataire ? "Ajouter un logo" : "Ajouter une photo de profil"}</strong>
                      <span>JPG, PNG ou WEBP — max 5 MB</span>
                    </div>
                    <div className="photo-upload-badge">Parcourir</div>
                  </div>
                ) : (
                  <div className="photo-preview-wrap">
                    <img src={preview} alt="Aperçu" />
                    <div className="photo-preview-overlay">
                      <div className="photo-change-btn">
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z" />
                        </svg>
                        Changer
                      </div>
                    </div>
                  </div>
                )}
              </label>
              <input id="imageInput" type="file" accept="image/*" onChange={handleImageChange} style={{ display: "none" }} />
              <FieldError error={errors.image} />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="auth-btn span-2"
              style={{ opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? "not-allowed" : "pointer" }}
            >
              {isSubmitting
                ? "En cours..."
                : isPrestataire ? "Envoyer ma demande" : "Créer mon compte"}
            </button>
          </form>

          <p className="auth-link">
            Déjà un compte ?{" "}
            <span onClick={() => navigate("/login")}>Se connecter</span>
          </p>
        </div>
      </div>

      {/* Partie droite décorative */}
      <div className="split-right">
        <div className="image-overlay">
          <div className="overlay-content">
            <h1>{isPrestataire ? "Proposez vos services" : "Gérez vos événements"}</h1>
            <p>
              {isPrestataire
                ? "Rejoignez notre réseau de prestataires et développez votre activité."
                : "Créez, planifiez et coordonnez tous vos événements en un seul endroit."}
            </p>
          </div>
        </div>
      </div>

      {/* Popup prestataire en attente */}
      <AnimatePresence>
        {showPendingPopup && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 p-4 animate-fadeIn">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[420px] overflow-hidden relative animate-slideUp">

              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-yellow-200 rounded-full opacity-20 animate-pulse-slow"></div>
                <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-indigo-200 rounded-full opacity-20 animate-pulse-slower"></div>
              </div>

              <button onClick={() => { setShowPendingPopup(false); }} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 hover:rotate-90 transition-all duration-300 z-10">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="relative p-8">
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-yellow-400 rounded-full animate-ping opacity-20"></div>
                    <div className="absolute inset-0 border-2 border-yellow-400 rounded-full animate-spin-slow"></div>
                    <div className="relative bg-gradient-to-br from-yellow-400 to-yellow-500 text-white rounded-2xl p-5 shadow-lg shadow-yellow-200 animate-float">
                      <div className="animate-spin-slow">⏳</div>
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-green-500 text-white rounded-full p-1.5 shadow-lg animate-bounce-in">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                </div>

                <h3 className="text-2xl font-bold text-center mb-3 bg-gradient-to-r from-yellow-600 to-indigo-600 bg-clip-text text-transparent animate-slideDown">
                  Demande en cours de traitement !
                </h3>

                <div className="space-y-4 mb-6">
                  <p className="text-gray-600 text-center leading-relaxed animate-slideUp delay-100">
                    Votre compte prestataire est en cours de validation par l'administrateur.
                  </p>
                  <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="absolute inset-0 flex">
                      <motion.div
                        animate={{ x: ['-100%', '400%'] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="w-1/3 h-full bg-gradient-to-r from-yellow-400 via-indigo-400 to-yellow-400"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-yellow-50 to-indigo-50 rounded-xl p-4 mb-6 animate-scaleUp">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Temps estimé</span>
                    <span className="font-semibold text-indigo-600 animate-pulse">24-48 heures</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                    <span>Début</span>
                    <div className="flex space-x-1">
                      <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse"></div>
                      <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse delay-100"></div>
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse delay-200"></div>
                    </div>
                    <span>Finalisation</span>
                  </div>
                </div>

                <button
                  onClick={() => { setShowPendingPopup(false); navigate("/login"); }}
                  className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold py-3.5 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden group"
                >
                  <span className="relative z-10">J'ai compris</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-700 to-indigo-800 transform translate-x-full group-hover:translate-x-0 transition-transform duration-500"></div>
                </button>

                <p className="text-xs text-center text-gray-400 mt-4 animate-fadeIn delay-500">
                  Vous recevrez une confirmation une fois votre demande approuvée
                </p>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  X, Calendar, Loader, CheckCircle, Upload,
  AlertCircle, ShieldCheck, FileText, ExternalLink
} from "lucide-react";

/* ─────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────── */
const getLocalUser = () => {
  try { return JSON.parse(localStorage.getItem("user") || "null"); }
  catch { return null; }
};

const CIN_STATUS = {
  IDLE: "idle",
  UPLOADING: "uploading",
  VERIFYING: "verifying",
  SUCCESS: "success",
  ERROR: "error",
};

/*
  Props :
  - resourceDate  : string | Date  → date de la réservation de la ressource
  - resource      : object         → ressource concernée (pour afficher le contrat)
  - onEventCreated(eventId, cinFile, cinNumber) : callback après création
*/
const QuickEventModal = ({ isOpen, onClose, onEventCreated, resourceDate, resource }) => {
  const [formData, setFormData] = useState({
    title: "", dateDebut: "", dateFin: "", category: "",
  });

  /* ── CIN ── */
  const [cinFile, setCinFile] = useState(null);
  const [cinNumber, setCinNumber] = useState("");
  const [cinError, setCinError] = useState("");
  const [cinStatus, setCinStatus] = useState(CIN_STATUS.IDLE);
  const [cinData, setCinData] = useState(null);
  const [mismatch, setMismatch] = useState([]);
  const prevCinRef = React.useRef(cinNumber);

  /* ── Contrat ── */
  const [contractRead, setContractRead] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  /* ── Divers ── */
  const [dateError, setDateError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const token = localStorage.getItem("token");

  /* ── reset quand cinNumber change après erreur/succès ── */
  useEffect(() => {
    const prev = prevCinRef.current;
    prevCinRef.current = cinNumber;
    if (prev === cinNumber) return;
    if (cinStatus === CIN_STATUS.ERROR || cinStatus === CIN_STATUS.SUCCESS) {
      setCinStatus(CIN_STATUS.IDLE);
      setCinError("");
      setMismatch([]);
      setCinData(null);
    }
  }, [cinNumber]);

  const cinVerified = cinStatus === CIN_STATUS.SUCCESS;
  const cinLoading = cinStatus === CIN_STATUS.UPLOADING || cinStatus === CIN_STATUS.VERIFYING;

  /* ─────────────────────────────────────────────────
     Termes du contrat (mini-modal inline)
  ───────────────────────────────────────────────── */
  const hasTermsPdf = resource?.terms?.file && resource.terms.file.trim() !== "";
  const hasTermsText = resource?.terms?.text && resource.terms.text.trim() !== "";
  const pdfUrl = hasTermsPdf
    ? `http://localhost:5000/${resource.terms.file.replace(/\\/g, "/")}`
    : null;

  /* ─────────────────────────────────────────────────
     Date helpers
  ───────────────────────────────────────────────── */
  const resourceDay = resourceDate ? new Date(resourceDate) : null;
  const resourceDayStr = resourceDay
    ? resourceDay.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
    : null;

  const validateDateConstraint = (debut, fin) => {
    if (!resourceDay || !debut || !fin) return true;
    const start = new Date(debut);
    const end = new Date(fin);
    if (end < start) {
      setDateError("La date de fin doit être postérieure ou égale à la date de début.");
      return false;
    }
    const resDate = new Date(resourceDay);
    [resDate, start, end].forEach(d => d.setHours(0, 0, 0, 0));
    if (resDate < start || resDate > end) {
      setDateError(
        `La date de la ressource (${resourceDayStr}) doit être incluse dans la période de l'événement.`
      );
      return false;
    }
    setDateError("");
    return true;
  };

  const handleDateChange = (field, value) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    if (updated.dateDebut && updated.dateFin) {
      validateDateConstraint(updated.dateDebut, updated.dateFin);
    }
  };

  /* ─────────────────────────────────────────────────
     CIN file
  ───────────────────────────────────────────────── */
  const handleCINFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 5_000_000) { setCinError("Fichier trop lourd (max 5 Mo)"); return; }
    setCinError("");
    setCinStatus(CIN_STATUS.IDLE);
    setMismatch([]);
    setCinData(null);
    setCinFile(f);
  };

  const removeCINFile = () => {
    setCinFile(null);
    setCinError("");
    setCinStatus(CIN_STATUS.IDLE);
    setMismatch([]);
    setCinData(null);
  };

  /* ─────────────────────────────────────────────────
     Vérification CIN via n8n
  ───────────────────────────────────────────────── */
  const verifyCIN = async () => {
    if (!cinFile) return;
    const user = getLocalUser();
    if (!user) { setCinError("Impossible de récupérer les données utilisateur."); return; }

    try {
      setCinStatus(CIN_STATUS.UPLOADING);
      const fd = new FormData();
      fd.append("file", cinFile);
      await axios.post("http://localhost:5678/webhook/transfer", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setCinStatus(CIN_STATUS.VERIFYING);
      await new Promise(r => setTimeout(r, 3000));

      const { data } = await axios.get("http://localhost:5000/api/cin");
      const cinInfo = Array.isArray(data) ? data[0] : data;
      setCinData(cinInfo);

      const stripNum = (val) => (val || "").replace(/^=/, "").replace(/\s/g, "").trim();
      const extracted = stripNum(cinInfo?.cin);

      if (!extracted) {
        setCinError("Document invalide ou illisible. Veuillez importer une CIN tunisienne valide.");
        setCinStatus(CIN_STATUS.ERROR);
        return;
      }

      const entered = cinNumber.replace(/\s/g, "").trim();
      if (!entered) {
        setCinError("Veuillez entrer votre numéro de CIN.");
        setCinStatus(CIN_STATUS.ERROR);
        return;
      }

      if (entered !== extracted) {
        setCinStatus(CIN_STATUS.ERROR);
        setMismatch([{ field: "Numéro CIN", cin: extracted, user: entered || "—" }]);
        return;
      }

      setCinStatus(CIN_STATUS.SUCCESS);

      /* Mise à jour profil en arrière-plan */
      try {
        const t = localStorage.getItem("token");
        await axios.put(
          "http://localhost:5000/api/users/update-cin",
          { cin: extracted },
          { headers: { Authorization: `Bearer ${t}` } }
        );
        localStorage.setItem("user", JSON.stringify({ ...user, cin: extracted }));
      } catch (e) {
        console.warn("Mise à jour CIN profil échouée (non bloquant):", e);
      }

    } catch (err) {
      console.error("Erreur vérification CIN:", err);
      setCinError(err.response?.data?.message || "Erreur lors de la vérification. Réessayez.");
      setCinStatus(CIN_STATUS.ERROR);
    }
  };

  /* ─────────────────────────────────────────────────
     Reset & close
  ───────────────────────────────────────────────── */
  const resetForm = () => {
    setFormData({ title: "", dateDebut: "", dateFin: "", category: "" });
    setCinFile(null); setCinNumber(""); setCinError("");
    setCinStatus(CIN_STATUS.IDLE); setCinData(null); setMismatch([]);
    setContractRead(false); setShowTerms(false);
    setDateError(""); setError(""); setSuccess(false);
  };

  const handleClose = () => { resetForm(); onClose(); };

  /* ─────────────────────────────────────────────────
     Submit
  ───────────────────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess(false);

    if (!formData.title || !formData.dateDebut || !formData.dateFin || !formData.category) {
      setError("Tous les champs de l'événement sont obligatoires."); return;
    }
    if (!cinNumber.trim()) { setError("Veuillez entrer votre numéro de CIN."); return; }
    if (!cinFile) { setError("Veuillez importer votre CIN."); return; }
    if (!cinVerified) { setError("Veuillez vérifier votre CIN avant de continuer."); return; }
    if (!contractRead) { setError("Veuillez accepter les conditions du contrat."); return; }
    if (!validateDateConstraint(formData.dateDebut, formData.dateFin)) return;

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("title", formData.title);
      fd.append("description", `Événement créé depuis une réservation : ${formData.title}`);
      fd.append("category", formData.category);
      fd.append("lieu", "À définir");
      fd.append("type", "privé");
      fd.append("dateDebut", new Date(formData.dateDebut).toISOString());
      fd.append("dateFin", new Date(formData.dateFin).toISOString());
      fd.append("nombreParticipants", "0");
      fd.append("cinNumber", cinNumber);
      fd.append("cinFile", cinFile);

      const response = await axios.post(
        "http://localhost:5000/api/event/addEvent", fd,
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } }
      );

      setSuccess(true);
      setTimeout(() => {
        onEventCreated(response.data._id, cinFile, cinNumber);
        resetForm();
        onClose();
      }, 1000);
    } catch (err) {
      console.error("Erreur création événement:", err);
      setError(err.response?.data?.message || "Erreur lors de la création de l'événement.");
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* ── Modal termes ── */}
      {showTerms && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
        >
          <div className="bg-white rounded-2xl shadow-2xl flex flex-col"
            style={{ width: "100%", maxWidth: 700, maxHeight: "90vh" }}>
            <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
                  <FileText size={16} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Conditions du contrat</h3>
                  <p className="text-xs text-gray-400">{resource?.name}</p>
                </div>
              </div>
              <button onClick={() => setShowTerms(false)} className="p-2 hover:bg-gray-100 rounded-full transition">
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden">
              {hasTermsPdf ? (
                <div className="flex flex-col h-full">
                  <iframe src={pdfUrl} title="Contrat PDF" className="w-full flex-1"
                    style={{ minHeight: 480, border: "none" }} />
                  <div className="px-6 py-3 border-t bg-gray-50 flex items-center justify-between flex-shrink-0">
                    <p className="text-xs text-gray-400">Document PDF du prestataire</p>
                    <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline font-medium">
                      <ExternalLink size={12} /> Ouvrir dans un nouvel onglet
                    </a>
                  </div>
                </div>
              ) : hasTermsText ? (
                <div className="p-6 overflow-y-auto h-full">
                  <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap"
                    style={{ fontSize: 13 }}>
                    {resource.terms.text}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <FileText size={40} className="mb-3 opacity-30" />
                  <p className="text-sm font-medium">Aucune condition fournie</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 flex-shrink-0">
              <button onClick={() => setShowTerms(false)}
                className="w-full py-2.5 rounded-xl font-semibold text-sm text-white transition"
                style={{ background: "linear-gradient(135deg,#2563eb,#1d4ed8)" }}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal principal ── */}
      <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">

          {/* Header */}
          <div className="flex justify-between items-center p-5 border-b sticky top-0 bg-white z-10">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Créer un événement
            </h2>
            <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">

            {/* Contrainte de date */}
            {resourceDayStr && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  La ressource est réservée le{" "}
                  <span className="font-semibold">{resourceDayStr}</span>.{" "}
                  L'événement doit couvrir cette date.
                </p>
              </div>
            )}

            {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>}
            {success && (
              <div className="bg-emerald-50 text-emerald-600 p-3 rounded-lg text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> Événement créé avec succès !
              </div>
            )}

            {/* ── Informations de l'événement ── */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 border-b pb-1">Informations de l'événement</h3>

              <div>
                <label className="block text-sm font-medium mb-1">Nom de l'événement *</label>
                <input type="text" required value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex : Mariage de Sophie" disabled={loading} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Date de début *</label>
                <input type="date" required value={formData.dateDebut}
                  onChange={(e) => handleDateChange("dateDebut", e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={loading} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Date de fin *</label>
                <input type="date" required value={formData.dateFin}
                  min={formData.dateDebut || undefined}
                  onChange={(e) => handleDateChange("dateFin", e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={loading} />
              </div>

              {dateError && (
                <div className="flex items-start gap-2 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-rose-700">{dateError}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Catégorie *</label>
                <select required value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={loading}>
                  <option value="">Sélectionner</option>
                  <option value="Mariage">Mariage</option>
                  <option value="Conference">Conférence</option>
                  <option value="Anniversaire">Anniversaire</option>
                  <option value="Seminaire">Séminaire</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
            </div>

            {/* ── Vérification CIN ── */}
            <div className="border-t pt-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">Vérification d'identité</h3>

              {/* Numéro CIN */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Numéro de CIN <span className="text-rose-500">*</span>
                </label>
                <input type="text" value={cinNumber}
                  onChange={(e) => setCinNumber(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Ex : 08361985" disabled={loading} />
              </div>

              {/* Upload CIN */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Photo de la CIN <span className="text-rose-500">*</span>
                </label>

                {!cinFile ? (
                  <label className={`flex flex-col items-center gap-2 py-5 rounded-xl border-2 border-dashed cursor-pointer transition
                    ${cinError ? "border-rose-300 bg-rose-50" : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/30"}`}>
                    <Upload className="w-6 h-6 text-gray-300" />
                    <span className="text-sm text-gray-400">Cliquez pour importer votre CIN</span>
                    <span className="text-xs text-gray-300">JPG · PNG · PDF — max 5 Mo</span>
                    <input type="file" accept="image/*,.pdf" className="hidden"
                      onChange={handleCINFileChange} disabled={loading} />
                  </label>
                ) : (
                  <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all
                    ${cinStatus === CIN_STATUS.SUCCESS ? "bg-emerald-50 border-emerald-200"
                      : cinStatus === CIN_STATUS.ERROR ? "bg-rose-50 border-rose-200"
                        : "bg-gray-50 border-gray-200"}`}>
                    {cinStatus === CIN_STATUS.SUCCESS
                      ? <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      : cinStatus === CIN_STATUS.ERROR
                        ? <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                        : <Upload className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                    <span className={`text-sm flex-1 truncate font-medium
                      ${cinStatus === CIN_STATUS.SUCCESS ? "text-emerald-700"
                        : cinStatus === CIN_STATUS.ERROR ? "text-rose-700" : "text-gray-700"}`}>
                      {cinFile.name}
                    </span>
                    {!cinLoading && (
                      <button type="button" onClick={removeCINFile}
                        className="text-gray-400 hover:text-gray-700 transition">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}

                {cinError && (
                  <p className="flex items-center gap-1.5 text-xs text-rose-600 font-medium mt-1">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {cinError}
                  </p>
                )}
              </div>

              {/* Mismatch */}
              {mismatch.length > 0 && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 space-y-2">
                  <p className="text-xs font-bold text-rose-700 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Les informations suivantes ne correspondent pas :
                  </p>
                  {mismatch.map((m) => (
                    <div key={m.field} className="rounded-lg bg-white border border-rose-100 px-3 py-2">
                      <p className="text-[11px] font-bold text-rose-600 uppercase tracking-wide mb-1">{m.field}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><span className="text-gray-400">CIN : </span><span className="font-semibold text-gray-700">{m.cin || "—"}</span></div>
                        <div><span className="text-gray-400">Saisi : </span><span className="font-semibold text-gray-700">{m.user || "—"}</span></div>
                      </div>
                    </div>
                  ))}
                  <p className="text-[11px] text-rose-500">
                    Corrigez le numéro ci-dessus — la vérification se relancera automatiquement.
                  </p>
                </div>
              )}

              {/* Succès CIN */}
              {cinStatus === CIN_STATUS.SUCCESS && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <p className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" /> CIN vérifiée — identité confirmée
                  </p>
                  {cinData && (
                    <p className="text-[11px] text-emerald-600 mt-1">
                      {cinData.nom?.replace(/^=/, "").trim() || ""}{" "}
                      {cinData.prenom?.replace(/^=/, "").trim() || ""}
                      {cinData.cin ? ` · ${cinData.cin.replace(/^=/, "").trim()}` : ""}
                    </p>
                  )}
                </div>
              )}

              {/* Bouton vérifier */}
              {cinFile && cinStatus !== CIN_STATUS.SUCCESS && (
                <button type="button" onClick={verifyCIN} disabled={cinLoading || loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border-2 transition
                    border-blue-500 text-blue-600 hover:bg-blue-50 disabled:opacity-60 disabled:cursor-not-allowed">
                  {cinLoading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      {cinStatus === CIN_STATUS.UPLOADING ? "Envoi en cours..." : "Vérification en cours..."}
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      {cinStatus === CIN_STATUS.ERROR ? "Réessayer la vérification" : "Vérifier ma CIN"}
                    </>
                  )}
                </button>
              )}
            </div>

            {/* ── Conditions du contrat ── */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">Conditions du contrat</p>
                {cinVerified && (
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    ✓ Identité vérifiée
                  </span>
                )}
              </div>



              {(hasTermsPdf || hasTermsText) && (
                <p className="text-[11px] text-gray-400 flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {hasTermsPdf ? "Contrat PDF disponible" : "Conditions textuelles disponibles"}
                </p>
              )}

              <label className="flex items-start gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={contractRead}
                  onChange={(e) => setContractRead(e.target.checked)}
                  className="mt-0.5 accent-blue-600" />
                <span className="text-xs text-gray-600">
                  J'ai lu et j'accepte les{" "}
                  <button type="button" onClick={() => setShowTerms(true)}
                    className="text-blue-600 hover:underline font-medium">
                    conditions générales du contrat
                  </button>
                </span>
              </label>
            </div>

            {/* ── Bouton submit ── */}
            <button type="submit"
              disabled={loading || !!dateError || !cinVerified || !contractRead}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <Loader className="w-4 h-4 animate-spin" />}
              {loading ? "Création en cours..." : "Créer l'événement et continuer"}
            </button>

            <button type="button" onClick={handleClose}
              className="w-full text-gray-500 text-sm py-2 hover:text-gray-700 transition">
              Annuler
            </button>

          </form>
        </div>
      </div>
    </>
  );
};

export default QuickEventModal;
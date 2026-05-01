import React, { useState, useEffect } from "react";
import {
  X, Calendar, ChevronRight, Upload, CheckCircle,
  AlertCircle, Loader, FileText, ExternalLink, ShieldCheck
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import axios from "axios";

/* ─────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────── */
const getLocalUser = () => {
  try { return JSON.parse(localStorage.getItem("user") || "null"); }
  catch { return null; }
};

/* ─────────────────────────────────────────────────
   Statuts CIN
───────────────────────────────────────────────── */
const CIN_STATUS = {
  IDLE: "idle", UPLOADING: "uploading",
  VERIFYING: "verifying", SUCCESS: "success", ERROR: "error",
};

/* ─────────────────────────────────────────────────
   Modal Termes du contrat
───────────────────────────────────────────────── */
function TermsModal({ isOpen, onClose, terms, resourceName }) {
  if (!isOpen) return null;

  const hasPdf = terms?.file && terms.file.trim() !== "";
  const hasText = terms?.text && terms.text.trim() !== "";
  const pdfUrl = hasPdf
    ? `http://localhost:5000/${terms.file.replace(/\\/g, "/")}`
    : null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl flex flex-col"
        style={{ width: "100%", maxWidth: 700, maxHeight: "90vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
              <FileText size={16} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">Conditions du contrat</h3>
              <p className="text-xs text-gray-400">{resourceName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-hidden">
          {hasPdf ? (
            <div className="flex flex-col h-full">
              <iframe
                src={pdfUrl}
                title="Contrat PDF"
                className="w-full flex-1"
                style={{ minHeight: 480, border: "none" }}
              />
              <div className="px-6 py-3 border-t bg-gray-50 flex items-center justify-between flex-shrink-0">
                <p className="text-xs text-gray-400">Document PDF du prestataire</p>
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline font-medium"
                >
                  <ExternalLink size={12} /> Ouvrir dans un nouvel onglet
                </a>
              </div>
            </div>
          ) : hasText ? (
            <div className="p-6 overflow-y-auto h-full">
              <div
                className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap"
                style={{ fontSize: 13 }}
              >
                {terms.text}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <FileText size={40} className="mb-3 opacity-30" />
              <p className="text-sm font-medium">Aucune condition fournie</p>
              <p className="text-xs mt-1">Le prestataire n'a pas encore ajouté de contrat.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl font-semibold text-sm text-white transition"
            style={{ background: "linear-gradient(135deg,#2563eb,#1d4ed8)" }}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   Vérificateur CIN
───────────────────────────────────────────────── */
function CINVerifier({ onVerified, cinNumber, onCinNumberChange }) {
  const [cinFile, setCinFile] = useState(null);
  const [cinError, setCinError] = useState("");
  const [status, setStatus] = useState(CIN_STATUS.IDLE);
  const [mismatch, setMismatch] = useState([]);
  const [cinData, setCinData] = useState(null);
  const prevCinNumberRef = React.useRef(cinNumber);

  // Quand le numéro CIN change après ERROR ou SUCCESS → reset pour re-vérifier
  useEffect(() => {
    const prev = prevCinNumberRef.current;
    prevCinNumberRef.current = cinNumber;
    if (prev === cinNumber) return;

    if (status === CIN_STATUS.ERROR || status === CIN_STATUS.SUCCESS) {
      setStatus(CIN_STATUS.IDLE);
      setCinError("");
      setMismatch([]);
      setCinData(null);
      onVerified(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cinNumber]);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 5_000_000) { setCinError("Fichier trop lourd (max 5 Mo)"); return; }
    setCinError("");
    setStatus(CIN_STATUS.IDLE);
    setMismatch([]);
    setCinData(null);
    onVerified(false);
    setCinFile(f);
  };

  const removeFile = () => {
    setCinFile(null);
    setCinError("");
    setStatus(CIN_STATUS.IDLE);
    setMismatch([]);
    setCinData(null);
    onVerified(false);
  };

  const verifyCIN = async () => {
    if (!cinFile) return;
    const user = getLocalUser();
    if (!user) { setCinError("Impossible de récupérer les données utilisateur."); return; }

    try {
      // ÉTAPE 1 : envoi du fichier au webhook n8n
      setStatus(CIN_STATUS.UPLOADING);
      const formData = new FormData();
      formData.append("file", cinFile);
      await axios.post("http://localhost:5678/webhook/transfer", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // ÉTAPE 2 : attente du traitement n8n puis lecture du résultat
      setStatus(CIN_STATUS.VERIFYING);
      await new Promise((r) => setTimeout(r, 3000));

      const { data } = await axios.get("http://localhost:5000/api/cin");
      const cinInfo = Array.isArray(data) ? data[0] : data;
      setCinData(cinInfo);

      const stripNum = (val) => (val || "").replace(/^=/, "").replace(/\s/g, "").trim();
      const cinNumberExtracted = stripNum(cinInfo?.cin);

      if (!cinNumberExtracted) {
        setCinError("Document invalide ou illisible. Veuillez importer une CIN tunisienne valide.");
        setStatus(CIN_STATUS.ERROR);
        onVerified(false);
        return;
      }

      const cinNumberEntered = cinNumber.replace(/\s/g, "").trim();
      if (!cinNumberEntered) {
        setCinError("Veuillez entrer votre numéro de CIN.");
        setStatus(CIN_STATUS.ERROR);
        onVerified(false);
        return;
      }

      if (cinNumberEntered !== cinNumberExtracted) {
        setStatus(CIN_STATUS.ERROR);
        setMismatch([{
          field: "Numéro CIN",
          cin: cinNumberExtracted,
          user: cinNumberEntered || "—",
        }]);
        onVerified(false);
        return;
      }

      setStatus(CIN_STATUS.SUCCESS);
      onVerified(true);

      try {
        const token = localStorage.getItem("token");
        await axios.put(
          "http://localhost:5000/api/users/update-cin",
          { cin: cinNumberExtracted },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        localStorage.setItem("user", JSON.stringify({ ...user, cin: cinNumberExtracted }));
      } catch (updateErr) {
        console.warn("Mise à jour CIN profil échouée (non bloquant):", updateErr);
      }

    } catch (err) {
      console.error("Erreur vérification CIN:", err);
      setCinError(err.response?.data?.message || "Erreur lors de la vérification. Réessayez.");
      setStatus(CIN_STATUS.ERROR);
      onVerified(false);
    }
  };

  const isLoading = status === CIN_STATUS.UPLOADING || status === CIN_STATUS.VERIFYING;

  return (
    <div className="border-t pt-4 space-y-3">
      {/* Numéro CIN */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Numéro de CIN <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          value={cinNumber}
          onChange={(e) => onCinNumberChange(e.target.value)}
          placeholder="Ex : 08361985"
          className="w-full px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      {/* Upload CIN */}
      <label className="block text-sm font-semibold text-gray-700">
        Photo de la CIN <span className="text-rose-500">*</span>
      </label>

      {!cinFile ? (
        <label className={`flex flex-col items-center gap-2 py-5 rounded-xl border-2 border-dashed cursor-pointer transition
          ${cinError ? "border-rose-300 bg-rose-50" : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/30"}`}>
          <Upload className="w-6 h-6 text-gray-300" />
          <span className="text-sm text-gray-400">Cliquez pour importer votre CIN</span>
          <span className="text-xs text-gray-300">JPG · PNG · PDF — max 5 Mo</span>
          <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileChange} />
        </label>
      ) : (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all
          ${status === CIN_STATUS.SUCCESS ? "bg-emerald-50 border-emerald-200"
            : status === CIN_STATUS.ERROR ? "bg-rose-50 border-rose-200"
              : "bg-gray-50 border-gray-200"}`}>
          {status === CIN_STATUS.SUCCESS
            ? <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            : status === CIN_STATUS.ERROR
              ? <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
              : <Upload className="w-4 h-4 text-gray-400 flex-shrink-0" />}
          <span className={`text-sm flex-1 truncate font-medium
            ${status === CIN_STATUS.SUCCESS ? "text-emerald-700"
              : status === CIN_STATUS.ERROR ? "text-rose-700" : "text-gray-700"}`}>
            {cinFile.name}
          </span>
          {!isLoading && (
            <button type="button" onClick={removeFile} className="text-gray-400 hover:text-gray-700 transition">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Erreur */}
      {cinError && (
        <p className="flex items-center gap-1.5 text-xs text-rose-600 font-medium">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {cinError}
        </p>
      )}

      {/* Mismatch numéro */}
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

      {/* Succès */}
      {status === CIN_STATUS.SUCCESS && (
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
      {cinFile && status !== CIN_STATUS.SUCCESS && (
        <button
          type="button"
          onClick={verifyCIN}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border-2 transition
            border-blue-500 text-blue-600 hover:bg-blue-50 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              {status === CIN_STATUS.UPLOADING ? "Envoi en cours..." : "Vérification en cours..."}
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4" />
              {status === CIN_STATUS.ERROR ? "Réessayer la vérification" : "Vérifier ma CIN"}
            </>
          )}
        </button>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────
   COMPOSANT PRINCIPAL
───────────────────────────────────────────────── */
const SelectEventModal = ({
  isOpen,
  onClose,
  onConfirm,
  events,
  onCreateNew,
  resourceDate,
  resource,
}) => {
  const [selectedEventId, setSelectedEventId] = useState("");
  const [cinVerified, setCinVerified] = useState(false);
  const [cinNumber, setCinNumber] = useState("");
  const [contractRead, setContractRead] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  // Reset complet à chaque ouverture
  useEffect(() => {
    if (isOpen) {
      setSelectedEventId("");
      setCinVerified(false);
      setCinNumber("");
      setContractRead(false);
      setShowTerms(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filtrage des événements par date
  const resourceDay = resourceDate ? new Date(resourceDate) : null;
  const toDateOnly = (d) => {
    const date = new Date(d);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  };
  const filteredEvents = resourceDay
    ? events.filter((ev) => {
      const start = toDateOnly(ev.dateDebut);
      const end = toDateOnly(ev.dateFin);
      const res = toDateOnly(resourceDay);
      return res >= start && res <= end;
    })
    : [];

  const hasTermsPdf = resource?.terms?.file && resource.terms.file.trim() !== "";
  const hasTermsText = resource?.terms?.text && resource.terms.text.trim() !== "";
  const hasTerms = hasTermsPdf || hasTermsText;

  // Si pas d'événements dispo, on ne bloque pas sur selectedEventId
  const canConfirm =
    cinVerified &&
    cinNumber.trim() &&
    contractRead &&
    (filteredEvents.length === 0 || selectedEventId);

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm(selectedEventId, cinNumber);
  };

  const getButtonLabel = () => {
    if (filteredEvents.length > 0 && !selectedEventId) return "Sélectionnez un événement";
    if (!cinNumber.trim()) return "Entrez votre numéro de CIN";
    if (!cinVerified) return "Vérifiez votre CIN d'abord";
    if (!contractRead) return "Acceptez les conditions du contrat";
    return null;
  };
  const buttonLabel = getButtonLabel();
  console.log("RESOURCE:", resource);
  console.log("TERMS:", resource?.terms);

  return (
    <>
      {/* Modal termes */}
      <TermsModal
        isOpen={showTerms}
        onClose={() => setShowTerms(false)}
        terms={resource?.terms}
        resourceName={resource?.name ?? resource?.resourceName}
      />

      {/* Modal principal */}
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">

          {/* Header */}
          <div className="flex justify-between items-center p-5 border-b sticky top-0 bg-white z-10">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Associer à un événement
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-4">

            {/* Indication date */}
            {resourceDay && (
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                <Calendar className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <p className="text-xs text-blue-700">
                  Seuls les événements du{" "}
                  <span className="font-semibold">
                    {format(resourceDay, "dd MMMM yyyy", { locale: fr })}
                  </span>{" "}
                  sont affichés.
                </p>
              </div>
            )}

            {/* Liste événements */}
            {filteredEvents.length === 0 ? (
              <div className="text-center py-4 bg-amber-50 border border-amber-100 rounded-xl">
                <p className="text-sm text-amber-700 font-medium">
                  {resourceDay
                    ? `Aucun événement à la date du ${format(resourceDay, "dd MMMM yyyy", { locale: fr })}.`
                    : "Aucun événement disponible."}
                </p>
                <button
                  onClick={onCreateNew}
                  className="mt-2 text-blue-600 text-xs hover:underline font-medium"
                >
                  + Créer un événement pour cette date
                </button>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-600">Sélectionnez un événement existant :</p>
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {filteredEvents.map((event) => (
                    <button
                      key={event._id}
                      onClick={() => setSelectedEventId(event._id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${selectedEventId === event._id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-blue-300"
                        }`}
                    >
                      <p className="font-medium text-gray-900">{event.title}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {format(new Date(event.dateDebut), "dd MMMM yyyy", { locale: fr })}
                      </p>
                      <p className="text-xs text-gray-400">{event.category}</p>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* ✅ Vérification CIN — TOUJOURS VISIBLE */}
            <CINVerifier
              onVerified={setCinVerified}
              cinNumber={cinNumber}
              onCinNumberChange={setCinNumber}
            />

            {/* ✅ Conditions du contrat — TOUJOURS VISIBLE */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">Conditions du contrat</p>
                {cinVerified && (
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    ✓ Identité vérifiée
                  </span>
                )}
              </div>

              {/* Bouton consulter */}


              {/* Indicateur type contrat */}
              {hasTerms && (
                <p className="text-[11px] text-gray-400 flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {hasTermsPdf ? "Contrat PDF disponible" : "Conditions textuelles disponibles"}
                </p>
              )}

              {/* ✅ Checkbox acceptation — TOUJOURS VISIBLE */}
              <label className="flex items-start gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={contractRead}
                  onChange={(e) => setContractRead(e.target.checked)}
                  className="mt-0.5 accent-blue-600"
                />
                <span className="text-xs text-gray-600">
                  J'ai lu et j'accepte les{" "}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation(); // 🔥 TRÈS IMPORTANT
                      setShowTerms(true);
                    }}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    conditions générales du contrat
                  </button>
                </span>
              </label>
            </div>

            {/* Bouton confirmer */}
            <button
              onClick={handleConfirm}
              disabled={!canConfirm}
              className={`w-full py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2 text-sm
                ${canConfirm
                  ? "text-white hover:opacity-90"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
              style={canConfirm
                ? { background: "linear-gradient(135deg,#2563eb,#1d4ed8)", boxShadow: "0 4px 14px rgba(37,99,235,0.35)" }
                : {}}
            >
              {buttonLabel
                ? buttonLabel
                : <><span>Confirmer la réservation</span><ChevronRight className="w-4 h-4" /></>
              }
            </button>

            {/* Lien créer événement — affiché seulement s'il y a des événements aussi */}
            {filteredEvents.length > 0 && (
              <button
                onClick={onCreateNew}
                className="w-full text-blue-600 text-sm py-2 hover:underline"
              >
                + Créer un nouvel événement
              </button>
            )}

          </div>
        </div>
      </div>
    </>
  );
};

export default SelectEventModal;
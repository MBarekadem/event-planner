import React, { useState } from "react";
import { X, Calendar, ChevronRight, Upload, CheckCircle, AlertCircle, Loader, FileText } from "lucide-react";
import { format, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import axios from "axios";

/* ═══════════════════════════════════════════
   Normalise une chaîne pour comparaison
═══════════════════════════════════════════ */
const normalize = (str = "") =>
  str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-_\s]+/g, " ")
    .trim();

/* ═══════════════════════════════════════════
   Récupère l'utilisateur depuis localStorage
═══════════════════════════════════════════ */
const getLocalUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};

/* ═══════════════════════════════════════════
   STATUTS DE VÉRIFICATION CIN
═══════════════════════════════════════════ */
const CIN_STATUS = {
  IDLE: "idle",
  UPLOADING: "uploading",
  VERIFYING: "verifying",
  SUCCESS: "success",
  ERROR: "error",
};

/* ═══════════════════════════════════════════
   CHAMP CIN — numéro + upload + vérification
═══════════════════════════════════════════ */
function CINVerifier({ onVerified, cinNumber, onCinNumberChange }) {
  const [cinFile, setCinFile] = useState(null);
  const [cinError, setCinError] = useState("");
  const [status, setStatus] = useState(CIN_STATUS.IDLE);
  const [mismatch, setMismatch] = useState([]);
  const [cinData, setCinData] = useState(null);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 5_000_000) {
      setCinError("Fichier trop lourd (max 5 Mo)");
      return;
    }
    setCinError("");
    setStatus(CIN_STATUS.IDLE);
    setMismatch([]);
    setCinData(null);
    setCinFile(f);
    onVerified(false);
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
    if (!user) {
      setCinError("Impossible de récupérer les données utilisateur.");
      return;
    }

    try {
      setStatus(CIN_STATUS.UPLOADING);
      const formData = new FormData();
      formData.append("file", cinFile);

      await axios.post("http://localhost:5678/webhook/transfer", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setStatus(CIN_STATUS.VERIFYING);
      await new Promise((r) => setTimeout(r, 3000));

      const { data } = await axios.get("http://localhost:5000/api/cin");
      const cinInfo = Array.isArray(data) ? data[0] : data;
      setCinData(cinInfo);

      const cinNumberExtracted = (cinInfo?.cin || "")
        .replace(/^=/, "")
        .replace(/\s/g, "")
        .trim();

      // ✅ Validation stricte : rejette si les champs clés sont vides/null
      const hasValidData =
        cinNumberExtracted &&
        cinInfo?.given_name &&
        cinInfo?.surname;

      if (!hasValidData) {
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
        setMismatch([
          {
            field: "Numéro CIN",
            cin: cinNumberExtracted,
            user: cinNumberEntered || "—",
          },
        ]);
        onVerified(false);
        return;
      }

      // ✅ Tout est valide
      setStatus(CIN_STATUS.SUCCESS);
      onVerified(true);

      // ✅ Enregistrement dans la base
      const token = localStorage.getItem("token");
      await axios.put(
        "http://localhost:5000/api/users/update-cin",
        { cin: cinNumberExtracted },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // ✅ Mettre à jour le localStorage aussi
      const updatedUser = { ...user, cin: cinNumberExtracted };
      localStorage.setItem("user", JSON.stringify(updatedUser));

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
      {/* ── Numéro de CIN ── */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Numéro de CIN <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          value={cinNumber}
          onChange={(e) => onCinNumberChange(e.target.value)}
          placeholder="Ex : 12345678"
          className="w-full px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      {/* ── Photo CIN ── */}
      <label className="block text-sm font-semibold text-gray-700">
        Photo de la CIN <span className="text-rose-500">*</span>
      </label>

      {!cinFile ? (
        <label
          className={`flex flex-col items-center gap-2 py-5 rounded-xl border-2 border-dashed cursor-pointer transition
            ${cinError ? "border-rose-300 bg-rose-50" : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/30"}`}
        >
          <Upload className="w-6 h-6 text-gray-300" />
          <span className="text-sm text-gray-400">Cliquez pour importer votre CIN</span>
          <span className="text-xs text-gray-300">JPG · PNG · PDF — max 5 Mo</span>
          <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileChange} />
        </label>
      ) : (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all
          ${status === CIN_STATUS.SUCCESS ? "bg-emerald-50 border-emerald-200"
            : status === CIN_STATUS.ERROR ? "bg-rose-50 border-rose-200"
              : "bg-gray-50 border-gray-200"}`}
        >
          {status === CIN_STATUS.SUCCESS
            ? <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            : status === CIN_STATUS.ERROR
              ? <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
              : <Upload className="w-4 h-4 text-gray-400 flex-shrink-0" />}
          <span className={`text-sm flex-1 truncate font-medium
            ${status === CIN_STATUS.SUCCESS ? "text-emerald-700"
              : status === CIN_STATUS.ERROR ? "text-rose-700"
                : "text-gray-700"}`}>
            {cinFile.name}
          </span>
          {!isLoading && (
            <button type="button" onClick={removeFile} className="text-gray-400 hover:text-gray-700 transition flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {cinError && (
        <p className="flex items-center gap-1.5 text-xs text-rose-600 font-medium">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {cinError}
        </p>
      )}

      {mismatch.length > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 space-y-2">
          <p className="text-xs font-bold text-rose-700 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            Les informations suivantes ne correspondent pas à votre compte :
          </p>
          <div className="space-y-1.5">
            {mismatch.map((m) => (
              <div key={m.field} className="rounded-lg bg-white border border-rose-100 px-3 py-2">
                <p className="text-[11px] font-bold text-rose-600 uppercase tracking-wide mb-1">{m.field}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-gray-400">CIN : </span><span className="font-semibold text-gray-700">{m.cin || "—"}</span></div>
                  <div><span className="text-gray-400">Compte : </span><span className="font-semibold text-gray-700">{m.user || "—"}</span></div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-rose-500">Veuillez utiliser la CIN correspondant à votre compte, ou contacter le support.</p>
        </div>
      )}

      {status === CIN_STATUS.SUCCESS && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5" />
            CIN vérifiée avec succès — identité confirmée
          </p>
          {cinData && (
            <p className="text-[11px] text-emerald-600 mt-1">
              {cinData.given_name?.latin_transliteration} {cinData.surname?.latin_transliteration}
              {cinData.id_number ? ` · ${cinData.id_number}` : ""}
            </p>
          )}
        </div>
      )}

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
              {status === CIN_STATUS.UPLOADING ? "Envoi en cours..." : "Vérification..."}
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              {status === CIN_STATUS.ERROR ? "Réessayer la vérification" : "Vérifier ma CIN"}
            </>
          )}
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   COMPOSANT PRINCIPAL
   Props :
   - resourceDate : string | Date  →  date de la réservation (obligatoire pour le filtre)
   - contractUrl  : string         →  URL du contrat PDF/page (optionnel, par défaut "#")
═══════════════════════════════════════════ */
const SelectEventModal = ({
  isOpen,
  onClose,
  onConfirm,
  events,
  onCreateNew,
  resourceDate,           // ← date de la ressource réservée
  contractUrl = "#",      // ← lien vers le contrat
}) => {
  const [selectedEventId, setSelectedEventId] = useState("");
  const [cinVerified, setCinVerified] = useState(true);///////////////////////////////////just pour test
  const [cinNumber, setCinNumber] = useState("");
  const [contractRead, setContractRead] = useState(false);

  if (!isOpen) return null;

  /* ── Filtre : ne garder que les événements dont la date = resourceDate ── */
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
  //const canConfirm = selectedEventId && cinVerified && cinNumber.trim() && contractRead;
  const canConfirm = selectedEventId && contractRead;
  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm(selectedEventId, cinNumber);
  };

  const handleContractClick = () => {
    window.open(contractUrl, "_blank", "noopener,noreferrer");
    // On ne coche pas automatiquement — l'utilisateur doit cocher manuellement
  };

  console.log("resourceDate reçu:", resourceDate);
  console.log("events reçus:", events);
  console.log("filteredEvents:", filteredEvents);
  return (
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

          {/* Indication de la contrainte de date */}
          {resourceDay && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
              <Calendar className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <p className="text-xs text-blue-700">
                Seuls les événements du{" "}
                <span className="font-semibold">
                  {format(resourceDay, "dd MMMM yyyy", { locale: fr })}
                </span>{" "}
                sont affichés (date de la ressource réservée).
              </p>
            </div>
          )}

          {/* Liste des événements filtrés */}
          {filteredEvents.length === 0 ? (
            <div className="text-center py-6 text-sm text-gray-400">
              {resourceDay
                ? `Aucun événement à la date du ${format(resourceDay, "dd MMMM yyyy", { locale: fr })}.`
                : "Aucun événement disponible."}
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

          {/* Vérificateur CIN (numéro + photo) 
          <CINVerifier
            onVerified={setCinVerified}
            cinNumber={cinNumber}
            onCinNumberChange={setCinNumber}
          />*/}

          {/* ── Conditions du contrat ── */}
          <div className="border-t pt-4 space-y-2">
            <button
              type="button"
              onClick={handleContractClick}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline transition font-medium"
            >
              <FileText className="w-4 h-4 flex-shrink-0" />
              Vérifier les conditions du contrat
            </button>
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
                  onClick={handleContractClick}
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
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
          >
            {!selectedEventId
              ? "Sélectionnez un événement"
              : !cinNumber.trim()
                ? "Entrez votre numéro de CIN"
                : !cinVerified
                  ? "Vérifiez votre CIN d'abord"
                  : !contractRead
                    ? "Acceptez les conditions du contrat"
                    : <><span>Confirmer</span><ChevronRight className="w-4 h-4" /></>}
          </button>

          <button
            onClick={onCreateNew}
            className="w-full text-blue-600 text-sm py-2 hover:underline"
          >
            + Créer un nouvel événement
          </button>
        </div>
      </div>
    </div>
  );
};

export default SelectEventModal;
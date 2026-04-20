import React, { useState } from "react";
import axios from "axios";
import { X, Calendar, Loader, CheckCircle, Upload, AlertCircle } from "lucide-react";

/*
  Props :
  - resourceDate : string | Date  →  date de la réservation de la ressource.
    L'événement doit englober cette date (dateDebut ≤ resourceDate ≤ dateFin).
*/
const QuickEventModal = ({ isOpen, onClose, onEventCreated, resourceDate }) => {
  const [formData, setFormData] = useState({
    title: "",
    dateDebut: "",
    dateFin: "",
    category: "",
  });
  const [cinFile, setCinFile] = useState(null);
  const [cinNumber, setCinNumber] = useState("");
  const [cinError, setCinError] = useState("");
  const [dateError, setDateError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const token = localStorage.getItem("token");

  /* ── Formatage de la date ressource pour l'affichage ── */
  const resourceDay = resourceDate ? new Date(resourceDate) : null;
  const resourceDayStr = resourceDay
    ? resourceDay.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
    : null;

  const resetForm = () => {
    setFormData({ title: "", dateDebut: "", dateFin: "", category: "" });
    setCinFile(null);
    setCinNumber("");
    setCinError("");
    setDateError("");
    setError("");
    setSuccess(false);
  };

  /* ── Validation de la contrainte de date ── */
  const validateDateConstraint = (debut, fin) => {
    if (!resourceDay || !debut || !fin) return true; // pas encore renseigné

    const start = new Date(debut);
    const end = new Date(fin);

    // dateFin doit être >= dateDebut
    if (end < start) {
      setDateError("La date de fin doit être postérieure ou égale à la date de début.");
      return false;
    }

    // resourceDate doit être comprise entre dateDebut et dateFin (bornes incluses)
    const resDate = new Date(resourceDay);
    resDate.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

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

  const handleCINChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 5e6) {
      setCinError("Fichier trop lourd (max 5 Mo)");
      return;
    }
    setCinError("");
    setCinFile(f);
  };

  const removeCIN = () => {
    setCinFile(null);
    setCinError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!formData.title || !formData.dateDebut || !formData.dateFin || !formData.category) {
      setError("Tous les champs de l'événement sont obligatoires.");
      return;
    }

    if (!cinFile) {
      setError("Veuillez importer votre CIN.");
      return;
    }

    if (!cinNumber.trim()) {
      setError("Veuillez entrer votre numéro de CIN.");
      return;
    }

    // Vérification contrainte de date avant envoi
    if (!validateDateConstraint(formData.dateDebut, formData.dateFin)) {
      return;
    }

    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("title", formData.title);
      formDataToSend.append("description", `Événement créé depuis une réservation : ${formData.title}`);
      formDataToSend.append("category", formData.category);
      formDataToSend.append("lieu", "À définir");
      formDataToSend.append("type", "privé");
      formDataToSend.append("dateDebut", new Date(formData.dateDebut).toISOString());
      formDataToSend.append("dateFin", new Date(formData.dateFin).toISOString());
      formDataToSend.append("nombreParticipants", "0");
      formDataToSend.append("cinNumber", cinNumber);
      formDataToSend.append("cinFile", cinFile);

      const response = await axios.post(
        "http://localhost:5000/api/event/addEvent",
        formDataToSend,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setSuccess(true);
      setTimeout(() => {
        onEventCreated(response.data._id, cinFile);
        resetForm();
        onClose();
      }, 1000);
    } catch (err) {
      console.error("Erreur création événement:", err);
      setError(err.response?.data?.message || "Erreur lors de la création de l'événement.");
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-5 border-b sticky top-0 bg-white">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Créer un événement
          </h2>
          <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">

          {/* Contrainte de date visible */}
          {resourceDayStr && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
              <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                La ressource est réservée le{" "}
                <span className="font-semibold">{resourceDayStr}</span>.
                L'événement doit couvrir cette date (date de début ≤ {resourceDayStr} ≤ date de fin).
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>
          )}

          {success && (
            <div className="bg-emerald-50 text-emerald-600 p-3 rounded-lg text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Événement créé avec succès !
            </div>
          )}

          {/* Informations de l'événement */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 border-b pb-1">Informations de l'événement</h3>

            <div>
              <label className="block text-sm font-medium mb-1">Nom de l'événement *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Ex : Mariage de Sophie"
                disabled={loading}
              />
            </div>

            {/* Date de début */}
            <div>
              <label className="block text-sm font-medium mb-1">Date de début *</label>
              <input
                type="date"
                required
                value={formData.dateDebut}
                onChange={(e) => handleDateChange("dateDebut", e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>

            {/* Date de fin */}
            <div>
              <label className="block text-sm font-medium mb-1">Date de fin *</label>
              <input
                type="date"
                required
                value={formData.dateFin}
                min={formData.dateDebut || undefined}
                onChange={(e) => handleDateChange("dateFin", e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>

            {/* Message d'erreur de date */}
            {dateError && (
              <div className="flex items-start gap-2 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
                <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-rose-700">{dateError}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Catégorie *</label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="">Sélectionner</option>
                <option value="Mariage">Mariage</option>
                <option value="Conference">Conférence</option>
                <option value="Anniversaire">Anniversaire</option>
                <option value="Seminaire">Séminaire</option>
                <option value="autre">Autre</option>
              </select>
            </div>
          </div>

          {/* Numéro CIN */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              Numéro de CIN <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={cinNumber}
              onChange={(e) => setCinNumber(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Ex : 12345678"
              disabled={loading}
            />
          </div>

          {/* Photo CIN */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              Photo de la CIN <span className="text-rose-500">*</span>
            </label>

            {!cinFile ? (
              <label className={`flex flex-col items-center gap-2 py-5 rounded-xl border-2 border-dashed cursor-pointer transition
                ${cinError ? "border-rose-300 bg-rose-50" : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/30"}`}>
                <Upload className="w-6 h-6 text-gray-300" />
                <span className="text-sm text-gray-400">Cliquez pour importer votre CIN</span>
                <span className="text-xs text-gray-300">JPG · PNG · PDF — max 5 Mo</span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={handleCINChange}
                  disabled={loading}
                />
              </label>
            ) : (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span className="text-sm text-emerald-700 flex-1 truncate">{cinFile.name}</span>
                <button
                  type="button"
                  onClick={removeCIN}
                  className="text-emerald-400 hover:text-emerald-700 transition"
                  disabled={loading}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {cinError && <p className="text-xs text-rose-500">{cinError}</p>}
          </div>

          <button
            type="submit"
            disabled={loading || !!dateError}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader className="w-4 h-4 animate-spin" /> : null}
            {loading ? "Création en cours..." : "Créer l'événement et continuer"}
          </button>

          <button
            type="button"
            onClick={handleClose}
            className="w-full text-gray-500 text-sm py-2 hover:text-gray-700 transition"
          >
            Annuler
          </button>
        </form>
      </div>
    </div>
  );
};

export default QuickEventModal;
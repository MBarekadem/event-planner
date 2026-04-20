import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  FiCalendar, FiClock, FiUsers, FiTag, FiType,
  FiEdit3, FiArrowLeft, FiCheckCircle, FiAlertCircle,
  FiSun, FiMoon, FiStar, FiHeart, FiChevronLeft, FiChevronRight,
  FiCalendar as FiCalendarIcon, FiClock as FiClockIcon, FiMapPin
} from 'react-icons/fi';

const api = axios.create({
  baseURL: "http://localhost:5000/api/",
});

// Composant de calendrier personnalisé - Version responsive (inchangé)
const CustomDatePicker = ({ startDate, endDate, onChange, minDate }) => {
  const [view, setView] = useState('days');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const daysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const firstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDateSelect = (day) => {
    const selectedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);

    if (!startDate || (startDate && endDate)) {
      onChange([selectedDate, null]);
    } else if (startDate && !endDate) {
      if (selectedDate >= startDate) {
        onChange([startDate, selectedDate]);
      } else {
        onChange([selectedDate, null]);
      }
    }
  };

  const isInRange = (day) => {
    if (!startDate || !endDate) return false;
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return date >= startDate && date <= endDate;
  };

  const isStartDate = (day) => {
    if (!startDate) return false;
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return date.toDateString() === startDate.toDateString();
  };

  const isEndDate = (day) => {
    if (!endDate) return false;
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return date.toDateString() === endDate.toDateString();
  };

  const renderDays = () => {
    const days = [];
    const totalDays = daysInMonth(currentMonth);
    const firstDay = firstDayOfMonth(currentMonth);

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8 sm:h-10" />);
    }

    for (let day = 1; day <= totalDays; day++) {
      const isSelected = isStartDate(day) || isEndDate(day);
      const inRange = isInRange(day);
      const isToday = new Date().toDateString() ===
        new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).toDateString();

      days.push(
        <motion.button
          key={day}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleDateSelect(day)}
          className={`
            h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium
            transition-all duration-200 relative mx-auto
            ${isSelected ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 z-10' :
              inRange ? 'bg-indigo-100 text-indigo-700' :
                'hover:bg-gray-100 text-gray-700'}
            ${isToday && !isSelected ? 'ring-2 ring-indigo-300' : ''}
          `}
        >
          {day}
          {isStartDate(day) && !isEndDate(day) && (
            <span className="absolute -top-1 -right-1 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full" />
          )}
          {isEndDate(day) && !isStartDate(day) && (
            <span className="absolute -top-1 -right-1 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full" />
          )}
        </motion.button>
      );
    }

    return days;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 border border-gray-100 w-full"
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4 sm:mb-6">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <motion.button
            whileHover={{ scale: 1.1, x: -3 }}
            whileTap={{ scale: 0.9 }}
            onClick={handlePrevMonth}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <FiChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
          </motion.button>
          <motion.h3
            key={currentMonth.getMonth()}
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-base sm:text-lg font-semibold text-gray-800 mx-2"
          >
            {months[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </motion.h3>
          <motion.button
            whileHover={{ scale: 1.1, x: 3 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleNextMonth}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <FiChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
          </motion.button>
        </div>
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 w-full sm:w-auto justify-center">
          <button
            onClick={() => setView('days')}
            className={`px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm transition flex-1 sm:flex-none ${view === 'days' ? 'bg-white shadow text-indigo-600' : 'text-gray-600'
              }`}
          >
            Jours
          </button>
          <button
            onClick={() => setView('months')}
            className={`px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm transition flex-1 sm:flex-none ${view === 'months' ? 'bg-white shadow text-indigo-600' : 'text-gray-600'
              }`}
          >
            Mois
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2 sm:mb-4">
        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
          <div key={day} className="h-6 sm:h-8 flex items-center justify-center text-[10px] sm:text-xs font-medium text-gray-500">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {renderDays()}
      </div>
      {startDate && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-100"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-[10px] sm:text-xs font-medium text-gray-500 mb-1 sm:mb-2 flex items-center gap-1">
                <FiClockIcon className="w-3 h-3" />
                Heure de début
              </label>
              <input
                type="time"
                value={startDate ? startDate.toTimeString().slice(0, 5) : ''}
                onChange={(e) => {
                  const [hours, minutes] = e.target.value.split(':');
                  const newDate = new Date(startDate);
                  newDate.setHours(hours, minutes);
                  onChange([newDate, endDate]);
                }}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div>
              <label className="block text-[10px] sm:text-xs font-medium text-gray-500 mb-1 sm:mb-2 flex items-center gap-1">
                <FiClockIcon className="w-3 h-3" />
                Heure de fin
              </label>
              <input
                type="time"
                value={endDate ? endDate.toTimeString().slice(0, 5) : ''}
                onChange={(e) => {
                  const [hours, minutes] = e.target.value.split(':');
                  const newDate = new Date(endDate || startDate);
                  newDate.setHours(hours, minutes);
                  onChange([startDate, newDate]);
                }}
                disabled={!startDate}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:bg-gray-50 disabled:text-gray-400"
              />
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default function CreerEvenement() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formProgress, setFormProgress] = useState(0);
  const [hoveredField, setHoveredField] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [showCalendar, setShowCalendar] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    lieu: "", // Champ lieu ajouté
    category: "",
    type: "",
    dateDebut: "",
    dateFin: "",
    nombreParticipants: "",
  });

  const calculateProgress = () => {
    const requiredFields = ['title', 'description', 'lieu', 'category', 'type', 'dateDebut', 'dateFin', 'nombreParticipants'];
    const filledFields = requiredFields.filter(field => formData[field] && formData[field].toString().trim() !== '').length;
    return (filledFields / requiredFields.length) * 100;
  };

  const handleChange = (e) => {
    const newFormData = { ...formData, [e.target.name]: e.target.value };
    setFormData(newFormData);
    setFormProgress(calculateProgress());
  };

  const handleDateChange = (dates) => {
    const [start, end] = dates;
    setDateRange({ start, end });
    if (start) {
      setFormData({
        ...formData,
        dateDebut: start.toISOString(),
        dateFin: end ? end.toISOString() : ""
      });
    }
    setFormProgress(calculateProgress());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (new Date(formData.dateFin) < new Date(formData.dateDebut)) {
      alert("La date de fin doit être après la date de début ❌");
      return;
    }

    if (!formData.lieu || formData.lieu.trim() === "") {
      alert("Veuillez renseigner le lieu de l'événement 📍");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const dataToSend = {
        ...formData,
        nombreParticipants: Number(formData.nombreParticipants),
      };

      const response = await api.post("/event/addEvent", dataToSend, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log("data envoie",response.data);

      const eventId = response.data._id;

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        navigate("/les_ressources", {
          state: {
            eventId,
            eventData: dataToSend
          }
        });
      }, 2000);
    } catch (error) {
      console.error(error);
    }
  };

  const nextStep = () => {
    if (currentStep === 1) {
      if (!formData.title || !formData.description) {
        alert("Veuillez remplir le titre et la description");
        return;
      }
    }
    if (currentStep === 2) {
      if (!formData.lieu || !formData.dateDebut || !formData.nombreParticipants) {
        alert("Veuillez remplir le lieu, les dates et le nombre de participants");
        return;
      }
    }
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const formatDateRange = () => {
    if (!dateRange.start) return "Sélectionnez une période";
    if (!dateRange.end) {
      return `À partir du ${dateRange.start.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      })}`;
    }
    return `${dateRange.start.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })} - ${dateRange.end.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-2 sm:p-4 relative overflow-hidden">
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 90, 180],
          opacity: [0.1, 0.15, 0.1]
        }}
        transition={{ duration: 20, repeat: Infinity }}
        className="absolute -top-20 -right-20 w-64 sm:w-96 h-64 sm:h-96 bg-indigo-200 rounded-full blur-3xl"
      />
      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          rotate: [180, 270, 360],
          opacity: [0.1, 0.2, 0.1]
        }}
        transition={{ duration: 25, repeat: Infinity }}
        className="absolute -bottom-20 -left-20 w-64 sm:w-96 h-64 sm:h-96 bg-purple-200 rounded-full blur-3xl"
      />

      <motion.div
        className="fixed top-0 left-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 z-50"
        initial={{ width: 0 }}
        animate={{ width: `${formProgress}%` }}
        transition={{ duration: 0.5 }}
      />

      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
          >
            <div className="bg-green-500 text-white p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl shadow-2xl flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4 max-w-[90%] sm:max-w-md mx-auto">
              <FiCheckCircle className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0" />
              <span className="text-base sm:text-lg md:text-xl font-semibold text-center sm:text-left">
                Événement créé avec succès !
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-4xl bg-white/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl border border-white/20 overflow-hidden relative z-10"
      >
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 sm:px-6 md:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <button
              onClick={() => navigate(-1)}
              className="text-white/80 hover:text-white flex items-center gap-2 transition-colors text-sm sm:text-base"
            >
              <FiArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Retour</span>
            </button>
            <div className="flex items-center space-x-2 self-end sm:self-auto">
              <FiStar className="text-yellow-300 w-4 h-4 sm:w-5 sm:h-5" />
              <FiHeart className="text-pink-300 w-4 h-4 sm:w-5 sm:h-5" />
              <FiSun className="text-yellow-300 w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">Créer un événement</h1>
          <p className="text-indigo-100 text-sm sm:text-base">Organisez votre prochain événement en quelques étapes</p>
          <div className="flex items-center justify-between mt-4 sm:mt-6">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <motion.div
                  animate={{
                    scale: currentStep >= step ? 1 : 0.9,
                    backgroundColor: currentStep >= step ? '#ffffff' : 'rgba(255,255,255,0.3)'
                  }}
                  className={`w-7 h-7 sm:w-8 sm:h-10 rounded-full flex items-center justify-center font-semibold text-xs sm:text-sm ${currentStep >= step ? 'text-indigo-600' : 'text-white'
                    }`}
                >
                  {step}
                </motion.div>
                {step < 3 && (
                  <motion.div
                    animate={{
                      backgroundColor: currentStep > step ? '#ffffff' : 'rgba(255,255,255,0.3)'
                    }}
                    className="flex-1 h-0.5 sm:h-1 mx-1 sm:mx-2 rounded-full"
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 md:p-8">
          {currentStep === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4 sm:space-y-6"
            >
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 sm:mb-6">Informations générales</h2>
              <motion.div
                onHoverStart={() => setHoveredField('title')}
                onHoverEnd={() => setHoveredField(null)}
                animate={{ scale: hoveredField === 'title' ? 1.01 : 1 }}
              >
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <FiEdit3 className="text-indigo-500" />
                  Titre de l'événement *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  placeholder="Ex: Mariage de Jean & Marie"
                  className="w-full border border-gray-200 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                />
              </motion.div>
              <motion.div
                onHoverStart={() => setHoveredField('description')}
                onHoverEnd={() => setHoveredField(null)}
                animate={{ scale: hoveredField === 'description' ? 1.01 : 1 }}
              >
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <FiEdit3 className="text-indigo-500" />
                  Description *
                </label>
                <textarea
                  name="description"
                  rows="4"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  placeholder="Décrivez votre événement en quelques mots..."
                  className="w-full border border-gray-200 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all resize-none"
                />
              </motion.div>
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4 sm:space-y-6"
            >
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 sm:mb-6">Lieu, dates et participants</h2>
              <motion.div
                onHoverStart={() => setHoveredField('lieu')}
                onHoverEnd={() => setHoveredField(null)}
                animate={{ scale: hoveredField === 'lieu' ? 1.01 : 1 }}
              >
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <FiMapPin className="text-indigo-500" />
                  Lieu de l'événement *
                </label>
                <div className="relative">
                  <FiMapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    name="lieu"
                    value={formData.lieu}
                    onChange={handleChange}
                    required
                    placeholder="Ex: Paris, France | Salle des fêtes de Marseille | Centre de conférences..."
                    className="w-full border border-gray-200 pl-10 pr-3 sm:pr-4 py-2 sm:py-3 text-sm sm:text-base rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">📍 Indiquez l'adresse complète ou le nom du lieu</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-indigo-100"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <FiCalendarIcon className="text-indigo-600 w-4 h-4 sm:w-5 sm:h-5" />
                    Période de l'événement *
                  </h3>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowCalendar(!showCalendar)}
                    className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-white text-indigo-600 rounded-lg shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    <FiCalendar className="w-4 h-4" />
                    <span className="truncate">{showCalendar ? 'Masquer' : 'Choisir les dates'}</span>
                  </motion.button>
                </div>
                <motion.div layout className="bg-white rounded-xl p-3 sm:p-4 mb-4 border border-gray-100">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-2 sm:p-3 bg-indigo-100 rounded-lg sm:rounded-xl flex-shrink-0">
                      <FiCalendar className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm text-gray-500">Période sélectionnée</p>
                      <p className="text-sm sm:text-base font-medium text-gray-800 break-words">
                        {formatDateRange()}
                      </p>
                    </div>
                  </div>
                </motion.div>
                <AnimatePresence>
                  {showCalendar && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <CustomDatePicker
                        startDate={dateRange.start}
                        endDate={dateRange.end}
                        onChange={handleDateChange}
                        minDate={new Date()}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="flex flex-wrap gap-2 mt-4">
                  {['Aujourd\'hui', 'Demain', 'Ce week-end', 'Semaine prochaine'].map((option) => (
                    <motion.button
                      key={option}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        const today = new Date();
                        let start = new Date(today);
                        let end = new Date(today);
                        switch (option) {
                          case 'Aujourd\'hui':
                            end.setHours(23, 59);
                            break;
                          case 'Demain':
                            start.setDate(today.getDate() + 1);
                            end.setDate(today.getDate() + 1);
                            end.setHours(23, 59);
                            break;
                          case 'Ce week-end':
                            start.setDate(today.getDate() + (6 - today.getDay()));
                            end.setDate(start.getDate() + 1);
                            end.setHours(23, 59);
                            break;
                          case 'Semaine prochaine':
                            start.setDate(today.getDate() + (8 - today.getDay()));
                            end.setDate(start.getDate() + 6);
                            end.setHours(23, 59);
                            break;
                        }
                        handleDateChange([start, end]);
                      }}
                      className="px-2 sm:px-3 py-1 sm:py-1.5 bg-white border border-gray-200 rounded-lg text-[10px] sm:text-xs text-gray-600 hover:border-indigo-500 hover:text-indigo-600 transition-all whitespace-nowrap"
                    >
                      {option}
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              <motion.div
                onHoverStart={() => setHoveredField('participants')}
                onHoverEnd={() => setHoveredField(null)}
                animate={{ scale: hoveredField === 'participants' ? 1.01 : 1 }}
              >
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <FiUsers className="text-indigo-500" />
                  Nombre de participants *
                </label>
                <input
                  type="number"
                  name="nombreParticipants"
                  value={formData.nombreParticipants}
                  onChange={handleChange}
                  required
                  min="1"
                  placeholder="Ex: 100"
                  className="w-full border border-gray-200 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                />
              </motion.div>
            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4 sm:space-y-6"
            >
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 sm:mb-6">Catégorie et type</h2>
              <motion.div
                onHoverStart={() => setHoveredField('category')}
                onHoverEnd={() => setHoveredField(null)}
                animate={{ scale: hoveredField === 'category' ? 1.01 : 1 }}
              >
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <FiTag className="text-indigo-500" />
                  Catégorie *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-200 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all appearance-none bg-white"
                >
                  <option value="">Sélectionner une catégorie</option>
                  <option value="Mariage">💒 Mariage</option>
                  <option value="Conference">🎤 Conférence</option>
                  <option value="Anniversaire">🎂 Anniversaire</option>
                  <option value="Seminaire">📚 Séminaire</option>
                  <option value="autre">✨ Autre</option>
                </select>
              </motion.div>
              <motion.div
                onHoverStart={() => setHoveredField('type')}
                onHoverEnd={() => setHoveredField(null)}
                animate={{ scale: hoveredField === 'type' ? 1.01 : 1 }}
              >
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <FiType className="text-indigo-500" />
                  Type d'événement *
                </label>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 p-3 sm:p-4 bg-gray-50 rounded-xl">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="type"
                      value="public"
                      onChange={handleChange}
                      required
                      className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm sm:text-base text-gray-700">🌍 Public</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="type"
                      value="privé"
                      onChange={handleChange}
                      className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm sm:text-base text-gray-700">🔒 Privé</span>
                  </label>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Navigation avec bouton submit corrigé */}
          <div className="flex flex-col sm:flex-row justify-between gap-3 mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-100">
            <motion.button
              type="button"
              onClick={prevStep}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-medium text-sm sm:text-base transition-all ${
                currentStep === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              disabled={currentStep === 1}
            >
              ← Précédent
            </motion.button>

            {currentStep < 3 ? (
              <motion.button
                type="button"
                onClick={nextStep}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium text-sm sm:text-base hover:shadow-lg transition-all"
              >
                Suivant →
              </motion.button>
            ) : (
              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-xl font-medium text-sm sm:text-base hover:shadow-lg transition-all"
              >
                Créer l'événement ✓
              </motion.button>
            )}
          </div>

          {formProgress > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 sm:mt-6 p-3 sm:p-4 bg-indigo-50 rounded-xl"
            >
              <h3 className="text-xs sm:text-sm font-medium text-indigo-800 mb-2">Récapitulatif</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] sm:text-xs text-indigo-600">
                {formData.title && <div className="truncate">📌 {formData.title}</div>}
                {formData.lieu && <div className="truncate">📍 {formData.lieu}</div>}
                {formData.dateDebut && <div>📅 {new Date(formData.dateDebut).toLocaleDateString()}</div>}
                {formData.nombreParticipants && <div>👥 {formData.nombreParticipants} pers.</div>}
                {formData.category && <div>🏷️ {formData.category}</div>}
              </div>
            </motion.div>
          )}
        </form>
      </motion.div>
    </div>
  );
}
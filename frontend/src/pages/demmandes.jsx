// src/pages/MesDemandes.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Clock, Calendar, User, CheckCircle, XCircle,
    RefreshCw, FileText, X, Clock as ClockIcon,
    Search, ArrowUpDown, ChevronDown, ArrowLeft,
    ListFilter, AlertCircle, Info
} from 'lucide-react';

const StatusBadge = ({ status }) => {
    const config = {
        en_attente: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock, label: 'En attente' },
        confirmé: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle, label: 'Confirmé' },
        refusé: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle, label: 'Refusé' },
    };
    const conf = config[status] || config.en_attente;
    const Icon = conf.icon;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${conf.bg} ${conf.text}`}>
            <Icon size={12} /> {conf.label}
        </span>
    );
};

const formatPrice = (price) => {
    if (!price) return '0 €';
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(price);
};

const formatDate = (date) => {
    if (!date) return 'Date non définie';
    return format(parseISO(date), 'dd MMMM yyyy', { locale: fr });
};

const formatTime = (date) => {
    if (!date) return '';
    return format(parseISO(date), 'HH:mm', { locale: fr });
};

const headerGradient = (status) => {
    if (status === 'confirmé') return 'from-green-700 to-green-500';
    if (status === 'refusé') return 'from-red-700 to-red-500';
    return 'from-blue-800 to-blue-500';
};

const statusDotColor = (status) => {
    if (status === 'confirmé') return 'bg-green-300';
    if (status === 'refusé') return 'bg-red-300';
    return 'bg-yellow-400';
};

const statusLabel = (status) => {
    if (status === 'confirmé') return 'Confirmé';
    if (status === 'refusé') return 'Refusé';
    return 'En attente';
};

export default function MesDemandes() {
    const navigate = useNavigate();
    const [requests, setRequests] = useState([]);
    const [filteredRequests, setFilteredRequests] = useState([]);
    const [requestsLoading, setRequestsLoading] = useState(true);
    const [showRequestDetailsModal, setShowRequestDetailsModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);

    // États pour la notification toast
    const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

    // États des filtres
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortType, setSortType] = useState('recent');

    const token = localStorage.getItem('token');
    const api = axios.create({
        baseURL: 'http://localhost:5000/api',
        headers: { Authorization: `Bearer ${token}` },
    });

    // Fonction pour afficher une notification (toast)
    const showNotification = (message, type = 'success') => {
        setNotification({ show: true, message, type });
        setTimeout(() => {
            setNotification({ show: false, message: '', type: 'success' });
        }, 4000);
    };

    const fetchRequests = async () => {
        try {
            setRequestsLoading(true);
            const response = await api.get('/location/get_pres');
            const locations = response.data;
            const formatted = locations.map((loc) => ({
                id: loc._id,
                createdAt: loc.createdAt,
                resourceName: loc.resource?.name || 'Ressource inconnue',
                resourceId: loc.resource?._id,
                clientName: loc.organisateur
                    ? `${loc.organisateur.firstname} ${loc.organisateur.lastname}`
                    : 'Client inconnu',
                cin: loc.organisateur?.passportOrCid,
                tel: loc.organisateur?.numTel,
                region: loc.organisateur?.locationName,
                eventName: loc.event?.title || 'Événement inconnu',
                dateDebut: loc.dateDebut,
                dateFin: loc.dateFin,
                status: loc.status === 'acceptée' ? 'confirmé' : loc.status === 'refusée' ? 'refusé' : 'en_attente',
                price: loc.resource?.price || 0,
                message: loc.message || '',
            }));
            formatted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); setRequests(formatted);
        } catch (err) {
            console.error('Erreur lors du chargement des demandes:', err);
            showNotification('Erreur lors du chargement des demandes', 'error');
        } finally {
            setRequestsLoading(false);
        }
    };

    useEffect(() => {
        if (!token) { navigate('/login'); return; }
        fetchRequests();
    }, []);

    // Application des filtres et tri
    useEffect(() => {
        let result = [...requests];
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            result = result.filter(
                (r) =>
                    r.resourceName.toLowerCase().includes(term) ||
                    r.clientName.toLowerCase().includes(term) ||
                    r.eventName.toLowerCase().includes(term)
            );
        }
        if (statusFilter !== 'all') result = result.filter((r) => r.status === statusFilter);
        result.sort((a, b) => {
            if (sortType === 'recent') return new Date(b.createdAt) - new Date(a.createdAt);
            if (sortType === 'old') return new Date(a.createdAt) - new Date(b.createdAt);
            if (sortType === 'az') return a.resourceName.localeCompare(b.resourceName);
            if (sortType === 'za') return b.resourceName.localeCompare(a.resourceName);
            return 0;
        });
        setFilteredRequests(result);
    }, [requests, searchTerm, statusFilter, sortType]);

    const handleRequestAction = async (requestId, action) => {
        try {
            const newStatus = action === 'accept' ? 'acceptée' : 'refusée';
            await api.put(`/location/update_pres/${requestId}`, { status: newStatus });
            await fetchRequests();
            setShowRequestDetailsModal(false);
            showNotification(
                action === 'accept' ? 'Demande acceptée avec succès' : 'Demande refusée',
                'success'
            );
        } catch (err) {
            console.error('Erreur lors de la mise à jour:', err);
            // Récupérer le message d'erreur renvoyé par le backend
            const errorMessage = err.response?.data?.message || 'Erreur lors de la mise à jour de la demande';
            showNotification(errorMessage, 'error');
        }
    };

    const handleRequestClick = (request) => {
        setSelectedRequest(request);
        setShowRequestDetailsModal(true);
    };

    const pendingCount = requests.filter((r) => r.status === 'en_attente').length;
    const confirmedCount = requests.filter((r) => r.status === 'confirmé').length;
    const refusedCount = requests.filter((r) => r.status === 'refusé').length;

    const clearSearch = () => setSearchTerm('');

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                {/* En-tête */}
                <div className="flex flex-wrap items-center gap-3 mb-6">
                    <motion.button
                        whileHover={{ scale: 1.05, x: -3 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 px-3 py-2 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm hover:bg-gray-100 transition-all"
                    >
                        <ArrowLeft size={18} className="text-gray-600" />
                        <span className="text-sm font-medium text-gray-600">Retour</span>
                    </motion.button>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <ClockIcon size={28} className="text-yellow-600" />
                            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                                Mes demandes de réservation
                            </h2>
                            {pendingCount > 0 && (
                                <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-sm font-medium">
                                    {pendingCount} en attente
                                </span>
                            )}
                        </div>
                        <div className="mt-2 h-1 w-24 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"></div>
                    </div>
                </div>

                {/* Barre de filtrage améliorée */}
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-4 mb-6 transition-all">
                    <div className="flex flex-col sm:flex-row gap-3 mb-4">
                        <div className="relative flex-1">
                            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Rechercher par ressource, client ou événement..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-9 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all bg-gray-50/50"
                            />
                            {searchTerm && (
                                <button
                                    onClick={clearSearch}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <div className="relative">
                                <select
                                    value={sortType}
                                    onChange={(e) => setSortType(e.target.value)}
                                    className="appearance-none pl-9 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50/50 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200 cursor-pointer"
                                >
                                    <option value="recent">📅 Plus récents</option>
                                    <option value="old">📅 Plus anciens</option>
                                    <option value="az">🔤 A → Z</option>
                                    <option value="za">🔤 Z → A</option>
                                </select>
                                <ArrowUpDown size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <ChevronDown size={14} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                whileHover={{ rotate: 30 }}
                                onClick={fetchRequests}
                                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                                title="Actualiser"
                            >
                                <RefreshCw size={16} />
                            </motion.button>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <ListFilter size={14} className="text-gray-400 mr-1" />
                        <span className="text-xs font-medium text-gray-500 mr-2">Filtrer par statut :</span>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { value: 'all', label: 'Tous', count: requests.length, color: 'gray' },
                                { value: 'en_attente', label: 'En attente', count: pendingCount, color: 'yellow' },
                                { value: 'confirmé', label: 'Confirmé', count: confirmedCount, color: 'green' },
                                { value: 'refusé', label: 'Refusé', count: refusedCount, color: 'red' },
                            ].map((filter) => (
                                <motion.button
                                    key={filter.value}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setStatusFilter(filter.value)}
                                    className={`
                                        px-3 py-1.5 rounded-full text-xs font-medium transition-all
                                        ${statusFilter === filter.value
                                            ? `bg-${filter.color}-100 text-${filter.color}-700 ring-2 ring-${filter.color}-300 ring-offset-1`
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }
                                    `}
                                >
                                    {filter.label} ({filter.count})
                                </motion.button>
                            ))}
                        </div>
                    </div>

                    <div className="mt-3 text-xs text-gray-400 border-t border-gray-100 pt-3 flex justify-between items-center">
                        <span>
                            {filteredRequests.length} résultat{filteredRequests.length > 1 ? 's' : ''}
                            {searchTerm && ` pour « ${searchTerm} »`}
                            {statusFilter !== 'all' && ` • statut : ${statusFilter === 'en_attente' ? 'En attente' : statusFilter === 'confirmé' ? 'Confirmé' : 'Refusé'}`}
                        </span>
                        {(searchTerm || statusFilter !== 'all') && (
                            <button
                                onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}
                                className="text-blue-500 hover:text-blue-700 underline text-xs"
                            >
                                Réinitialiser les filtres
                            </button>
                        )}
                    </div>
                </div>

                {/* Liste des demandes */}
                <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 border border-gray-100">
                    {requestsLoading ? (
                        <div className="flex justify-center py-12">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity }}
                                className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"
                            />
                        </div>
                    ) : filteredRequests.length === 0 ? (
                        <div className="text-center py-12">
                            <ClockIcon size={48} className="mx-auto mb-4 text-gray-300" />
                            <p className="text-gray-500">
                                {searchTerm || statusFilter !== 'all'
                                    ? 'Aucune demande ne correspond aux critères'
                                    : 'Aucune demande de réservation'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredRequests.map((request, index) => (
                                <motion.div
                                    key={request.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.03 }}
                                    whileHover={{ scale: 1.01 }}
                                    onClick={() => handleRequestClick(request)}
                                    className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-md transition-all cursor-pointer"
                                >
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex items-start gap-3">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${request.status === 'en_attente' ? 'bg-yellow-100'
                                                : request.status === 'confirmé' ? 'bg-green-100' : 'bg-red-100'
                                                }`}>
                                                {request.status === 'en_attente' ? (
                                                    <Clock size={20} className="text-yellow-600" />
                                                ) : request.status === 'confirmé' ? (
                                                    <CheckCircle size={20} className="text-green-600" />
                                                ) : (
                                                    <XCircle size={20} className="text-red-600" />
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-900">{request.resourceName}</h3>
                                                <p className="text-sm text-gray-600 mt-1">{request.eventName}</p>
                                                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
                                                    <span className="flex items-center gap-1"><User size={12} />{request.clientName}</span>
                                                    <span className="flex items-center gap-1"><Calendar size={12} />{formatDate(request.dateDebut)}</span>
                                                    <span className="flex items-center gap-1"><Clock size={12} />{formatTime(request.dateDebut)} - {formatTime(request.dateFin)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <StatusBadge status={request.status} />
                                            <span className="text-lg font-bold text-blue-600">{formatPrice(request.price)}</span>
                                            {request.status === 'en_attente' && (
                                                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                                    <motion.button
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={() => handleRequestAction(request.id, 'accept')}
                                                        className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200"
                                                    >
                                                        <CheckCircle size={18} />
                                                    </motion.button>
                                                    <motion.button
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={() => handleRequestAction(request.id, 'reject')}
                                                        className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                                                    >
                                                        <XCircle size={18} />
                                                    </motion.button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Modal de détails (inchangé) */}
                <AnimatePresence>
                    {showRequestDetailsModal && selectedRequest && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 flex items-center justify-center z-50 p-4"
                            style={{ background: 'rgba(15,15,25,0.65)', backdropFilter: 'blur(4px)' }}
                            onClick={() => setShowRequestDetailsModal(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.92, y: 24 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.92, y: 24 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                                className="w-full max-w-md overflow-hidden rounded-3xl shadow-2xl"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className={`bg-gradient-to-br ${headerGradient(selectedRequest.status)} px-5 pt-5 pb-0`}>
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}>
                                            <span className={`w-2 h-2 rounded-full ${statusDotColor(selectedRequest.status)}`}></span>
                                            {statusLabel(selectedRequest.status)}
                                        </span>
                                        <motion.button
                                            whileHover={{ scale: 1.1, rotate: 90 }}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => setShowRequestDetailsModal(false)}
                                            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                                            style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}
                                        >
                                            <X size={15} />
                                        </motion.button>
                                    </div>
                                    <div className="flex items-center gap-3 mb-5">
                                        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.18)' }}>
                                            <FileText size={22} color="#fff" />
                                        </div>
                                        <div>
                                            <p className="text-xs mb-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>Ressource demandée</p>
                                            <p className="text-base font-semibold" style={{ color: '#fff' }}>{selectedRequest.resourceName}</p>
                                            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>{selectedRequest.eventName}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.18)' }}>
                                        <div className="py-3 text-center">
                                            <p className="text-xs mb-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Date</p>
                                            <p className="text-xs font-medium" style={{ color: '#fff' }}>{formatDate(selectedRequest.dateDebut)}</p>
                                        </div>
                                        <div className="py-3 text-center border-x" style={{ borderColor: 'rgba(255,255,255,0.18)' }}>
                                            <p className="text-xs mb-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Horaires</p>
                                            <p className="text-xs font-medium" style={{ color: '#fff' }}>{formatTime(selectedRequest.dateDebut)} → {formatTime(selectedRequest.dateFin)}</p>
                                        </div>
                                        <div className="py-3 text-center">
                                            <p className="text-xs mb-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Prix</p>
                                            <p className="text-sm font-bold" style={{ color: '#fff' }}>{formatPrice(selectedRequest.price)}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white px-5 py-4 space-y-3 max-h-64 overflow-y-auto">
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-px bg-gray-100"></div>
                                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Informations client</span>
                                        <div className="flex-1 h-px bg-gray-100"></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-px rounded-xl overflow-hidden border border-gray-100">
                                        {[
                                            { label: 'Nom complet', value: selectedRequest.clientName },
                                            { label: 'CIN / Passeport', value: selectedRequest.cin || '—' },
                                            { label: 'Téléphone', value: selectedRequest.tel || '—' },
                                            { label: 'Région', value: selectedRequest.region || '—' },
                                        ].map(({ label, value }) => (
                                            <div key={label} className="bg-gray-50 px-4 py-3">
                                                <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                                                <p className="text-sm font-medium text-gray-900">{value}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="bg-gray-50 rounded-xl px-4 py-3">
                                        <p className="text-xs text-gray-400 mb-0.5">ID ressource</p>
                                        <p className="text-xs font-mono text-gray-600">{selectedRequest.resourceId || '—'}</p>
                                    </div>
                                </div>
                                <div className="bg-white px-5 pb-5 pt-2 border-t border-gray-100">
                                    {selectedRequest.status === 'en_attente' ? (
                                        <div className="grid grid-cols-2 gap-3 mb-2">
                                            <motion.button
                                                whileHover={{ scale: 1.03 }}
                                                whileTap={{ scale: 0.97 }}
                                                onClick={() => handleRequestAction(selectedRequest.id, 'accept')}
                                                className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors"
                                            >
                                                <CheckCircle size={15} /> Accepter
                                            </motion.button>
                                            <motion.button
                                                whileHover={{ scale: 1.03 }}
                                                whileTap={{ scale: 0.97 }}
                                                onClick={() => handleRequestAction(selectedRequest.id, 'reject')}
                                                className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
                                            >
                                                <XCircle size={15} /> Refuser
                                            </motion.button>
                                        </div>
                                    ) : null}
                                    <button
                                        onClick={() => setShowRequestDetailsModal(false)}
                                        className="w-full py-2.5 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
                                    >
                                        Fermer
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ─── POPUP DE NOTIFICATION (TOAST) ÉLÉGANTE ─── */}
                <AnimatePresence>
                    {notification.show && (
                        <motion.div
                            initial={{ opacity: 0, y: -50, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.9 }}
                            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                            className="fixed top-5 right-5 z-50 max-w-sm w-full shadow-2xl rounded-xl overflow-hidden"
                        >
                            <div className={`flex items-center gap-3 p-4 ${notification.type === 'success' ? 'bg-green-50 border-l-4 border-green-500' : 'bg-red-50 border-l-4 border-red-500'
                                }`}>
                                <div className={`flex-shrink-0 ${notification.type === 'success' ? 'text-green-500' : 'text-red-500'
                                    }`}>
                                    {notification.type === 'success' ? (
                                        <CheckCircle size={22} />
                                    ) : (
                                        <AlertCircle size={22} />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-800">{notification.message}</p>
                                </div>
                                <button
                                    onClick={() => setNotification({ show: false, message: '', type: 'success' })}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
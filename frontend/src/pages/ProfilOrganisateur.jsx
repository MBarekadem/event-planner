// OrganizerDashboard.jsx - Version corrigée (3 fixes)

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    Calendar, ChevronLeft, ChevronRight,
    User, Mail, Phone, Building2,
    MapPin, Euro, Edit2, Search,
    Trash2, Camera, Award, Star,
    LogOut, RefreshCw, Filter, X,
    ChevronDown, CheckCircle, Clock,
    AlertCircle, TrendingUp, Users,
    DollarSign, CalendarDays, LayoutGrid,
    List, ArrowUpRight, Eye, Calendar as CalendarIcon,
    MoreVertical, PlusCircle, History,
    Package, FolderOpen, Archive,
    ChevronRight as ChevronRightIcon,
    Bell, BellRing, Menu, ArrowLeft, Home,
    FileText, Upload, Download, CheckSquare,
    Clock as ClockIcon, CheckCircle as CheckCircleIcon,
    XCircle, AlertTriangle, File, Image as ImageIcon,
    Layers, Save, Lock, Heart,
    Receipt, FileSignature
} from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, getDay, addMonths, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from "../components/navbar";

// ─── FIX 2 : helper robuste pour l'URL de l'image de profil ───────────────────
const getProfileImageUrl = (imagePath) => {
    if (!imagePath) return null;
    // Evite les doubles slashes : http://localhost:5000//uploads/...
    const clean = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
    return `http://localhost:5000${clean}`;
};

// ─── Helper pour les images de ressources ─────────────────────────────────────
const getResourceImageUrl = (media) => {
    if (!media || !media.length) return null;
    const first = media[0];
    // Supporte img_vd (tableau) ou url directe
    const path = first?.img_vd?.[0] || first?.url || first?.path || null;
    if (!path) return null;
    const clean = path.startsWith('/') ? path : `/${path}`;
    return `http://localhost:5000${clean}`;
};

export default function OrganizerDashboard() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [selectedDayEvents, setSelectedDayEvents] = useState([]);
    const [showDayEventsModal, setShowDayEventsModal] = useState(false);
    const [viewMode, setViewMode] = useState('grid');
    const [hoveredCard, setHoveredCard] = useState(null);
    const [activeTab, setActiveTab] = useState('events');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Notifications
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    // Données principales
    const [organizer, setOrganizer] = useState(null);
    const [events, setEvents] = useState([]);
    const [resources, setResources] = useState([]);         // favoris
    const [allResources, setAllResources] = useState([]);   // toutes les ressources (pour le modal event)
    const [filteredResources, setFilteredResources] = useState([]);
    const [selectedEventFilter, setSelectedEventFilter] = useState('all');

    const [docSearchTerm, setDocSearchTerm] = useState('');
    const [docSortOption, setDocSortOption] = useState('nameAsc');

    // États profil
    const [showProfileEditModal, setShowProfileEditModal] = useState(false);
    const [profileFormData, setProfileFormData] = useState({
        firstname: '', lastname: '', email: '', numTel: '', region: ''
    });
    const [profilePasswordData, setProfilePasswordData] = useState({ password: '', confirmPassword: '' });
    const [profileImage, setProfileImage] = useState(null);
    const [profileImagePreview, setProfileImagePreview] = useState(null);
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileError, setProfileError] = useState('');
    const [profileSuccess, setProfileSuccess] = useState('');
    const [profileActiveTab, setProfileActiveTab] = useState('info');

    // États modification événement
    const [showEditEventModal, setShowEditEventModal] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [editEventFormData, setEditEventFormData] = useState({
        title: '', description: '', lieu: '', category: '',
        type: 'public', dateDebut: '', dateFin: '',
        nombreParticipants: '', status: 'en attente'
    });
    const [editEventLoading, setEditEventLoading] = useState(false);
    const [editEventError, setEditEventError] = useState('');
    // FIX 1 : ressources de l'événement en cours d'édition
    const [editingEventResources, setEditingEventResources] = useState([]);

    // Favoris
    const [likedResources, setLikedResources] = useState([]);

    // ─── FIX 3 : Factures réelles depuis l'API ────────────────────────────────
    const [selectedDocType, setSelectedDocType] = useState('invoices');
    const [invoices, setInvoices] = useState([]);           // locations payées
    const [invoicesLoading, setInvoicesLoading] = useState(false);
    const [documents, setDocuments] = useState([]);         // affichage unifié

    // Token et userId
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const userId = user?._id || user?.id;

    const api = axios.create({
        baseURL: 'http://localhost:5000/api',
        headers: { 'Authorization': `Bearer ${token}` }
    });

    // ─── Chargement initial ───────────────────────────────────────────────────
    useEffect(() => {
        if (!token || !userId) { navigate('/login'); return; }
        fetchOrganizerData();
        loadNotifications();
        fetchAllResources();
        fetchInvoices();          // FIX 3
    }, []);

    // ─── FIX 3 : charger les factures réelles ────────────────────────────────
    const fetchInvoices = async () => {
        setInvoicesLoading(true);
        try {
            const res = await api.get('/location/get_my_locations');          // GET /api/location/my → getMyLocations
            const locations = res.data || [];
            // On ne garde que les locations payées (payer === "payer")
            const paid = locations.filter(loc => loc.payer === 'payer');
            setInvoices(paid);
        } catch (err) {
            console.error('Erreur chargement factures:', err);
            setInvoices([]);
        } finally {
            setInvoicesLoading(false);
        }
    };

    // Mettre à jour les documents affichés selon l'onglet sélectionné
    useEffect(() => {
        if (selectedDocType === 'invoices') {
            // Transformer les locations payées en format document
            const docs = invoices.map(loc => ({
                id: loc._id,
                name: `Facture – ${loc.resource?.name || 'Ressource'} (${loc.event?.title || 'Événement'})`,
                date: loc.paymentDate || loc.updatedAt || loc.createdAt,
                url: loc.invoice ? `http://localhost:5000/${loc.invoice}` : null,
                amount: loc.resource?.price || 0,
                status: loc.status,
                resourceName: loc.resource?.name,
                eventTitle: loc.event?.title,
            }));
            setDocuments(docs);
        } else {
            // Onglet Contrats : pas encore de données réelles → liste vide propre
            setDocuments([]);
        }
    }, [selectedDocType, invoices]);

    // ─── FIX 1 : charger toutes les ressources (pour le modal édition) ────────
    const fetchAllResources = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/ressources/get_all_ressources');
            setAllResources(res.data || []);
        } catch (err) {
            console.error('Erreur chargement toutes ressources:', err);
        }
    };

    // Mettre à jour les ressources filtrées par événement sélectionné
    useEffect(() => {
        if (selectedEvent) {
            const eventResources = resources.filter(resource =>
                selectedEvent.ressources_utiliser?.includes(resource._id)
            );
            setFilteredResources(eventResources);
        } else {
            setFilteredResources(resources);
        }
    }, [selectedEvent, resources]);

    useEffect(() => {
        const dayEvents = events.filter(event => {
            if (!event.dateDebut) return false;
            return isSameDay(parseISO(event.dateDebut), selectedDate);
        });
        setSelectedDayEvents(dayEvents);
    }, [selectedDate, events]);

    const loadNotifications = () => {
        const mockNotifs = [
            { id: 1, title: 'Bienvenue', message: 'Bienvenue sur votre espace organisateur', time: '5 min', read: false, type: 'success' },
            { id: 2, title: 'Nouvel événement', message: 'Un nouvel événement a été créé', time: '1 heure', read: false, type: 'info' },
        ];
        setNotifications(mockNotifs);
        setUnreadCount(mockNotifs.filter(n => !n.read).length);
    };

    const fetchOrganizerData = async () => {
        try {
            setLoading(true);
            const [userRes, eventsRes, resourcesRes] = await Promise.all([
                api.get(`/users/${userId}`),
                api.get(`/event/user_event/${userId}`),
                api.get(`/users/adore/${userId}`)
            ]);
            setOrganizer(userRes.data);
            setProfileFormData({
                firstname: userRes.data.firstname || '',
                lastname: userRes.data.lastname || '',
                email: userRes.data.email || '',
                numTel: userRes.data.numTel || '',
                region: userRes.data.locationName || ''
            });
            setEvents(eventsRes.data);
            setResources(resourcesRes.data);
            setFilteredResources(resourcesRes.data);
        } catch (err) {
            console.error('Erreur chargement:', err);
            setError('Impossible de charger les données');
            if (err.response?.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                navigate('/login');
            }
        } finally {
            setLoading(false);
        }
    };

    const filteredAndSortedDocuments = useMemo(() => {
        let filtered = documents.filter(doc =>
            doc.name.toLowerCase().includes(docSearchTerm.toLowerCase())
        );
        switch (docSortOption) {
            case 'nameAsc': filtered.sort((a, b) => a.name.localeCompare(b.name)); break;
            case 'nameDesc': filtered.sort((a, b) => b.name.localeCompare(a.name)); break;
            case 'dateDesc': filtered.sort((a, b) => new Date(b.date) - new Date(a.date)); break;
            case 'dateAsc': filtered.sort((a, b) => new Date(a.date) - new Date(b.date)); break;
            default: break;
        }
        return filtered;
    }, [documents, docSearchTerm, docSortOption]);

    // ─── Profil ───────────────────────────────────────────────────────────────
    const geocodeLocation = async (locationName) => {
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}`);
            const data = await res.json();
            if (data && data.length > 0) {
                return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), displayName: data[0].display_name };
            }
            return null;
        } catch (err) { console.error("Erreur géocodage:", err); return null; }
    };

    const handleProfileEdit = () => {
        setProfileFormData({
            firstname: organizer?.firstname || '',
            lastname: organizer?.lastname || '',
            email: organizer?.email || '',
            numTel: organizer?.numTel || '',
            region: organizer?.locationName || ''
        });
        setProfilePasswordData({ password: '', confirmPassword: '' });
        setProfileImage(null);
        setProfileImagePreview(null);
        setProfileError('');
        setProfileSuccess('');
        setShowProfileEditModal(true);
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setProfileLoading(true);
        setProfileError('');
        setProfileSuccess('');

        if (profilePasswordData.password && profilePasswordData.password !== profilePasswordData.confirmPassword) {
            setProfileError('Les mots de passe ne correspondent pas');
            setProfileLoading(false);
            return;
        }
        if (profilePasswordData.password && profilePasswordData.password.length < 6) {
            setProfileError('Le mot de passe doit contenir au moins 6 caractères');
            setProfileLoading(false);
            return;
        }

        try {
            const formData = new FormData();
            formData.append('firstname', profileFormData.firstname);
            formData.append('lastname', profileFormData.lastname);
            formData.append('email', profileFormData.email);
            formData.append('numTel', profileFormData.numTel || '');

            if (profileFormData.region && profileFormData.region.trim() !== '') {
                try {
                    const coords = await geocodeLocation(profileFormData.region);
                    if (coords && coords.lng && coords.lat) {
                        formData.append('location', JSON.stringify({ type: "Point", coordinates: [coords.lng, coords.lat] }));
                        formData.append('locationName', coords.displayName);
                    } else {
                        setProfileError("Impossible de géolocaliser la région saisie.");
                    }
                } catch (geoError) {
                    setProfileError("Erreur technique lors de la géolocalisation.");
                }
            } else {
                formData.append('locationName', '');
            }

            if (profilePasswordData.password) formData.append('password', profilePasswordData.password);
            if (profileImage) formData.append('image', profileImage);

            const response = await api.put(`/users/update`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setOrganizer(response.data);
            setProfileFormData({
                firstname: response.data.firstname || '',
                lastname: response.data.lastname || '',
                email: response.data.email || '',
                numTel: response.data.numTel || '',
                region: response.data.locationName || ''
            });
            const updatedUser = { ...user, ...response.data, id: response.data._id };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setProfileSuccess('Profil modifié avec succès !');
            setProfilePasswordData({ password: '', confirmPassword: '' });
            setProfileImage(null);
            setProfileImagePreview(null);
            setTimeout(() => { setShowProfileEditModal(false); setProfileSuccess(''); }, 2000);
        } catch (err) {
            setProfileError(err.response?.data?.message || 'Erreur lors de la modification');
        } finally {
            setProfileLoading(false);
        }
    };

    const handleProfileImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProfileImage(file);
            const reader = new FileReader();
            reader.onloadend = () => setProfileImagePreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveProfileImage = () => { setProfileImage(null); setProfileImagePreview(null); };

    // ─── FIX 1 : handleEditEvent avec résolution des ressources ──────────────
    const handleEditEvent = (event) => {
        setEditingEvent(event);
        setEditEventFormData({
            title: event.title || '',
            description: event.description || '',
            lieu: event.lieu || '',
            category: event.category || '',
            type: event.type || 'public',
            dateDebut: event.dateDebut ? format(parseISO(event.dateDebut), "yyyy-MM-dd'T'HH:mm") : '',
            dateFin: event.dateFin ? format(parseISO(event.dateFin), "yyyy-MM-dd'T'HH:mm") : '',
            nombreParticipants: event.nombreParticipants || '',
            status: event.status || 'en attente'
        });

        // Résoudre les IDs de ressources_utiliser vers les objets complets
        const usedIds = event.ressources_utiliser || [];
        const resolved = usedIds
            .map(id => {
                const strId = typeof id === 'object' ? (id.$oid || id._id || String(id)) : String(id);
                return allResources.find(r => {
                    const rId = typeof r._id === 'object' ? (r._id.$oid || String(r._id)) : String(r._id);
                    return rId === strId;
                });
            })
            .filter(Boolean);
        setEditingEventResources(resolved);
        setShowEditEventModal(true);
    };

    const handleEditEventSubmit = async (e) => {
        e.preventDefault();
        if (!editingEvent || !editingEvent._id) { setEditEventError('Événement invalide'); return; }
        setEditEventLoading(true);
        setEditEventError('');
        try {
            const submitData = {
                title: editEventFormData.title?.trim(),
                description: editEventFormData.description?.trim(),
                lieu: editEventFormData.lieu?.trim(),
                category: editEventFormData.category,
                type: editEventFormData.type,
                dateDebut: new Date(editEventFormData.dateDebut),
                dateFin: new Date(editEventFormData.dateFin),
                nombreParticipants: Number(editEventFormData.nombreParticipants) || 0,
                status: editEventFormData.status
            };
            const response = await api.put(`/event/update_event/${editingEvent._id}`, submitData);
            setEvents(events.map(ev => ev._id === editingEvent._id ? response.data : ev));
            setShowEditEventModal(false);
            setEditingEvent(null);
            setEditingEventResources([]);
            alert('Événement modifié avec succès !');
        } catch (err) {
            setEditEventError(err.response?.data?.message || 'Erreur lors de la modification');
        } finally {
            setEditEventLoading(false);
        }
    };

    // Notifications
    const markAsRead = (id) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
    };
    const markAllAsRead = () => { setNotifications(prev => prev.map(n => ({ ...n, read: true }))); setUnreadCount(0); };

    // Formatage
    const formatPrice = (price) => {
        if (!price) return '0 DT';
        return new Intl.NumberFormat('fr-TN', { style: 'decimal', minimumFractionDigits: 0 }).format(price) + ' DT';
    };
    const formatDate = (date) => {
        if (!date) return 'Date non définie';
        try { return format(parseISO(date), 'dd MMMM yyyy', { locale: fr }); }
        catch { return 'Date invalide'; }
    };
    const formatDateTime = (date) => {
        if (!date) return 'Date non définie';
        try { return format(parseISO(date), 'dd MMMM yyyy HH:mm', { locale: fr }); }
        catch { return 'Date invalide'; }
    };
    const formatTime = (date) => {
        if (!date) return '';
        try { return format(parseISO(date), 'HH:mm', { locale: fr }); }
        catch { return ''; }
    };

    // Calendrier
    const getDaysInMonth = () => eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
    const getEventsForDay = (day) => {
        let filtered = events;
        if (selectedEventFilter !== 'all') filtered = filtered.filter(e => e._id === selectedEventFilter);
        return filtered.filter(e => e.dateDebut && isSameDay(parseISO(e.dateDebut), day));
    };
    const handleDayClick = (day) => {
        setSelectedDate(day);
        const dayEvents = getEventsForDay(day);
        if (dayEvents.length > 0) { setSelectedDayEvents(dayEvents); setShowDayEventsModal(true); }
    };
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const goToToday = () => { setCurrentMonth(new Date()); setSelectedDate(new Date()); };
    const handleEventSelect = (event) => {
        setSelectedEvent(selectedEvent?._id === event._id ? null : event);
        setShowDayEventsModal(false);
        setActiveTab('events');
    };
    const getMonthName = (date) => format(date, 'MMMM yyyy', { locale: fr });

    // Documents
    const handleViewPDF = (url) => { if (url) window.open(url, '_blank'); };
    const handleDownloadPDF = (url, filename) => {
        if (!url) return;
        const link = document.createElement('a');
        link.href = url;
        link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Likes
    const [likedResourceIds, setLikedResourceIds] = useState([]);
    useEffect(() => {
        const u = JSON.parse(localStorage.getItem("user") || "{}");
        setLikedResourceIds(u?.adore || []);
    }, []);

    const toggleLike = async (e, resourceId) => {
        e.stopPropagation();
        const tok = localStorage.getItem("token");
        const u = JSON.parse(localStorage.getItem("user") || "{}");
        if (!tok || !u) { alert("Vous devez être connecté !"); return; }
        const isLiked = likedResourceIds.includes(resourceId);
        try {
            const url = isLiked ? "http://localhost:5000/api/users/remove" : "http://localhost:5000/api/users/like";
            const res = await fetch(url, {
                method: isLiked ? "DELETE" : "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok}` },
                body: JSON.stringify({ resourceId }),
            });
            const data = await res.json();
            if (!res.ok) { alert(data.message); return; }
            const updated = isLiked ? likedResourceIds.filter(id => id !== resourceId) : [...likedResourceIds, resourceId];
            setLikedResourceIds(updated);
            localStorage.setItem("user", JSON.stringify({ ...u, adore: updated }));
        } catch (err) { console.error(err); }
    };

    // Stats
    const getStats = () => {
        const totalBudget = resources.reduce((acc, r) => acc + (r.price || 0), 0);
        const upcomingEvents = events.filter(e => new Date(e.dateDebut) > new Date()).length;
        const completedEvents = events.filter(e => e.status === 'terminé').length;
        const totalDocuments = invoices.length;
        return { totalBudget, upcomingEvents, completedEvents, totalDocuments };
    };
    const stats = getStats();

    // Composants
    const StatusBadge = ({ status }) => {
        const config = {
            'en attente': { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: ClockIcon, label: 'En attente' },
            'en cours': { bg: 'bg-blue-100', text: 'text-blue-700', icon: TrendingUp, label: 'En cours' },
            'terminé': { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircleIcon, label: 'Terminé' }
        };
        const conf = config[status] || config['en attente'];
        const Icon = conf.icon;
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${conf.bg} ${conf.text}`}>
                <Icon size={12} /> {conf.label}
            </span>
        );
    };

    const Tabs = () => (
        <div className="border-b border-gray-200 mb-6 overflow-x-auto">
            <div className="flex space-x-4 sm:space-x-8 min-w-max px-2">
                <button onClick={() => setActiveTab('events')} className={`pb-4 px-1 flex items-center gap-2 font-medium text-xs sm:text-sm transition-all relative ${activeTab === 'events' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                    <Calendar size={16} /><span>Mes événements</span>
                    {events.length > 0 && <span className="bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full text-[10px]">{events.length}</span>}
                </button>
                <button onClick={() => setActiveTab('resources')} className={`pb-4 px-1 flex items-center gap-2 font-medium text-xs sm:text-sm transition-all relative ${activeTab === 'resources' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                    <Package size={16} /><span>Mes favoris</span>
                    {likedResourceIds.length > 0 && <span className="bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full text-[10px]">{likedResourceIds.length}</span>}
                </button>
                <button onClick={() => setActiveTab('demandes')} className={`pb-4 px-1 flex items-center gap-2 font-medium text-xs sm:text-sm transition-all relative ${activeTab === 'demandes' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                    <FileText size={16} /><span>Mes Documents</span>
                    {invoicesLoading
                        ? <span className="bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full text-[10px]">…</span>
                        : <span className="bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full text-[10px]">{invoices.length}</span>
                    }
                </button>
            </div>
        </div>
    );

    if (loading) {
        return (
            <>
                <Navbar notifications={notifications} unreadCount={unreadCount} onMarkAsRead={markAsRead} onMarkAllAsRead={markAllAsRead} />
                <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-gray-50 pt-20">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Chargement de votre espace...</p>
                    </div>
                </div>
            </>
        );
    }

    if (error) {
        return (
            <>
                <Navbar notifications={notifications} unreadCount={unreadCount} onMarkAsRead={markAsRead} onMarkAllAsRead={markAllAsRead} />
                <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-gray-50 p-4 pt-20">
                    <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="text-center bg-white p-10 rounded-3xl shadow-2xl max-w-md w-full">
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6"><AlertCircle size={40} className="text-red-600" /></div>
                        <p className="text-red-600 mb-6">{error}</p>
                        <button onClick={() => window.location.reload()} className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700"><RefreshCw size={16} /> Réessayer</button>
                    </motion.div>
                </div>
            </>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
            <Navbar notifications={notifications} unreadCount={unreadCount} onMarkAsRead={markAsRead} onMarkAllAsRead={markAllAsRead} />

            <div className="pt-20 sm:pt-24">
                <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6 lg:space-y-8">

                    {/* Profil + Calendrier */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

                        {/* ── Carte Profil ── */}
                        <motion.div whileHover={{ y: -5 }} className="lg:col-span-1">
                            <div className="bg-white rounded-3xl shadow-xl p-6 border border-gray-100 h-full hover:shadow-2xl transition-all duration-300">
                                <div className="flex flex-col items-center">
                                    <motion.div whileHover={{ scale: 1.05 }} className="relative mb-4 cursor-pointer">
                                        <div className="w-28 h-28 rounded-full overflow-hidden ring-4 ring-blue-100 shadow-lg">
                                            {/* ── FIX 2 : URL robuste ── */}
                                            {organizer?.image ? (
                                                <img
                                                    src={getProfileImageUrl(organizer.image)}
                                                    alt={`${organizer.firstname} ${organizer.lastname}`}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => { e.target.onerror = null; e.target.src = ''; e.target.style.display = 'none'; e.target.parentElement.innerHTML = `<div class="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center"><svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2'><path d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'/><circle cx='12' cy='7' r='4'/></svg></div>`; }}
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                                                    <User size={40} className="text-white" />
                                                </div>
                                            )}
                                        </div>
                                        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }}
                                            className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-white ${organizer?.status === 'valide' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                                    </motion.div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-2xl font-bold text-gray-900 text-center">{organizer?.firstname} {organizer?.lastname}</h2>
                                        <motion.button whileHover={{ scale: 1.1, rotate: 15 }} whileTap={{ scale: 0.9 }} onClick={handleProfileEdit} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Edit2 size={16} /></motion.button>
                                    </div>
                                    <p className="text-blue-600 font-medium flex items-center gap-1 mt-1"><Award size={14} /> Organisateur</p>
                                    <div className="w-full mt-6 space-y-3">
                                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-blue-50 transition-colors group">
                                            <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200"><Mail size={14} className="text-blue-600" /></div>
                                            <span className="text-sm text-gray-600 truncate">{organizer?.email}</span>
                                        </div>
                                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-green-50 transition-colors group">
                                            <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200"><Phone size={14} className="text-green-600" /></div>
                                            <span className="text-sm text-gray-600 truncate">{organizer?.numTel || 'Non renseigné'}</span>
                                        </div>
                                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-purple-50 transition-colors group">
                                            <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200"><Building2 size={14} className="text-purple-600" /></div>
                                            <span className="text-sm text-gray-600 truncate">{organizer?.locationName || 'Région non renseignée'}</span>
                                        </div>
                                    </div>
                                    <div className="w-full grid grid-cols-3 gap-2 mt-6">
                                        <motion.div whileHover={{ scale: 1.05 }} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-2 text-center">
                                            <p className="text-lg font-bold text-blue-600">{events.length}</p>
                                            <p className="text-xs text-gray-600">Événements</p>
                                        </motion.div>
                                        <motion.div whileHover={{ scale: 1.05 }} className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-2 text-center">
                                            <p className="text-lg font-bold text-purple-600">{likedResourceIds.length}</p>
                                            <p className="text-xs text-gray-600">Favoris</p>
                                        </motion.div>
                                        <motion.div whileHover={{ scale: 1.05 }} className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-2 text-center">
                                            <p className="text-lg font-bold text-green-600">{invoices.length}</p>
                                            <p className="text-xs text-gray-600">Factures</p>
                                        </motion.div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* ── Calendrier ── */}
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-2">
                            <div className="bg-white rounded-3xl shadow-xl p-6 border border-gray-100 hover:shadow-2xl transition-all duration-300">
                                <div className="flex items-center gap-2 mb-6">
                                    <div className="p-2 bg-blue-100 rounded-lg"><CalendarIcon className="text-blue-600" size={18} /></div>
                                    <h3 className="text-lg font-semibold text-gray-900">Agenda des événements</h3>
                                </div>
                                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <select value={selectedEventFilter} onChange={(e) => setSelectedEventFilter(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500">
                                            <option value="all">Tous les événements</option>
                                            {events.map(event => <option key={event._id} value={event._id}>{event.title}</option>)}
                                        </select>
                                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={goToToday} className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-sm font-medium flex items-center gap-1">
                                            <Home size={14} /><span>Aujourd'hui</span>
                                        </motion.button>
                                        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                                            <motion.button whileHover={{ scale: 1.1 }} onClick={prevMonth} className="p-2 bg-white rounded-lg hover:bg-gray-200 shadow-sm"><ChevronLeft size={16} /></motion.button>
                                            <motion.button whileHover={{ scale: 1.1 }} onClick={nextMonth} className="p-2 bg-white rounded-lg hover:bg-gray-200 shadow-sm"><ChevronRight size={16} /></motion.button>
                                        </div>
                                    </div>
                                    <motion.button whileHover={{ scale: 1.05 }} onClick={() => navigate('/CreerEvenement')} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-sm font-medium">
                                        <PlusCircle size={14} /><span>Nouvel événement</span>
                                    </motion.button>
                                </div>
                                <motion.h4 key={currentMonth.toString()} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center font-semibold text-gray-700 mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{getMonthName(currentMonth)}</motion.h4>
                                <div className="grid grid-cols-7 gap-1 mb-2">{['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => <div key={d} className="text-center text-sm font-medium text-gray-500 py-2">{d}</div>)}</div>
                                <div className="grid grid-cols-7 gap-1">
                                    {Array.from({ length: (getDay(startOfMonth(currentMonth)) + 6) % 7 }).map((_, i) => <div key={`e-${i}`} className="p-3" />)}
                                    {getDaysInMonth().map((day, index) => {
                                        const dayEvents = getEventsForDay(day);
                                        const hasEvents = dayEvents.length > 0;
                                        const isSelected = isSameDay(day, selectedDate);
                                        const isTodayDate = isToday(day);
                                        return (
                                            <motion.button key={index} whileHover={{ scale: 1.05 }} onClick={() => handleDayClick(day)}
                                                className={`relative p-3 rounded-xl transition-all text-sm font-medium
                                                    ${isSelected ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg' : ''}
                                                    ${!isSelected && isTodayDate ? 'ring-2 ring-blue-400 bg-blue-50' : ''}
                                                    ${!isSelected && !isTodayDate && hasEvents ? 'bg-blue-50 hover:bg-blue-100' : ''}
                                                    ${!isSelected && !isTodayDate && !hasEvents ? 'hover:bg-gray-100' : ''}`}>
                                                <span>{format(day, 'd')}</span>
                                                {hasEvents && !isSelected && (
                                                    <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-0.5">
                                                        {dayEvents.slice(0, 3).map((_, idx) => <div key={idx} className="w-1 h-1 bg-blue-600 rounded-full" />)}
                                                    </div>
                                                )}
                                            </motion.button>
                                        );
                                    })}
                                </div>
                                <div className="mt-6">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-sm font-medium text-gray-500 flex items-center gap-2"><Calendar size={12} />{format(selectedDate, 'EEEE d MMMM', { locale: fr })}</h4>
                                        {selectedDayEvents.length > 0 && <span className="text-xs bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-2 py-0.5 rounded-full">{selectedDayEvents.length}</span>}
                                    </div>
                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                        {selectedDayEvents.length > 0 ? selectedDayEvents.slice(0, 2).map((event, index) => (
                                            <motion.div key={event._id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }} whileHover={{ scale: 1.02, x: 5 }} onClick={() => handleEventSelect(event)} className="p-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg cursor-pointer border border-blue-100 hover:shadow-md transition-all">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-5 h-5 bg-gradient-to-br from-blue-600 to-indigo-600 rounded flex items-center justify-center text-white text-xs flex-shrink-0">{event.category === 'Mariage' ? '💒' : '📅'}</div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-gray-900 text-xs truncate">{event.title}</p>
                                                        <p className="text-[10px] text-gray-500">{formatTime(event.dateDebut)}</p>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )) : <p className="text-sm text-gray-400 text-center py-4">Aucun événement ce jour</p>}
                                        {selectedDayEvents.length > 2 && <button onClick={() => setShowDayEventsModal(true)} className="w-full text-xs text-blue-600 hover:text-blue-700 font-medium py-1 hover:underline">+{selectedDayEvents.length - 2} autres</button>}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* ── Onglets ── */}
                    <div className="bg-white rounded-3xl shadow-xl p-6 border border-gray-100">
                        <Tabs />
                        <AnimatePresence mode="wait">

                            {/* ── Tab Événements ── */}
                            {activeTab === 'events' && (
                                <motion.div key="events" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                                    <div className="flex items-center justify-between gap-3 mb-6">
                                        <div className="flex items-center gap-4">
                                            <h2 className="text-xl font-bold text-gray-900">Mes événements</h2>
                                            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                                                <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}><LayoutGrid size={14} /></button>
                                                <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}><List size={14} /></button>
                                            </div>
                                        </div>
                                        <button onClick={() => setSelectedEvent(null)} className="flex items-center gap-2 px-4 py-2 text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 text-sm font-medium"><Filter size={14} />Tous</button>
                                    </div>
                                    {viewMode === 'grid' ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {events.map((event, index) => {
                                                const totalPrice = event.ressources_utiliser?.reduce((acc, resId) => {
                                                    const resource = allResources.find(r => String(r._id) === String(resId));
                                                    return acc + (resource?.price || 0);
                                                }, 0) || 0;
                                                return (
                                                    <motion.div key={event._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} whileHover={{ y: -5 }} onClick={() => handleEventSelect(event)}
                                                        className={`relative bg-gradient-to-br from-gray-50 to-white rounded-2xl p-5 transition-all duration-300 border-2 cursor-pointer ${selectedEvent?._id === event._id ? 'border-blue-500 shadow-2xl' : 'border-gray-100 hover:border-blue-200 hover:shadow-xl'}`}>
                                                        <div className="text-4xl mb-3">{event.category === 'Mariage' ? '💒' : event.category === 'Conference' ? '🎤' : event.category === 'Anniversaire' ? '🎂' : '📅'}</div>
                                                        <h3 className="font-bold text-gray-900 mb-2 truncate">{event.title}</h3>
                                                        <div className="space-y-2 mb-4">
                                                            <div className="flex items-center gap-2 text-xs text-gray-500"><Calendar size={10} /><span className="truncate">{formatDate(event.dateDebut)}</span></div>
                                                            <div className="flex items-center gap-2 text-xs text-gray-500"><MapPin size={10} /><span className="truncate">{event.lieu || 'Lieu non défini'}</span></div>
                                                            <div className="flex items-center gap-2 text-sm font-bold text-blue-600"><Euro size={12} />{formatPrice(totalPrice)}</div>
                                                            <StatusBadge status={event.status} />
                                                        </div>
                                                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={(e) => { e.stopPropagation(); handleEditEvent(event); }} className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all">
                                                            <Edit2 size={12} /> Modifier
                                                        </motion.button>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {events.map((event, index) => (
                                                <motion.div key={event._id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }} whileHover={{ x: 5 }} onClick={() => handleEventSelect(event)} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-blue-50 transition-all group">
                                                    <div className="flex items-center gap-4 min-w-0 flex-1">
                                                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center text-white">{event.category === 'Mariage' ? '💒' : '📅'}</div>
                                                        <div className="min-w-0">
                                                            <h3 className="font-semibold text-gray-900 text-sm truncate group-hover:text-blue-600">{event.title}</h3>
                                                            <p className="text-xs text-gray-500">{formatDate(event.dateDebut)}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <StatusBadge status={event.status} />
                                                        <Edit2 size={14} className="text-gray-400 group-hover:text-blue-600" onClick={(e) => { e.stopPropagation(); handleEditEvent(event); }} />
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    )}
                                    {events.length === 0 && (
                                        <div className="text-center py-16">
                                            <Calendar size={40} className="text-gray-300 mx-auto mb-4" />
                                            <p className="text-gray-500 mb-4 text-sm">Aucun événement trouvé</p>
                                            <button onClick={() => navigate('/CreerEvenement')} className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-medium">Créer un événement</button>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* ── Tab Favoris ── */}
                            {activeTab === 'resources' && (
                                <motion.div key="resources" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                                    <div className="flex items-center justify-between gap-3 mb-6">
                                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Package size={20} className="text-purple-600" />Mes Favoris</h2>
                                        <div className="relative">
                                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input type="text" placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-64 pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {resources.filter(r => likedResourceIds.includes(r._id) && r.name.toLowerCase().includes(searchTerm.toLowerCase())).length > 0
                                            ? resources.filter(r => likedResourceIds.includes(r._id) && r.name.toLowerCase().includes(searchTerm.toLowerCase())).map((resource, index) => (
                                                <motion.div key={resource._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} whileHover={{ y: -5 }} onClick={() => navigate(`/RessourceDetail/${resource._id}`)} className="relative bg-white rounded-2xl p-5 border border-gray-200 hover:shadow-xl transition-all cursor-pointer group">
                                                    <div onClick={(e) => { e.stopPropagation(); toggleLike(e, resource._id); }} className="absolute top-2 right-2 bg-white p-1.5 rounded-full shadow hover:scale-110 transition cursor-pointer">
                                                        <Heart size={16} className={likedResourceIds.includes(resource._id) ? "text-red-500 fill-red-500" : "text-gray-400"} />
                                                    </div>
                                                    <div className="flex items-start gap-4">
                                                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                                                            {getResourceImageUrl(resource.media) ? (
                                                                <img src={getResourceImageUrl(resource.media)} alt={resource.name} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                                                            ) : <div className="w-full h-full flex items-center justify-center"><Camera size={20} className="text-gray-400" /></div>}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h3 className="font-semibold text-gray-900 text-sm truncate group-hover:text-blue-600">{resource.name}</h3>
                                                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{resource.description?.substring(0, 60)}...</p>
                                                            <div className="flex items-center gap-2 mt-2">
                                                                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs">{resource.category}</span>
                                                                <span className="text-sm font-bold text-green-600">{formatPrice(resource.price)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))
                                            : <div className="col-span-full text-center py-16 bg-white rounded-2xl"><Heart size={40} className="text-gray-300 mx-auto mb-4" /><p className="text-gray-500 text-sm">Aucun favori trouvé</p></div>
                                        }
                                    </div>
                                </motion.div>
                            )}

                            {/* ── FIX 3 : Tab Documents (vraies factures) ── */}
                            {activeTab === 'demandes' && (
                                <motion.div key="documents" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>


                                    <div className="flex flex-col sm:flex-row gap-3 mb-6">
                                        <div className="relative flex-1">
                                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input type="text" placeholder="Rechercher par nom..." value={docSearchTerm} onChange={(e) => setDocSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" />
                                        </div>
                                        <select value={docSortOption} onChange={(e) => setDocSortOption(e.target.value)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white">
                                            <option value="nameAsc">Nom (A → Z)</option>
                                            <option value="nameDesc">Nom (Z → A)</option>
                                            <option value="dateDesc">Date (récent → ancien)</option>
                                            <option value="dateAsc">Date (ancien → récent)</option>
                                        </select>
                                    </div>

                                    {invoicesLoading ? (
                                        <div className="text-center py-12"><div className="animate-spin w-8 h-8 border-b-2 border-blue-600 rounded-full mx-auto mb-3" /><p className="text-gray-500 text-sm">Chargement des factures...</p></div>
                                    ) : filteredAndSortedDocuments.length === 0 ? (
                                        <div className="text-center py-16 bg-gray-50 rounded-2xl">
                                            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                                            <p className="text-gray-500 font-medium">
                                                {selectedDocType === 'invoices' ? 'Aucune facture pour le moment' : 'Aucun contrat disponible'}
                                            </p>
                                            {selectedDocType === 'invoices' && (
                                                <p className="text-gray-400 text-sm mt-1">Les factures apparaissent après paiement d'une réservation</p>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto rounded-2xl border border-gray-100">
                                            <table className="w-full">
                                                <thead className="bg-gray-50 border-b border-gray-200">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Événement</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 bg-white">
                                                    {filteredAndSortedDocuments.map((doc) => (
                                                        <motion.tr key={doc.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="hover:bg-gray-50 transition-colors">
                                                            <td className="px-4 py-3">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600"><Receipt size={16} /></div>
                                                                    <div>
                                                                        <p className="font-medium text-gray-900 text-sm">{doc.resourceName || 'Ressource'}</p>
                                                                        <p className="text-xs text-gray-400">Facture de réservation</p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-gray-600">{doc.eventTitle || '—'}</td>
                                                            <td className="px-4 py-3 text-sm text-gray-600">{formatDate(doc.date)}</td>
                                                            <td className="px-4 py-3">
                                                                <span className="font-bold text-green-600">{formatPrice(doc.amount)}</span>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="flex items-center gap-2">
                                                                    {doc.url ? (
                                                                        <>
                                                                            <motion.button whileHover={{ scale: 1.05 }} onClick={() => handleViewPDF(doc.url)} className="px-3 py-1.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-all flex items-center gap-1 text-sm"><Eye size={14} />Voir</motion.button>
                                                                            <motion.button whileHover={{ scale: 1.05 }} onClick={() => handleDownloadPDF(doc.url, doc.name)} className="px-3 py-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-all flex items-center gap-1 text-sm"><Download size={14} />Télécharger</motion.button>
                                                                        </>
                                                                    ) : (
                                                                        <span className="text-xs text-gray-400 italic">Facture en génération...</span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </motion.tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* ─── Modals ─────────────────────────────────────────────────────────── */}
                    <AnimatePresence>
                        {showDayEventsModal && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowDayEventsModal(false)}>
                                <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                                    <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                                        <div className="flex justify-between items-center">
                                            <h3 className="text-xl font-bold text-gray-900">{format(selectedDate, 'EEEE d MMMM', { locale: fr })}</h3>
                                            <button onClick={() => setShowDayEventsModal(false)} className="p-2 hover:bg-white rounded-xl"><X size={18} className="text-gray-500" /></button>
                                        </div>
                                        <p className="text-sm text-gray-500 mt-1">{selectedDayEvents.length} événement(s)</p>
                                    </div>
                                    <div className="p-6 overflow-y-auto max-h-[60vh] space-y-3">
                                        {selectedDayEvents.map((event, index) => (
                                            <motion.div key={event._id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }} whileHover={{ scale: 1.02 }} onClick={() => { handleEventSelect(event); setShowDayEventsModal(false); }} className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 cursor-pointer hover:shadow-md">
                                                <div className="flex items-start gap-3">
                                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white text-xl">{event.category === 'Mariage' ? '💒' : '📅'}</div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-bold text-gray-900 text-sm">{event.title}</h4>
                                                        <p className="text-xs text-gray-600 mt-1">{event.description}</p>
                                                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                                            <span className="flex items-center gap-1"><Clock size={10} />{formatTime(event.dateDebut)}</span>
                                                            <span className="flex items-center gap-1"><MapPin size={10} />{event.lieu || 'Lieu non défini'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                    <div className="p-6 border-t border-gray-100 bg-gray-50">
                                        <button onClick={() => setShowDayEventsModal(false)} className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium text-sm">Fermer</button>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ── Modal Profil ── */}
                    <AnimatePresence>
                        {showProfileEditModal && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowProfileEditModal(false)}>
                                <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                                    <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-3"><div className="p-2 bg-blue-100 rounded-xl"><User size={20} className="text-blue-600" /></div><h3 className="text-xl font-bold text-gray-900">Modifier mon profil</h3></div>
                                            <button onClick={() => setShowProfileEditModal(false)} className="p-2 hover:bg-white rounded-xl"><X size={18} className="text-gray-500" /></button>
                                        </div>
                                    </div>
                                    <div className="flex border-b border-gray-200 px-6">
                                        <button onClick={() => setProfileActiveTab('info')} className={`py-3 px-4 text-sm font-medium transition-all ${profileActiveTab === 'info' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>Informations</button>
                                        <button onClick={() => setProfileActiveTab('password')} className={`py-3 px-4 text-sm font-medium transition-all ${profileActiveTab === 'password' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>Sécurité</button>
                                    </div>
                                    <form onSubmit={handleProfileSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
                                        {profileError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-600 text-sm"><AlertCircle size={16} />{profileError}</div>}
                                        {profileSuccess && <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-600 text-sm"><CheckCircle size={16} />{profileSuccess}</div>}
                                        {profileActiveTab === 'info' && (
                                            <>
                                                <div className="flex flex-col items-center mb-4">
                                                    <div className="relative">
                                                        <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-blue-100 shadow-lg bg-gray-100">
                                                            {/* ── FIX 2 dans le modal aussi ── */}
                                                            {profileImagePreview
                                                                ? <img src={profileImagePreview} alt="Aperçu" className="w-full h-full object-cover" />
                                                                : organizer?.image
                                                                    ? <img src={getProfileImageUrl(organizer.image)} alt={organizer.firstname} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                                                                    : <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center"><User size={32} className="text-white" /></div>
                                                            }
                                                        </div>
                                                        <label className="absolute bottom-0 right-0 p-1 bg-blue-600 rounded-full cursor-pointer hover:bg-blue-700">
                                                            <Camera size={16} className="text-white" />
                                                            <input type="file" accept="image/*" onChange={handleProfileImageChange} className="hidden" />
                                                        </label>
                                                        {profileImagePreview && <button type="button" onClick={handleRemoveProfileImage} className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white hover:bg-red-600"><X size={12} /></button>}
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-2">Cliquez sur la caméra pour changer la photo</p>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label><input type="text" value={profileFormData.firstname} onChange={(e) => setProfileFormData({ ...profileFormData, firstname: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" required /></div>
                                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label><input type="text" value={profileFormData.lastname} onChange={(e) => setProfileFormData({ ...profileFormData, lastname: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" required /></div>
                                                </div>
                                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Email *</label><input type="email" value={profileFormData.email} onChange={(e) => setProfileFormData({ ...profileFormData, email: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" required /></div>
                                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label><input type="tel" value={profileFormData.numTel} onChange={(e) => setProfileFormData({ ...profileFormData, numTel: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" /></div>
                                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Région</label><input type="text" value={profileFormData.region} onChange={(e) => setProfileFormData({ ...profileFormData, region: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" placeholder="Tunis, Sfax..." /></div>
                                            </>
                                        )}
                                        {profileActiveTab === 'password' && (
                                            <>
                                                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm flex items-center gap-2"><AlertCircle size={16} />Laissez vide pour conserver le mot de passe actuel</div>
                                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label><input type="password" value={profilePasswordData.password} onChange={(e) => setProfilePasswordData({ ...profilePasswordData, password: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" /></div>
                                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Confirmer</label><input type="password" value={profilePasswordData.confirmPassword} onChange={(e) => setProfilePasswordData({ ...profilePasswordData, confirmPassword: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" disabled={!profilePasswordData.password} /></div>
                                            </>
                                        )}
                                        <div className="pt-4 flex gap-3">
                                            <button type="button" onClick={() => setShowProfileEditModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Annuler</button>
                                            <button type="submit" disabled={profileLoading} className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg disabled:opacity-50 flex items-center justify-center gap-2">
                                                {profileLoading ? <><RefreshCw size={16} className="animate-spin" />Enregistrement...</> : <><Save size={16} />Enregistrer</>}
                                            </button>
                                        </div>
                                    </form>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ── FIX 1 : Modal Modifier Événement avec images des ressources ── */}
                    <AnimatePresence>
                        {showEditEventModal && editingEvent && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowEditEventModal(false)}>
                                <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                                    <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-100 rounded-xl"><Edit2 size={20} className="text-blue-600" /></div>
                                                <div>
                                                    <h3 className="text-xl font-bold text-gray-900">Modifier l'événement</h3>
                                                    <p className="text-sm text-gray-500 mt-0.5">"{editingEvent.title}"</p>
                                                </div>
                                            </div>
                                            <button onClick={() => { setShowEditEventModal(false); setEditingEventResources([]); }} className="p-2 hover:bg-white rounded-xl"><X size={18} className="text-gray-500" /></button>
                                        </div>
                                    </div>

                                    <div className="overflow-y-auto max-h-[75vh]">
                                        {/* ── Section ressources utilisées ── */}
                                        {editingEventResources.length > 0 && (
                                            <div className="px-6 pt-5 pb-4 border-b border-gray-100">
                                                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                                    <Package size={16} className="text-indigo-500" />
                                                    Ressources utilisées dans cet événement
                                                    <span className="ml-1 px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-full text-xs">{editingEventResources.length}</span>
                                                </h4>
                                                <div className="flex gap-3 overflow-x-auto pb-2">
                                                    {editingEventResources.map((res) => {
                                                        const imgUrl = getResourceImageUrl(res.media);
                                                        return (
                                                            <motion.div key={res._id} whileHover={{ scale: 1.03 }} className="flex-shrink-0 w-36 bg-gray-50 rounded-xl overflow-hidden border border-gray-200 hover:shadow-md transition-all cursor-pointer" onClick={() => navigate(`/RessourceDetail/${res._id}`)}>
                                                                <div className="w-full h-24 bg-gray-100 relative">
                                                                    {imgUrl ? (
                                                                        <img src={imgUrl} alt={res.name} className="w-full h-full object-cover"
                                                                            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                                                                    ) : null}
                                                                    <div className={`w-full h-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center absolute inset-0 ${imgUrl ? 'hidden' : 'flex'}`}>
                                                                        <Camera size={20} className="text-indigo-400" />
                                                                    </div>
                                                                </div>
                                                                <div className="p-2">
                                                                    <p className="text-xs font-semibold text-gray-800 truncate">{res.name}</p>
                                                                    <p className="text-xs text-indigo-600 font-bold mt-0.5">{formatPrice(res.price)}</p>
                                                                    <span className="inline-block mt-1 px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px]">{res.category}</span>
                                                                </div>
                                                            </motion.div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* ── Formulaire ── */}
                                        <form onSubmit={handleEditEventSubmit} className="p-6 space-y-4">
                                            {editEventError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-600 text-sm"><AlertCircle size={16} />{editEventError}</div>}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
                                                <input type="text" value={editEventFormData.title} onChange={(e) => setEditEventFormData({ ...editEventFormData, title: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" required />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                                                <textarea value={editEventFormData.description} onChange={(e) => setEditEventFormData({ ...editEventFormData, description: e.target.value })} rows={3} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 resize-none" required />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2"><MapPin size={16} className="text-blue-500" />Lieu *</label>
                                                <input type="text" value={editEventFormData.lieu} onChange={(e) => setEditEventFormData({ ...editEventFormData, lieu: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" required />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie *</label>
                                                    <select value={editEventFormData.category} onChange={(e) => setEditEventFormData({ ...editEventFormData, category: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" required>
                                                        <option value="Mariage">Mariage 💒</option>
                                                        <option value="Conference">Conférence 🎤</option>
                                                        <option value="Anniversaire">Anniversaire 🎂</option>
                                                        <option value="Seminaire">Séminaire 📚</option>
                                                        <option value="autre">Autre 📅</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                                                    <select value={editEventFormData.type} onChange={(e) => setEditEventFormData({ ...editEventFormData, type: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" required>
                                                        <option value="public">Public</option>
                                                        <option value="privé">Privé</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Date début *</label>
                                                    <input type="datetime-local" value={editEventFormData.dateDebut} onChange={(e) => setEditEventFormData({ ...editEventFormData, dateDebut: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" required />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Date fin *</label>
                                                    <input type="datetime-local" value={editEventFormData.dateFin} onChange={(e) => setEditEventFormData({ ...editEventFormData, dateFin: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" required />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de participants</label>
                                                <input type="number" value={editEventFormData.nombreParticipants} onChange={(e) => setEditEventFormData({ ...editEventFormData, nombreParticipants: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" min="0" />
                                            </div>
                                            <div className="pt-4 flex gap-3">
                                                <button type="button" onClick={() => { setShowEditEventModal(false); setEditingEventResources([]); }} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Annuler</button>
                                                <button type="submit" disabled={editEventLoading} className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg disabled:opacity-50 flex items-center justify-center gap-2">
                                                    {editEventLoading ? <><RefreshCw size={16} className="animate-spin" />Modification...</> : <><CheckCircle size={16} />Enregistrer</>}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <style>{`@keyframes shake { 0%, 100% { transform: rotate(0deg); } 10%, 30%, 50%, 70%, 90% { transform: rotate(-5deg); } 20%, 40%, 60%, 80% { transform: rotate(5deg); } } .animate-shake { animation: shake 0.5s ease-in-out; }`}</style>
        </div>
    );
}
import React, { useState, useEffect } from 'react';
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
    Layers, Save, Lock, Zap, Ruler, Palette, Weight, Info, Tag, Plus, Minus
} from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, getDay, addMonths, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from "../components/navbar";
import { useToast } from "../components/useToast";



// Configuration des caractéristiques par catégorie
const resourceFields = {
    salle: [
        { name: "capacity", label: "Capacité (personnes)", type: "number", required: true },
        { name: "surface", label: "Surface (m²)", type: "number" },
        { name: "parking", label: "Parking", type: "boolean" },
        { name: "wifi", label: "Wi-Fi", type: "boolean" },
        { name: "climatisation", label: "Climatisation", type: "boolean" },
        { name: "nombreChaises", label: "Nombre de chaises", type: "number" },
        { name: "nombreTables", label: "Nombre de tables", type: "number" }
    ],
    materiel: [
        { name: "quantite", label: "Quantité par lot", type: "number", required: true },
        { name: "etat", label: "État", type: "text" },
        { name: "couleur", label: "Couleur", type: "text" },
        { name: "matiere", label: "Matière", type: "text" },
        { name: "dimensions", label: "Dimensions", type: "text" }
    ],
    decoration: [
        { name: "type", label: "Type", type: "text" },
        { name: "couleur", label: "Couleur", type: "text" },
        { name: "quantite", label: "Quantité par lot", type: "number" },
        { name: "matiere", label: "Matière", type: "text" }
    ],
    traiteur: [
        { name: "typeCuisine", label: "Type de cuisine", type: "text", required: true },
        { name: "nombrePersonnes", label: "Nombre de personnes", type: "number", required: true },
        { name: "serveursInclus", label: "Serveurs inclus", type: "boolean" }
    ]
};

// Utilitaire : affiche les coordonnées GeoJSON lisiblement
const formatLocation = (location) => {
    if (!location) return 'Lieu non défini';
    if (location?.coordinates?.length === 2) {
        const [lng, lat] = location.coordinates;
        return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
    if (typeof location === 'string' && location.trim()) return location;
    return 'Lieu non défini';
};

export default function ProfilPres() {
    const { toast, showConfirm, ToastProvider } = useToast();
    const [showRequestDetailsModal, setShowRequestDetailsModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDayDetails, setSelectedDayDetails] = useState([]);
    const [showDayDetailsModal, setShowDayDetailsModal] = useState(false);
    const [activeTab, setActiveTab] = useState('resources');
    const [selectedResourceFilter, setSelectedResourceFilter] = useState('all');


    // États pour les données
    const [provider, setProvider] = useState(null);
    const [resources, setResources] = useState([]);
    const [filteredResources, setFilteredResources] = useState([]);
    const [requests, setRequests] = useState([]);

    const [documents, setDocuments] = useState([]);

    // PAR ceci :
    useEffect(() => {
        fetchInvoices();
    }, []);

    const fetchInvoices = async () => {
        try {
            const res = await api.get('/location/invoices/provider');
            const docs = (res.data || []).map(doc => ({
                id: doc.id || doc._id,
                name: doc.name || `Facture_${doc.id}`,
                type: 'pdf',
                size: '—',
                date: doc.date || doc.paymentDate || doc.createdAt,
                status: doc.status || 'validé',
                url: doc.url
            }));
            setDocuments(docs);
        } catch (err) {
            console.error(err);
            toast.error("Erreur chargement factures", "Erreur");
        }
    };
    // États pour les disponibilités
    const [allAvailability, setAllAvailability] = useState([]);
    const [requestsLoading, setRequestsLoading] = useState(false);
    // États pour la modification de ressource
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingResource, setEditingResource] = useState(null);
    const [editFormData, setEditFormData] = useState({
        name: '',
        description: '',
        type: '',
        category: '',
        price: '',
        location: null,
        stock: 1,
        attributes: {},
        customAttributes: []
    });
    const [editLoading, setEditLoading] = useState(false);
    const [editError, setEditError] = useState('');
    const [editAvailabilities, setEditAvailabilities] = useState([]);
    const [editShowAvailabilityForm, setEditShowAvailabilityForm] = useState(false);
    const [editNewAvailability, setEditNewAvailability] = useState({
        start: '',
        end: '',
        status: false
    });

    // États pour les images
    const [editImages, setEditImages] = useState([]);
    const [editNewImages, setEditNewImages] = useState([]);
    const [editImagePreviews, setEditImagePreviews] = useState([]);
    const[editCurrentMonth,setEditCurrentMonth]=useState([]);

    // États pour la gestion des caractéristiques dans la modale
    const [showAttributesModal, setShowAttributesModal] = useState(false);
    const [tempAttributes, setTempAttributes] = useState({});
    const [tempCustomAttributes, setTempCustomAttributes] = useState([]);
    const [newCustomAttrName, setNewCustomAttrName] = useState('');
    const [newCustomAttrValue, setNewCustomAttrValue] = useState('');

    // États pour la modification du profil prestataire
    const [showProfileEditModal, setShowProfileEditModal] = useState(false);
    const [profileFormData, setProfileFormData] = useState({
        firstname: '',

        email: '',
        numTel: '',
        region: ''
    });
    const [profilePasswordData, setProfilePasswordData] = useState({
        password: '',
        confirmPassword: ''
    });
    const [profileImage, setProfileImage] = useState(null);
    const [profileImagePreview, setProfileImagePreview] = useState(null);
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileError, setProfileError] = useState('');
    const [profileSuccess, setProfileSuccess] = useState('');
    const [profileActiveTab, setProfileActiveTab] = useState('info');

    // NOUVEAUX ÉTATS pour la société et la localisation
    const [profileNomSociete, setProfileNomSociete] = useState('');
    const [profileLocationName, setProfileLocationName] = useState('');
    const [profileLocationCoords, setProfileLocationCoords] = useState(null);

    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const userId = user?.id;
    console.log(token);

    const api = axios.create({
        baseURL: 'http://localhost:5000/api',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    // Fonction de géocodage (nom du lieu → coordonnées)
    const geocodeLocation = async (address) => {
        if (!address.trim()) {
            setProfileLocationCoords(null);
            return;
        }
        try {
            const response = await axios.get('https://nominatim.openstreetmap.org/search', {
                params: {
                    q: address,
                    format: 'json',
                    limit: 1,
                    addressdetails: 1
                }
            });
            if (response.data && response.data.length > 0) {
                const { lat, lon } = response.data[0];
                setProfileLocationCoords([parseFloat(lon), parseFloat(lat)]);
            } else {
                setProfileLocationCoords(null);
            }
        } catch (error) {
            console.error('Erreur de géocodage:', error);
            setProfileLocationCoords(null);
        }
    };

    // Debounce pour éviter trop d'appels API
    const handleLocationNameChange = (e) => {
        const value = e.target.value;
        setProfileLocationName(value);
        if (window.geocodeTimeout) clearTimeout(window.geocodeTimeout);
        window.geocodeTimeout = setTimeout(() => geocodeLocation(value), 500);
    };

    const handleRequestClick = (request) => {
        setSelectedRequest(request);
        setShowRequestDetailsModal(true);
    };

    // ==================== Récupération des données ====================
    const fetchProviderData = async () => {
        try {
            setLoading(true);
            const userRes = await api.get(`/users/${userId}`);
            setProvider(userRes.data);
            setProfileFormData({
                firstname: userRes.data.firstname || '',


                email: userRes.data.email || '',
                numTel: userRes.data.numTel || '',
                region: userRes.data.locationName || ''
            });
            setProfileNomSociete(userRes.data.nomSociete || '');
            setProfileLocationName(userRes.data.locationName || '');
            setProfileLocationCoords(userRes.data.location?.coordinates || null);
            const resourcesRes = await api.get('/ressources/res_user');
            setResources(resourcesRes.data);
            setFilteredResources(resourcesRes.data);
            const availabilityList = [];
            resourcesRes.data.forEach(resource => {
                if (resource.availability && resource.availability.length > 0) {
                    resource.availability.forEach(avail => {
                        availabilityList.push({
                            ...avail,
                            resourceId: resource._id,
                            resourceName: resource.name,
                            resourceType: resource.type
                        });
                    });
                }
            });
            setAllAvailability(availabilityList);
        } catch (err) {
            console.error('Erreur lors du chargement:', err);
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

    const fetchRequests = async () => {
        try {
            setRequestsLoading(true);
            const response = await api.get('/location/get_pres');
            const locations = response.data;
            const formattedRequests = locations.map(loc => ({
                id: loc._id,
                resourceName: loc.resource?.name || 'Ressource inconnue',
                resourceId: loc.resource?._id,
                clientName: loc.organisateur ? `${loc.organisateur.firstname} ${loc.organisateur.lastname}` : 'Client inconnu',
                cin: loc.organisateur?.passportOrCid,
                tel: loc.organisateur?.numTel,
                region: loc.organisateur?.region,
                eventName: loc.event?.title || 'Événement inconnu',
                dateDebut: loc.dateDebut,
                dateFin: loc.dateFin,
                status: loc.status === 'acceptée' ? 'confirmé' : loc.status === 'refusée' ? 'refusé' : 'en_attente',
                price: loc.resource?.price || 0,
                message: loc.message || '',
            }));
            formattedRequests.sort((a, b) => new Date(b.dateDebut) - new Date(a.dateDebut));
            setRequests(formattedRequests);
        } catch (err) {
            console.error('Erreur lors du chargement des demandes:', err);
        } finally {
            setRequestsLoading(false);
        }
    };

    useEffect(() => {
        if (!token || !userId) {
            navigate('/login');
            return;
        }
        fetchProviderData();
        fetchRequests();

    }, []);

    // Nettoyage du timeout de géocodage
    useEffect(() => {
        return () => {
            if (window.geocodeTimeout) clearTimeout(window.geocodeTimeout);
        };
    }, []);

    // ==================== Gestion des demandes ====================
    const handleRequestAction = async (requestId, action) => {
        try {
            const newStatus = action === 'accept' ? 'acceptée' : 'refusée';
            await api.put(`/location/update_pres/${requestId}`, { status: newStatus });
            setRequests(prev =>
                prev.map(req =>
                    req.id === requestId
                        ? { ...req, status: action === 'accept' ? 'confirmé' : 'refusé' }
                        : req
                )
            );
            await fetchRequests();
        } catch (err) {
            console.error('Erreur lors de la mise à jour du statut:', err);
            toast.error('Erreur lors de la mise à jour de la demande', "Avertissement");
        }
    };

    // ==================== Gestion des ressources (modification) ====================
    const handleEditResource = (resource) => {
        setEditingResource(resource);
        const attrs = resource.attributes || {};
        if (resource.capacity !== undefined && !attrs.capacity) {
            attrs.capacity = resource.capacity;
        }
        setEditFormData({
            name: resource.name || '',
            description: resource.description || '',
            type: resource.type || 'service',
            category: resource.category || '',
            price: resource.price || '',
            location: resource.location || null,
            stock: resource.stock || 1,
            attributes: attrs,
            customAttributes: resource.customAttributes || []
        });
        const existingImages = (resource.media || []).map(media => ({
            _id: media._id,
            url: media.img_vd?.[0] || media,
            name: media.name || 'Image'
        }));
        setEditImages(existingImages);
        setEditImagePreviews([]);
        setEditNewImages([]);
        const availabilities = (resource.availability || []).map(avail => ({
            id: avail._id,
            start: avail.date_deb,
            end: avail.date_fin,
            status: avail.satut_disp
        }));
        setEditAvailabilities(availabilities);
        setEditCurrentMonth(new Date());
        setShowEditModal(true);
    };

    // Gestion des images
    const handleAddEditImages = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        const newImages = [...editNewImages];
        const newPreviews = [...editImagePreviews];
        files.forEach(file => {
            newImages.push(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                newPreviews.push(reader.result);
                setEditImagePreviews([...newPreviews]);
            };
            reader.readAsDataURL(file);
        });
        setEditNewImages(newImages);
    };

    const handleRemoveEditImage = (imageId, isExisting = true) => {
        if (isExisting) {
            setEditImages(prev => prev.filter(img => img._id !== imageId));
        } else {
            setEditNewImages(prev => prev.filter((_, i) => i !== imageId));
            setEditImagePreviews(prev => prev.filter((_, i) => i !== imageId));
        }
    };

    // Gestion des disponibilités
    const handleAddEditAvailability = () => {
        if (editNewAvailability.start && editNewAvailability.end) {
            setEditAvailabilities([
                ...editAvailabilities,
                {
                    id: `temp_${Date.now()}`,
                    start: editNewAvailability.start,
                    end: editNewAvailability.end,
                    status: false
                }
            ]);
            setEditNewAvailability({ start: '', end: '', status: false });
            setEditShowAvailabilityForm(false);
        }
    };

    const handleRemoveEditAvailability = (index) => {
        setEditAvailabilities(prev => prev.filter((_, i) => i !== index));
    };

    // Gestion des caractéristiques
    const openAttributesModal = () => {
        const currentType = editFormData.category;
        const fields = resourceFields[currentType] || [];
        const newTempAttributes = { ...editFormData.attributes };
        fields.forEach(field => {
            if (!(field.name in newTempAttributes)) {
                if (field.type === 'boolean') newTempAttributes[field.name] = false;
                else newTempAttributes[field.name] = '';
            }
        });
        setTempAttributes(newTempAttributes);
        setTempCustomAttributes(editFormData.customAttributes.map(attr => ({ ...attr })));
        setNewCustomAttrName('');
        setNewCustomAttrValue('');
        setShowAttributesModal(true);
    };

    const addCustomAttribute = () => {
        if (newCustomAttrName.trim() && newCustomAttrValue.trim()) {
            setTempCustomAttributes([
                ...tempCustomAttributes,
                { name: newCustomAttrName.trim(), value: newCustomAttrValue.trim() }
            ]);
            setNewCustomAttrName('');
            setNewCustomAttrValue('');
        }
    };

    const removeCustomAttribute = (index) => {
        setTempCustomAttributes(prev => prev.filter((_, i) => i !== index));
    };

    const updateCustomAttribute = (index, field, value) => {
        const updated = [...tempCustomAttributes];
        updated[index][field] = value;
        setTempCustomAttributes(updated);
    };

    const saveAttributes = () => {
        setEditFormData(prev => ({
            ...prev,
            attributes: tempAttributes,
            customAttributes: tempCustomAttributes
        }));
        setShowAttributesModal(false);
    };

    // Soumission du formulaire de modification
    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setEditLoading(true);
        setEditError('');
        try {
            const formData = new FormData();
            formData.append('name', editFormData.name);
            formData.append('description', editFormData.description);
            formData.append('type', editFormData.type);
            formData.append('category', editFormData.category);
            formData.append('price', editFormData.price);
            formData.append('stock', editFormData.stock || 1);
            formData.append('attributes', JSON.stringify(editFormData.attributes));
            formData.append('customAttributes', JSON.stringify(editFormData.customAttributes));

            if (editFormData.location?.coordinates) {
                formData.append('location', JSON.stringify(editFormData.location));
            } else if (typeof editFormData.location === 'string' && editFormData.location.trim()) {
                formData.append('location', editFormData.location);
            }

            const imagesToKeep = editImages.map(img => img._id).filter(id => id);
            formData.append('imagesToKeep', JSON.stringify(imagesToKeep));
            editNewImages.forEach(image => {
                formData.append('images', image);
            });
            const availabilityData = editAvailabilities.map(avail => ({
                start: avail.start,
                end: avail.end,
                status: avail.status
            }));
            formData.append('availability', JSON.stringify(availabilityData));

            const response = await api.put(`/ressources/modify/${editingResource._id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const updatedResources = resources.map(r =>
                r._id === editingResource._id ? response.data : r
            );
            setResources(updatedResources);
            setFilteredResources(updatedResources);
            setShowEditModal(false);
            setEditingResource(null);
            toast.success('Profil mis à jour', 'Succès');
        } catch (err) {
            console.error('Erreur:', err);
            setEditError(err.response?.data?.message || 'Erreur lors de la modification');
        } finally {
            setEditLoading(false);
        }
    };

    const handleDeleteResource = async (resourceId) => {
        if (window.confirm('Voulez-vous vraiment supprimer cette ressource ?')) {
            try {
                await api.delete(`/ressources/dell/${resourceId}`);
                setResources(prev => prev.filter(r => r._id !== resourceId));
                setFilteredResources(prev => prev.filter(r => r._id !== resourceId));
            } catch (err) {
                console.error('Erreur:', err);
                alert('Erreur lors de la suppression');
            }
        }
    };

    // ==================== Gestion du profil prestataire ====================
    const handleProfileEdit = () => {
        setProfileFormData({
            firstname: provider?.firstname || '',

            email: provider?.email || '',
            numTel: provider?.numTel || '',
            region: provider?.region || ''
        });
        setProfileNomSociete(provider?.nomSociete || '');
        setProfileLocationName(provider?.locationName || '');
        setProfileLocationCoords(provider?.location?.coordinates || null);
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
            formData.append('email', profileFormData.email);
            formData.append('numTel', profileFormData.numTel || '');
            // NOUVEAUX CHAMPS
            if (profileNomSociete) formData.append('nomSociete', profileFormData.firstname);
            if (profileLocationName) formData.append('locationName', profileLocationName);
            if (profileLocationCoords && profileLocationCoords.length === 2) {
                const locationGeoJSON = {
                    type: 'Point',
                    coordinates: profileLocationCoords
                };
                formData.append('location', JSON.stringify(locationGeoJSON));
            }
            if (profilePasswordData.password) {
                formData.append('password', profilePasswordData.password);
            }
            if (profileImage) {
                formData.append('image', profileImage);
            }
            const response = await api.put(`/users/update`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setProvider(response.data);
            setProfileFormData({
                firstname: response.data.firstname || '',
                lastname: response.data.lastname || '',
                email: response.data.email || '',
                numTel: response.data.numTel || '',
                region: response.data.region || ''
            });
            setProfileNomSociete(response.data.nomSociete || '');
            setProfileLocationName(response.data.locationName || '');
            setProfileLocationCoords(response.data.location?.coordinates || null);
            const updatedUser = {
                ...user,
                id: response.data._id,
                firstname: response.data.firstname,
                lastname: response.data.lastname,
                email: response.data.email,
                role: response.data.role,
                image: response.data.image,
                status: response.data.status,
                nomSociete: response.data.nomSociete,
                locationName: response.data.locationName
            };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setProfileSuccess('Profil modifié avec succès !');
            setProfilePasswordData({ password: '', confirmPassword: '' });
            setProfileImage(null);
            setProfileImagePreview(null);
            setTimeout(() => {
                setShowProfileEditModal(false);
                setProfileSuccess('');
            }, 2000);
        } catch (err) {
            console.error('Erreur:', err);
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
            reader.onloadend = () => {
                setProfileImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveProfileImage = () => {
        setProfileImage(null);
        setProfileImagePreview(null);
    };


    // ==================== Gestion du calendrier ====================
    const getAvailabilityForDay = (day) => {
        if (!allAvailability || allAvailability.length === 0) return [];
        const dayStr = format(day, 'yyyy-MM-dd');
        return allAvailability.filter(avail => {
            if (!avail.date_deb || !avail.date_fin) return false;
            try {
                const startStr = format(parseISO(avail.date_deb), 'yyyy-MM-dd');
                const endStr = format(parseISO(avail.date_fin), 'yyyy-MM-dd');
                return dayStr >= startStr && dayStr <= endStr;
            } catch (error) {
                return false;
            }
        });
    };


    const getAvailabilityForDayFiltered = (day) => {
        if (!allAvailability || allAvailability.length === 0) return [];
        let filtered = allAvailability;
        if (selectedResourceFilter !== 'all') {
            filtered = filtered.filter(avail => avail.resourceId === selectedResourceFilter);
        }
        const dayStr = format(day, 'yyyy-MM-dd');
        return filtered.filter(avail => {
            if (!avail.date_deb || !avail.date_fin) return false;
            try {
                const startStr = format(parseISO(avail.date_deb), 'yyyy-MM-dd');
                const endStr = format(parseISO(avail.date_fin), 'yyyy-MM-dd');
                return dayStr >= startStr && dayStr <= endStr;
            } catch (error) {
                return false;
            }
        });
    };

    const getDayAvailabilityStatus = (day) => {
        const dayAvail = getAvailabilityForDayFiltered(day);
        if (dayAvail.length === 0) return null;
        const hasUnavailable = dayAvail.some(a => a.satut_disp === false);
        return hasUnavailable ? 'unavailable' : null;
    };

    const getDayStats = (day) => {
        const dayAvail = getAvailabilityForDay(day);
        const available = dayAvail.filter(a => a.satut_disp === true).length;
        const unavailable = dayAvail.filter(a => a.satut_disp === false).length;
        return { available, unavailable, total: dayAvail.length };
    };

    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const goToToday = () => {
        setCurrentMonth(new Date());
        setSelectedDate(new Date());
    };

    const handleDayClick = (day) => {
        setSelectedDate(day);
        const dayAvailability = getAvailabilityForDay(day);
        const unavailableOnly = dayAvailability.filter(avail => avail.satut_disp === false);
        if (unavailableOnly.length > 0) {
            const groupedByResource = {};
            unavailableOnly.forEach(avail => {
                const resourceId = avail.resourceId;
                if (!groupedByResource[resourceId]) {
                    groupedByResource[resourceId] = {
                        resourceId,
                        resourceName: avail.resourceName,
                        resourceType: avail.resourceType,
                        availabilities: []
                    };
                }
                groupedByResource[resourceId].availabilities.push(avail);
            });
            setSelectedDayDetails(Object.values(groupedByResource));
            setShowDayDetailsModal(true);
        } else {
            setSelectedDayDetails([]);
            setShowDayDetailsModal(true);
        }
    };

    // ==================== Fonctions utilitaires ====================
    const handleGoBack = () => navigate('/');
    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/');
    };

    const formatPrice = (price) => {
        if (!price) return '0 €';
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
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

    const getMonthName = (date) => format(date, 'MMMM yyyy', { locale: fr });
    const getDaysInMonth = () => {
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);
        return eachDayOfInterval({ start, end });
    };

    const pendingRequestsCount = requests.filter(r => r.status === 'en_attente').length;
    const totalDocuments = documents.length;



    const getImageUrl = (imagePath) => {
        if (!imagePath) return null;
        if (imagePath.startsWith("http")) return imagePath;
        const fileName = imagePath.replace(/\\/g, "/").split("/").pop();
        return `http://localhost:5000/uploads/${fileName}`;
    };

    // Filtrage des ressources par recherche
    useEffect(() => {
        if (searchTerm) {
            setFilteredResources(resources.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase())));
        } else {
            setFilteredResources(resources);
        }
    }, [searchTerm, resources]);

    // ==================== Composants d'affichage ====================
    const Tabs = () => (
        <div className="border-b border-gray-200 mb-6 overflow-x-auto">
            <div className="flex space-x-4 sm:space-x-8 min-w-max px-2">
                <button onClick={() => setActiveTab('resources')} className={`pb-4 px-1 flex items-center gap-2 font-medium text-xs sm:text-sm transition-all relative ${activeTab === 'resources' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                    <Package size={16} />
                    <span className="hidden xs:inline">Mes ressources</span>
                    <span className="xs:hidden">Ress.</span>
                    {resources.length > 0 && <span className="bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs">{resources.length}</span>}
                </button>
                <button onClick={() => setActiveTab('documents')} className={`pb-4 px-1 flex items-center gap-2 font-medium text-xs sm:text-sm transition-all relative ${activeTab === 'documents' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                    <FileText size={16} />
                    <span className="hidden xs:inline">Documents</span>
                    <span className="xs:hidden">Docs</span>
                    {documents.filter(d => d.status === 'en_attente').length > 0 && <span className="bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs">{documents.filter(d => d.status === 'en_attente').length}</span>}
                </button>
            </div>
        </div>
    );

    const StatusBadge = ({ status }) => {
        const config = {
            'en_attente': { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: ClockIcon, label: 'En attente' },
            'confirmé': { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircleIcon, label: 'Confirmé' },
            'validé': { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircleIcon, label: 'Validé' },
            'refusé': { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle, label: 'Refusé' }
        };
        const conf = config[status] || config['en_attente'];
        const Icon = conf.icon;
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${conf.bg} ${conf.text}`}>
                <Icon size={12} /> {conf.label}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-gray-50 p-4">
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center w-full max-w-md">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="w-16 h-16 sm:w-20 sm:h-20 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4 sm:mb-6" />
                    <motion.p animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-sm sm:text-base text-gray-600">Chargement de votre profil...</motion.p>
                </motion.div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-gray-50 p-4">
                <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="text-center bg-white p-6 sm:p-10 rounded-2xl sm:rounded-3xl shadow-2xl max-w-md w-full">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                        <AlertCircle size={32} className="sm:w-10 sm:h-10 text-red-600" />
                    </div>
                    <p className="text-red-600 mb-4 sm:mb-6 text-base sm:text-lg">{error}</p>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => window.location.reload()} className="flex items-center justify-center gap-2 w-full px-4 sm:px-6 py-2.5 sm:py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 mx-auto shadow-lg text-sm sm:text-base">
                        <RefreshCw size={16} /> Réessayer
                    </motion.button>
                </motion.div>
            </div>
        );
    }
    if (loading) return (
        <>
            <Navbar />
            <div className="min-h-screen flex items-center justify-center pt-24">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin" />
                    <p className="text-xs text-gray-400">Chargement...</p>
                </div>
            </div>
        </>
    );


    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
            <Navbar />
            {/* Header */}
            <div className="pt-20"></div>
            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6 lg:space-y-8">
                {/* Section Profil + Calendrier */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                    {/* Carte Profil */}
                    <motion.div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-4 sm:p-6 border-gray-100 h-full">
                            <div className="flex flex-col items-center">
                                <motion.div className="relative mb-3 sm:mb-4 cursor-pointer">
                                    <div className="w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 rounded-full overflow-hidden ring-4 ring-blue-100 shadow-lg">
                                        {/* APRÈS */}
                                        {getImageUrl(provider?.image) ? (
                                            <img
                                                src={getImageUrl(provider?.image)}
                                                alt={`${provider?.firstname} ${provider?.lastname}`}
                                                className="w-full h-full object-cover"
                                                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                            />
                                        ) : null}
                                        <div
                                            className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center"
                                            style={{ display: getImageUrl(provider?.image) ? 'none' : 'flex' }}
                                        >
                                            <User size={28} className="sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-white" />
                                        </div>
                                    </div>
                                    <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }} className={`absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 rounded-full border-2 sm:border-4 border-white ${provider?.status === 'valide' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                                </motion.div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 text-center">
                                        {provider?.nomSociete || `${provider?.firstname} ${provider?.lastname}`}
                                    </h2>
                                    <motion.button whileHover={{ scale: 1.1, rotate: 15 }} whileTap={{ scale: 0.9 }} onClick={handleProfileEdit} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Modifier le profil"><Edit2 size={16} /></motion.button>
                                </div>
                                <p className="text-sm sm:text-base text-blue-600 font-medium flex items-center gap-1 mt-0.5 sm:mt-1"><Award size={14} className="sm:w-4 sm:h-4" /> Prestataire</p>
                                <div className="w-full mt-4 sm:mt-6 space-y-2 sm:space-y-3">
                                    <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg sm:rounded-xl hover:bg-blue-50 transition-colors group">
                                        <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors"><Mail size={14} className="sm:w-4 sm:h-4 text-blue-600" /></div>
                                        <span className="text-xs sm:text-sm text-gray-600 group-hover:text-gray-900 truncate">{provider?.email}</span>
                                    </div>
                                    <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg sm:rounded-xl hover:bg-green-50 transition-colors group">
                                        <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors"><Phone size={14} className="sm:w-4 sm:h-4 text-green-600" /></div>
                                        <span className="text-xs sm:text-sm text-gray-600 group-hover:text-gray-900 truncate">{provider?.numTel || 'Non renseigné'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg sm:rounded-xl hover:bg-purple-50 transition-colors group">
                                        <div className="p-1.5 sm:p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors"><MapPin size={14} className="sm:w-4 sm:h-4 text-purple-600" /></div>
                                        <span className="text-xs sm:text-sm text-gray-600 group-hover:text-gray-900 truncate">{provider?.locationName || 'Localisation non renseignée'}</span>
                                    </div>
                                </div>
                                <div className="w-full grid grid-cols-3 gap-1 sm:gap-2 mt-4 sm:mt-6">
                                    <motion.div whileHover={{ scale: 1.05 }} className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg sm:rounded-xl p-1.5 sm:p-2 text-center cursor-pointer"><p className="text-base sm:text-lg font-bold text-purple-600">{resources.length}</p><p className="text-[10px] sm:text-xs text-gray-600">Ressources</p></motion.div>
                                    <motion.div whileHover={{ scale: 1.05 }} className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg sm:rounded-xl p-1.5 sm:p-2 text-center cursor-pointer"><p className="text-base sm:text-lg font-bold text-yellow-600">{pendingRequestsCount}</p><p className="text-[10px] sm:text-xs text-gray-600">Demandes</p></motion.div>
                                    <motion.div whileHover={{ scale: 1.05 }} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg sm:rounded-xl p-1.5 sm:p-2 text-center cursor-pointer"><p className="text-base sm:text-lg font-bold text-blue-600">{totalDocuments}</p><p className="text-[10px] sm:text-xs text-gray-600">Documents</p></motion.div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Calendrier */}
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-2">

                        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-4 sm:p-6 border border-gray-100 hover:shadow-2xl transition-all duration-300">

                            <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-3 mb-4 sm:mb-6">

                                <div className="flex items-center gap-2"><div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg"><CalendarIcon className="text-blue-600" size={18} /></div><h3 className="text-base sm:text-lg font-semibold text-gray-900">Disponibilités des ressources</h3></div>
                                <div className="flex items-center gap-2 w-full xs:w-auto">
                                    <select value={selectedResourceFilter} onChange={(e) => setSelectedResourceFilter(e.target.value)} className="px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"><option value="all">Toutes les ressources</option>{resources.map(r => (<option key={r._id} value={r._id}>{r.name}</option>))}</select>
                                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={goToToday} className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:shadow-lg transition-all flex items-center justify-center gap-1 group"><Home size={14} className="group-hover:rotate-12 transition-transform" /><span>Aujourd'hui</span></motion.button>
                                    <div className="flex gap-1 bg-gray-100 rounded-lg p-1"><motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={prevMonth} className="p-1.5 sm:p-2 bg-white rounded-lg hover:bg-gray-200 shadow-sm transition-all"><ChevronLeft size={16} /></motion.button><motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={nextMonth} className="p-1.5 sm:p-2 bg-white rounded-lg hover:bg-gray-200 shadow-sm transition-all"><ChevronRight size={16} /></motion.button></div>
                                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate('/add-resource')} className="hidden sm:flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg hover:shadow-xl text-xs sm:text-sm font-medium group">
                                        <PlusCircle size={16} className="group-hover:rotate-90 transition-transform" />
                                        <span className="hidden md:inline">Nouvelle ressource</span>
                                        <span className="md:hidden">Nouveau</span>
                                    </motion.button>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 mb-4 text-xs"><div className="flex items-center gap-2"><div className="w-3 h-3 bg-white border border-gray-300 rounded-full"></div><span className="text-gray-600">Pas d'indisponibilité</span></div><div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded-full"></div><span className="text-gray-600">Indisponibilité(s)</span></div><div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500 rounded-full"></div><span className="text-gray-600">Jour sélectionné</span></div><div className="flex items-center gap-2"><Layers size={14} className="text-gray-500" /><span className="text-gray-600">Plusieurs ressources</span></div></div>
                            <motion.h4 key={currentMonth.toString()} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center font-semibold text-gray-700 mb-3 sm:mb-4 text-sm sm:text-base bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{getMonthName(currentMonth)}</motion.h4>
                            <div className="grid grid-cols-7 gap-1 mb-2">{['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (<div key={day} className="text-center text-xs sm:text-sm font-medium text-gray-500 py-1 sm:py-2">{day}</div>))}</div>
                            <div className="grid grid-cols-7 gap-1">
                                {Array.from({ length: (getDay(startOfMonth(currentMonth)) + 6) % 7 }).map((_, i) => (<div key={`empty-${i}`} className="p-1 sm:p-3" />))}
                                {getDaysInMonth().map((day, index) => {
                                    const availabilityStatus = getDayAvailabilityStatus(day);
                                    const isSelected = isSameDay(day, selectedDate);
                                    const isTodayDate = isToday(day);
                                    const stats = getDayStats(day);
                                    const unavailableCount = stats.unavailable;
                                    return (
                                        <motion.button key={index} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => handleDayClick(day)} className={`relative p-1.5 sm:p-3 rounded-lg sm:rounded-xl transition-all text-xs sm:text-sm font-medium ${isSelected ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg scale-105' : ''} ${!isSelected && availabilityStatus === 'unavailable' ? 'bg-red-100 hover:bg-red-200 text-red-800' : ''} ${!isSelected && !availabilityStatus && isTodayDate ? 'ring-2 ring-blue-400 bg-blue-50' : ''} ${!isSelected && !availabilityStatus && !isTodayDate ? 'hover:bg-gray-100 bg-white' : ''}`}>
                                            <span>{format(day, 'd')}</span>
                                            {unavailableCount > 0 && (<div className="absolute -top-1 -right-1"><span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-medium text-white">{unavailableCount}</span></div>)}
                                        </motion.button>
                                    );
                                })}
                            </div>
                        </div>

                    </motion.div>
                </div>

                {/* Onglets */}
                <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-4 sm:p-6 border border-gray-100">
                    <Tabs />
                    <AnimatePresence mode="wait">
                        {activeTab === 'resources' && (
                            <motion.div key="resources" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
                                <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-3 mb-4 sm:mb-6">
                                    <h2 className="text-base sm:text-xl font-bold text-gray-900 flex items-center gap-2"><Package size={20} className="text-purple-600" /> Mes ressources</h2>
                                    <div className="relative w-full xs:w-64"><Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" /><input type="text" placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200" /></div>
                                </div>
                                {filteredResources.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {filteredResources.map((resource, index) => (
                                            <motion.div key={resource._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} whileHover={{ y: -5 }} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-xl transition-all group">
                                                <div className="relative h-40 bg-gray-100">
                                                    {resource.media && resource.media.length > 0 && resource.media[0]?.img_vd ? (
                                                        <img src={`http://localhost:5000/${resource.media[0].img_vd[0]}`} alt={resource.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center"><ImageIcon size={40} className="text-gray-400" /></div>
                                                    )}
                                                    <div className="absolute top-2 right-2"><span className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full">{resource.category}</span></div>
                                                </div>
                                                <div className="p-4">
                                                    <h3 className="font-semibold text-gray-900 mb-2 truncate">{resource.name}</h3>
                                                    <div className="flex items-center justify-between mb-3">
                                                        <span className="text-lg font-bold text-blue-600">{formatPrice(resource.price)}</span>
                                                        <span className="text-sm text-gray-500 flex items-center gap-1">
                                                            <MapPin size={12} className="text-gray-400" />
                                                            {formatLocation(resource.location)}
                                                        </span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => handleEditResource(resource)} className="flex-1 flex items-center justify-center gap-1 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-all"><Edit2 size={14} /> Modifier</motion.button>
                                                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => handleDeleteResource(resource._id)} className="flex-1 flex items-center justify-center gap-1 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-all"><Trash2 size={14} /> Supprimer</motion.button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                ) : (<div className="text-center py-12"><Package size={48} className="mx-auto mb-4 text-gray-300" /><p className="text-gray-500 mb-4">Aucune ressource trouvée</p><motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate('/add-resource')} className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg hover:shadow-xl">Ajouter une ressource</motion.button></div>)}
                            </motion.div>
                        )}
                        {activeTab === 'documents' && (
                            <motion.div key="documents" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>

                                <div className="flex items-center justify-between gap-3 mb-4">
                                    <h2 className="text-base sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                                        <FileText size={20} className="text-blue-600" /> Mes documents
                                    </h2>
                                </div>

                                {documents.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-gray-200">
                                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Nom</th>
                                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Date</th>
                                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Statut</th>
                                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {documents.map((doc, index) => (
                                                    <motion.tr key={doc.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: index * 0.05 }}
                                                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                                        <td className="py-3 px-4">
                                                            <div className="flex items-center gap-2">
                                                                <FileText size={16} className="text-red-500" />
                                                                <span className="text-sm font-medium text-gray-900">{doc.name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4 text-sm text-gray-600">{formatDate(doc.date)}</td>
                                                        <td className="py-3 px-4"><StatusBadge status={doc.status} /></td>
                                                        <td className="py-3 px-4">
                                                            <div className="flex items-center gap-2">
                                                                {doc.url ? (
                                                                    <>
                                                                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                                                            onClick={() => window.open(`http://localhost:5000/${doc.url}`, '_blank')}
                                                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-1 text-xs">
                                                                            <Eye size={14} /> Voir
                                                                        </motion.button>
                                                                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                                                            onClick={() => {
                                                                                const link = document.createElement('a');
                                                                                link.href = `http://localhost:5000/${doc.url}`;
                                                                                link.download = doc.name;
                                                                                link.click();
                                                                            }}
                                                                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg flex items-center gap-1 text-xs">
                                                                            <Download size={14} /> Télécharger
                                                                        </motion.button>
                                                                    </>
                                                                ) : (
                                                                    <span className="text-xs text-gray-400 italic">En génération...</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </motion.tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <FileText size={48} className="mx-auto mb-4 text-gray-300" />
                                        <p className="text-gray-500">Aucune facture disponible</p>
                                        <p className="text-sm text-gray-400 mt-1">Les factures apparaissent après paiement d'une réservation</p>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Modale de détails de demande */}
                <AnimatePresence>
                    {showRequestDetailsModal && selectedRequest && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 flex items-center justify-center z-50 p-3 sm:p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowRequestDetailsModal(false)}>
                            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden mx-3 sm:mx-4" onClick={(e) => e.stopPropagation()}>
                                <div className="p-4 sm:p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                                    <div className="flex justify-between items-center"><div className="flex items-center gap-3"><div className="p-2 bg-blue-100 rounded-xl"><FileText size={20} className="text-blue-600" /></div><h3 className="text-lg sm:text-xl font-bold text-gray-900">Détails de la demande</h3></div><motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={() => setShowRequestDetailsModal(false)} className="p-1.5 sm:p-2 hover:bg-white rounded-lg transition-all"><X size={18} className="sm:w-5 sm:h-5 text-gray-500" /></motion.button></div>
                                    <p className="text-xs sm:text-sm text-gray-500 mt-2">Informations complètes sur la réservation</p>
                                </div>
                                <div className="p-4 sm:p-6 space-y-4 overflow-y-auto max-h-[60vh]">
                                    <div className="flex items-center justify-between"><span className="text-sm font-medium text-gray-500">Statut</span><StatusBadge status={selectedRequest.status} /></div>
                                    <div className="border-t border-gray-100 pt-3"><div className="flex items-start gap-3"><div className="p-2 bg-purple-100 rounded-lg"><Package size={16} className="text-purple-600" /></div><div><p className="text-xs text-gray-500">Ressource</p><p className="font-semibold text-gray-900">{selectedRequest.resourceName}</p><p className="text-xs text-gray-500 mt-1">ID: {selectedRequest.resourceId}</p></div></div></div>
                                    <div className="border-t border-gray-100 pt-3"><div className="flex items-start gap-3"><div className="p-2 bg-green-100 rounded-lg"><User size={16} className="text-green-600" /></div><div><p className="text-xs text-gray-500">Client</p><p className="font-semibold text-gray-900">{selectedRequest.clientName}</p></div></div></div>
                                    <div className="border-t border-gray-100 pt-3"><div className="flex items-start gap-3"><div className="p-2 bg-green-100 rounded-lg"><User size={16} className="text-green-600" /></div><div><p className="text-xs text-gray-500">Cin/Passport</p><p className="font-semibold text-gray-900">{selectedRequest.cin}</p></div></div></div>
                                    <div className="border-t border-gray-100 pt-3"><div className="flex items-start gap-3"><div className="p-2 bg-green-100 rounded-lg"><User size={16} className="text-green-600" /></div><div><p className="text-xs text-gray-500">Région</p><p className="font-semibold text-gray-900">{selectedRequest.region}</p></div></div></div>
                                    <div className="border-t border-gray-100 pt-3"><div className="flex items-start gap-3"><div className="p-2 bg-green-100 rounded-lg"><User size={16} className="text-green-600" /></div><div><p className="text-xs text-gray-500">Téléphone</p><p className="font-semibold text-gray-900">{selectedRequest.tel}</p></div></div></div>
                                    <div className="border-t border-gray-100 pt-3"><div className="flex items-start gap-3"><div className="p-2 bg-orange-100 rounded-lg"><Clock size={16} className="text-orange-600" /></div><div><p className="text-xs text-gray-500">Période</p><p className="font-semibold text-gray-900">{formatDate(selectedRequest.dateDebut)}</p><p className="text-sm text-gray-600">De {formatTime(selectedRequest.dateDebut)} à {formatTime(selectedRequest.dateFin)}</p></div></div></div>
                                    <div className="border-t border-gray-100 pt-3"><div className="flex items-start gap-3"><div className="p-2 bg-red-100 rounded-lg"><Euro size={16} className="text-red-600" /></div><div><p className="text-xs text-gray-500">Prix total</p><p className="text-2xl font-bold text-blue-600">{formatPrice(selectedRequest.price)}</p></div></div></div>
                                </div>
                                <div className="p-4 sm:p-6 border-t border-gray-100 bg-gray-50"><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowRequestDetailsModal(false)} className="w-full py-2 sm:py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg sm:rounded-xl font-medium text-xs sm:text-sm hover:shadow-lg transition-all">Fermer</motion.button></div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* MODALE DE MODIFICATION DE RESSOURCE */}
                <AnimatePresence>
                    {showEditModal && editingResource && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 flex items-center justify-center z-50 p-3 sm:p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowEditModal(false)}>
                            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col mx-2 sm:mx-4" onClick={(e) => e.stopPropagation()}>
                                {/* En-tête fixe */}
                                <div className="p-3 sm:p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 flex-shrink-0">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2 sm:gap-3">
                                            <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg sm:rounded-xl">
                                                <Edit2 size={18} className="sm:w-5 sm:h-5 text-blue-600" />
                                            </div>
                                            <h3 className="text-base sm:text-xl font-bold text-gray-900">Modifier la ressource</h3>
                                        </div>
                                        <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={() => setShowEditModal(false)} className="p-1.5 sm:p-2 hover:bg-white rounded-lg transition-all">
                                            <X size={18} className="sm:w-5 sm:h-5 text-gray-500" />
                                        </motion.button>
                                    </div>
                                    <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2 truncate">Modifiez les informations de "{editingResource.name}"</p>
                                </div>

                                {/* Contenu avec scroll */}
                                <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
                                    {/* Colonne gauche - Formulaire */}
                                    <div className="w-full lg:w-1/2 p-3 sm:p-6 border-b lg:border-b-0 lg:border-r border-gray-200 overflow-y-auto max-h-[60vh] lg:max-h-[70vh]">
                                        <form onSubmit={handleEditSubmit} className="space-y-3 sm:space-y-4">
                                            {editError && (
                                                <div className="p-2 sm:p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-600 text-xs sm:text-sm">
                                                    <AlertCircle size={14} className="sm:w-4 sm:h-4" />
                                                    <span className="flex-1">{editError}</span>
                                                </div>
                                            )}

                                            <div>
                                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Nom *</label>
                                                <input type="text" value={editFormData.name} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} className="w-full px-3 sm:px-4 py-1.5 sm:py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200" required />
                                            </div>

                                            <div>
                                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Description *</label>
                                                <textarea value={editFormData.description} onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })} rows={3} className="w-full px-3 sm:px-4 py-1.5 sm:py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-none" required />
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                                <div>
                                                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Type *</label>
                                                    <select value={editFormData.type} onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value })} className="w-full px-3 sm:px-4 py-1.5 sm:py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" required>
                                                        <option value="product">Produit</option>
                                                        <option value="service">Service</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Catégorie *</label>
                                                    <select value={editFormData.category} onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })} className="w-full px-3 sm:px-4 py-1.5 sm:py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" required>
                                                        <option value="salle">Salle</option>
                                                        <option value="materiel">Matériel</option>
                                                        <option value="decoration">Décoration</option>
                                                        <option value="traiteur">Traiteur</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                                <div>
                                                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Prix (€) *</label>
                                                    <input type="number" value={editFormData.price} onChange={(e) => setEditFormData({ ...editFormData, price: e.target.value })} className="w-full px-3 sm:px-4 py-1.5 sm:py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" required />
                                                </div>
                                                <div>
                                                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Localisation</label>
                                                    {editFormData.location?.coordinates ? (
                                                        <div className="px-3 py-1.5 sm:py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500 flex items-center gap-1">
                                                            <MapPin size={12} className="text-gray-400 flex-shrink-0" />
                                                            <span className="font-mono truncate">
                                                                {editFormData.location.coordinates[1].toFixed(4)}, {editFormData.location.coordinates[0].toFixed(4)}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <input
                                                            type="text"
                                                            value={editFormData.location || ''}
                                                            onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                                                            className="w-full px-3 sm:px-4 py-1.5 sm:py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                                                            placeholder="Ville, adresse..."
                                                        />
                                                    )}
                                                </div>
                                            </div>

                                            {editFormData.type === "product" && (
                                                <div>
                                                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Stock disponible *</label>
                                                    <input type="number" value={editFormData.stock || 1} onChange={(e) => setEditFormData({ ...editFormData, stock: parseInt(e.target.value) || 1 })} min="0" className="w-full px-3 sm:px-4 py-1.5 sm:py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200" required />
                                                    <p className="text-[10px] sm:text-xs text-gray-400 mt-1">Quantité disponible pour les organisateurs</p>
                                                </div>
                                            )}

                                            {/* Caractéristiques */}
                                            <div className="border-t border-gray-200 pt-3">
                                                <div className="flex items-center justify-between">
                                                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Caractéristiques</label>
                                                    <button type="button" onClick={openAttributesModal} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
                                                        <Edit2 size={12} /> Ajouter / Modifier
                                                    </button>
                                                </div>
                                                <div className="mt-2 bg-gray-50 rounded-lg p-3 text-sm">
                                                    {Object.keys(editFormData.attributes).length === 0 && editFormData.customAttributes.length === 0 ? (
                                                        <p className="text-gray-500 text-xs">Aucune caractéristique définie</p>
                                                    ) : (
                                                        <ul className="space-y-1">
                                                            {resourceFields[editFormData.category]?.map(field => {
                                                                const value = editFormData.attributes[field.name];
                                                                if (value === undefined || value === '') return null;
                                                                return (
                                                                    <li key={field.name} className="flex items-start gap-2">
                                                                        <span className="text-gray-400">•</span>
                                                                        <span><span className="font-medium">{field.label || field.name}</span> : {typeof value === 'boolean' ? (value ? 'Oui' : 'Non') : value}</span>
                                                                    </li>
                                                                );
                                                            })}
                                                            {editFormData.customAttributes.map((attr, idx) => (
                                                                <li key={idx} className="flex items-start gap-2">
                                                                    <span className="text-gray-400">•</span>
                                                                    <span><span className="font-medium">{attr.name}</span> : {attr.value}</span>
                                                                </li>
                                                            ))}
                                                            {Object.entries(editFormData.attributes)
                                                                .filter(([key]) => !resourceFields[editFormData.category]?.some(f => f.name === key))
                                                                .map(([key, value]) => (
                                                                    <li key={key} className="flex items-start gap-2">
                                                                        <span className="text-gray-400">•</span>
                                                                        <span><span className="font-medium">{key}</span> : {typeof value === 'boolean' ? (value ? 'Oui' : 'Non') : value}</span>
                                                                    </li>
                                                                ))}
                                                        </ul>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="pt-3 sm:pt-4 flex flex-col sm:flex-row gap-2 sm:gap-3">
                                                <button type="button" onClick={() => setShowEditModal(false)} className="order-2 sm:order-1 flex-1 px-3 sm:px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-sm">Annuler</button>
                                                <button type="submit" disabled={editLoading} className="order-1 sm:order-2 flex-1 px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
                                                    {editLoading ? <><RefreshCw size={16} className="animate-spin" /> Modification...</> : <><CheckCircle size={16} /> Enregistrer</>}
                                                </button>
                                            </div>
                                        </form>
                                    </div>

                                    {/* Colonne droite - Images et Disponibilités */}
                                    <div className="w-full lg:w-1/2 p-3 sm:p-6 overflow-y-auto max-h-[60vh] lg:max-h-[70vh]">
                                        {/* Section Images */}
                                        <div className="mb-4 sm:mb-6">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                                                <div className="flex items-center gap-2">
                                                    <ImageIcon size={16} className="sm:w-[18px] sm:h-[18px] text-purple-600" />
                                                    <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Images</h4>
                                                </div>
                                                <label className="cursor-pointer inline-flex items-center justify-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-700 transition-all w-fit">
                                                    <Camera size={12} className="sm:w-4 sm:h-4" />
                                                    <span>Ajouter des images</span>
                                                    <input type="file" multiple accept="image/*" onChange={handleAddEditImages} className="hidden" />
                                                </label>
                                            </div>
                                            {editImages.length > 0 && (
                                                <div className="mb-3">
                                                    <p className="text-xs text-gray-500 mb-2">Images actuelles</p>
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                        {editImages.map((img, idx) => (
                                                            <div key={img._id} className="relative group">
                                                                <img src={`http://localhost:5000/${img.url}`} alt={`Image ${idx + 1}`} className="w-full h-20 sm:h-24 object-cover rounded-lg border border-gray-200" />
                                                                <button onClick={() => handleRemoveEditImage(img._id, true)} className="absolute -top-1 -right-1 p-0.5 sm:p-1 bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"><X size={12} className="sm:w-3 sm:h-3" /></button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {editImagePreviews.length > 0 && (
                                                <div>
                                                    <p className="text-xs text-gray-500 mb-2">Nouvelles images à ajouter</p>
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                        {editImagePreviews.map((preview, idx) => (
                                                            <div key={idx} className="relative group">
                                                                <img src={preview} alt={`Nouvelle ${idx + 1}`} className="w-full h-20 sm:h-24 object-cover rounded-lg border border-green-200" />
                                                                <button onClick={() => handleRemoveEditImage(idx, false)} className="absolute -top-1 -right-1 p-0.5 sm:p-1 bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"><X size={12} className="sm:w-3 sm:h-3" /></button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {editImages.length === 0 && editImagePreviews.length === 0 && (
                                                <div className="text-center py-4 sm:py-6 bg-gray-50 rounded-lg">
                                                    <ImageIcon size={32} className="mx-auto mb-2 text-gray-400" />
                                                    <p className="text-xs text-gray-500">Aucune image</p>
                                                    <p className="text-[10px] text-gray-400">Cliquez sur "Ajouter des images"</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Section Disponibilités */}
                                        <div className="border-t border-gray-200 pt-4 sm:pt-6">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                                                <div className="flex items-center gap-2">
                                                    <ClockIcon size={16} className="sm:w-[18px] sm:h-[18px] text-blue-600" />
                                                    <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Disponibilités</h4>
                                                </div>
                                                <button onClick={() => setEditShowAvailabilityForm(true)} className="inline-flex items-center justify-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-all w-fit"><PlusCircle size={12} className="sm:w-4 sm:h-4" /> Ajouter</button>
                                            </div>
                                            {editShowAvailabilityForm && (
                                                <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-gray-50 rounded-lg border border-gray-200">
                                                    <div className="space-y-2 sm:space-y-3">
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div><label className="block text-[10px] sm:text-xs text-gray-600 mb-1">Date début</label><input type="datetime-local" value={editNewAvailability.start} onChange={(e) => setEditNewAvailability({ ...editNewAvailability, start: e.target.value })} className="w-full px-2 py-1 text-xs sm:text-sm border border-gray-200 rounded-lg" /></div>
                                                            <div><label className="block text-[10px] sm:text-xs text-gray-600 mb-1">Date fin</label><input type="datetime-local" value={editNewAvailability.end} onChange={(e) => setEditNewAvailability({ ...editNewAvailability, end: e.target.value })} className="w-full px-2 py-1 text-xs sm:text-sm border border-gray-200 rounded-lg" /></div>
                                                        </div>
                                                        <div><label className="block text-[10px] sm:text-xs text-gray-600 mb-1">Statut</label><div className="w-full px-2 py-1 text-xs sm:text-sm border border-gray-200 rounded-lg bg-gray-100 text-gray-500">Indisponible</div></div>
                                                        <div className="flex gap-2"><button onClick={handleAddEditAvailability} className="flex-1 px-2 py-1.5 bg-blue-600 text-white text-xs sm:text-sm rounded-lg hover:bg-blue-700">Ajouter</button><button onClick={() => setEditShowAvailabilityForm(false)} className="px-2 py-1.5 border border-gray-300 text-gray-600 text-xs sm:text-sm rounded-lg hover:bg-gray-50">Annuler</button></div>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="space-y-2 max-h-48 sm:max-h-64 overflow-y-auto">
                                                <p className="text-[10px] sm:text-xs text-gray-500 mb-2">{editAvailabilities.length} disponibilité(s)</p>
                                                {editAvailabilities.map((avail, index) => (
                                                    <div key={index} className="p-2 bg-gray-50 rounded-lg border border-gray-200">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-1 sm:gap-2 mb-0.5 sm:mb-1">
                                                                    {avail.status ? <CheckCircle size={10} className="sm:w-3 sm:h-3 text-green-600" /> : <XCircle size={10} className="sm:w-3 sm:h-3 text-red-600" />}
                                                                    <span className={`text-[10px] sm:text-xs font-medium ${avail.status ? 'text-green-700' : 'text-red-700'}`}>{avail.status ? 'Disponible' : 'Indisponible'}</span>
                                                                </div>
                                                                <p className="text-[8px] sm:text-[10px] text-gray-500 truncate">{format(parseISO(avail.start), 'dd/MM/yyyy HH:mm')} - {format(parseISO(avail.end), 'dd/MM/yyyy HH:mm')}</p>
                                                            </div>
                                                            <button onClick={() => handleRemoveEditAvailability(index)} className="p-1 text-red-500 hover:bg-red-50 rounded-lg flex-shrink-0"><Trash2 size={12} className="sm:w-3.5 sm:h-3.5" /></button>
                                                        </div>
                                                    </div>
                                                ))}
                                                {editAvailabilities.length === 0 && (
                                                    <div className="text-center py-3 sm:py-4 text-gray-400"><Clock size={24} className="sm:w-8 sm:h-8 mx-auto mb-1 opacity-50" /><p className="text-[10px] sm:text-xs">Aucune disponibilité</p><p className="text-[8px] sm:text-[10px]">Cliquez sur "Ajouter"</p></div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* MODALE D'ÉDITION DES CARACTÉRISTIQUES */}
                <AnimatePresence>
                    {showAttributesModal && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowAttributesModal(false)}>
                            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                                <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50 flex justify-between items-center flex-shrink-0">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">Caractéristiques</h3>
                                        <p className="text-xs text-purple-600 mt-0.5">
                                            {editFormData.category === 'salle' ? 'Salle' : editFormData.category === 'materiel' ? 'Matériel' : editFormData.category === 'decoration' ? 'Décoration' : 'Traiteur'}
                                        </p>
                                    </div>
                                    <button onClick={() => setShowAttributesModal(false)} className="p-1 hover:bg-white rounded-lg transition"><X size={20} /></button>
                                </div>
                                <div className="p-4 overflow-y-auto flex-1 space-y-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-3">Attributs spécifiques</label>
                                        <div className="space-y-3">
                                            {(resourceFields[editFormData.category] || []).length === 0 ? (
                                                <p className="text-sm text-gray-400 italic">Aucun attribut standard pour cette catégorie.</p>
                                            ) : (
                                                resourceFields[editFormData.category].map(field => (
                                                    <div key={field.name} className="flex flex-col sm:flex-row sm:items-center gap-2">
                                                        <span className="text-sm text-gray-600 w-36 flex-shrink-0">{field.label}{field.required && <span className="text-red-500 ml-1">*</span>}</span>
                                                        {field.type === 'boolean' ? (
                                                            <select value={tempAttributes[field.name] === true ? 'true' : 'false'} onChange={(e) => setTempAttributes({ ...tempAttributes, [field.name]: e.target.value === 'true' })} className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-200 focus:border-purple-400">
                                                                <option value="true">Oui</option>
                                                                <option value="false">Non</option>
                                                            </select>
                                                        ) : (
                                                            <input type={field.type === 'number' ? 'number' : 'text'} value={tempAttributes[field.name] ?? ''} onChange={(e) => setTempAttributes({ ...tempAttributes, [field.name]: e.target.value })} className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-200 focus:border-purple-400" placeholder={field.label} required={field.required} />
                                                        )}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                    <div className="border-t border-gray-100 pt-4">
                                        <label className="block text-sm font-semibold text-gray-700 mb-3">Attributs personnalisés</label>
                                        {tempCustomAttributes.length > 0 && (
                                            <div className="space-y-2 mb-3">
                                                {tempCustomAttributes.map((attr, idx) => (
                                                    <div key={idx} className="flex items-center gap-2">
                                                        <input type="text" value={attr.name} onChange={(e) => updateCustomAttribute(idx, 'name', e.target.value)} className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Nom" />
                                                        <input type="text" value={attr.value} onChange={(e) => updateCustomAttribute(idx, 'value', e.target.value)} className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Valeur" />
                                                        <button onClick={() => removeCustomAttribute(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 size={16} /></button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2">
                                            <input type="text" value={newCustomAttrName} onChange={(e) => setNewCustomAttrName(e.target.value)} className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Nom (ex: Matière)" />
                                            <input type="text" value={newCustomAttrValue} onChange={(e) => setNewCustomAttrValue(e.target.value)} className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Valeur (ex: Bois)" />
                                            <button onClick={addCustomAttribute} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"><PlusCircle size={20} /></button>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 flex-shrink-0">
                                    <button onClick={() => setShowAttributesModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition">Annuler</button>
                                    <button onClick={saveAttributes} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition shadow-sm">Enregistrer</button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* MODALE DE MODIFICATION DU PROFIL PRESTATAIRE (MODIFIÉE) */}
                <AnimatePresence>
                    {showProfileEditModal && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 flex items-center justify-center z-50 p-3 sm:p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowProfileEditModal(false)}>
                            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden mx-3 sm:mx-4" onClick={(e) => e.stopPropagation()}>
                                <div className="p-4 sm:p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-100 rounded-xl"><User size={20} className="text-blue-600" /></div>
                                            <h3 className="text-lg sm:text-xl font-bold text-gray-900">Modifier mon profil</h3>
                                        </div>
                                        <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={() => setShowProfileEditModal(false)} className="p-1.5 sm:p-2 hover:bg-white rounded-lg sm:rounded-xl transition-all"><X size={18} className="sm:w-5 sm:h-5 text-gray-500" /></motion.button>
                                    </div>
                                    <p className="text-xs sm:text-sm text-gray-500 mt-2">Modifiez vos informations personnelles</p>
                                </div>
                                <div className="flex border-b border-gray-200 px-4 sm:px-6">
                                    <button onClick={() => setProfileActiveTab('info')} className={`py-3 px-4 text-sm font-medium transition-all relative flex items-center gap-2 ${profileActiveTab === 'info' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}><User size={16} /> Informations</button>
                                    <button onClick={() => setProfileActiveTab('password')} className={`py-3 px-4 text-sm font-medium transition-all relative flex items-center gap-2 ${profileActiveTab === 'password' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}><Lock size={16} /> Sécurité</button>
                                </div>
                                <form onSubmit={handleProfileSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto max-h-[60vh]">
                                    {profileError && (<div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-600 text-sm"><AlertCircle size={16} /> {profileError}</div>)}
                                    {profileSuccess && (<div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-600 text-sm"><CheckCircle size={16} /> {profileSuccess}</div>)}
                                    {profileActiveTab === 'info' && (
                                        <>
                                            <div className="flex flex-col items-center mb-4">
                                                <div className="relative">
                                                    <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-blue-100 shadow-lg bg-gray-100">
                                                        {/* APRÈS */}
                                                        {profileImagePreview ? (
                                                            <img src={profileImagePreview} alt="Aperçu" className="w-full h-full object-cover" />
                                                        ) : getImageUrl(provider?.image) ? (
                                                            <img
                                                                src={getImageUrl(provider?.image)}
                                                                alt={provider?.firstname}
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => { e.target.style.display = 'none'; }}
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                                                                <User size={32} className="text-white" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <label className="absolute bottom-0 right-0 p-1 bg-blue-600 rounded-full cursor-pointer hover:bg-blue-700">
                                                        <Camera size={16} className="text-white" />
                                                        <input type="file" accept="image/*" onChange={handleProfileImageChange} className="hidden" />
                                                    </label>
                                                    {profileImagePreview && (
                                                        <button type="button" onClick={handleRemoveProfileImage} className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white hover:bg-red-600">
                                                            <X size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500 mt-2">Cliquez sur l'icône caméra pour changer la photo</p>
                                            </div>

                                            {/* Nom de la société */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la société *</label>

                                                <input
                                                    type="text"
                                                    value={profileFormData.firstname}
                                                    onChange={(e) => setProfileFormData({ ...profileFormData, firstname: e.target.value })}
                                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                                                />
                                            </div>



                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                                <input
                                                    type="email"
                                                    value={profileFormData.email}
                                                    onChange={(e) => setProfileFormData({ ...profileFormData, email: e.target.value })}
                                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                                                    required
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                                                <input
                                                    type="tel"
                                                    value={profileFormData.numTel}
                                                    onChange={(e) => setProfileFormData({ ...profileFormData, numTel: e.target.value })}
                                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                                                    placeholder="+216 XX XXX XXX"
                                                />
                                            </div>

                                            {/* Localisation (nom du lieu) avec géocodage */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Localisation (ville, adresse)
                                                    {profileLocationCoords && <span className="ml-2 text-xs text-green-600">✓ coordonnées obtenues</span>}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={profileLocationName}
                                                    onChange={handleLocationNameChange}
                                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                                                    placeholder="Ex: Tunis, Sfax, 12 rue Habib Bourguiba..."
                                                />
                                                <p className="text-xs text-gray-400 mt-1">Saisissez une adresse ou un lieu, les coordonnées seront automatiquement récupérées.</p>
                                            </div>
                                        </>
                                    )}
                                    {profileActiveTab === 'password' && (
                                        <>
                                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                                <div className="flex items-center gap-2 text-amber-700 text-sm">
                                                    <AlertCircle size={16} /> Laissez vide si vous ne voulez pas changer le mot de passe
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe (optionnel)</label>
                                                <input
                                                    type="password"
                                                    value={profilePasswordData.password}
                                                    onChange={(e) => setProfilePasswordData({ ...profilePasswordData, password: e.target.value })}
                                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                                                    placeholder="Laissez vide pour conserver l'ancien"
                                                />
                                                <p className="text-xs text-gray-400 mt-1">Minimum 6 caractères</p>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le nouveau mot de passe</label>
                                                <input
                                                    type="password"
                                                    value={profilePasswordData.confirmPassword}
                                                    onChange={(e) => setProfilePasswordData({ ...profilePasswordData, confirmPassword: e.target.value })}
                                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                                                    placeholder="Confirmez le nouveau mot de passe"
                                                    disabled={!profilePasswordData.password}
                                                />
                                                {profilePasswordData.password && profilePasswordData.confirmPassword && profilePasswordData.password !== profilePasswordData.confirmPassword && (
                                                    <p className="text-xs text-red-500 mt-1"><XCircle size={12} className="inline mr-1" /> Les mots de passe ne correspondent pas</p>
                                                )}
                                                {profilePasswordData.password && profilePasswordData.confirmPassword && profilePasswordData.password === profilePasswordData.confirmPassword && (
                                                    <p className="text-xs text-green-500 mt-1"><CheckCircle size={12} className="inline mr-1" /> Les mots de passe correspondent</p>
                                                )}
                                            </div>
                                        </>
                                    )}
                                    <div className="pt-4 flex gap-3">
                                        <button type="button" onClick={() => setShowProfileEditModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Annuler</button>
                                        <button type="submit" disabled={profileLoading} className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
                                            {profileLoading ? <><RefreshCw size={16} className="animate-spin" /> Enregistrement...</> : <><Save size={16} /> Enregistrer</>}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Modale des détails du jour */}
                <AnimatePresence>
                    {showDayDetailsModal && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 flex items-center justify-center z-50 p-3 sm:p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowDayDetailsModal(false)}>
                            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden mx-3 sm:mx-4" onClick={(e) => e.stopPropagation()}>
                                <div className="p-4 sm:p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-base sm:text-xl font-bold text-gray-900">{format(selectedDate, 'EEEE d MMMM', { locale: fr })}</h3>
                                        <button onClick={() => setShowDayDetailsModal(false)} className="p-1.5 sm:p-2 hover:bg-white rounded-lg"><X size={16} /></button>
                                    </div>
                                    <p className="text-xs sm:text-sm text-gray-500 mt-1">{selectedDayDetails.length} ressource(s) avec des indisponibilités</p>
                                </div>
                                <div className="p-4 sm:p-6 overflow-y-auto max-h-[60vh]">
                                    {selectedDayDetails.length > 0 ? (
                                        <div className="space-y-4">
                                            {selectedDayDetails.map((resourceData) => (
                                                <div key={resourceData.resourceId} className="border border-gray-200 rounded-xl overflow-hidden">
                                                    <div className="bg-gray-50 p-3 border-b border-gray-200">
                                                        <h4 className="font-semibold text-gray-900">{resourceData.resourceName}</h4>
                                                        <p className="text-xs text-gray-500">{resourceData.resourceType}</p>
                                                    </div>
                                                    <div className="p-3 space-y-2">
                                                        {resourceData.availabilities.map((avail, i) => (
                                                            <div key={i} className="p-3 rounded-lg bg-red-50 border border-red-200">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <XCircle size={16} className="text-red-600" />
                                                                        <span className="text-sm font-medium text-red-700">Indisponible</span>
                                                                    </div>
                                                                    <span className="text-xs text-gray-500">{formatTime(avail.date_deb)} - {formatTime(avail.date_fin)}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8">
                                            <CheckCircle size={48} className="mx-auto mb-4 text-green-500" />
                                            <p className="text-gray-600">Aucune indisponibilité pour cette date</p>
                                            <p className="text-sm text-gray-500 mt-2">Toutes les ressources sont disponibles</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <style>{`
                @keyframes shake { 0%, 100% { transform: rotate(0deg); } 10%, 30%, 50%, 70%, 90% { transform: rotate(-5deg); } 20%, 40%, 60%, 80% { transform: rotate(5deg); } }
                .animate-shake { animation: shake 0.5s ease-in-out; }
            `}</style>
        </div >
    );
}
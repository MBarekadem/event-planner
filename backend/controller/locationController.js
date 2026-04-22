import Location from "../model/location.js";
import Resource from "../model/ressources.js";
import User from "../model/user.js";
import mongoose from "mongoose";
import { generateInvoice } from "../utils/invoice.js";
// ✅ Import correct depuis le controller (pas depuis routes)
import { createNotification } from '../controller/notificationController.js';
import Event from "../model/event.js";
import Dispo from "../model/disponibilite.js";

// ============================
// ✅ CRÉER UNE DEMANDE (organisateur)
// ============================
export const createLocation = async (req, res) => {
    try {
        const { event, resource, dateDebut, dateFin } = req.body;

        if (!event || !resource || !dateDebut || !dateFin) {
            return res.status(400).json({
                message: "Tous les champs sont obligatoires"
            });
        }

        const eventExists = await Event.findOne({
            _id: event,
            organisateur_id: new mongoose.Types.ObjectId(req.user.id)
        });

        if (!eventExists) {
            return res.status(404).json({
                message: "Événement non trouvé ou non autorisé"
            });
        }

        const resourceExists = await Resource.findById(resource)
            .populate("prestataire", "firstname lastname email");

        if (!resourceExists) {
            return res.status(404).json({
                message: "Ressource non trouvée"
            });
        }

        const existingRequest = await Location.findOne({
            resource: resource,
            organisateur: req.user.id,

            // ✅ seulement les demandes en attente
            status: "en attente",

            // ✅ ignorer les déjà payées
            payer: { $ne: "payer" },

            // ✅ vrai conflit
            $or: [
                {
                    dateDebut: { $lt: new Date(dateFin) },
                    dateFin: { $gt: new Date(dateDebut) }
                }
            ]
        });

        if (existingRequest) {
            return res.status(400).json({
                message: "Vous avez déjà une demande pour cette ressource dans cette période"
            });
        }

        const newLocation = new Location({
            event,
            resource,
            organisateur: req.user.id,
            dateDebut: new Date(dateDebut),
            dateFin: new Date(dateFin)
        });

        await newLocation.save();

        // ✅ NOTIFICATION POUR LE PRESTATAIRE
        try {
            const organisateur = await User.findById(req.user.id);

            if (resourceExists.prestataire) {
                const prestataireId = resourceExists.prestataire._id;
                const formattedDate = new Date(dateDebut).toLocaleDateString('fr-FR');

                await createNotification(
                    prestataireId,
                    "Nouvelle demande de réservation",
                    `${organisateur?.firstname || "Un organisateur"} ${organisateur?.lastname || ""} souhaite réserver votre ressource "${resourceExists.name}" pour le ${formattedDate}.`,
                    "event",
                    "/mes-demandes"  // ✅ route prestataire correcte dans App.jsx
                );
            }
        } catch (notifError) {
            console.error("Erreur création notification réservation:", notifError);
        }

        res.status(201).json({
            message: "Demande envoyée avec succès",
            location: newLocation
        });

    } catch (error) {
        console.error("ERREUR createLocation:", error);
        res.status(500).json({ message: error.message });
    }
};

// ============================
// ✅ VOIR MES DEMANDES (organisateur)
// ============================
export const getMyLocations = async (req, res) => {
    try {
        const locations = await Location.find({
            organisateur: req.user.id
        })
            .populate("event")
            .populate("resource");

        res.status(200).json(locations);
    } catch (error) {
        console.error("ERREUR getMyLocations:", error);
        res.status(500).json({ message: error.message });
    }
};

// ============================
// ✅ VOIR LES DEMANDES REÇUES (prestataire)
// ============================
export const getLocationsForProvider = async (req, res) => {
    try {
        const locations = await Location.find()
            .populate({
                path: "resource",
                match: { prestataire: req.user.id }
            })
            .populate("event")
            .populate("organisateur");

        const filtered = locations.filter(loc => loc.resource);
        res.status(200).json(filtered);
    } catch (error) {
        console.error("ERREUR getLocationsForProvider:", error);
        res.status(500).json({ message: error.message });
    }
};

// ============================
// ✅ METTRE À JOUR LE STATUT (prestataire)
// ============================
export const updateStatusByProvider = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const location = await Location.findById(id)
            .populate("resource")
            .populate("organisateur", "firstname lastname email");

        if (!location) {
            return res.status(404).json({ message: "Demande non trouvée" });
        }

        if (["acceptée", "refusée"].includes(location.status)) {
            return res.status(400).json({
                message: "Demande déjà traitée"
            });
        }

        if (location.resource.prestataire.toString() !== req.user.id.toString()) {
            return res.status(403).json({ message: "Non autorisé (prestataire)" });
        }

        if (!["acceptée", "refusée"].includes(status)) {
            return res.status(400).json({ message: "Statut invalide" });
        }

        if (status === "acceptée") {
            const conflict = await Location.findOne({
                resource: location.resource._id,
                status: "acceptée",
                _id: { $ne: location._id },
                $or: [
                    {
                        dateDebut: { $lte: location.dateFin },
                        dateFin: { $gte: location.dateDebut }
                    }
                ]
            });

            if (conflict) {
                return res.status(400).json({
                    message: "Conflit avec une autre réservation"
                });
            }
        }

        location.status = status;
        await location.save();

        if (status === "acceptée") {
            await Location.updateMany(
                {
                    resource: location.resource._id,
                    _id: { $ne: location._id },
                    status: "en attente",
                    $or: [
                        {
                            dateDebut: { $lte: location.dateFin },
                            dateFin: { $gte: location.dateDebut }
                        }
                    ]
                },
                { $set: { status: "refusée" } }
            );
        }

        // ✅ NOTIFICATION POUR L'ORGANISATEUR
        try {
            if (location.organisateur) {
                const prestataire = await User.findById(req.user.id);

                await createNotification(
                    location.organisateur._id,
                    status === "acceptée" ? "Réservation acceptée ✅" : "Réservation refusée ❌",
                    `Le prestataire ${prestataire?.firstname || ""} ${prestataire?.lastname || ""} a ${status === "acceptée" ? "accepté" : "refusé"
                    } votre demande pour la ressource "${location.resource.name}".`,
                    status === "acceptée" ? "success" : "error",
                    "/mes-reservations"
                );
            }
        } catch (notifError) {
            console.error("Erreur création notification statut réservation:", notifError);
        }

        res.status(200).json({
            message: `Demande ${status}`,
            location
        });

    } catch (error) {
        console.error("ERREUR updateStatusByProvider:", error);
        res.status(500).json({ message: error.message });
    }
};


export const payLocation = async (req, res) => {
    try {
        const { locationId, amount } = req.body;

        if (!locationId) {
            return res.status(400).json({ message: "locationId requis" });
        }

        const location = await Location.findById(locationId)
            .populate({
                path: "resource",
                populate: { path: "prestataire", select: "firstname lastname email phone" }
            })
            .populate("organisateur", "firstname lastname email phone")
            .populate("event", "title");

        if (!location) {
            return res.status(404).json({ message: "Location non trouvée" });
        }

        if (location.status !== "acceptée") {
            return res.status(400).json({
                message: "Paiement possible seulement si la réservation est acceptée"
            });
        }

        if (location.payer === "payer") {
            return res.status(400).json({ message: "Déjà payé" });
        }

        // ✅ Mise à jour paiement
        location.payer = "payer";
        console.log("STEP 1: paiement validé");

        location.paymentDate = new Date();

        // ✅ Générer et sauvegarder facture
        const invoicePath = generateInvoice(location, amount);
        location.invoice = invoicePath;

        await location.save();

        // ✅ 1. Ajouter la ressource dans ressources_utiliser de l'événement
        await Event.findByIdAndUpdate(
            location.event._id || location.event,
            {
                $addToSet: { ressources_utiliser: location.resource._id }
            }
        );

        console.log("STEP 2: création dispo");
        // ✅ 2. Marquer les disponibilités concernées comme indisponibles (satut_disp = false)
        // ✅ 2. Créer une indisponibilité et l'ajouter à la ressource
        const newDispo = await Dispo.create({
            date_deb: location.dateDebut,
            date_fin: location.dateFin,
            satut_disp: false

        });
        console.log("STEP 3: push availability");

        await Resource.findByIdAndUpdate(
            location.resource._id,
            { $push: { availability: newDispo._id } }
        );

        res.status(200).json({
            message: "Paiement confirmé + facture générée",
            location
        });

    } catch (error) {
        console.error("ERREUR PAY:", error);
        res.status(500).json({ message: error.message });
    }
};

// ============================
// ✅ ANNULER UNE DEMANDE (organisateur)
// ============================
export const deleteLocation = async (req, res) => {
    try {
        const location = await Location.findOne({
            _id: req.params.id,
            organisateur: req.user.id,
            status: "en attente"
        });

        if (!location) {
            return res.status(404).json({ message: "Demande non trouvée ou déjà traitée" });
        }

        await location.deleteOne();

        // ✅ NOTIFICATION POUR LE PRESTATAIRE (annulation)
        try {
            const resource = await Resource.findById(location.resource)
                .populate("prestataire", "firstname lastname");
            const organisateur = await User.findById(req.user.id);

            if (resource?.prestataire) {
                await createNotification(
                    resource.prestataire._id,
                    "Demande annulée",
                    `${organisateur?.firstname || "L'organisateur"} ${organisateur?.lastname || ""} a annulé sa demande pour la ressource "${resource.name}".`,
                    "warning",
                    "/mes-demandes"  // ✅ route prestataire correcte dans App.jsx
                );
            }
        } catch (notifError) {
            console.error("Erreur création notification annulation:", notifError);
        }

        res.status(200).json({ message: "Demande annulée" });
    } catch (error) {
        console.error("ERREUR deleteLocation:", error);
        res.status(500).json({ message: error.message });
    }
};



export const getProviderInvoices = async (req, res) => {
    try {
        const locations = await Location.find({
            payer: "payer"
        })
        .populate({
            path: "resource",
            match: { prestataire: req.user.id }
        })
        .populate("organisateur", "firstname lastname")
        .populate("event", "title");

        // garder فقط les locations liées à ce prestataire
        const filtered = locations.filter(loc => loc.resource);

        const documents = filtered.map(loc => ({
            id: loc._id,
            name: `Facture_${loc.event?.title || "event"}.pdf`,
            type: "pdf",
            size: "—", // optionnel
            date: loc.paymentDate,
            status: "validé",
            url: loc.invoice
        }));

        res.status(200).json(documents);

    } catch (error) {
        console.error("ERREUR getProviderInvoices:", error);
        res.status(500).json({ message: error.message });
    }
};
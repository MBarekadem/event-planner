
import Location from "../model/location.js";
import Resource from "../model/ressources.js";
import User from "../model/user.js";
import mongoose from "mongoose";
import { generateInvoice } from "../utils/invoice.js";
import { createNotification } from '../controller/notificationController.js';
import Event from "../model/event.js";
import Dispo from "../model/disponibilite.js";

// ============================
// ✅ CRÉER UNE DEMANDE (organisateur)
// ============================
export const createLocation = async (req, res) => {
    try {
        const { event, resource, dateDebut, dateFin } = req.body;

        // Vérification champs obligatoires
        if (!event || !resource || !dateDebut || !dateFin) {
            return res.status(400).json({
                message: "Tous les champs sont obligatoires"
            });
        }

        // Vérifier que l'événement appartient à l'organisateur connecté
        const eventExists = await Event.findOne({
            _id: event,
            organisateur_id: new mongoose.Types.ObjectId(req.user.id)
        });

        if (!eventExists) {
            return res.status(404).json({
                message: "Événement non trouvé ou non autorisé"
            });
        }

        // Vérifier existence ressource
        const resourceExists = await Resource.findById(resource)
            .populate("prestataire", "firstname lastname email");

        if (!resourceExists) {
            return res.status(404).json({
                message: "Ressource non trouvée"
            });
        }

        // Vérifier si une demande similaire existe déjà
        const existingRequest = await Location.findOne({
            resource: resource,
            organisateur: req.user.id,
            status: "en attente",
            payer: { $ne: "payer" },
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

        // Création location
        const newLocation = new Location({
            event,
            resource,
            organisateur: req.user.id,
            dateDebut: new Date(dateDebut),
            dateFin: new Date(dateFin)
        });

        await newLocation.save();

        // ============================
        // ✅ NOTIFICATION PRESTATAIRE
        // ============================
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
                    "/mes-demandes"
                );
            }
        } catch (notifError) {
            console.error("Erreur notification réservation:", notifError);
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
// ✅ MES DEMANDES (organisateur)
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
// ✅ DEMANDES REÇUES (prestataire)
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
// ✅ ACCEPTER / REFUSER DEMANDE
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

        // Empêcher double traitement
        if (["acceptée", "refusée"].includes(location.status)) {
            return res.status(400).json({
                message: "Demande déjà traitée"
            });
        }

        // Vérification prestataire propriétaire
        if (location.resource.prestataire.toString() !== req.user.id.toString()) {
            return res.status(403).json({ message: "Non autorisé" });
        }

        if (!["acceptée", "refusée"].includes(status)) {
            return res.status(400).json({ message: "Statut invalide" });
        }

        // Vérification conflit réservation
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

        // Mise à jour statut
        location.status = status;
        await location.save();

        // Si acceptée → refuser autres demandes en conflit
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

        // ============================
        // ✅ NOTIFICATION ORGANISATEUR
        // ============================
        try {
            if (location.organisateur) {
                const prestataire = await User.findById(req.user.id);

                await createNotification(
                    location.organisateur._id,
                    status === "acceptée"
                        ? "Réservation acceptée ✅"
                        : "Réservation refusée ❌",

                    `Le prestataire ${prestataire?.firstname || ""} ${prestataire?.lastname || ""} a ${status === "acceptée" ? "accepté" : "refusé"} votre demande pour la ressource "${location.resource.name}".`,

                    status === "acceptée" ? "success" : "error",
                    "/mes-reservations"
                );
            }
        } catch (notifError) {
            console.error("Erreur notification statut:", notifError);
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

// ============================
// ✅ PAIEMENT
// ============================
export const payLocation = async (req, res) => {
    try {
        const { locationId, amount } = req.body;

        if (!locationId) {
            return res.status(400).json({
                message: "locationId requis"
            });
        }

        const location = await Location.findById(locationId)
            .populate({
                path: "resource",
                populate: {
                    path: "prestataire",
                    select: "firstname lastname email phone"
                }
            })
            .populate("organisateur", "firstname lastname email phone")
            .populate("event", "title");

        if (!location) {
            return res.status(404).json({
                message: "Location non trouvée"
            });
        }

        // Paiement possible seulement si acceptée
        if (location.status !== "acceptée") {
            return res.status(400).json({
                message: "Paiement possible seulement si réservation acceptée"
            });
        }

        // Empêcher double paiement
        if (location.payer === "payer") {
            return res.status(400).json({
                message: "Déjà payé"
            });
        }

        // ============================
        // ✅ VALIDER PAIEMENT
        // ============================
        location.payer = "payer";
        location.paymentDate = new Date();

        // Génération facture
        const invoicePath = generateInvoice(location, amount);
        location.invoice = invoicePath;

        await location.save();

        // ============================
        // ✅ AJOUT RESSOURCE À EVENT
        // ============================
        await Event.findByIdAndUpdate(
            location.event._id || location.event,
            {
                $addToSet: {
                    ressources_utiliser: location.resource._id
                }
            }
        );

        // ============================
        // ✅ BLOQUER DISPONIBILITÉ
        // ============================
        const newDispo = await Dispo.create({
            date_deb: location.dateDebut,
            date_fin: location.dateFin,
            satut_disp: false
        });

        await Resource.findByIdAndUpdate(
            location.resource._id,
            {
                $push: {
                    availability: newDispo._id
                }
            }
        );

        // ============================
        // ✅ NOTIFICATION PRESTATAIRE
        // ============================
        try {
            if (location.resource?.prestataire) {
                await createNotification(
                    location.resource.prestataire._id,
                    "Paiement confirmé 💰",
                    `${location.organisateur?.firstname || "Le client"} ${location.organisateur?.lastname || ""} a effectué le paiement pour la ressource "${location.resource.name}".`,
                    "success",
                    "/mes-demandes"
                );
            }
        } catch (notifError) {
            console.error("Erreur notification paiement:", notifError);
        }

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
// ✅ ANNULER DEMANDE
// ============================
export const deleteLocation = async (req, res) => {
    try {
        const location = await Location.findOne({
            _id: req.params.id,
            organisateur: req.user.id,
            status: "en attente"
        });

        if (!location) {
            return res.status(404).json({
                message: "Demande non trouvée ou déjà traitée"
            });
        }

        await location.deleteOne();

        // ============================
        // ✅ NOTIFICATION PRESTATAIRE
        // ============================
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
                    "/mes-demandes"
                );
            }
        } catch (notifError) {
            console.error("Erreur notification annulation:", notifError);
        }

        res.status(200).json({
            message: "Demande annulée"
        });

    } catch (error) {
        console.error("ERREUR deleteLocation:", error);
        res.status(500).json({ message: error.message });
    }
};

// ============================
// ✅ FACTURES PRESTATAIRE
// ============================
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

        // garder uniquement les locations du prestataire
        const filtered = locations.filter(loc => loc.resource);

        const documents = filtered.map(loc => ({
            id: loc._id,
            name: `Facture_${loc.event?.title || "event"}.pdf`,
            type: "pdf",
            size: "—",
            date: loc.paymentDate,
            status: "validé",
            url: loc.invoice
        }));

        res.status(200).json(documents);

    } catch (error) {
        console.error("ERREUR getProviderInvoices:", error);
        res.status(500).json({ message: error.message });
    }
}
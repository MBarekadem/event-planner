import Resource from "../model/ressources.js";
import Event from "../model/event.js";
import User from "../model/user.js";
import Comment from "../model/commantaire.js";
import { distance } from "../utils/knn.js";
import { eventToResourceMap } from "../utils/mapping.js";
import {
    resourceToVector,
    eventToVector,
    isResourceAvailable,
    extractKeywords,
    keywordScore,
} from "../utils/helpers.js";

// ─── Helpers internes ────────────────────────────────────────────────────────

async function attachLikes(resources) {
    const users = await User.find({}, { adore: 1 });
    const likesMap = {};
    users.forEach((u) =>
        u.adore.forEach((id) => {
            const key = id.toString();
            likesMap[key] = (likesMap[key] || 0) + 1;
        })
    );
    return resources.map((r) => ({
        ...r._doc,
        likesCount: likesMap[r._id.toString()] || 0,
    }));
}

async function attachRatings(resources) {
    const comments = await Comment.find({}, { C_res: 1, nbr_stars: 1 });
    const sum = {};
    const count = {};
    comments.forEach((c) => {
        const key = c.C_res.toString();
        sum[key] = (sum[key] || 0) + c.nbr_stars;
        count[key] = (count[key] || 0) + 1;
    });
    return resources.map((r) => {
        const key = r._id.toString();
        return { ...r, rating: count[key] ? sum[key] / count[key] : 0 };
    });
}

function sortByPopularity(resources, limit) {
    return [...resources]
        .sort((a, b) => b.likesCount + b.rating - (a.likesCount + a.rating))
        .slice(0, limit);
}

function hybridScore(resource, profile, keywords, maxLikes) {
    const vec = resourceToVector(resource);
    const dist = distance(profile, vec);

    const score_knn = 1 / (1 + dist);
    const score_location = vec.location === profile.location ? 1 : 0;
    const score_pop = resource.likesCount / (maxLikes || 1);
    const score_rating = resource.rating / 5;
    const score_keywords = keywordScore(resource, keywords);

    return (
        score_knn * 0.30 +
        score_location * 0.15 +
        score_pop * 0.15 +
        score_rating * 0.15 +
        score_keywords * 0.25
    );
}

async function loadResources() {
    let resources = await Resource.find()
        .populate({
            path: "media",
            select: "img_vd" // très important
        })
        .populate({
            path: "prestataire",
            select: "lastname name image"
        })
        .populate("availability");

    resources = await attachLikes(resources);
    resources = await attachRatings(resources);

    return resources;
}

// ─── CAS 1 : Utilisateur non connecté ────────────────────────────────────────
// Retourne les ressources les plus populaires (likes + note)

export async function getPopularResources(limit = 10) {
    const resources = await loadResources();
    return sortByPopularity(resources, limit);
}

// ─── CAS 2 : Utilisateur connecté, pas d'événement ───────────────────────────
// Construit un profil à partir des événements passés de l'utilisateur
// et recommande des ressources similaires à ce qu'il a déjà utilisé.
// Fallback vers les populaires si aucun historique.

export async function getPersonalizedResources(userId, limit = 10) {
    const [resources, user] = await Promise.all([
        loadResources(),
        User.findById(userId),
    ]);

    if (!user) throw new Error("Utilisateur introuvable");

    const pastEvents = await Event.find({
        organisateur_id: userId,
        status: "terminé",
    }).populate("ressources_utiliser");

    // Pas d'historique → fallback populaires
    if (!pastEvents.length || !pastEvents.some((e) => e.ressources_utiliser.length)) {
        return sortByPopularity(resources, limit);
    }

    // Construction du profil moyen
    let totalPrice = 0;
    let totalCapacity = 0;
    let count = 0;

    pastEvents.forEach((e) =>
        e.ressources_utiliser.forEach((r) => {
            totalPrice += r.price || 0;
            totalCapacity += r.attributes?.get?.("capacity") || 0;
            count++;
        })
    );

    const profile = {
        price: totalPrice / count,
        capacity: totalCapacity / count,
        location: user.locationName || "",
    };

    const maxLikes = Math.max(...resources.map((r) => r.likesCount), 1);

    return resources
        .map((r) => ({ ...r, score: hybridScore(r, profile, [], maxLikes) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
}

// ─── CAS 3 : Création / consultation d'un événement ──────────────────────────
// Filtre par catégorie de l'événement et disponibilité,
// puis classe par score hybride (KNN + keywords + popularité + note + localisation).

export async function getEventBasedResources(eventData, userId = null, limit = 15) {
    let resources = await loadResources();

    // Filtre catégorie
    const allowedCategories = eventToResourceMap[eventData.category];
    if (!allowedCategories) throw new Error(`Catégorie inconnue : ${eventData.category}`);
    resources = resources.filter((r) => allowedCategories.includes(r.category));

    // Filtre disponibilité (si l'événement a des dates)
    if (eventData.dateDebut && eventData.dateFin) {
        resources = resources.filter((r) => isResourceAvailable(r, eventData));
    }

    if (!resources.length) return [];

    const profile = eventToVector(eventData);
    const keywords = extractKeywords(eventData.description || "");
    const maxLikes = Math.max(...resources.map((r) => r.likesCount), 1);

    return resources
        .map((r) => ({ ...r, score: hybridScore(r, profile, keywords, maxLikes) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
}
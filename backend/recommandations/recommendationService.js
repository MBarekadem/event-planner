import User from "../model/user.js";
import Resource from "../model/ressources.js";
import Event from "../model/event.js";
import mongoose from "mongoose";

/* ─────────────────────────────────────────────
   NORMALIZE (définie en premier)
───────────────────────────────────────────── */
const normalizeResources = async (resources) => {
    if (!resources || resources.length === 0) return [];
    
    const ids = resources.map(r => r._id);

    const populated = await Resource.find({ _id: { $in: ids } })
        .populate("prestataire", "nomSociete image")
        .populate({ path: "media", select: "img_vd" })
        .lean();

    const map = new Map(populated.map(r => [r._id.toString(), r]));

    return resources
        .map(r => map.get(r._id.toString()))
        .filter(Boolean);
};

/* ─────────────────────────────────────────────
   COSINE SIMILARITY
───────────────────────────────────────────── */
function cosineSimilarity(vecA, vecB) {
    const keys = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);
    let dot = 0, normA = 0, normB = 0;

    for (const k of keys) {
        const a = vecA[k] || 0;
        const b = vecB[k] || 0;
        dot += a * b;
        normA += a * a;
        normB += b * b;
    }

    if (!normA || !normB) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/* ─────────────────────────────────────────────
   USER VECTOR
───────────────────────────────────────────── */
async function buildUserVector(userId) {
    const events = await Event.find({ organisateur_id: userId }).populate("ressources_utiliser");
    const user = await User.findById(userId).populate("adore");

    const vector = {};

    for (const event of events) {
        for (const r of event.ressources_utiliser) {
            if (r?.category) {
                vector[r.category] = (vector[r.category] || 0) + 1;
            }
        }
    }

    for (const r of user.adore || []) {
        if (r?.category) {
            vector[r.category] = (vector[r.category] || 0) + 0.5;
        }
    }

    return { vector, user, events };
}

/* ─────────────────────────────────────────────
   KNN USERS
───────────────────────────────────────────── */
async function findKNearestUsers(userId, targetVector, K = 5) {
    const users = await User.find({
        _id: { $ne: userId },
        role: "organisateur",
        status: "valide",
    }).lean();

    const similarities = [];

    for (const u of users) {
        const { vector } = await buildUserVector(u._id);
        if (Object.keys(vector).length === 0) continue;

        const sim = cosineSimilarity(targetVector, vector);
        if (sim > 0) {
            similarities.push({
                userId: u._id,
                similarity: sim,
                adore: u.adore || []
            });
        }
    }

    return similarities.sort((a, b) => b.similarity - a.similarity).slice(0, K);
}

/* ─────────────────────────────────────────────
   POPULAR
───────────────────────────────────────────── */
export async function getPopularResources(limit = 10) {
    const resources = await Resource.find()
        .sort({ averageRating: -1, likesCount: -1 })
        .limit(limit)
        .lean();

    return await normalizeResources(resources);
}

/* ─────────────────────────────────────────────
   PERSONALIZED
───────────────────────────────────────────── */
export async function getPersonalizedResources(userId, limit = 10) {

    const { vector, user, events } = await buildUserVector(userId);

    if (Object.keys(vector).length === 0) {
        return getPopularResources(limit);
    }

    const neighbors = await findKNearestUsers(userId, vector, 5);

    /* ── KNN SCORE ── */
    const knnScoreMap = {};
    for (const n of neighbors) {
        for (const id of n.adore) {
            const key = id.toString();
            knnScoreMap[key] = (knnScoreMap[key] || 0) + n.similarity;
        }
    }

    /* ── EXCLUSION ── */
    const seenIds = [
        ...events.flatMap(e => e.ressources_utiliser.map(r => r._id)),
        ...(user.adore || []).map(r => r._id)
    ];

    /* ── GEO FILTER ou fallback ── */
    let resources = [];

    const hasLocation =
        user.location &&
        Array.isArray(user.location.coordinates) &&
        user.location.coordinates.length === 2 &&
        (user.location.coordinates[0] !== 0 || user.location.coordinates[1] !== 0);

    if (hasLocation) {
        resources = await Resource.aggregate([
            {
                $geoNear: {
                    near: { type: "Point", coordinates: user.location.coordinates },
                    distanceField: "distance",
                    maxDistance: 100000,
                    spherical: true,
                },
            },
            { $match: { _id: { $nin: seenIds } } }
        ]);
    } else {
        // ✅ Fallback : toutes les ressources hors déjà vues
        resources = await Resource.find({
            _id: { $nin: seenIds }
        }).lean();
    }

    /* ── SCORING ── */
    resources = resources.map(r => {
        const knn = knnScoreMap[r._id.toString()] || 0;
        const score =
            knn * 0.5 +
            (r.averageRating || 0) * 0.3 +
            ((r.likesCount || 0) / ((r.likesCount || 0) + 10)) * 0.2;

        return { ...r, knnScore: knn, finalScore: score };
    });

    /* ── TRI ── */
    resources.sort((a, b) => b.finalScore - a.finalScore);

    /* ── DIVERSITÉ ── */
    const seenCategories = new Set();
    const diversified = [];

    for (const r of resources) {
        if (!seenCategories.has(r.category)) {
            diversified.push(r);
            seenCategories.add(r.category);
        }
        if (diversified.length >= limit) break;
    }

    /* ── FALLBACK si pas assez ── */
    if (diversified.length < limit) {
        const extra = await getPopularResources(limit);
        const existingIds = new Set(diversified.map(r => r._id.toString()));
        const merged = [
            ...diversified,
            ...extra.filter(r => !existingIds.has(r._id.toString()))
        ].slice(0, limit);
        // extra est déjà normalisé, mais diversified ne l'est pas encore
        const normalizedDiversified = await normalizeResources(diversified);
        const normalizedIds = new Set(normalizedDiversified.map(r => r._id.toString()));
        return [
            ...normalizedDiversified,
            ...extra.filter(r => !normalizedIds.has(r._id.toString()))
        ].slice(0, limit);
    }

    // ✅ Normalize toujours à la fin
    return await normalizeResources(diversified);
}

/* ─────────────────────────────────────────────
   EVENT BASED
───────────────────────────────────────────── */
export async function getEventBasedResources(eventData, userId, limit = 15) {
    const categories = {
        mariage: ["salle", "traiteur", "photographe", "dj"],
        anniversaire: ["salle", "decoration", "dj"],
        conference: ["salle", "materiel"],
    };

    const cats = categories[eventData.category?.toLowerCase()] || ["salle"];

    const resources = await Resource.find({
        category: { $in: cats }
    }).limit(limit).lean();

    return await normalizeResources(resources);
}
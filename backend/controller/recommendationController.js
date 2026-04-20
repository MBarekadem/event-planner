import {
  getPopularResources,
  getPersonalizedResources,
  getEventBasedResources,
} from "../recommandations/recommendationService.js";

// ─── GET /api/recommendations ─────────────────────────────────────────────────
// Cas 1 : user non connecté → populaires
// Cas 2 : user connecté     → personnalisées (historique)

export const getRecommendations = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      const data = await getPopularResources(10);
      return res.json({ type: "popular", data });
    }

    const data = await getPersonalizedResources(userId, 10);
    return res.json({ type: "personalized", data });

  } catch (err) {
    console.error("[Recommandation]", err);
    res.status(500).json({ message: "Erreur recommandation", error: err.message });
  }
};

// ─── POST /api/recommendations/event ─────────────────────────────────────────
// Cas 3 : recommandation basée sur les caractéristiques d'un événement
// Body attendu : { category, dateDebut?, dateFin?, description?, nombreParticipants?, lieu? }

export const getEventRecommendations = async (req, res) => {
  try {
    const userId = req.user?.id;
    const eventData = req.body;

    if (!eventData.category) {
      return res.status(400).json({ message: "Le champ 'category' est requis" });
    }

    const data = await getEventBasedResources(eventData, userId, 15);
    return res.json({ type: "event", data });

  } catch (err) {
    console.error("[Recommandation événement]", err);
    res.status(500).json({ message: "Erreur recommandation événement", error: err.message });
  }
};
// routes/cinRoutes.js
import express from "express";
const router = express.Router();

// Variable en mémoire pour stocker les données CIN reçues depuis n8n
let cinData = null;

/**
 * POST /api/cin
 * Appelé par n8n (HTTP Request1) pour stocker les données extraites de la CIN
 */
router.post("/", (req, res) => {
    try {
        const data = req.body;

        if (!data || (Array.isArray(data) && data.length === 0)) {
            return res.status(400).json({ message: "Aucune donnée CIN reçue" });
        }

        // n8n envoie parfois un tableau, on stocke tel quel
        cinData = Array.isArray(data) ? data : [data];

        console.log("✅ CIN data reçue depuis n8n :", JSON.stringify(cinData, null, 2));

        return res.status(200).json({ message: "CIN data enregistrée avec succès", data: cinData });
    } catch (err) {
        console.error("Erreur POST /api/cin :", err);
        return res.status(500).json({ message: "Erreur serveur" });
    }
});

/**
 * GET /api/cin
 * Appelé par le frontend React pour récupérer les données extraites
 */
router.get("/", (req, res) => {
    try {
        if (!cinData) {
            return res.status(404).json({ message: "Aucune donnée CIN disponible. Veuillez d'abord envoyer une image." });
        }

        return res.status(200).json(cinData);
    } catch (err) {
        console.error("Erreur GET /api/cin :", err);
        return res.status(500).json({ message: "Erreur serveur" });
    }
});

/**
 * DELETE /api/cin
 * Optionnel — pour vider les données après vérification
 */
router.delete("/", (req, res) => {
    cinData = null;
    return res.status(200).json({ message: "CIN data effacée" });
});

export default router;

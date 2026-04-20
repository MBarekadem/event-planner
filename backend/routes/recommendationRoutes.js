// recommendationRoutes.js
import express from "express";
import { getRecommendations, getEventRecommendations } from "../controller/recommendationController.js";
import { optionalAuth, verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", optionalAuth, getRecommendations);           // Cas 1 & 2
router.post("/event", verifyToken, getEventRecommendations); // Cas 3

export default router;
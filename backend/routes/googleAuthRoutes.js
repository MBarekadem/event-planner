// backend/routes/googleAuthRoutes.js
import express from "express";
import { googleAuth, setAppPassword } from "../controller/googleAuthController.js"; // ← setAppPassword ajouté
import { verifyToken } from "../middleware/authMiddleware.js"
const router = express.Router();

router.post("/google", googleAuth);
router.post("/set-password", verifyToken, setAppPassword);

export default router;
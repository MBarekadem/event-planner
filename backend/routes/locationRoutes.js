import express from "express";
import {
  createLocation,
  getMyLocations,
  getLocationsForProvider,
  deleteLocation,
  updateStatusByProvider, payLocation
} from "../controller/locationController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Routes pour organisateur
router.post("/create", verifyToken, createLocation);
router.get("/get_my_locations", verifyToken, getMyLocations);
router.delete("/delete/:id", verifyToken, deleteLocation);
router.post("/pay", verifyToken, payLocation);  // ← ajoute ça

// Routes pour prestataire
router.get("/get_pres", verifyToken, getLocationsForProvider);
router.put("/update_pres/:id", verifyToken, updateStatusByProvider);
router.get("/get_my_locations", verifyToken, getMyLocations);
export default router;
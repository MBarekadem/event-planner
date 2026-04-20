// routes/dispoRoutes.js
import express from "express";
import {
  createDispo,
  getAllDispo,
  getDispoById,
  updateDispo,
  deleteDispo,
} from "../controller/dispoController.js";

const router = express.Router();

router.post("/add_dispo", createDispo);
router.get("/get_all_dispo", getAllDispo);
router.get("/get_dispo/:id", getDispoById);
router.put("/dispo/:id", updateDispo);
router.delete("/disop/:id", deleteDispo);

export default router;
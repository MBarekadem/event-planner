// routes/mediaRoutes.js
import express from "express";
import {
  createMedia,
  getAllMedia,
  getMediaById,
  updateMedia,
  deleteMedia,
} from "../controller/mediaController.js";

const router = express.Router();

router.post("/add_media", createMedia);
router.get("/get_all_media", getAllMedia);
router.get("/get_media/:id", getMediaById);
router.put("/media/:id", updateMedia);
router.delete("/dell/:id", deleteMedia);

export default router;
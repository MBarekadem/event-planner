import express from "express";
import {
    addResource,
    getAllResources,
    getResourceById,
    updateResource,
    deleteResource,
    getResourcesByUser
} from "../controller/ressourcesController.js";
import upload from "../middleware/upload_image.js"
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// ================= MULTER CONFIG =================




router.post(
  "/add_ressource",
  verifyToken,
  upload.fields([
    { name: "termsFile", maxCount: 1 },
    { name: "media", maxCount: 10 }
  ]),
  addResource
);
router.get("/get_all_ressources", getAllResources);
router.get("/get_by_id/:id", getResourceById);
router.get("/res_user", verifyToken, getResourcesByUser);
router.put("/modify/:id", verifyToken, upload.array("media"), updateResource);
router.delete("/dell/:id", verifyToken, deleteResource);

export default router;
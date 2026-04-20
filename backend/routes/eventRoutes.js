import express from "express";
import { addEvent, get_all_Event, get_event_by_id, updateEvent, deleteEvent, get_Event_by_user } from "../controller/eventController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import multer from "multer";
import path from "path";
import fs from "fs";

// ✅ Créer le dossier s'il n'existe pas
const cinDir = "uploads/cin/";
if (!fs.existsSync(cinDir)) fs.mkdirSync(cinDir, { recursive: true });

// ✅ Config multer pour le CIN
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, cinDir),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpg|jpeg|png|pdf/;
  allowed.test(file.mimetype) ? cb(null, true) : cb(new Error("PDF ou image seulement !"));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

const router = express.Router();

// ✅ upload.single("cinFile") ajouté ici
router.post("/addEvent", verifyToken, upload.single("cinFile"), addEvent);

router.get("/allEvent", get_all_Event);
router.get("/Event/:id", verifyToken, get_event_by_id);
router.put("/update_event/:id", verifyToken, upload.single("cinFile"), updateEvent);
router.delete("/dell_event/:id", verifyToken, deleteEvent);
router.get("/user_event/:id", verifyToken, get_Event_by_user);

export default router;
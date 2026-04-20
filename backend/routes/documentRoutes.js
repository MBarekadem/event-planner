import express from "express";
import {
    createDocument,
    getUserDocuments,
    getDocumentById,
    deleteDocument,
    getAllDocuments
} from "../controller/documentController.js";

import upload from "../middleware/upload_doc.js";

const router = express.Router();

router.post("/", upload.single("file"), createDocument);
router.get("/admin/all", getAllDocuments);   // ← nouvelle route admin
router.get("/", getUserDocuments);
router.get("/:id", getDocumentById);
router.delete("/:id", deleteDocument);

export default router;
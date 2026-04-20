import express from "express";
import {
  registerUser,
  getUser,
  loginUser,
  updateUser, addToAdore,
  removeFromAdore,
  getAdore, getUserById,updateCIN 
} from "../controller/userController.js";
import upload from "../middleware/upload_image.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", upload.fields([
  { name: "image",   maxCount: 1 },
  { name: "patente", maxCount: 1 }
]), registerUser);
router.post("/login", loginUser);
router.get("/allusers", getUser);
router.post("/like", verifyToken, addToAdore);
router.delete("/remove", verifyToken, removeFromAdore);
router.get("/adore/:userId", getAdore);
router.get("/:id", getUserById);
router.put('/update', verifyToken, upload.single('image'), updateUser);
router.put("/update-cin", verifyToken, updateCIN);
export default router;
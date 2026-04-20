// routes/adminRoutes.js
import express from "express";
import { verifyToken, isAdmin } from "../middleware/authMiddleware.js";
import {
  getStats,
  getAllUsers,
  deleteUser,
  updateUserStatus,
  getAllEvents,
  getAllResources,
  deleteResource,
  getMonthlyStats,
  getResourceComments
} from "../controller/Admincontroller.js";

const router = express.Router();

router.use(verifyToken, isAdmin);

// Stats
router.get("/stats",getStats);
router.get("/stats/monthly", getMonthlyStats);

// Users
router.get("/users",getAllUsers);
router.delete("/users/:id",deleteUser);
router.patch("/users/:id/status",updateUserStatus);   

// Events
router.get("/events",getAllEvents);

// Resources
router.get("/resources",getAllResources);
router.delete("/resources/:id",deleteResource);
router.get("/resources/:id/commentaires", getResourceComments);

export default router;
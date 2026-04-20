// controller/Admincontroller.js
import User from "../model/user.js";
import Event from "../model/event.js";
import Ressource from "../model/ressources.js";
import axios from "axios";
import mongoose from "mongoose";
import Comment from "../model/commantaire.js";
import { createNotification } from '../controller/notificationController.js';

// ─── Stats ────────────────────────────────────────────────────────────────────
export const getStats = async (req, res) => {
  try {
    const [users, events, resources, pending, resourcesByType] = await Promise.all([
      User.countDocuments(),
      Event.countDocuments(),
      Ressource.countDocuments(),
      User.countDocuments({ role: "prestataire", status: "en_attente" }),
      Ressource.aggregate([{ $group: { _id: "$type", count: { $sum: 1 } } }]),
    ]);

    const resourcesByTypeMap = {};
    resourcesByType.forEach(r => { resourcesByTypeMap[r._id] = r.count; });

    res.json({ users, events, resources, pending, resourcesByType: resourcesByTypeMap });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Users ────────────────────────────────────────────────────────────────────
export const getAllUsers = async (req, res) => {
  try {
    // On exclut les admins de la liste
    const users = await User.find({ role: { $ne: "admin" } })
      .select("-password")
      .sort({ _id: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "Utilisateur supprimé" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/admin/users/:id/status — valider ou rejeter un prestataire
export const updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["valide", "en_attente", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Statut invalide" });
    }

    //  récupérer ancien user
    const oldUser = await User.findById(req.params.id);

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { returnDocument: "after" }
    ).select("-password");

    //  envoyer email seulement si changement
    if (oldUser.status !== user.status) {
      try {
        if (user.status === "valide") {
          await axios.post("http://localhost:5678/webhook/accept_sing_up", {
            email: user.email,
            name: user.firstname
          });
          console.log("Envoi vers n8n...");
        }
        if (user.status === "rejected") {
          console.log("Status rejected détecté ✅");

          await axios.post("http://localhost:5678/webhook/reject_sing_up", {
            email: user.email,
            name: user.firstname
          });

          console.log("Envoi vers n8n ref...");
        }
      }
      catch (err) {
        console.log("Erreur envoi email n8n:");
        console.log(err.response?.data || err.message);
        console.log("Erreur envoi email:", err.message);
      }
    }

    res.json(user);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Events ───────────────────────────────────────────────────────────────────
export const getAllEvents = async (req, res) => {
  try {
    const events = await Event.find().sort({ _id: -1 });
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteEvent = async (req, res) => {
  try {
    await Event.findByIdAndDelete(req.params.id);
    res.json({ message: "Événement supprimé" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Resources ────────────────────────────────────────────────────────────────
export const getAllResources = async (req, res) => {
  try {
    const resources = await Ressource.find().sort({ createdAt: -1 });
    res.json(resources);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteResource = async (req, res) => {
  try {
    await Ressource.findByIdAndDelete(req.params.id);
    res.json({ message: "Ressource supprimée" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getMonthlyStats = async (req, res) => {
  try {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // Users : utilise _id (ObjectId contient la date)
    const users = await User.aggregate([
      {
        $match: {
          _id: { $gte: mongoose.Types.ObjectId.createFromTime(sixMonthsAgo.getTime() / 1000) }
        }
      },
      {
        $group: {
          _id: {
            year:  { $year:  { $toDate: "$_id" } },
            month: { $month: { $toDate: "$_id" } },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // Resources : a createdAt donc on l'utilise directement
    const resources = await Ressource.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year:  { $year:  "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    res.json({ users, resources });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getResourceComments = async (req, res) => {
  try {
    const comments = await Comment.find({ C_res: req.params.id })
      .populate("C_user", "firstname lastname email image")
      .sort({ createdAt: -1 });
    res.json(comments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
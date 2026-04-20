import Event from "../model/event.js";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";

// ============================
// ✅ CREATE EVENT (avec upload CIN)
// ============================
const addEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      lieu,
      type,
      dateDebut,
      dateFin,
      nombreParticipants,
      ressources_utiliser
    } = req.body;

    // Gérer l'upload du fichier CIN
    let cinFileUrl = null;
    if (req.file) {
      // Le fichier est déjà sauvegardé par multer
      cinFileUrl = `/uploads/cin/${req.file.filename}`;
    }

    const event = new Event({
      title,
      description,
      category,
      lieu,
      type,
      dateDebut,
      dateFin,
      nombreParticipants,
      ressources_utiliser,
      organisateur_id: req.user.id,
      cinFile: cinFileUrl,  // Ajouter le champ CIN
      cinNumber: req.body.cinNumber || null  // Ajouter le numéro CIN
    });

    await event.save();

    const populatedEvent = await Event.findById(event._id)
      .populate({
        path: "ressources_utiliser",
        populate: ["media", "availability"]
      });

    res.status(201).json(populatedEvent);

  } catch (error) {
    console.error("ERREUR addEvent:", error);
    res.status(500).json({ message: error.message });
  }
};

// ============================
// ✅ GET ALL EVENTS
// ============================
const get_all_Event = async (req, res) => {
  try {
    const events = await Event.find()
      .populate({
        path: "ressources_utiliser",
        populate: ["media", "availability"]
      });

    res.status(200).json(events);

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

// ============================
// ✅ GET EVENT BY ID
// ============================
const get_event_by_id = async (req, res) => {
  try {
    const event = await Event.findOne({
      _id: req.params.id,
      organisateur_id: req.user._id
    }).populate({
      path: "ressources_utiliser",
      populate: ["media", "availability"]
    });

    if (!event) {
      return res.status(404).json({ message: "Événement non trouvé" });
    }

    res.status(200).json(event);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================
// ✅ UPDATE EVENT
// ============================
const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await Event.findOne({
      _id: id,
      organisateur_id: new mongoose.Types.ObjectId(req.user.id)
    });

    if (!event) {
      return res.status(404).json({
        message: "Événement non trouvé ou non autorisé"
      });
    }

    const allowedUpdates = [
      'title', 'description', 'category', 'lieu', 'type',
      'dateDebut', 'dateFin', 'nombreParticipants', 'status',
      'cinNumber', 'cinFile'
    ];

    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        if (key === "dateDebut" || key === "dateFin") {
          event[key] = new Date(req.body[key]);
        } else if (key === "nombreParticipants") {
          event[key] = Number(req.body[key]);
        } else {
          event[key] = req.body[key];
        }
      }
    }

    // Gérer l'upload d'un nouveau fichier CIN
    if (req.file) {
      // Supprimer l'ancien fichier si existant
      if (event.cinFile) {
        const oldFilePath = path.join(process.cwd(), event.cinFile);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      event.cinFile = `/uploads/cin/${req.file.filename}`;
    }

    await event.save();

    res.status(200).json(event);

  } catch (error) {
    console.error("ERREUR updateEvent:", error);
    res.status(500).json({ message: error.message });
  }
};

// ============================
// ✅ DELETE EVENT
// ============================
const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findOne({
      _id: req.params.id,
      organisateur_id: req.user._id
    });

    if (!event) {
      return res.status(404).json({ message: "Événement non trouvé" });
    }

    // Supprimer le fichier CIN associé
    if (event.cinFile) {
      const filePath = path.join(process.cwd(), event.cinFile);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await event.deleteOne();
    res.status(200).json({ message: "Événement supprimé" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const get_Event_by_user = async (req, res) => {
  try {
    const events = await Event.find({ organisateur_id: req.params.id }).populate({
      path: "ressources_utiliser",
      populate: ["media", "availability"]
    });

    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export {
  addEvent,
  get_all_Event,
  get_event_by_id,
  updateEvent,
  get_Event_by_user,
  deleteEvent
};
import mongoose from "mongoose";

const locationSchema = new mongoose.Schema({

  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
    required: true
  },

  resource: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Resource",
    required: true
  },

  organisateur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  dateDebut: {
    type: Date,
    required: true
  },

  dateFin: {
    type: Date,
    required: true
  },

  status: {
    type: String,
    enum: ["en attente", "acceptée", "refusée"],
    default: "en attente"
  },

  payer: {
    type: String,
    enum: ["en attente", "payer"],
    default: "en attente"
  },


  paymentDate: {
    type: Date
  },
  invoice: {
    type: String // chemin du PDF
  }

}, { timestamps: true });

export default mongoose.model("Location", locationSchema);
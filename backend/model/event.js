import mongoose from "mongoose";

const EventSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        description: { type: String, required: true },
        category: { type: String, enum: ["Mariage", "Conference", "Anniversaire", "Seminaire", "autre"] },
        type: { type: String, enum: ["public", "privé"]  },
        dateDebut: { type: Date },
        dateFin: { type: Date },
        nombreParticipants: { type: Number },
        lieu:{type:String},
        status: { type: String, enum: ["en attente", "en cours", "terminé"], required: true, default: "en attente" },
        createdAt: { type: Date, default: Date.now },
        ressources_utiliser: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Resource"
        }],
        organisateur_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User", required: true
        },
    },

    { timestamps: true }
);

export default mongoose.model("Event", EventSchema);



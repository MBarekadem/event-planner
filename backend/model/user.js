import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  lastname: { type: String, default: "" },
  firstname: { type: String, default: "" },
  cin:{type:String,default:""},
  nomSociete: { type: String, default: "" }, // ← NOUVEAU : pour les prestataires
  email: { type: String, required: true, unique: true },
  password: { type: String, default: "" },
  hasAppPassword: { type: Boolean, default: false },
  image: { type: String },
  role: {
    type: String,
    enum: ["organisateur", "prestataire", "admin"],
    required: true,
  },
  status: {
    type: String,
    enum: ["valide", "en_attente", "rejected"],
    default: "en_attente",
  },
  googleId: { type: String },
  adore: [{ type: mongoose.Schema.Types.ObjectId, ref: "Resource" }],
  patente: { type: String },
  numPatente: { type: String },
  numTel: { type: String },
  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point"
    },
    coordinates: {
      type: [Number], // [lng, lat]
    },

  },
  locationName: { type: String },
  createdAt: { type: Date, default: Date.now },
});
UserSchema.index({ location: "2dsphere" });
export default mongoose.model("User", UserSchema);

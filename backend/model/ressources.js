import mongoose from "mongoose";

const resourceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      required: true,
      enum: ["product", "service"]
    },

    category: {
      type: String,
      required: true,
      enum: ["salle", "materiel", "decoration", "traiteur", "dj", "photographe", "serveur"]
    },

    // 🔹 Champs dynamiques
    attributes: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {}
    },

    // 🔹 Champs personnalisés
    customAttributes: [
      {
        name: {
          type: String,
          required: true
        },

        value: mongoose.Schema.Types.Mixed
      }
    ],

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },
      coordinates: {
        type: [Number], // [lng, lat]
        default: [0, 0]
      }
    },

    locationname: {
      type: String,
      default: ""
    },

    media: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Media"
      }
    ],

    availability: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Dispo"
      }
    ],

    prestataire: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalRatings: { type: Number, default: 0 },
    likesCount: { type: Number, default: 0 },
    stock: {
      type: Number,
      min: 0,
      required: function () {
        return this.type === "product";
      },
      default: function () {
        return this.type === "product" ? 1 : undefined;
      }
    },

    terms: {
      text: {
        type: String,
        default: null
      },
      file: {
        type: String,
        default: null
      }
    }

  },

  {
    timestamps: true,
  }
);

// validation
resourceSchema.pre("save", function () {
  const hasText = this.terms?.text && this.terms.text.trim() !== "";
  const hasFile = this.terms?.file && this.terms.file !== "";

  if (!hasText && !hasFile) {
    throw new Error("Terms must have text or file");
  }

  // 🔥 validation stock
  if (this.type === "product" && (this.stock === undefined || this.stock < 0)) {
    throw new Error("Stock is required for products");
  }

  if (this.type === "service") {
    this.stock = undefined; // 🔥 supprimer stock si service
  }
});

resourceSchema.index({ location: "2dsphere" });
const Resource = mongoose.model("Resource", resourceSchema);

export default Resource;
import mongoose from "mongoose";

const docSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    resource: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Resource"
    }],

    documentType: {
        type: String,
        enum: ["CIN", "Passport", "Contract", "patente"],
        required: true
    },

    title: {
        type: String,
        required: true
    },

    fileUrl: {
        type: String,
        required: true
    }

}, { timestamps: true });

const Document = mongoose.model("Document", docSchema);

export default Document;
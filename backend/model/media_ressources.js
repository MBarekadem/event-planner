import mongoose from "mongoose";
const MediaSchema = new mongoose.Schema({
    img_vd: { type: [String] }
});

export default mongoose.model("Media", MediaSchema);

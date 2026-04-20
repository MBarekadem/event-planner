import mongoose from "mongoose";

const dispoSchema=new mongoose.Schema({
    date_deb:{type:Date, required: true},
    date_fin:{type:Date, required: true},
    satut_disp:{type:Boolean}}
)

export default mongoose.model("Dispo", dispoSchema);

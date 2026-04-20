import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
    {
        contenue: {
            type: String,
            required: true
        },
        nbr_stars: {
            type: Number,
            min: 1,
            max: 5,
        },
        C_user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        C_res: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Resource"
        },
    },
    { timestamps: true }
);

export default mongoose.model("Comment", commentSchema);
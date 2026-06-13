import mongoose from "mongoose";

const datingMatchSchema = new mongoose.Schema(
    {
        userA: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        userB: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    { timestamps: true }
);

datingMatchSchema.index({ userA: 1, userB: 1 }, { unique: true });

const DatingMatch = mongoose.model("DatingMatch", datingMatchSchema);

export default DatingMatch;

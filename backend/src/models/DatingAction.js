import mongoose from "mongoose";

const datingActionSchema = new mongoose.Schema(
    {
        from: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        to: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        action: {
            type: String,
            enum: ["like", "pass"],
            required: true,
        },
    },
    { timestamps: true }
);

datingActionSchema.index({ from: 1, to: 1 }, { unique: true });
datingActionSchema.index({ to: 1, action: 1 });

const DatingAction = mongoose.model("DatingAction", datingActionSchema);

export default DatingAction;

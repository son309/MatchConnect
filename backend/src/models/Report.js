import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reportedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reason: {
      type: String,
      enum: [
        "fake-profile",
        "harassment",
        "spam",
        "inappropriate-content",
        "scam",
        "other",
      ],
      required: true,
    },
    details: {
      type: String,
      default: "",
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: ["pending", "reviewed", "resolved", "dismissed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

reportSchema.index({ reportedUser: 1, status: 1, createdAt: -1 });
reportSchema.index({ reporter: 1, createdAt: -1 });

const Report = mongoose.model("Report", reportSchema);

export default Report;

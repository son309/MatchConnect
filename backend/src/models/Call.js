import mongoose from "mongoose";

const callSchema = new mongoose.Schema(
  {
    caller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    callType: {
      type: String,
      enum: ["audio", "video"],
      default: "audio",
    },
    status: {
      type: String,
      enum: ["missed", "answered", "rejected", "busy", "unavailable"],
      default: "missed",
    },
    duration: {
      type: Number, // Duration in seconds
      default: 0,
    },
    startedAt: {
      type: Date,
    },
    endedAt: {
      type: Date,
    },
    callId: {
      type: String, // The unique call session ID
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
callSchema.index({ caller: 1, createdAt: -1 });
callSchema.index({ receiver: 1, createdAt: -1 });
callSchema.index({ callId: 1 }, { unique: true });

const Call = mongoose.model("Call", callSchema);
export default Call;

import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    messageType: {
      type: String,
      enum: ["text", "call"],
      default: "text",
    },
    image: {
      type: String,
    },
    audio: {
      type: String, // URL to the audio file
    },
    call: {
      callId: {
        type: String,
      },
      callType: {
        type: String,
        enum: ["audio", "video"],
      },
      status: {
        type: String,
        enum: ["missed", "answered", "rejected", "busy", "unavailable"],
      },
      duration: {
        type: Number,
        default: 0,
      },
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    reactions: [
      {
        emoji: { type: String, required: true },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      },
    ],
  },
  { timestamps: true }
);

// Index for faster direct-message queries
messageSchema.index({ senderId: 1, receiverId: 1 });
messageSchema.index({ "call.callId": 1 }, { sparse: true });

const Message = mongoose.model("Message", messageSchema);

export default Message;

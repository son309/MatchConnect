import { uploadOnCloudinary } from "../lib/cloudinary.js";
import { getReceiverSocketIds, io } from "../lib/socket.js";
import {
  getAllContactsService,
  getChatPartnersService,
  getGroupMessagesService,
  getMessagesByUserIdService,
  getSharedMediaService,
  markMessagesAsReadService,
  markSingleMessageAsReadService,
  reactToMessageService,
  searchAllMessagesService,
  searchMessagesService,
  sendGroupMessageService,
  sendMessageService
} from "../services/message.service.js";

// Helper to emit to all sockets of a user
function emitToUser(userId, event, data) {
  const socketIds = getReceiverSocketIds(userId);
  socketIds.forEach(socketId => {
    io.to(socketId).emit(event, data);
  });
}

export const getAllContacts = async (req, res) => {
  try {
    const contacts = await getAllContactsService(req.user._id);
    res.status(200).json(contacts);
  } catch (error) {
    console.error("getAllContacts:", error);
    res.status(error.statusCode || 500).json({ message: error.message || "Server error" });
  }
};

export const getMessagesByUserId = async (req, res) => {
  try {
    const myId = req.user._id;
    const { id: userToChatId } = req.params;

    const messages = await getMessagesByUserIdService(myId, userToChatId);
    res.status(200).json(messages);
  } catch (error) {
    console.error("getMessagesByUserId:", error);
    res.status(error.statusCode || 500).json({ message: error.message || "Server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    let imageUrl = null;
    let audioUrl = null;

    // Handle files from upload.fields
    if (req.files) {
      if (req.files.image && req.files.image[0]) {
        imageUrl = await uploadOnCloudinary(req.files.image[0].path);
      }
      if (req.files.audio && req.files.audio[0]) {
        audioUrl = await uploadOnCloudinary(req.files.audio[0].path, { resource_type: "video" }); // Cloudinary treats audio as video resource_type often, or "auto"
      }
    }

    const newMessage = await sendMessageService(senderId, receiverId, text, imageUrl, audioUrl);

    // Emit socket event to all receiver sockets
    emitToUser(receiverId, "newMessage", newMessage);

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("sendMessage:", error);
    res.status(error.statusCode || 500).json({ message: error.message || "Server error" });
  }
};

export const getChatPartners = async (req, res) => {
  try {
    const chatPartners = await getChatPartnersService(req.user._id);
    res.status(200).json(chatPartners);
  } catch (error) {
    console.error("getChatPartners:", error);
    res.status(error.statusCode || 500).json({ message: error.message || "Server error" });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const myUserId = req.user._id;
    const { partnerId } = req.params;

    const result = await markMessagesAsReadService(myUserId, partnerId);

    // Emit socket event to all partner sockets
    emitToUser(partnerId, "messagesRead", {
      partnerId: result.myUserId,
    });

    res.status(200).json({
      message: "Messages marked as read",
      updatedCount: result.updatedCount,
    });
  } catch (error) {
    console.error("markAsRead:", error);
    res.status(error.statusCode || 500).json({ message: error.message || "Server error" });
  }
};

export const markMessageAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await markSingleMessageAsReadService(messageId);

    // Emit socket event to all sender sockets
    emitToUser(message.senderId, "messageRead", {
      messageId: messageId,
      readBy: req.user._id,
    });

    res.status(200).json(message);
  } catch (error) {
    console.error("markMessageAsRead:", error);
    res.status(error.statusCode || 500).json({ message: error.message || "Server error" });
  }
};

export const reactToMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    const updatedMessage = await reactToMessageService(messageId, userId, emoji);

    // Emit socket event to sender and receiver
    const receiverId = updatedMessage.senderId.toString() === userId.toString()
      ? updatedMessage.receiverId
      : updatedMessage.senderId;

    // Notify the other user
    emitToUser(receiverId, "messageReaction", updatedMessage);

    // Also notify the sender (current user) to update UI immediately if needed (though frontend usually does optimistic update)
    // Actually, it's better to broadcast to both users involved in the chat so their views are consistent
    emitToUser(userId, "messageReaction", updatedMessage);

    res.status(200).json(updatedMessage);
  } catch (error) {
    console.error("reactToMessage:", error);
    res.status(error.statusCode || 500).json({ message: error.message || "Server error" });
  }
};

export const searchMessages = async (req, res) => {
  try {
    const myUserId = req.user._id;
    const { partnerId } = req.params;
    const { q } = req.query;

    if (!q || q.trim() === "") {
      return res.status(200).json([]);
    }

    const messages = await searchMessagesService(myUserId, partnerId, q);
    res.status(200).json(messages);
  } catch (error) {
    console.error("searchMessages:", error);
    res.status(error.statusCode || 500).json({ message: error.message || "Server error" });
  }
};

export const searchAllMessages = async (req, res) => {
  try {
    const myUserId = req.user._id;
    const { q } = req.query;

    if (!q || q.trim() === "") {
      return res.status(200).json([]);
    }

    const messages = await searchAllMessagesService(myUserId, q);
    res.status(200).json(messages);
  } catch (error) {
    console.error("searchAllMessages:", error);
    res.status(error.statusCode || 500).json({ message: error.message || "Server error" });
  }
};

// ==================== GROUP MESSAGE CONTROLLERS ====================

export const getGroupMessages = async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId } = req.params;

    const messages = await getGroupMessagesService(groupId, userId);
    res.status(200).json(messages);
  } catch (error) {
    console.error("getGroupMessages:", error);
    res.status(error.statusCode || 500).json({ message: error.message || "Server error" });
  }
};

export const getSharedMedia = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const media = await getSharedMediaService(myId, userToChatId);

    res.status(200).json(media);
  } catch (error) {
    console.log("Error in getSharedMedia controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendGroupMessage = async (req, res) => {
  try {
    const { text } = req.body;
    const { groupId } = req.params;
    const senderId = req.user._id;

    let imageUrl = null;
    let audioUrl = null;

    if (req.files) {
      if (req.files.image && req.files.image[0]) {
        imageUrl = await uploadOnCloudinary(req.files.image[0].path);
      }
      if (req.files.audio && req.files.audio[0]) {
        audioUrl = await uploadOnCloudinary(req.files.audio[0].path, { resource_type: "video" });
      }
    }

    const { message, group } = await sendGroupMessageService({ senderId, groupId, text, imageUrl, audioUrl });

    // Emit socket event to all group members (except sender)
    group.members.forEach((memberId) => {
      if (memberId.toString() !== senderId.toString()) {
        emitToUser(memberId, "group:newMessage", {
          groupId,
          message,
        });
      }
    });

    res.status(201).json(message);
  } catch (error) {
    console.error("sendGroupMessage:", error);
    res.status(error.statusCode || 500).json({ message: error.message || "Server error" });
  }
};

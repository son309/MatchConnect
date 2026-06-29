import express from "express";
import {
  getAllContacts,
  getChatPartners,
  getMessagesByUserId,
  getSharedMedia,
  markAsRead,
  markMessageAsRead,
  reactToMessage,
  searchAllMessages,
  searchMessages,
  sendMessage
} from "../controllers/message.controller.js";
import { arcjetProtection } from "../middleware/arcjet.middleware.js";
import { protectRoute, requireMember } from "../middleware/auth.middleware.js";
import upload from "../middleware/multer.middleware.js";

const router = express.Router();

router.use(arcjetProtection, protectRoute, requireMember);

router.get("/contacts", getAllContacts);
router.get("/chats", getChatPartners);

// Search routes (must be before /:id to avoid conflicts)
router.get("/search", searchAllMessages);
router.get("/search/:partnerId", searchMessages);


router.get("/:id/media", getSharedMedia);
router.get("/:id", getMessagesByUserId);
router.post("/send/:id", upload.fields([{ name: 'image', maxCount: 1 }, { name: 'audio', maxCount: 1 }]), sendMessage);

// Mark all messages from a partner as read
router.post("/read/:partnerId", markAsRead);

// Mark individual message as read
router.put("/:messageId/read", markMessageAsRead);

// React to a message
router.put("/:messageId/react", reactToMessage);


export default router;
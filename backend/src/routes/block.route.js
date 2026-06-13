import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
    blockUser,
    unblockUser,
    getBlockedUsers,
    spamUser,
    unspamUser,
    getSpammedUsers,
    checkIfBlockedBy,
} from "../controllers/block.controller.js";

const router = express.Router();

// All routes require authentication
router.use(protectRoute);

// Block a user
router.post("/block/:userToBlockId", blockUser);

// Unblock a user
router.post("/unblock/:userToUnblockId", unblockUser);

// Get list of blocked users
router.get("/list", getBlockedUsers);

// Spam a user
router.post("/spam/:userToSpamId", spamUser);

// Unspam a user
router.post("/unspam/:userToUnspamId", unspamUser);

// Get list of spammed users
router.get("/spam/list", getSpammedUsers);

// Check if blocked by another user
router.get("/check/:otherUserId", checkIfBlockedBy);

export default router;


import {
    blockUserService,
    unblockUserService,
    getBlockedUsersService,
    spamUserService,
    unspamUserService,
    getSpammedUsersService,
    checkIfBlockedByService,
} from "../services/block.service.js";

/**
 * Block a user
 */
export const blockUser = async (req, res) => {
    try {
        const userId = req.user._id;
        const { userToBlockId } = req.params;

        const result = await blockUserService(userId, userToBlockId);
        res.status(200).json(result);
    } catch (error) {
        console.error("blockUser:", error);
        res.status(error.statusCode || 500).json({
            message: error.message || "Server error",
        });
    }
};

/**
 * Unblock a user
 */
export const unblockUser = async (req, res) => {
    try {
        const userId = req.user._id;
        const { userToUnblockId } = req.params;

        const result = await unblockUserService(userId, userToUnblockId);
        res.status(200).json(result);
    } catch (error) {
        console.error("unblockUser:", error);
        res.status(error.statusCode || 500).json({
            message: error.message || "Server error",
        });
    }
};

/**
 * Get blocked users list
 */
export const getBlockedUsers = async (req, res) => {
    try {
        const userId = req.user._id;
        const blockedUsers = await getBlockedUsersService(userId);
        res.status(200).json(blockedUsers);
    } catch (error) {
        console.error("getBlockedUsers:", error);
        res.status(error.statusCode || 500).json({
            message: error.message || "Server error",
        });
    }
};

/**
 * Mark a user as spam
 */
export const spamUser = async (req, res) => {
    try {
        const userId = req.user._id;
        const { userToSpamId } = req.params;

        const result = await spamUserService(userId, userToSpamId);
        res.status(200).json(result);
    } catch (error) {
        console.error("spamUser:", error);
        res.status(error.statusCode || 500).json({
            message: error.message || "Server error",
        });
    }
};

/**
 * Unmark a user as spam
 */
export const unspamUser = async (req, res) => {
    try {
        const userId = req.user._id;
        const { userToUnspamId } = req.params;

        const result = await unspamUserService(userId, userToUnspamId);
        res.status(200).json(result);
    } catch (error) {
        console.error("unspamUser:", error);
        res.status(error.statusCode || 500).json({
            message: error.message || "Server error",
        });
    }
};

/**
 * Get spammed users list
 */
export const getSpammedUsers = async (req, res) => {
    try {
        const userId = req.user._id;
        const spammedUsers = await getSpammedUsersService(userId);
        res.status(200).json(spammedUsers);
    } catch (error) {
        console.error("getSpammedUsers:", error);
        res.status(error.statusCode || 500).json({
            message: error.message || "Server error",
        });
    }
};

/**
 * Check if current user is blocked by another user
 */
export const checkIfBlockedBy = async (req, res) => {
    try {
        const userId = req.user._id;
        const { otherUserId } = req.params;

        const result = await checkIfBlockedByService(userId, otherUserId);
        res.status(200).json(result);
    } catch (error) {
        console.error("checkIfBlockedBy:", error);
        res.status(error.statusCode || 500).json({
            message: error.message || "Server error",
        });
    }
};

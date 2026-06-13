import User from "../models/User.js";
import { AppError } from "./AppError.js";

/**
 * Block a user (mark as spam)
 */
export const blockUserService = async (userId, userToBlockId) => {
    if (userId === userToBlockId) {
        throw new AppError("Cannot block yourself", 400);
    }

    const user = await User.findById(userId);
    if (!user) {
        throw new AppError("User not found", 404);
    }

    const userToBlock = await User.findById(userToBlockId);
    if (!userToBlock) {
        throw new AppError("User to block not found", 404);
    }

    // Check if already blocked
    if (user.blockedUsers.includes(userToBlockId)) {
        throw new AppError("User is already blocked", 400);
    }

    // Remove from spam list if exists
    user.spammedUsers = user.spammedUsers.filter(
        (id) => id.toString() !== userToBlockId.toString()
    );

    // Add to blocked list
    user.blockedUsers.push(userToBlockId);
    await user.save();

    return {
        success: true,
        message: "User blocked successfully",
    };
};

/**
 * Unblock a user (remove spam flag)
 */
export const unblockUserService = async (userId, userToUnblockId) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new AppError("User not found", 404);
    }

    // Check if user is blocked
    if (!user.blockedUsers.includes(userToUnblockId)) {
        throw new AppError("User is not blocked", 400);
    }

    // Remove from blocked list
    user.blockedUsers = user.blockedUsers.filter(
        (id) => id.toString() !== userToUnblockId.toString()
    );
    await user.save();

    return {
        success: true,
        message: "User unblocked successfully",
    };
};

/**
 * Get list of blocked users
 */
export const getBlockedUsersService = async (userId) => {
    const user = await User.findById(userId).populate(
        "blockedUsers",
        "fullName email profilePic"
    );

    if (!user) {
        throw new AppError("User not found", 404);
    }

    return user.blockedUsers || [];
};

/**
 * Mark a user as spam (messages go to unread)
 */
export const spamUserService = async (userId, userToSpamId) => {
    if (userId === userToSpamId) {
        throw new AppError("Cannot spam yourself", 400);
    }

    const user = await User.findById(userId);
    if (!user) {
        throw new AppError("User not found", 404);
    }

    const userToSpam = await User.findById(userToSpamId);
    if (!userToSpam) {
        throw new AppError("User to spam not found", 404);
    }

    // Check if already spammed
    if (user.spammedUsers.includes(userToSpamId)) {
        throw new AppError("User is already marked as spam", 400);
    }

    // Remove from blocked if exists
    user.blockedUsers = user.blockedUsers.filter(
        (id) => id.toString() !== userToSpamId.toString()
    );

    // Add to spam list
    user.spammedUsers.push(userToSpamId);
    await user.save();

    return {
        success: true,
        message: "User marked as spam successfully",
    };
};

/**
 * Unmark a user as spam
 */
export const unspamUserService = async (userId, userToUnspamId) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new AppError("User not found", 404);
    }

    // Check if user is spammed
    if (!user.spammedUsers.includes(userToUnspamId)) {
        throw new AppError("User is not marked as spam", 400);
    }

    // Remove from spam list
    user.spammedUsers = user.spammedUsers.filter(
        (id) => id.toString() !== userToUnspamId.toString()
    );
    await user.save();

    return {
        success: true,
        message: "User unmarked as spam successfully",
    };
};

/**
 * Get list of spammed users
 */
export const getSpammedUsersService = async (userId) => {
    const user = await User.findById(userId).populate(
        "spammedUsers",
        "fullName email profilePic"
    );

    if (!user) {
        throw new AppError("User not found", 404);
    }

    return user.spammedUsers || [];
};

/**
 * Check if current user is blocked by another user
 */
export const checkIfBlockedByService = async (userId, otherUserId) => {
    const otherUser = await User.findById(otherUserId);
    if (!otherUser) {
        throw new AppError("User not found", 404);
    }

    const isBlocked = otherUser.blockedUsers && otherUser.blockedUsers.includes(userId);
    return { isBlocked };
};

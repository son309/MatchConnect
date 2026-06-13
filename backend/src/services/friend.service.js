import User from "../models/User.js";
import { AppError } from "./AppError.js";

const populateFields = "fullName email profilePic";

/**
 * Send a friend request from sender to receiver
 */
export const sendFriendRequestService = async (senderId, receiverId) => {
    if (senderId.equals(receiverId)) {
        throw new AppError("Can't send friend request to yourself", 400);
    }

    const [sender, receiver] = await Promise.all([
        User.findById(senderId),
        User.findById(receiverId),
    ]);

    if (!receiver) {
        throw new AppError("User not found", 404);
    }

    if (sender.friends.some((id) => id.equals(receiverId))) {
        throw new AppError("Already friends", 400);
    }

    if (sender.sentFriendRequests.some((id) => id.equals(receiverId))) {
        throw new AppError("Friend request already sent", 400);
    }

    if (receiver.friendRequests.some((id) => id.equals(senderId))) {
        throw new AppError("Friend request already exists", 400);
    }

    sender.sentFriendRequests.push(receiverId);
    receiver.friendRequests.push(senderId);

    await Promise.all([sender.save(), receiver.save()]);

    return { senderId, receiverId };
};

/**
 * Accept a friend request
 */
export const acceptFriendRequestService = async (receiverId, senderId) => {
    const [receiver, sender] = await Promise.all([
        User.findById(receiverId),
        User.findById(senderId),
    ]);

    if (!sender) {
        throw new AppError("User not found", 404);
    }

    if (!receiver) {
        throw new AppError("Receiver not found", 404);
    }

    if (!receiver.friendRequests.some((id) => id.equals(senderId))) {
        throw new AppError("Friend request not found", 400);
    }

    // Remove from pending requests
    receiver.friendRequests = receiver.friendRequests.filter(
        (id) => !id.equals(senderId)
    );
    sender.sentFriendRequests = sender.sentFriendRequests.filter(
        (id) => !id.equals(receiverId)
    );

    // Add to friends
    receiver.friends.push(senderId);
    sender.friends.push(receiverId);

    await Promise.all([receiver.save(), sender.save()]);

    return { receiverId, senderId };
};

/**
 * Reject a friend request
 */
export const rejectFriendRequestService = async (receiverId, senderId) => {
    const [receiver, sender] = await Promise.all([
        User.findById(receiverId),
        User.findById(senderId),
    ]);

    if (!sender) {
        throw new AppError("User not found", 404);
    }

    if (!receiver) {
        throw new AppError("Receiver not found", 404);
    }

    receiver.friendRequests = receiver.friendRequests.filter(
        (id) => !id.equals(senderId)
    );
    sender.sentFriendRequests = sender.sentFriendRequests.filter(
        (id) => !id.equals(receiverId)
    );

    await Promise.all([receiver.save(), sender.save()]);

    return { receiverId, senderId };
};

/**
 * Cancel a sent friend request
 */
export const cancelFriendRequestService = async (senderId, receiverId) => {
    const [sender, receiver] = await Promise.all([
        User.findById(senderId),
        User.findById(receiverId),
    ]);

    if (!receiver) {
        throw new AppError("User not found", 404);
    }

    if (!sender) {
        throw new AppError("Sender not found", 404);
    }

    sender.sentFriendRequests = sender.sentFriendRequests.filter(
        (id) => !id.equals(receiverId)
    );
    receiver.friendRequests = receiver.friendRequests.filter(
        (id) => !id.equals(senderId)
    );

    await Promise.all([sender.save(), receiver.save()]);

    return { senderId, receiverId };
};

/**
 * Remove a friend
 */
export const removeFriendService = async (userId, friendId) => {
    const [user, friend] = await Promise.all([
        User.findById(userId),
        User.findById(friendId),
    ]);

    if (!friend) {
        throw new AppError("Friend not found", 404);
    }

    if (!user.friends.some((id) => id.equals(friendId))) {
        throw new AppError("Not a friend", 400);
    }

    user.friends = user.friends.filter((id) => !id.equals(friendId));
    friend.friends = friend.friends.filter((id) => !id.equals(userId));

    await Promise.all([user.save(), friend.save()]);

    return { userId, friendId };
};

/**
 * Get friend requests for a user
 */
export const getFriendRequestsService = async (userId) => {
    const user = await User.findById(userId).populate({
        path: "friendRequests",
        select: populateFields,
    });

    return user.friendRequests || [];
};

/**
 * Get sent friend requests for a user
 */
export const getSentRequestsService = async (userId) => {
    const user = await User.findById(userId).populate({
        path: "sentFriendRequests",
        select: populateFields,
    });

    return user.sentFriendRequests || [];
};

/**
 * Get friends list for a user
 */
export const getFriendsService = async (userId) => {
    const user = await User.findById(userId).populate({
        path: "friends",
        select: populateFields,
    });

    return user.friends || [];
};

/**
 * Search only among friends of a user
 */
export const searchFriendsService = async (userId, query = "") => {
    const user = await User.findById(userId).populate({
        path: "friends",
        select: populateFields,
    });

    if (!user.friends || user.friends.length === 0) {
        return [];
    }

    if (!query.trim()) {
        return user.friends;
    }

    const regex = new RegExp(query, "i");

    return user.friends.filter(
        (friend) =>
            regex.test(friend.fullName) || regex.test(friend.email)
    );
};

/**
 * Search for users
 */
export const searchUsersService = async (
    userId,
    query = "",
    excludeFriends = true
) => {
    const currentUser = await User.findById(userId);
    const regex = new RegExp(query, "i");

    const candidates = await User.find({
        _id: { $ne: currentUser._id },
        $or: [{ fullName: regex }, { email: regex }],
    }).select("fullName email profilePic");

    const response = candidates
        .map((user) => {
            const isFriend = currentUser.friends.some((id) => id.equals(user._id));
            if (excludeFriends && isFriend) return null;

            const hasSentRequest = currentUser.sentFriendRequests.some((id) =>
                id.equals(user._id)
            );
            const hasReceivedRequest = currentUser.friendRequests.some((id) =>
                id.equals(user._id)
            );

            let status = "none";
            if (isFriend) status = "friend";
            else if (hasSentRequest) status = "pending";
            else if (hasReceivedRequest) status = "incoming";

            return { ...user.toObject(), status };
        })
        .filter(Boolean);

    return response;
};

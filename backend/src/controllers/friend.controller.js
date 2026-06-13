import { getReceiverSocketIds, io } from "../lib/socket.js";
import {
    sendFriendRequestService,
    acceptFriendRequestService,
    rejectFriendRequestService,
    cancelFriendRequestService,
    removeFriendService,
    getFriendRequestsService,
    getSentRequestsService,
    getFriendsService,
    searchFriendsService,
    searchUsersService,
} from "../services/friend.service.js";

// Helper to emit to all sockets of a user
function emitToUser(userId, event, data) {
    const socketIds = getReceiverSocketIds(userId);
    socketIds.forEach(socketId => {
        io.to(socketId).emit(event, data);
    });
}

export const sendFriendRequest = async (req, res) => {
    try {
        const senderId = req.user._id;
        const { userId: receiverId } = req.params;

        const result = await sendFriendRequestService(senderId, receiverId);

        // Emit socket event to all receiver sockets
        emitToUser(receiverId, "friendRequestReceived", { from: senderId });

        res.json({ message: "Friend request sent" });
    } catch (error) {
        console.error("sendFriendRequest:", error);
        res.status(error.statusCode || 500).json({ message: error.message || "Server error" });
    }
};

export const acceptFriendRequest = async (req, res) => {
    try {
        const receiverId = req.user._id;
        const { userId: senderId } = req.params;

        await acceptFriendRequestService(receiverId, senderId);

        // Emit socket event to all sender sockets
        emitToUser(senderId, "friendRequestAccepted", { by: receiverId });

        res.json({ message: "Friend request accepted" });
    } catch (error) {
        console.error("acceptFriendRequest:", error);
        res.status(error.statusCode || 500).json({ message: error.message || "Server error" });
    }
};

export const rejectFriendRequest = async (req, res) => {
    try {
        const receiverId = req.user._id;
        const { userId: senderId } = req.params;

        await rejectFriendRequestService(receiverId, senderId);

        res.json({ message: "Friend request rejected" });
    } catch (error) {
        console.error("rejectFriendRequest:", error);
        res.status(error.statusCode || 500).json({ message: error.message || "Server error" });
    }
};

export const cancelFriendRequest = async (req, res) => {
    try {
        const senderId = req.user._id;
        const { userId: receiverId } = req.params;

        await cancelFriendRequestService(senderId, receiverId);

        res.json({ message: "Friend request cancelled" });
    } catch (error) {
        console.error("cancelFriendRequest:", error);
        res.status(error.statusCode || 500).json({ message: error.message || "Server error" });
    }
};

export const removeFriend = async (req, res) => {
    try {
        const userId = req.user._id;
        const { userId: friendId } = req.params;

        await removeFriendService(userId, friendId);

        res.json({ message: "Friend removed" });
    } catch (error) {
        console.error("removeFriend:", error);
        res.status(error.statusCode || 500).json({ message: error.message || "Server error" });
    }
};

export const getFriendRequests = async (req, res) => {
    try {
        const requests = await getFriendRequestsService(req.user._id);
        res.json(requests);
    } catch (error) {
        console.error("getFriendRequests:", error);
        res.status(error.statusCode || 500).json({ message: error.message || "Server error" });
    }
};

export const getSentRequests = async (req, res) => {
    try {
        const requests = await getSentRequestsService(req.user._id);
        res.json(requests);
    } catch (error) {
        console.error("getSentRequests:", error);
        res.status(error.statusCode || 500).json({ message: error.message || "Server error" });
    }
};

export const getFriends = async (req, res) => {
    try {
        const friends = await getFriendsService(req.user._id);
        res.json(friends);
    } catch (error) {
        console.error("getFriends:", error);
        res.status(error.statusCode || 500).json({ message: error.message || "Server error" });
    }
};

export const searchUsers = async (req, res) => {
    try {
        const { q = "", excludeFriends = "true" } = req.query;
        const results = await searchUsersService(
            req.user._id,
            q,
            excludeFriends === "true"
        );
        res.json(results);
    } catch (error) {
        console.error("searchUsers:", error);
        res.status(error.statusCode || 500).json({ message: error.message || "Server error" });
    }
};

export const searchFriends = async (req, res) => {
    try {
        const { q = "" } = req.query;
        const results = await searchFriendsService(req.user._id, q);
        res.json(results);
    } catch (error) {
        console.error("searchFriends:", error);
        res.status(error.statusCode || 500).json({ message: error.message || "Server error" });
    }
};

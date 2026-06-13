import Group from "../models/Group.js";
import DatingMatch from "../models/DatingMatch.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import { AppError } from "./AppError.js";

const contactSelect = "fullName email profilePic datingProfile";

async function getDatingMatchUserIds(userId) {
    const matches = await DatingMatch.find({
        $or: [{ userA: userId }, { userB: userId }],
    }).select("userA userB");

    return matches.map((match) =>
        match.userA.toString() === userId.toString()
            ? match.userB.toString()
            : match.userA.toString()
    );
}

async function hasDatingMatch(userIdA, userIdB) {
    const first = userIdA.toString();
    const second = userIdB.toString();
    const userA = first < second ? userIdA : userIdB;
    const userB = first < second ? userIdB : userIdA;

    return Boolean(await DatingMatch.exists({ userA, userB }));
}

/**
 * Get all contacts (friends) for a user
 */
export const getAllContactsService = async (userId) => {
    const matchUserIds = await getDatingMatchUserIds(userId);
    const datingMatches = await User.find({ _id: { $in: matchUserIds } }).select(contactSelect);

    const matchContacts = datingMatches.map((match) => ({
        ...match.toObject(),
        isDatingMatch: true,
    }));

    return matchContacts;
};

/**
 * Get messages between two users
 */
export const getMessagesByUserIdService = async (myId, userToChatId) => {
    return await Message.find({
        $or: [
            { senderId: myId, receiverId: userToChatId },
            { senderId: userToChatId, receiverId: myId },
        ],
    })
        .populate("senderId", "fullName profilePic email")
        .populate("receiverId", "fullName profilePic email");
};

/**
 * Send a message via REST API (with image upload)
 * Note: Self-messages are allowed for "My Cloud" feature (personal notes/files)
 */
export const sendMessageService = async (senderId, receiverId, text, imageUrl, audioUrl) => {
    if (!text && !imageUrl && !audioUrl) {
        throw new AppError("Text, image or audio is required", 400);
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
        throw new AppError("Receiver not found", 404);
    }

    const isSelfMessage = senderId.toString() === receiverId.toString();
    if (!isSelfMessage && !(await hasDatingMatch(senderId, receiverId))) {
        throw new AppError("You can only message users after matching", 403);
    }

    // Check if receiver has blocked the sender
    if (receiver.blockedUsers && receiver.blockedUsers.includes(senderId)) {
        throw new AppError("You cannot send messages to this user", 403);
    }

    const newMessage = new Message({
        senderId,
        receiverId,
        text,
        image: imageUrl,
        audio: audioUrl,
    });
    await newMessage.save();
    return newMessage;
};

/**
 * Get all chat partners for a user with last message info and unread count
 */
export const getChatPartnersService = async (userId) => {
    // Only get direct messages (exclude group messages which have groupId)
    const messages = await Message.find({
        groupId: null,
        $or: [{ senderId: userId }, { receiverId: userId }],
    }).sort({ createdAt: -1 });

    // Group messages by chat partner
    const chatPartnerMap = new Map();

    messages.forEach((msg) => {
        // Skip messages without receiverId (safety check)
        if (!msg.receiverId) return;

        const partnerId = msg.senderId.toString() === userId.toString()
            ? msg.receiverId.toString()
            : msg.senderId.toString();

        if (!chatPartnerMap.has(partnerId)) {
            chatPartnerMap.set(partnerId, {
                partnerId,
                lastMessage: msg,
                unreadCount: 0,
            });
        }

        // Count unread messages (messages sent TO this user that are not read)
        if (msg.receiverId.toString() === userId.toString() && !msg.isRead) {
            const partnerData = chatPartnerMap.get(partnerId);
            partnerData.unreadCount += 1;
        }
    });

    const matchUserIds = await getDatingMatchUserIds(userId);
    const matchIdSet = new Set(matchUserIds);
    const selfChatIds = chatPartnerMap.has(userId.toString()) ? [userId.toString()] : [];
    const chatPartnerIds = [...new Set([...matchUserIds, ...selfChatIds])];

    const chatPartners = await User.find({ _id: { $in: chatPartnerIds } }).select(
        "-password"
    );

    // Combine user data with last message info
    const result = chatPartners.map((partner) => {
        const partnerData = chatPartnerMap.get(partner._id.toString());
        return {
            _id: partner._id,
            fullName: partner.fullName,
            email: partner.email,
            profilePic: partner.profilePic,
            datingProfile: partner.datingProfile,
            isDatingMatch: matchIdSet.has(partner._id.toString()),
            isOnline: partner.isOnline || false,
            lastMessage: partnerData?.lastMessage?.text || "",
            lastMessageTime: partnerData?.lastMessage?.createdAt || "",
            unreadCount: partnerData?.unreadCount || 0,
        };
    });

    // Sort by last message time (most recent first)
    result.sort((a, b) => {
        const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
        const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
        return timeB - timeA;
    });

    return result;
};
//username: partner.username,
//avatar: partner.avatar,
/**
 * Mark all messages from a partner as read
 */
export const markMessagesAsReadService = async (myUserId, partnerId) => {
    if (!partnerId) {
        throw new AppError("Partner ID is required", 400);
    }

    const result = await Message.updateMany(
        {
            senderId: partnerId,
            receiverId: myUserId,
            isRead: false,
        },
        { $set: { isRead: true } }
    );

    return {
        partnerId,
        myUserId: myUserId.toString(),
        updatedCount: result.modifiedCount,
    };
};

/**
 * Mark a single message as read by its ID
 */
export const markSingleMessageAsReadService = async (messageId) => {
    const message = await Message.findByIdAndUpdate(
        messageId,
        { isRead: true },
        { new: true }
    );

    if (!message) {
        throw new AppError("Message not found", 404);
    }

    return message;
};

/**
 * Add or remove a reaction to/from a message
 */
export const reactToMessageService = async (messageId, userId, emoji) => {
    const message = await Message.findById(messageId);
    if (!message) {
        throw new AppError("Message not found", 404);
    }

    // Check if user already reacted
    const existingReactionIndex = message.reactions.findIndex(
        (reaction) => reaction.userId.toString() === userId.toString()
    );

    if (existingReactionIndex > -1) {
        // If same emoji, remove reaction (toggle off)
        if (message.reactions[existingReactionIndex].emoji === emoji) {
            message.reactions.splice(existingReactionIndex, 1);
        } else {
            // If different emoji, update it
            message.reactions[existingReactionIndex].emoji = emoji;
        }
    } else {
        // Add new reaction
        message.reactions.push({ emoji, userId });
    }

    await message.save();
    return message;
};

/**
 * Search messages between two users by text content
 */
export const searchMessagesService = async (myId, partnerId, searchQuery) => {
    if (!searchQuery || searchQuery.trim() === "") {
        return [];
    }

    const searchRegex = new RegExp(searchQuery.trim(), "i");

    const messages = await Message.find({
        $and: [
            {
                $or: [
                    { senderId: myId, receiverId: partnerId },
                    { senderId: partnerId, receiverId: myId },
                ],
            },
            {
                text: { $regex: searchRegex },
            },
        ],
    })
        .populate("senderId", "fullName profilePic email")
        .populate("receiverId", "fullName profilePic email")
        .sort({ createdAt: -1 })
        .limit(50);

    return messages;
};

/**
 * Search all messages for a user across all conversations
 */
export const searchAllMessagesService = async (userId, searchQuery) => {
    if (!searchQuery || searchQuery.trim() === "") {
        return [];
    }

    const searchRegex = new RegExp(searchQuery.trim(), "i");

    const messages = await Message.find({
        $and: [
            {
                $or: [
                    { senderId: userId },
                    { receiverId: userId },
                ],
            },
            {
                text: { $regex: searchRegex },
            },
        ],
    })
        .populate("senderId", "fullName profilePic email")
        .populate("receiverId", "fullName profilePic email")
        .sort({ createdAt: -1 })
        .limit(100);

    return messages;
};

// ==================== GROUP MESSAGE SERVICES ====================

/**
 * Get messages for a group
 */
export const getGroupMessagesService = async (groupId, userId) => {
    // Verify user is a member of the group
    const group = await Group.findOne({ _id: groupId, members: userId });
    if (!group) {
        throw new AppError("Group not found or you are not a member", 404);
    }

    const messages = await Message.find({ groupId })
        .populate("senderId", "fullName profilePic email")
        .sort({ createdAt: 1 });


    // Mark all messages in this group as read by this user
    await Message.updateMany(
        {
            groupId,
            senderId: { $ne: userId },
            readBy: { $ne: userId }
        },
        {
            $addToSet: { readBy: userId }
        }
    );

    return messages;
};


export const getSharedMediaService = async (authUserId, otherUserId) => {
    const images = await Message.find({
        $or: [
            { senderId: authUserId, receiverId: otherUserId },
            { senderId: otherUserId, receiverId: authUserId },
        ],
        image: { $ne: null },
    })
        .select("image messageId createdAt")
        .sort({ createdAt: -1 });

    return images;
};

/**
 * Send a message to a group
 */
export const sendGroupMessageService = async ({ senderId, groupId, text, imageUrl, audioUrl }) => {
    if (!text && !imageUrl && !audioUrl) {
        throw new AppError("Text, image or audio is required", 400);
    }

    // Verify user is a member of the group
    const group = await Group.findOne({ _id: groupId, members: senderId });
    if (!group) {
        throw new AppError("Group not found or you are not a member", 404);
    }

    const newMessage = new Message({
        senderId,
        groupId,
        text,
        image: imageUrl,
        audio: audioUrl,
    });

    await newMessage.save();

    // Populate sender info before returning
    await newMessage.populate("senderId", "fullName profilePic email");

    return { message: newMessage, group };
};

/**
 * Xóa toàn bộ cuộc trò chuyện giữa người dùng hiện tại và người chat
 */
export const deleteConversationService = async (myId, partnerId) => {
    if (!partnerId) {
        throw new AppError("Partner ID is required", 400);
    }

    const result = await Message.deleteMany({
        groupId: null, // Chỉ xóa tin nhắn 1-1, không xóa tin nhắn nhóm
        $or: [
            { senderId: myId, receiverId: partnerId },
            { senderId: partnerId, receiverId: myId },
        ],
    });

    if (result.deletedCount === 0) {
        throw new AppError("No conversation found to delete", 404);
    }

    return {
        success: true,
        message: "Conversation deleted successfully",
        deletedCount: result.deletedCount,
    };
};


/** * Xóa toàn bộ cuộc trò chuyện nhóm
 */
export const deleteGroupConversationService = async (groupId, userId) => {
    if (!groupId) {
        throw new AppError("Group ID is required", 400);
    }

    //Kiểm tra xem nhóm có tồn tại và người dùng có phải thành viên k
    const group = await Group.findById(groupId);
    if (!group) {
        throw new AppError("Group not found", 404);
    }


    //Xóa tất cả tin nhắn có groupId 
    const result = await Message.deleteMany({ groupId: groupId });

    return {
        success: true,
        message: "Group conversation history deleted successfully",
        deletedCount: result.deletedCount,
    };
};

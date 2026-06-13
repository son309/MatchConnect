import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuth } from "./AuthContext";
import { useSocket } from "./SocketContext";

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
    // --- STATE ---
    const [allContacts, setAllContacts] = useState([]);
    const [homeStats, setHomeStats] = useState({ calls: [], chats: [], notes: [] });
    const [messages, setMessages] = useState([]);

    const [selectedUser, _setSelectedUser] = useState(null);
    const [isUsersLoading, setIsUsersLoading] = useState(false);
    const [isMessagesLoading, setIsMessagesLoading] = useState(false);
    const [isSoundEnabled, setIsSoundEnabled] = useState(
        () => JSON.parse(localStorage.getItem("isSoundEnabled")) === true
    );

    const { authUser } = useAuth();
    const { socket } = useSocket();

    // --- HELPERS SẮP XẾP ---

    // 1. Sắp xếp Tin nhắn trong khung chat (Cũ ở trên - Mới nhất ở dưới cùng)
    const sortMessagesChronologically = useCallback((msgs) => {
        return [...msgs].sort((a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
    }, []);

    // 2. Sắp xếp Sidebar (My Cloud luôn trên cùng - Còn lại theo thời gian mới nhất)
    const sortChatsWithCloudOnTop = useCallback((chats) => {
        return [...chats].sort((a, b) => {
            if (a.isSelfChat) return -1;
            if (b.isSelfChat) return 1;
            const timeA = new Date(a.lastMessageTime || 0).getTime();
            const timeB = new Date(b.lastMessageTime || 0).getTime();
            return timeB - timeA;
        });
    }, []);

    // --- HỘI THOẠI ẢO & CHỌN USER ---
    const setSelectedUser = useCallback((user) => {
        if (!user) {
            _setSelectedUser(null);
            return;
        }

        const isSelf = authUser?._id === user._id;
        const normalizedUser = {
            ...user,
            fullName: isSelf ? authUser.fullName : (user.fullName || user.username || "Unknown"),
            isSelfChat: isSelf
        };

        _setSelectedUser(normalizedUser);

        if (!isSelf) {
            markAsRead(user._id);
        }

        setHomeStats((prev) => {
            const updatedChats = prev.chats.map(chat =>
                chat._id === user._id ? { ...chat, unreadCount: 0 } : chat
            );
            const isExist = prev.chats.some((chat) => chat._id === user._id);
            if (!isExist) {
                const newChatEntry = {
                    ...normalizedUser,
                    profilePic: isSelf ? "https://cdn-icons-png.flaticon.com/512/4144/4144099.png" : (user.profilePic || user.avatar),
                    lastMessage: "",
                    lastMessageTime: new Date().toISOString(),
                    unreadCount: 0,
                    isOnline: true,
                    isSelfChat: isSelf,
                };
                return { ...prev, chats: sortChatsWithCloudOnTop([newChatEntry, ...prev.chats]) };
            }
            return prev;
        });
    }, [authUser, sortChatsWithCloudOnTop]);

    // --- CONTACTS & STATS ---
    const getHomeStats = useCallback(async () => {
        const formatTimeAgo = (dateStr) => {
            if (!dateStr) return "";
            const date = new Date(dateStr);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            if (diffMins < 1) return "Just now";
            if (diffMins < 60) return `${diffMins}m ago`;
            if (Math.floor(diffMs / 3600000) < 24) return `${Math.floor(diffMs / 3600000)}h ago`;
            return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        };

        try {
            const res = await axiosInstance.get("/messages/chats");
            let chatPartners = Array.isArray(res.data) ? res.data : [];

            let chats = chatPartners.map((partner) => {
                const isSelfChat = authUser && partner._id === authUser._id;
                return {
                    ...partner,
                    name: isSelfChat ? authUser.fullName : (partner.fullName || partner.username || "Unknown"),
                    avatar: isSelfChat
                        ? "https://cdn-icons-png.flaticon.com/512/4144/4144099.png"
                        : (partner.avatar || partner.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(partner.fullName || "U")}&background=random`),
                    lastMessage: partner.lastMessage || "",
                    time: formatTimeAgo(partner.lastMessageTime),
                    unreadCount: partner.unreadCount || 0,
                    isOnline: isSelfChat ? true : (partner.isOnline || false),
                    isSelfChat: isSelfChat,
                };
            });

            // Luôn đảm bảo My Cloud hiện diện ngay khi đăng nhập
            if (chats.findIndex(chat => chat.isSelfChat) === -1 && authUser) {
                chats.push({
                    _id: authUser._id,
                    name: authUser.fullName,
                    fullName: authUser.fullName,
                    email: authUser.email,
                    avatar: "https://cdn-icons-png.flaticon.com/512/4144/4144099.png",
                    profilePic: "https://cdn-icons-png.flaticon.com/512/4144/4144099.png",
                    lastMessage: "Hộp thư cá nhân",
                    lastMessageTime: null,
                    unreadCount: 0,
                    isOnline: true,
                    isSelfChat: true,
                });
            }

            setHomeStats({ calls: [], chats: sortChatsWithCloudOnTop(chats), notes: [] });
        } catch (error) {
            console.error("Failed to load home stats:", error);
        }
    }, [authUser, sortChatsWithCloudOnTop]);

    // --- MESSAGES LOGIC ---

    const markAsRead = useCallback(async (partnerId) => {
        try {
            await axiosInstance.post(`/messages/read/${partnerId}`);
            setHomeStats((prev) => ({
                ...prev,
                chats: prev.chats.map((chat) =>
                    chat._id === partnerId ? { ...chat, unreadCount: 0 } : chat
                ),
            }));
            if (socket) socket.emit("markAsRead", { partnerId });
        } catch (error) {
            console.log("Error marking messages as read:", error);
        }
    }, [socket]);

    const getMessagesByUserId = useCallback(async (userId) => {
        setIsMessagesLoading(true);
        setMessages([]);
        if (!userId) {
            setIsMessagesLoading(false);
            return;
        }
        try {
            const res = await axiosInstance.get(`/messages/${userId}`);
            // Sắp xếp tin nhắn cũ -> mới trước khi render
            const sortedMsgs = sortMessagesChronologically(Array.isArray(res.data) ? res.data : []);
            setMessages(sortedMsgs);
            markAsRead(userId);
        } catch (error) {
            toast.error("Failed to load messages");
        } finally {
            setIsMessagesLoading(false);
        }
    }, [markAsRead, sortMessagesChronologically]);

    const sendMessage = useCallback(async (receiverId, formData) => {
        try {
            const res = await axiosInstance.post(`/messages/send/${receiverId}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const newMessage = res.data;
            setMessages((prev) => sortMessagesChronologically([...prev, newMessage]));

            setHomeStats((prev) => {
                const updatedChats = prev.chats.map((chat) =>
                    chat._id === receiverId
                        ? {
                            ...chat,
                            lastMessage: newMessage.text || "Sent an image",
                            lastMessageTime: newMessage.createdAt
                        }
                        : chat
                );
                return { ...prev, chats: sortChatsWithCloudOnTop(updatedChats) };
            });
        } catch (error) {
            toast.error("Failed to send message");
        }
    }, [axiosInstance, sortChatsWithCloudOnTop, sortMessagesChronologically]);

    const reactToMessage = useCallback(async (messageId, emoji) => {
        try {
            const res = await axiosInstance.put(`/messages/${messageId}/react`, { emoji });
            const updatedMessage = res.data;

            setMessages((prev) =>
                prev.map((msg) => (msg._id === messageId ? { ...msg, reactions: updatedMessage.reactions } : msg))
            );

            if (socket && selectedUser) {
                socket.emit("sendMessageReaction", {
                    messageId,
                    emoji,
                    receiverId: selectedUser._id
                });
            }
        } catch (error) {
            toast.error("Failed to react to message");
        }
    }, [socket, selectedUser]);

    const getSharedMedia = useCallback(async (partnerId) => {
        try {
            const res = await axiosInstance.get(`/messages/${partnerId}/media`);
            return res.data;
        } catch (error) {
            console.error("Failed to get shared media:", error);
            // toast.error("Failed to load shared media"); // Optional toast
            return [];
        }
    }, [axiosInstance]);

    // --- SOCKET LISTENERS ---
    useEffect(() => {
        if (socket && authUser) {

            socket.on("newMessage", (message) => {
                const senderId = message.senderId?._id || message.senderId;
                if (senderId === authUser._id) return;

                // Kiểm tra xem sender có phải là người đang chat trực tiếp không
                const isFromSelectedUser = selectedUser && String(senderId) === String(selectedUser._id);

                if (isFromSelectedUser) {
                    setMessages((prev) => sortMessagesChronologically([...prev, message]));
                    markAsRead(selectedUser._id);
                }

                setHomeStats((prev) => {
                    const chatExists = prev.chats.find((c) => c._id === senderId);

                    if (chatExists) {
                        const updatedChats = prev.chats.map((chat) => {
                            if (chat._id === senderId) {
                                return {
                                    ...chat,
                                    unreadCount: isFromSelectedUser ? 0 : (chat.unreadCount || 0) + 1, // Logic chấm đỏ
                                    lastMessage: message.text || "Sent an image",
                                    lastMessageTime: message.createdAt // Cập nhật thời gian để sắp xếp
                                };
                            }
                            return chat;
                        });
                        // Đẩy hội thoại vừa có tin nhắn lên đầu (ngay sau Cloud)
                        return { ...prev, chats: sortChatsWithCloudOnTop(updatedChats) };
                    } else {
                        getHomeStats(); // Load lại nếu là người lạ
                        return prev;
                    }
                });
            });

            socket.on("messagesRead", (data) => {
                setMessages((prev) => prev.map((msg) =>
                    (msg.senderId === authUser._id || msg.senderId?._id === authUser._id) &&
                        (msg.receiverId === data.partnerId || msg.receiverId?._id === data.partnerId)
                        ? { ...msg, isRead: true } : msg
                ));
            });

            socket.on("messageReaction", (updatedMessage) => {
                setMessages((prev) =>
                    prev.map((msg) =>
                        msg._id === updatedMessage._id ? { ...msg, reactions: updatedMessage.reactions } : msg
                    )
                );
            });

            socket.on("dating:match", () => {
                getHomeStats();
            });

            socket.on("dating:unmatch", ({ userId }) => {
                setHomeStats((prev) => ({
                    ...prev,
                    chats: prev.chats.filter((chat) => chat._id !== userId),
                }));

                if (selectedUser?._id === userId || selectedUser?.id === userId) {
                    _setSelectedUser(null);
                    setMessages([]);
                }
            });

            return () => {
                socket.off("newMessage");
                socket.off("messagesRead");
                socket.off("messageReaction");
                socket.off("dating:match");
                socket.off("dating:unmatch");
            };
        }
    }, [socket, authUser, selectedUser, markAsRead, getHomeStats, sortChatsWithCloudOnTop, sortMessagesChronologically]);

    // --- CÁC HÀM KHÁC ---
    const getAllContacts = useCallback(async () => {
        setIsUsersLoading(true);
        try {
            const res = await axiosInstance.get("/messages/contacts");
            setAllContacts(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            toast.error("Failed to load contacts");
        } finally {
            setIsUsersLoading(false);
        }
    }, []);

    const toggleSound = useCallback(() => {
        setIsSoundEnabled(prev => !prev);
        localStorage.setItem("isSoundEnabled", !isSoundEnabled);
    }, [isSoundEnabled]);

    const value = {
        allContacts, homeStats, isUsersLoading, getAllContacts, getHomeStats,
        messages, isMessagesLoading, getMessagesByUserId, sendMessage, markAsRead, reactToMessage, getSharedMedia,
        selectedUser, setSelectedUser, isSoundEnabled, toggleSound
    };

    return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = () => {
    const context = useContext(ChatContext);
    if (context === undefined) {
        throw new Error("useChat must be used within ChatProvider");
    }
    return context;
};

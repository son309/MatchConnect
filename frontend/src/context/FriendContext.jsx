import {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
} from "react";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { useAuth } from "./AuthContext";
import { useSocket } from "./SocketContext";

const FriendContext = createContext();

export const FriendProvider = ({ children }) => {
    const [friends, setFriends] = useState([]);
    const [friendRequests, setFriendRequests] = useState([]);
    const [sentRequests, setSentRequests] = useState([]);
    const [isFriendActionLoading, setIsFriendActionLoading] = useState(false);

    const { authUser } = useAuth();
    const { socket } = useSocket();

    // --- FETCH FUNCTIONS ---
    const getFriends = useCallback(async () => {
        try {
            const res = await axiosInstance.get("/friends/list");
            // Ensure we always set an array, even if API returns unexpected data
            setFriends(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            toast.error(
                error.response?.data?.message ||
                error.message ||
                "Failed to load friends"
            );
        }
    }, []);

    const getFriendRequests = useCallback(async () => {
        try {
            const res = await axiosInstance.get("/friends/requests");
            // Ensure we always set an array, even if API returns unexpected data
            setFriendRequests(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            toast.error(
                error.response?.data?.message || "Failed to load friend requests"
            );
        }
    }, []);

    const getSentRequests = useCallback(async () => {
        try {
            const res = await axiosInstance.get("/friends/requests/sent");
            // Ensure we always set an array, even if API returns unexpected data
            setSentRequests(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error("Failed to load sent requests", error);
            toast.error(
                error.response?.data?.message || "Failed to load sent requests"
            );
        }
    }, []);

    // --- ACTION FUNCTIONS ---
    const searchUsers = useCallback(async (keyword) => {
        const res = await axiosInstance.get("/friends/search", {
            params: { q: keyword },
        });
        return res.data;
    }, []);

    const sendFriendRequest = useCallback(
        async (userId) => {
            try {
                setIsFriendActionLoading(true);
                await axiosInstance.post(`/friends/request/${userId}`);
                toast.success("Friend request sent successfully");
                await Promise.all([getFriendRequests(), getFriends(), getSentRequests()]);
            } catch (error) {
                toast.error(
                    error.response?.data?.message || "Failed to send friend request"
                );
                throw error;
            } finally {
                setIsFriendActionLoading(false);
            }
        },
        [getFriendRequests, getFriends, getSentRequests]
    );

    const acceptFriendRequest = useCallback(
        async (userId) => {
            try {
                setIsFriendActionLoading(true);
                await axiosInstance.post(`/friends/accept/${userId}`);
                toast.success("Friend request accepted");
                await Promise.all([getFriendRequests(), getFriends()]);
            } catch (error) {
                toast.error(
                    error.response?.data?.message || "Failed to accept friend request"
                );
                throw error;
            } finally {
                setIsFriendActionLoading(false);
            }
        },
        [getFriendRequests, getFriends]
    );

    const rejectFriendRequest = useCallback(
        async (userId) => {
            try {
                setIsFriendActionLoading(true);
                await axiosInstance.post(`/friends/reject/${userId}`);
                toast.success("Friend request rejected");
                await getFriendRequests();
            } catch (error) {
                toast.error(
                    error.response?.data?.message || "Failed to reject friend request"
                );
                throw error;
            } finally {
                setIsFriendActionLoading(false);
            }
        },
        [getFriendRequests]
    );

    const cancelFriendRequest = useCallback(
        async (userId) => {
            try {
                setIsFriendActionLoading(true);
                await axiosInstance.post(`/friends/cancel/${userId}`);
                toast.success("Friend request cancelled");
                await Promise.all([getFriendRequests(), getSentRequests()]);
            } catch (error) {
                toast.error(
                    error.response?.data?.message || "Failed to cancel friend request"
                );
                throw error;
            } finally {
                setIsFriendActionLoading(false);
            }
        },
        [getFriendRequests, getSentRequests]
    );

    const removeFriend = useCallback(
        async (userId) => {
            try {
                setIsFriendActionLoading(true);
                await axiosInstance.delete(`/friends/remove/${userId}`);
                toast.success("Friend removed");
                await getFriends();
            } catch (error) {
                toast.error(error.response?.data?.message || "Failed to remove friend");
                throw error;
            } finally {
                setIsFriendActionLoading(false);
            }
        },
        [getFriends]
    );

    // --- EFFECTS ---
    // Load friends and requests when user logs in
    useEffect(() => {
        if (authUser) {
            getFriends();
            getFriendRequests();
            getSentRequests();
        }
    }, [authUser, getFriends, getFriendRequests, getSentRequests]);

    // Setup socket listeners for friend events
    useEffect(() => {
        if (socket && authUser) {
            socket.on("friendRequestReceived", async () => {
                await getFriendRequests();
            });

            socket.on("friendRemoved", async () => {
                await getFriends();
            });

            socket.on("friendRequestAccepted", async () => {
                await Promise.all([getFriends(), getFriendRequests(), getSentRequests()]);
            });

            socket.on("friendRequestCancelled", async () => {
                await getFriendRequests();
            });

            return () => {
                socket.off("friendRequestReceived");
                socket.off("friendRequestAccepted");
                socket.off("friendRemoved");
                socket.off("friendRequestCancelled");
            };
        }
    }, [socket, authUser, getFriends, getFriendRequests, getSentRequests]);

    const value = {
        friends,
        friendRequests,
        sentRequests,
        isFriendActionLoading,
        getFriends,
        getFriendRequests,
        getSentRequests,
        searchUsers,
        sendFriendRequest,
        acceptFriendRequest,
        rejectFriendRequest,
        cancelFriendRequest,
        removeFriend,
    };

    return (
        <FriendContext.Provider value={value}>{children}</FriendContext.Provider>
    );
};

export const useFriend = () => {
    const context = useContext(FriendContext);
    if (context === undefined) {
        throw new Error("useFriend must be used within FriendProvider");
    }
    return context;
};

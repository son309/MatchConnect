import {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
} from "react";
import { axiosInstance } from "../lib/axios";
import { useAuth } from "./AuthContext";
import toast from "react-hot-toast";

const BlockContext = createContext();

export const useBlock = () => {
    const context = useContext(BlockContext);
    if (!context) {
        throw new Error("useBlock must be used within a BlockProvider");
    }
    return context;
};

export const BlockProvider = ({ children }) => {
    const { authUser } = useAuth();
    const [blockedUsers, setBlockedUsers] = useState([]);
    const [spammedUsers, setSpammedUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch blocked users
    const fetchBlockedUsers = useCallback(async () => {
        if (!authUser) return;

        try {
            const response = await axiosInstance.get("/block/list");
            setBlockedUsers(response.data || []);
        } catch (error) {
            console.error("Error fetching blocked users:", error);
        }
    }, [authUser]);

    // Fetch spammed users
    const fetchSpammedUsers = useCallback(async () => {
        if (!authUser) return;

        try {
            const response = await axiosInstance.get("/block/spam/list");
            setSpammedUsers(response.data || []);
        } catch (error) {
            console.error("Error fetching spammed users:", error);
        }
    }, [authUser]);

    // Block a user
    const blockUser = useCallback(
        async (userId) => {
            setIsLoading(true);
            try {
                await axiosInstance.post(`/block/block/${userId}`);
                toast.success("User blocked successfully");
                await fetchBlockedUsers();
                await fetchSpammedUsers(); // Refresh spam list too
            } catch (error) {
                toast.error(
                    error.response?.data?.message || "Failed to block user"
                );
                throw error;
            } finally {
                setIsLoading(false);
            }
        },
        [fetchBlockedUsers, fetchSpammedUsers]
    );

    // Unblock a user
    const unblockUser = useCallback(
        async (userId) => {
            setIsLoading(true);
            try {
                await axiosInstance.post(`/block/unblock/${userId}`);
                toast.success("User unblocked successfully");
                await fetchBlockedUsers();
            } catch (error) {
                toast.error(
                    error.response?.data?.message || "Failed to unblock user"
                );
                throw error;
            } finally {
                setIsLoading(false);
            }
        },
        [fetchBlockedUsers]
    );

    // Spam a user
    const spamUser = useCallback(
        async (userId) => {
            setIsLoading(true);
            try {
                await axiosInstance.post(`/block/spam/${userId}`);
                toast.success("User marked as spam");
                await fetchSpammedUsers();
                await fetchBlockedUsers(); // Refresh block list too
            } catch (error) {
                toast.error(
                    error.response?.data?.message || "Failed to mark user as spam"
                );
                throw error;
            } finally {
                setIsLoading(false);
            }
        },
        [fetchSpammedUsers, fetchBlockedUsers]
    );

    // Unspam a user
    const unspamUser = useCallback(
        async (userId) => {
            setIsLoading(true);
            try {
                await axiosInstance.post(`/block/unspam/${userId}`);
                toast.success("User unmarked as spam");
                await fetchSpammedUsers();
            } catch (error) {
                toast.error(
                    error.response?.data?.message || "Failed to unmark user as spam"
                );
                throw error;
            } finally {
                setIsLoading(false);
            }
        },
        [fetchSpammedUsers]
    );

    // Check if a user is blocked
    const isUserBlocked = useCallback(
        (userId) => {
            return blockedUsers.some((blocked) => blocked._id === userId);
        },
        [blockedUsers]
    );

    // Check if a user is spammed
    const isUserSpammed = useCallback(
        (userId) => {
            return spammedUsers.some((spammed) => spammed._id === userId);
        },
        [spammedUsers]
    );

    // Check if you are blocked by another user
    const checkIfBlockedBy = useCallback(async (otherUserId) => {
        try {
            const response = await axiosInstance.get(`/block/check/${otherUserId}`);
            return response.data.isBlocked || false;
        } catch (error) {
            console.error("Error checking if blocked by user:", error);
            return false;
        }
    }, []);

    // Fetch blocked and spammed users on mount
    useEffect(() => {
        if (authUser) {
            fetchBlockedUsers();
            fetchSpammedUsers();
        }
    }, [authUser, fetchBlockedUsers, fetchSpammedUsers]);

    const value = {
        blockedUsers,
        spammedUsers,
        isLoading,
        blockUser,
        unblockUser,
        spamUser,
        unspamUser,
        isUserBlocked,
        isUserSpammed,
        checkIfBlockedBy,
        fetchBlockedUsers,
        fetchSpammedUsers,
    };

    return <BlockContext.Provider value={value}>{children}</BlockContext.Provider>;
};

export default BlockContext;


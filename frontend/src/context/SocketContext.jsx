import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useRef,
} from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext();
const ACTIVITY_VISIBILITY_KEY = "activityVisible";

function getStoredActivityVisibility() {
    return localStorage.getItem(ACTIVITY_VISIBILITY_KEY) !== "false";
}

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const [typingUsers, setTypingUsers] = useState({});
    const [isActivityVisible, setIsActivityVisibleState] = useState(getStoredActivityVisibility);
    const { authUser } = useAuth();
    const typingTimeoutRef = useRef(null);
    const activityVisibleRef = useRef(isActivityVisible);

    useEffect(() => {
        activityVisibleRef.current = isActivityVisible;
    }, [isActivityVisible]);

    useEffect(() => {
        if (authUser) {
            const BASE_URL =
                import.meta.env.MODE === "development" ? "http://localhost:3000" : "/";

            const newSocket = io(BASE_URL, {
                withCredentials: true,
                transports: ["websocket", "polling"],
            });

            newSocket.on("connect", () => {
                console.log("Socket connected:", newSocket.id);
                newSocket.emit("presence:set-visibility", {
                    isVisible: activityVisibleRef.current,
                });
                setIsConnected(true);
            });

            newSocket.on("disconnect", () => {
                console.log("Socket disconnected");
                setIsConnected(false);
            });

            newSocket.on("getOnlineUsers", (userIds) => {
                setOnlineUsers(userIds);
            });

            newSocket.on("user:typing", ({ senderId }) => {
                setTypingUsers(prev => ({ ...prev, [senderId]: true }));
            });

            newSocket.on("user:stop-typing", ({ senderId }) => {
                setTypingUsers(prev => {
                    const updated = { ...prev };
                    delete updated[senderId];
                    return updated;
                });
            });

            setSocket(newSocket);

            return () => {
                newSocket.disconnect();
                setSocket(null);
                setIsConnected(false);
            };
        } else {
            if (socket) {
                socket.disconnect();
                setSocket(null);
                setIsConnected(false);
            }
        }
    }, [authUser]);

    const setActivityVisible = useCallback((isVisible) => {
        const nextVisible = Boolean(isVisible);
        localStorage.setItem(ACTIVITY_VISIBILITY_KEY, String(nextVisible));
        activityVisibleRef.current = nextVisible;
        setIsActivityVisibleState(nextVisible);

        if (socket) {
            socket.emit("presence:set-visibility", { isVisible: nextVisible });
        }
    }, [socket]);

    const emitTyping = useCallback((receiverId) => {
        if (!socket) return;

        socket.emit("user:typing", { receiverId });

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
            socket.emit("user:stop-typing", { receiverId });
        }, 2000);
    }, [socket]);

    const stopTyping = useCallback((receiverId) => {
        if (!socket) return;

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        socket.emit("user:stop-typing", { receiverId });
    }, [socket]);

    const value = {
        socket,
        onlineUsers,
        isConnected,
        isActivityVisible,
        typingUsers,
        setActivityVisible,
        emitTyping,
        stopTyping,
    };

    return (
        <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
    );
};

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (context === undefined) {
        throw new Error("useSocket must be used within SocketProvider");
    }
    return context;
};

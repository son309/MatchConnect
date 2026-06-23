/* eslint-disable react-refresh/only-export-components */
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

const DatingContext = createContext();

export const DatingProvider = ({ children }) => {
  const [datingProfile, setDatingProfile] = useState(null);
  const [discoverProfiles, setDiscoverProfiles] = useState([]);
  const [likedYou, setLikedYou] = useState([]);
  const [matches, setMatches] = useState([]);
  const [isDatingLoading, setIsDatingLoading] = useState(false);
  const [isDatingActionLoading, setIsDatingActionLoading] = useState(false);

  const { authUser } = useAuth();
  const { socket } = useSocket();

  const getDatingProfile = useCallback(async () => {
    if (!authUser || authUser.role === "admin") return null;

    const res = await axiosInstance.get("/dating/profile");
    setDatingProfile(res.data);
    return res.data;
  }, [authUser]);

  const updateDatingProfile = useCallback(async (data) => {
    setIsDatingActionLoading(true);
    try {
      const res = await axiosInstance.put("/dating/profile", data);
      setDatingProfile(res.data);
      toast.success("Dating profile saved");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save dating profile");
      throw error;
    } finally {
      setIsDatingActionLoading(false);
    }
  }, []);

  const getDiscoverProfiles = useCallback(async (filters = {}) => {
    if (!authUser || authUser.role === "admin") return [];

    setIsDatingLoading(true);
    try {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value !== "" && value !== null && value !== undefined)
      );
      const res = await axiosInstance.get("/dating/discover", { params });
      const profiles = Array.isArray(res.data) ? res.data : [];
      setDiscoverProfiles(profiles);
      return profiles;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load profiles");
      return [];
    } finally {
      setIsDatingLoading(false);
    }
  }, [authUser]);

  const getMatches = useCallback(async () => {
    if (!authUser || authUser.role === "admin") return [];

    try {
      const res = await axiosInstance.get("/dating/matches");
      const nextMatches = Array.isArray(res.data) ? res.data : [];
      setMatches(nextMatches);
      return nextMatches;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load matches");
      return [];
    }
  }, [authUser]);

  const getLikedYou = useCallback(async () => {
    if (!authUser || authUser.role === "admin") return [];

    try {
      const res = await axiosInstance.get("/dating/liked-you");
      const likes = Array.isArray(res.data) ? res.data : [];
      setLikedYou(likes);
      return likes;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load likes");
      return [];
    }
  }, [authUser]);

  const removeProfileFromDeck = useCallback((userId) => {
    setDiscoverProfiles((prev) => prev.filter((profile) => profile._id !== userId));
  }, []);

  const likeProfile = useCallback(
    async (userId) => {
      setIsDatingActionLoading(true);
      try {
        const res = await axiosInstance.post(`/dating/like/${userId}`);
        removeProfileFromDeck(userId);
        setLikedYou((prev) => prev.filter((profile) => profile._id !== userId));

        if (res.data?.matched && res.data?.user) {
          setMatches((prev) => {
            if (prev.some((match) => match._id === res.data.user._id)) return prev;
            return [res.data.user, ...prev];
          });
          toast.success(`Matched with ${res.data.user.fullName}`);
        }

        return res.data;
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to like profile");
        throw error;
      } finally {
        setIsDatingActionLoading(false);
      }
    },
    [removeProfileFromDeck]
  );

  const passProfile = useCallback(
    async (userId) => {
      setIsDatingActionLoading(true);
      try {
        await axiosInstance.post(`/dating/pass/${userId}`);
        removeProfileFromDeck(userId);
        setLikedYou((prev) => prev.filter((profile) => profile._id !== userId));
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to pass profile");
        throw error;
      } finally {
        setIsDatingActionLoading(false);
      }
    },
    [removeProfileFromDeck]
  );

  const unmatchProfile = useCallback(async (userId) => {
    setIsDatingActionLoading(true);
    try {
      await axiosInstance.delete(`/dating/matches/${userId}`);
      setMatches((prev) => prev.filter((match) => match._id !== userId));
      setLikedYou((prev) => prev.filter((profile) => profile._id !== userId));
      await getDiscoverProfiles();
      toast.success("Match removed");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to remove match");
      throw error;
    } finally {
      setIsDatingActionLoading(false);
    }
  }, [getDiscoverProfiles]);

  useEffect(() => {
    if (!authUser || authUser.role === "admin") return;

    getDatingProfile();
    getDiscoverProfiles();
    getLikedYou();
    getMatches();
  }, [authUser, getDatingProfile, getDiscoverProfiles, getLikedYou, getMatches]);

  useEffect(() => {
    if (!socket || !authUser) return;

    const handleMatch = (match) => {
      if (matches.some((item) => item._id === match._id)) return;

      setMatches((prev) => {
        if (prev.some((item) => item._id === match._id)) return prev;
        return [match, ...prev];
      });
      setDiscoverProfiles((prev) => prev.filter((profile) => profile._id !== match._id));
      setLikedYou((prev) => prev.filter((profile) => profile._id !== match._id));
      toast.success(`Matched with ${match.fullName}`);
    };

    const handleLikedYou = (profile) => {
      setDiscoverProfiles((prev) => prev.filter((item) => item._id !== profile._id));
      setLikedYou((prev) => {
        if (matches.some((match) => match._id === profile._id)) return prev;
        if (prev.some((item) => item._id === profile._id)) return prev;
        return [profile, ...prev];
      });
    };

    const handleUnmatch = ({ userId, profile }) => {
      setMatches((prev) => prev.filter((match) => match._id !== userId));
      setLikedYou((prev) => prev.filter((item) => item._id !== userId));
      if (profile) {
        setDiscoverProfiles((prev) => {
          if (prev.some((item) => item._id === profile._id)) return prev;
          return [profile, ...prev];
        });
      }
    };

    socket.on("dating:match", handleMatch);
    socket.on("dating:liked-you", handleLikedYou);
    socket.on("dating:unmatch", handleUnmatch);

    return () => {
      socket.off("dating:match", handleMatch);
      socket.off("dating:liked-you", handleLikedYou);
      socket.off("dating:unmatch", handleUnmatch);
    };
  }, [socket, authUser, matches]);

  const value = {
    datingProfile,
    discoverProfiles,
    likedYou,
    matches,
    isDatingLoading,
    isDatingActionLoading,
    getDatingProfile,
    updateDatingProfile,
    getDiscoverProfiles,
    getLikedYou,
    getMatches,
    likeProfile,
    passProfile,
    unmatchProfile,
  };

  return (
    <DatingContext.Provider value={value}>{children}</DatingContext.Provider>
  );
};

export const useDating = () => {
  const context = useContext(DatingContext);
  if (!context) {
    throw new Error("useDating must be used within DatingProvider");
  }
  return context;
};

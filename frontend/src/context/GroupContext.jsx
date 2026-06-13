import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { axiosInstance } from "../lib/axios";
import { useAuth } from "./AuthContext";
import { useSocket } from "./SocketContext";

const GroupContext = createContext();

export const useGroup = () => {
  const context = useContext(GroupContext);
  if (!context) {
    throw new Error("useGroup must be used within a GroupProvider");
  }
  return context;
};

export const GroupProvider = ({ children }) => {
  const { authUser } = useAuth();
  const { socket } = useSocket();

  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupMessages, setGroupMessages] = useState([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Fetch all groups for current user
  const fetchGroups = useCallback(async () => {
    if (!authUser) return;

    setIsLoadingGroups(true);
    try {
      const response = await axiosInstance.get("/groups");
      setGroups(response.data.data || []);
    } catch (error) {
      console.error("Error fetching groups:", error);
    } finally {
      setIsLoadingGroups(false);
    }
  }, [authUser]);

  // Create a new group
  const createGroup = useCallback(async ({ name, description, memberIds }) => {
    try {
      const response = await axiosInstance.post("/groups", {
        name,
        description,
        memberIds,
      });
      const newGroup = response.data.data;
      setGroups((prev) => [newGroup, ...prev]);
      return newGroup;
    } catch (error) {
      console.error("Error creating group:", error);
      throw error;
    }
  }, []);

  // Fetch messages for a group
  const fetchGroupMessages = useCallback(async (groupId) => {
    if (!groupId) return;

    setIsLoadingMessages(true);
    try {
      const response = await axiosInstance.get(`/messages/group/${groupId}`);
      setGroupMessages(response.data || []);
    } catch (error) {
      console.error("Error fetching group messages:", error);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  // Send message to group
  const sendGroupMessage = useCallback(async (groupId, text, image) => {
    try {
      const formData = new FormData();
      if (text) formData.append("text", text);
      if (image) formData.append("image", image);

      const response = await axiosInstance.post(
        `/messages/group/${groupId}/send`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      const newMessage = response.data;
      setGroupMessages((prev) => [...prev, newMessage]);

      // Update group's last activity
      setGroups((prev) =>
        prev.map((g) =>
          g._id === groupId ? { ...g, updatedAt: new Date().toISOString() } : g
        )
      );

      return newMessage;
    } catch (error) {
      console.error("Error sending group message:", error);
      throw error;
    }
  }, []);

  // React to a group message
  const reactToGroupMessage = useCallback(
    async (messageId, emoji) => {
      try {
        const response = await axiosInstance.put(
          `/messages/${messageId}/react`,
          { emoji }
        );

        const updatedMessage = response.data;

        // Update message in state
        setGroupMessages((prev) =>
          prev.map((msg) =>
            msg._id === messageId
              ? { ...msg, reactions: updatedMessage.reactions }
              : msg
          )
        );

        // Emit socket event to notify other group members
        if (socket && selectedGroup) {
          socket.emit("group:messageReaction", {
            groupId: selectedGroup._id,
            message: updatedMessage,
          });
        }
      } catch (error) {
        console.error("Error reacting to message:", error);
      }
    },
    [socket, selectedGroup]
  );

  // Leave a group
  const leaveGroup = useCallback(
    async (groupId) => {
      try {
        await axiosInstance.post(`/groups/${groupId}/leave`);
        setGroups((prev) => prev.filter((g) => g._id !== groupId));
        if (selectedGroup?._id === groupId) {
          setSelectedGroup(null);
          setGroupMessages([]);
        }
      } catch (error) {
        console.error("Error leaving group:", error);
        throw error;
      }
    },
    [selectedGroup]
  );

  // Add members to a group
  const addMembers = useCallback(
    async (groupId, memberIds) => {
      try {
        const response = await axiosInstance.post(`/groups/${groupId}/members`, {
          memberIds,
        });
        const updatedGroup = response.data.data;

        // Update groups list
        setGroups((prev) =>
          prev.map((g) => (g._id === groupId ? updatedGroup : g))
        );

        // Update selected group if it's the same
        if (selectedGroup?._id === groupId) {
          setSelectedGroup(updatedGroup);
        }

        return updatedGroup;
      } catch (error) {
        console.error("Error adding members:", error);
        throw error;
      }
    },
    [selectedGroup]
  );

  // Remove a member from a group
  const removeMember = useCallback(
    async (groupId, userId) => {
      try {
        const response = await axiosInstance.delete(
          `/groups/${groupId}/members/${userId}`
        );
        const updatedGroup = response.data.data;

        // Update groups list
        setGroups((prev) =>
          prev.map((g) => (g._id === groupId ? updatedGroup : g))
        );

        // Update selected group if it's the same
        if (selectedGroup?._id === groupId) {
          setSelectedGroup(updatedGroup);
        }

        return updatedGroup;
      } catch (error) {
        console.error("Error removing member:", error);
        throw error;
      }
    },
    [selectedGroup]
  );

  // Add admin rights to a member
  const addAdmin = useCallback(
    async (groupId, userId) => {
      try {
        const response = await axiosInstance.post(
          `/groups/${groupId}/admins/${userId}`
        );
        const updatedGroup = response.data.data;

        // Update groups list
        setGroups((prev) =>
          prev.map((g) => (g._id === groupId ? updatedGroup : g))
        );

        // Update selected group if it's the same
        if (selectedGroup?._id === groupId) {
          setSelectedGroup(updatedGroup);
        }

        return updatedGroup;
      } catch (error) {
        console.error("Error adding admin:", error);
        throw error;
      }
    },
    [selectedGroup]
  );

  // Remove admin rights from a member
  const removeAdmin = useCallback(
    async (groupId, userId) => {
      try {
        const response = await axiosInstance.delete(
          `/groups/${groupId}/admins/${userId}`
        );
        const updatedGroup = response.data.data;

        // Update groups list
        setGroups((prev) =>
          prev.map((g) => (g._id === groupId ? updatedGroup : g))
        );

        // Update selected group if it's the same
        if (selectedGroup?._id === groupId) {
          setSelectedGroup(updatedGroup);
        }

        return updatedGroup;
      } catch (error) {
        console.error("Error removing admin:", error);
        throw error;
      }
    },
    [selectedGroup]
  );

  // Update group information
  const updateGroup = useCallback(
    async (groupId, updateData) => {
      try {
        const response = await axiosInstance.put(`/groups/${groupId}`, updateData);
        const updatedGroup = response.data.data;

        // Update groups list
        setGroups((prev) =>
          prev.map((g) => (g._id === groupId ? updatedGroup : g))
        );

        // Update selected group if it's the same
        if (selectedGroup?._id === groupId) {
          setSelectedGroup(updatedGroup);
        }

        return updatedGroup;
      } catch (error) {
        console.error("Error updating group:", error);
        throw error;
      }
    },
    [selectedGroup]
  );

  // Select a group and fetch its messages
  const selectGroup = useCallback(
    async (group) => {
      setSelectedGroup(group);
      if (group) {
        await fetchGroupMessages(group._id);
        // Reset unread count for this group
        setGroups((prev) =>
          prev.map((g) => (g._id === group._id ? { ...g, unreadCount: 0 } : g))
        );
        // Join socket room
        if (socket) {
          socket.emit("group:join", { groupId: group._id });
        }
      } else {
        setGroupMessages([]);
      }
    },
    [fetchGroupMessages, socket]
  );

  // Clear selected group
  const clearSelectedGroup = useCallback(() => {
    if (selectedGroup && socket) {
      socket.emit("group:leave", { groupId: selectedGroup._id });
    }
    setSelectedGroup(null);
    setGroupMessages([]);
  }, [selectedGroup, socket]);

  // Socket event handlers
  useEffect(() => {
    if (!socket || !authUser) return;

    // Handle new group message
    const handleNewGroupMessage = ({ groupId, message }) => {
      // Skip if it's our own message (already added via optimistic update)
      if (
        message.senderId._id === authUser._id ||
        message.senderId === authUser._id
      ) {
        return;
      }

      // Add message if we're viewing this group
      if (selectedGroup?._id === groupId) {
        setGroupMessages((prev) => [...prev, message]);
      }

      // Update group's last activity and unread count
      setGroups((prev) =>
        prev.map((g) =>
          g._id === groupId
            ? {
              ...g,
              updatedAt: new Date().toISOString(),
              // Increment unread count only if not viewing this group
              unreadCount: selectedGroup?._id === groupId ? 0 : (g.unreadCount || 0) + 1
            }
            : g
        )
      );
    };

    // Handle new group created (when someone adds you to a group)
    const handleGroupCreated = ({ group }) => {
      setGroups((prev) => {
        // Avoid duplicates
        if (prev.some((g) => g._id === group._id)) {
          return prev;
        }
        return [group, ...prev];
      });
    };

    // Handle member left group
    const handleMemberLeft = ({ groupId, userId }) => {
      // Update group members list if we're viewing that group
      if (selectedGroup?._id === groupId) {
        setSelectedGroup((prev) => ({
          ...prev,
          members: prev.members.filter((m) => m._id !== userId && m !== userId),
        }));
      }

      // Update groups list
      setGroups((prev) =>
        prev.map((g) => {
          if (g._id === groupId) {
            return {
              ...g,
              members: g.members.filter(
                (m) => m._id !== userId && m !== userId
              ),
            };
          }
          return g;
        })
      );
    };

    // Handle being added to a group
    const handleGroupAdded = ({ group }) => {
      setGroups((prev) => {
        if (prev.some((g) => g._id === group._id)) {
          return prev;
        }
        return [group, ...prev];
      });
    };

    // Handle members added to group
    const handleMembersAdded = ({ groupId, addedMembers }) => {
      // Refetch group to get updated members list
      if (selectedGroup?._id === groupId) {
        axiosInstance.get(`/groups/${groupId}`).then((res) => {
          setSelectedGroup(res.data.data);
        });
      }
    };

    // Handle being removed from a group
    const handleGroupRemoved = ({ groupId }) => {
      setGroups((prev) => prev.filter((g) => g._id !== groupId));
      if (selectedGroup?._id === groupId) {
        setSelectedGroup(null);
        setGroupMessages([]);
      }
    };

    // Handle member removed from group
    const handleMemberRemoved = ({ groupId, removedMemberId }) => {
      if (selectedGroup?._id === groupId) {
        setSelectedGroup((prev) => ({
          ...prev,
          members: prev.members.filter(
            (m) => m._id !== removedMemberId && m !== removedMemberId
          ),
          admins: prev.admins.filter(
            (a) => a._id !== removedMemberId && a !== removedMemberId
          ),
        }));
      }
    };

    // Handle promoted to admin
    const handlePromotedToAdmin = ({ groupId }) => {
      if (selectedGroup?._id === groupId) {
        axiosInstance.get(`/groups/${groupId}`).then((res) => {
          setSelectedGroup(res.data.data);
        });
      }
    };

    // Handle admin added
    const handleAdminAdded = ({ groupId, newAdminId }) => {
      if (selectedGroup?._id === groupId) {
        setSelectedGroup((prev) => ({
          ...prev,
          admins: [...prev.admins, prev.members.find((m) => m._id === newAdminId)],
        }));
      }
    };

    // Handle demoted from admin
    const handleDemotedFromAdmin = ({ groupId }) => {
      if (selectedGroup?._id === groupId) {
        axiosInstance.get(`/groups/${groupId}`).then((res) => {
          setSelectedGroup(res.data.data);
        });
      }
    };

    // Handle admin removed
    const handleAdminRemoved = ({ groupId, demotedAdminId }) => {
      if (selectedGroup?._id === groupId) {
        setSelectedGroup((prev) => ({
          ...prev,
          admins: prev.admins.filter(
            (a) => a._id !== demotedAdminId && a !== demotedAdminId
          ),
        }));
      }
    };

    // Handle group updated
    const handleGroupUpdated = ({ groupId, group }) => {
      setGroups((prev) =>
        prev.map((g) => (g._id === groupId ? group : g))
      );
      if (selectedGroup?._id === groupId) {
        setSelectedGroup(group);
      }
    };

    // Handle message reaction in group
    const handleGroupMessageReaction = ({ groupId, message }) => {
      if (selectedGroup?._id === groupId) {
        setGroupMessages((prev) =>
          prev.map((msg) =>
            msg._id === message._id
              ? { ...msg, reactions: message.reactions }
              : msg
          )
        );
      }
    };

    socket.on("group:newMessage", handleNewGroupMessage);
    socket.on("group:created", handleGroupCreated);
    socket.on("group:memberLeft", handleMemberLeft);
    socket.on("group:messageReaction", handleGroupMessageReaction);
    socket.on("group:added", handleGroupAdded);
    socket.on("group:membersAdded", handleMembersAdded);
    socket.on("group:removed", handleGroupRemoved);
    socket.on("group:memberRemoved", handleMemberRemoved);
    socket.on("group:promotedToAdmin", handlePromotedToAdmin);
    socket.on("group:adminAdded", handleAdminAdded);
    socket.on("group:demotedFromAdmin", handleDemotedFromAdmin);
    socket.on("group:adminRemoved", handleAdminRemoved);
    socket.on("group:updated", handleGroupUpdated);

    return () => {
      socket.off("group:newMessage", handleNewGroupMessage);
      socket.off("group:created", handleGroupCreated);
      socket.off("group:memberLeft", handleMemberLeft);
      socket.off("group:messageReaction", handleGroupMessageReaction);
      socket.off("group:added", handleGroupAdded);
      socket.off("group:membersAdded", handleMembersAdded);
      socket.off("group:removed", handleGroupRemoved);
      socket.off("group:memberRemoved", handleMemberRemoved);
      socket.off("group:promotedToAdmin", handlePromotedToAdmin);
      socket.off("group:adminAdded", handleAdminAdded);
      socket.off("group:demotedFromAdmin", handleDemotedFromAdmin);
      socket.off("group:adminRemoved", handleAdminRemoved);
      socket.off("group:updated", handleGroupUpdated);
    };
  }, [socket, authUser, selectedGroup]);

  // Fetch groups on mount
  useEffect(() => {
    if (authUser) {
      fetchGroups();
    }
  }, [authUser, fetchGroups]);

  const value = {
    groups,
    selectedGroup,
    groupMessages,
    isLoadingGroups,
    isLoadingMessages,
    fetchGroups,
    createGroup,
    selectGroup,
    clearSelectedGroup,
    sendGroupMessage,
    leaveGroup,
    setSelectedGroup,
    reactToGroupMessage,
    addMembers,
    removeMember,
    addAdmin,
    removeAdmin,
    updateGroup,
  };

  return (
    <GroupContext.Provider value={value}>{children}</GroupContext.Provider>
  );
};

export default GroupContext;

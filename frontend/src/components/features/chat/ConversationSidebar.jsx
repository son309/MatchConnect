import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Users, UserPlus } from "lucide-react";
import { useChat } from "../../../context/ChatContext";
import { useGroup } from "../../../context/GroupContext";
import { useFriend } from "../../../context/FriendContext";
import { useBlock } from "../../../context/BlockContext";
import SidebarHeader from "./SidebarHeader";
import ConversationItem from "./ConversationItem";
import GroupItem from "./GroupItem";
import CreateGroupModal from "./CreateGroupModal";

export default function ConversationSidebar({
  title = "Messages",
  allowGroups = true,
  selectedChat,
  onChatSelect,
  onHighlightMessage,
  selectedGroup,
  onGroupSelect,
}) {
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("chats"); // "chats" | "groups"
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);

  const { homeStats, getHomeStats, setSelectedUser } = useChat();
  const { groups, isLoadingGroups } = useGroup();
  const { friends } = useFriend();
  const { blockedUsers, spammedUsers } = useBlock();

  const chats = homeStats?.chats || [];

  useEffect(() => {
    getHomeStats();
  }, [getHomeStats]);

  useEffect(() => {
    if (!allowGroups && viewMode === "groups") {
      setViewMode("chats");
    }
  }, [allowGroups, viewMode]);

  // Handle chat selection from search
  const handleSelectChat = useCallback(
    (user) => {
      // Normalize the user object for the chat context
      const normalizedUser = {
        _id: user._id,
        fullName: user.fullName || user.name,
        profilePic: user.profilePic || user.avatar,
        email: user.email,
        isOnline: user.isOnline,
      };

      setSelectedUser(normalizedUser);
      if (onChatSelect) {
        onChatSelect(normalizedUser);
      }
    },
    [setSelectedUser, onChatSelect]
  );

  // Handle message selection from search (navigate and highlight)
  const handleSelectMessage = useCallback(
    (messageId) => {
      if (onHighlightMessage) {
        // Small delay to allow chat to load first
        setTimeout(() => {
          onHighlightMessage(messageId);
        }, 300);
      }
    },
    [onHighlightMessage]
  );

  // Separate chats based on filter, friend status, and block/spam status
  const { allChats, messageRequests, spamChats } = useMemo(() => {
    const friendChats = [];
    const nonFriendChats = [];
    const messageRequests = [];
    const spamChats = [];

    chats.forEach((chat) => {
      const isFriend = friends.some(f => f._id === chat._id) || chat.isSelfChat;
      const isDatingMatch = chat.isDatingMatch || chat.isMatch;
      const isBlocked = blockedUsers.some(b => b._id === chat._id);
      const isSpammed = spammedUsers.some(s => s._id === chat._id);

      // Blocked or spammed users only show in unread filter as spam
      if (isBlocked || isSpammed) {
        if (filter === "unread" && chat.lastMessage) {
          spamChats.push(chat);
        }
        // Don't add them to any other category - they're hidden from "all"
      } else if (isFriend || isDatingMatch) {
        friendChats.push(chat);
      } else if (chat.lastMessage) {
        // Non-friends with messages
        if (filter === "unread" && chat.unreadCount > 0) {
          // In unread view: show as message request if has unread messages
          messageRequests.push(chat);
        } else {
          // In all view: show as regular chat
          nonFriendChats.push(chat);
        }
      }
    });

    // Combine friends and non-friends for "All" view
    const allChats = [...friendChats, ...nonFriendChats];

    return { allChats, messageRequests, spamChats };
  }, [chats, friends, blockedUsers, spammedUsers, filter]);

  // Apply filters and search
  const filteredChats = allChats.filter((chat) => {
    const matchesFilter = filter === "unread" ? chat.unreadCount > 0 : true;
    const searchLow = searchQuery.toLowerCase();
    const matchesName = (chat.fullName || chat.name || "")
      .toLowerCase()
      .includes(searchLow);
    const matchesEmail = (chat.email || "").toLowerCase().includes(searchLow);
    return matchesFilter && (matchesName || matchesEmail);
  });

  const filteredMessageRequests = messageRequests.filter((chat) => {
    const searchLow = searchQuery.toLowerCase();
    const matchesName = (chat.fullName || chat.name || "")
      .toLowerCase()
      .includes(searchLow);
    const matchesEmail = (chat.email || "").toLowerCase().includes(searchLow);
    return matchesName || matchesEmail;
  });

  const filteredSpamChats = spamChats.filter((chat) => {
    const searchLow = searchQuery.toLowerCase();
    const matchesName = (chat.fullName || chat.name || "")
      .toLowerCase()
      .includes(searchLow);
    const matchesEmail = (chat.email || "").toLowerCase().includes(searchLow);
    return matchesName || matchesEmail;
  });

  // Logic lọc danh sách groups
  const filteredGroups = groups.filter((group) => {
    const searchLow = searchQuery.toLowerCase();
    return group.name.toLowerCase().includes(searchLow);
  });

  return (
    <div className="flex flex-col h-full w-full bg-white">
      <div className="px-4 pt-4 pb-1">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      </div>

      <SidebarHeader
        filter={filter}
        setFilter={setFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSelectChat={handleSelectChat}
        onSelectMessage={handleSelectMessage}
      />

      {/* View Mode Tabs */}
      {allowGroups && (
        <div className="flex border-b border-gray-100 px-2">
          <button
            onClick={() => setViewMode("chats")}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${viewMode === "chats"
              ? "text-pink-600 border-b-2 border-pink-500"
              : "text-gray-500 hover:text-gray-700"
              }`}
          >
            Messages
          </button>
          <button
            onClick={() => setViewMode("groups")}
            className={`flex-1 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1 ${viewMode === "groups"
              ? "text-purple-600 border-b-2 border-purple-500"
              : "text-gray-500 hover:text-gray-700"
              }`}
          >
            <Users size={14} />
            Groups
          </button>
        </div>
      )}

      {/* Create Group Button (only in groups view) */}
      {allowGroups && viewMode === "groups" && (
        <div className="px-3 py-2">
          <button
            onClick={() => setIsCreateGroupOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors text-sm font-medium"
          >
            <Plus size={16} />
            Create New Group
          </button>
        </div>
      )}

      {/* List Content */}
      <div className="flex-1 overflow-y-auto pt-2 pb-4 custom-scrollbar">
        {viewMode === "chats" ? (
          <>
            {/* Message Requests Section - Only in Unread filter */}
            {filteredMessageRequests.length > 0 && (
              <div className="mb-3">
                <div className="px-3 py-2 flex items-center gap-2">
                  <UserPlus size={16} className="text-purple-600" />
                  <h3 className="text-xs font-semibold text-purple-700 uppercase tracking-wider">
                    Message Requests ({filteredMessageRequests.length})
                  </h3>
                </div>
                {filteredMessageRequests.map((chat) => (
                  <div key={chat._id} className="relative">
                    <ConversationItem
                      chat={chat}
                      isActive={selectedChat?._id === chat._id && !selectedGroup}
                      onClick={() => {
                        onChatSelect(chat);
                        if (onGroupSelect) onGroupSelect(null);
                        setSearchQuery("");
                      }}
                    />
                    {/* Purple indicator for message requests */}
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500 rounded-r-full"></div>
                  </div>
                ))}
                <div className="border-b border-gray-200 mx-3 mt-2"></div>
              </div>
            )}

            {/* Spam/Blocked Section - Only in Unread filter */}
            {filteredSpamChats.length > 0 && (
              <div className="mb-3">
                <div className="px-3 py-2 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                  </svg>
                  <h3 className="text-xs font-semibold text-red-700 uppercase tracking-wider">
                    Spam / Blocked ({filteredSpamChats.length})
                  </h3>
                </div>
                {filteredSpamChats.map((chat) => (
                  <div key={chat._id} className="relative">
                    <ConversationItem
                      chat={chat}
                      isActive={selectedChat?._id === chat._id && !selectedGroup}
                      onClick={() => {
                        onChatSelect(chat);
                        if (onGroupSelect) onGroupSelect(null);
                        setSearchQuery("");
                      }}
                    />
                    {/* Red indicator for spam */}
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 rounded-r-full"></div>
                  </div>
                ))}
                <div className="border-b border-gray-200 mx-3 mt-2"></div>
              </div>
            )}

            {/* All Chats Section */}
            {filteredChats.length > 0 && (
              <>
                {filteredMessageRequests.length > 0 && (
                  <div className="px-3 py-2">
                    <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Chats
                    </h3>
                  </div>
                )}
                {filteredChats.map((chat) => (
                  <ConversationItem
                    key={chat._id}
                    chat={chat}
                    isActive={selectedChat?._id === chat._id && !selectedGroup}
                    onClick={() => {
                      onChatSelect(chat);
                      if (onGroupSelect) onGroupSelect(null);
                      setSearchQuery("");
                    }}
                  />
                ))}
              </>
            )}

            {/* Empty state */}
            {filteredChats.length === 0 && filteredMessageRequests.length === 0 && filteredSpamChats.length === 0 && (
              <div className="text-center text-gray-400 text-xs mt-10">
                {searchQuery ? "Not found" : "No messages yet"}
              </div>
            )}
          </>
        ) : (
          <>
            {isLoadingGroups ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full" />
              </div>
            ) : (
              <>
                {filteredGroups.map((group) => (
                  <GroupItem
                    key={group._id}
                    group={group}
                    isActive={selectedGroup?._id === group._id}
                    onClick={() => {
                      if (onGroupSelect) onGroupSelect(group);
                      onChatSelect(null);
                      setSearchQuery("");
                    }}
                  />
                ))}
                {filteredGroups.length === 0 && (
                  <div className="text-center text-gray-400 text-xs mt-10">
                    {searchQuery ? "Not found" : "No groups yet"}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Create Group Modal */}
      {allowGroups && (
        <CreateGroupModal
          isOpen={isCreateGroupOpen}
          onClose={() => setIsCreateGroupOpen(false)}
        />
      )}
    </div>
  );
}

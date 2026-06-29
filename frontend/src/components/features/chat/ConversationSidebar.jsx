import { useState, useEffect, useCallback, useMemo } from "react";
import { UserPlus } from "lucide-react";
import { useChat } from "../../../context/ChatContext";
import { useFriend } from "../../../context/FriendContext";
import { useBlock } from "../../../context/BlockContext";
import SidebarHeader from "./SidebarHeader";
import ConversationItem from "./ConversationItem";

export default function ConversationSidebar({
  title = "Messages",
  selectedChat,
  onChatSelect,
  onHighlightMessage,
}) {
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { homeStats, getHomeStats, setSelectedUser } = useChat();
  const { friends } = useFriend();
  const { blockedUsers, spammedUsers } = useBlock();

  const chats = homeStats?.chats || [];

  useEffect(() => {
    getHomeStats();
  }, [getHomeStats]);

  const handleSelectChat = useCallback(
    (user) => {
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

  const handleSelectMessage = useCallback(
    (messageId) => {
      if (onHighlightMessage) {
        setTimeout(() => {
          onHighlightMessage(messageId);
        }, 300);
      }
    },
    [onHighlightMessage]
  );

  const { allChats, messageRequests, spamChats } = useMemo(() => {
    const friendChats = [];
    const nonFriendChats = [];
    const messageRequests = [];
    const spamChats = [];

    chats.forEach((chat) => {
      const isFriend = friends.some((friend) => friend._id === chat._id) || chat.isSelfChat;
      const isDatingMatch = chat.isDatingMatch || chat.isMatch;
      const isBlocked = blockedUsers.some((blocked) => blocked._id === chat._id);
      const isSpammed = spammedUsers.some((spammed) => spammed._id === chat._id);

      if (isBlocked || isSpammed) {
        if (filter === "unread" && chat.lastMessage) {
          spamChats.push(chat);
        }
      } else if (isFriend || isDatingMatch) {
        friendChats.push(chat);
      } else if (chat.lastMessage) {
        if (filter === "unread" && chat.unreadCount > 0) {
          messageRequests.push(chat);
        } else {
          nonFriendChats.push(chat);
        }
      }
    });

    return {
      allChats: [...friendChats, ...nonFriendChats],
      messageRequests,
      spamChats,
    };
  }, [chats, friends, blockedUsers, spammedUsers, filter]);

  const matchesSearch = useCallback(
    (chat) => {
      const searchLow = searchQuery.toLowerCase();
      const matchesName = (chat.fullName || chat.name || "")
        .toLowerCase()
        .includes(searchLow);
      const matchesEmail = (chat.email || "").toLowerCase().includes(searchLow);
      return matchesName || matchesEmail;
    },
    [searchQuery]
  );

  const filteredChats = allChats.filter((chat) => {
    const matchesFilter = filter === "unread" ? chat.unreadCount > 0 : true;
    return matchesFilter && matchesSearch(chat);
  });

  const filteredMessageRequests = messageRequests.filter(matchesSearch);
  const filteredSpamChats = spamChats.filter(matchesSearch);

  const selectChat = (chat) => {
    onChatSelect(chat);
    setSearchQuery("");
  };

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

      <div className="flex-1 overflow-y-auto pt-2 pb-4 custom-scrollbar">
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
                  isActive={selectedChat?._id === chat._id}
                  onClick={() => selectChat(chat)}
                />
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500 rounded-r-full" />
              </div>
            ))}
            <div className="border-b border-gray-200 mx-3 mt-2" />
          </div>
        )}

        {filteredSpamChats.length > 0 && (
          <div className="mb-3">
            <div className="px-3 py-2 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600">
                <circle cx="12" cy="12" r="10" />
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
              <h3 className="text-xs font-semibold text-red-700 uppercase tracking-wider">
                Spam / Blocked ({filteredSpamChats.length})
              </h3>
            </div>
            {filteredSpamChats.map((chat) => (
              <div key={chat._id} className="relative">
                <ConversationItem
                  chat={chat}
                  isActive={selectedChat?._id === chat._id}
                  onClick={() => selectChat(chat)}
                />
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 rounded-r-full" />
              </div>
            ))}
            <div className="border-b border-gray-200 mx-3 mt-2" />
          </div>
        )}

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
                isActive={selectedChat?._id === chat._id}
                onClick={() => selectChat(chat)}
              />
            ))}
          </>
        )}

        {filteredChats.length === 0 && filteredMessageRequests.length === 0 && filteredSpamChats.length === 0 && (
          <div className="text-center text-gray-400 text-xs mt-10">
            {searchQuery ? "Not found" : "No messages yet"}
          </div>
        )}
      </div>
    </div>
  );
}

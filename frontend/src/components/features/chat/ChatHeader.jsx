import { ChevronLeft, Cloud, Phone, Search, Sidebar, Video, MoreVertical, ShieldAlert, ShieldOff, UserX } from "lucide-react";
import { OpenCallWindow } from "../../../utils/window";
import { useAuth } from "../../../context/AuthContext";
import { useChat } from "../../../context/ChatContext";
import { useSocket } from "../../../context/SocketContext";
import { useBlock } from "../../../context/BlockContext";
import { useDating } from "../../../context/DatingContext";
import { useState, useRef, useEffect } from "react";

export default function ChatHeader({
  chat,
  onToggleInfoSidebar,
  isInfoSidebarOpen,
  onToggleSearch,
  isSearchOpen,
}) {
  const { onlineUsers } = useSocket();
  const { authUser } = useAuth();
  const { setSelectedUser, getHomeStats } = useChat();
  const { matches, unmatchProfile } = useDating();
  const { isUserBlocked, isUserSpammed, blockUser, unblockUser, spamUser, unspamUser } = useBlock();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  //kiểm tra có phải bạn bè không
  const chatUserId = chat?._id || chat?.id;
  const isDatingMatch = chat?.isDatingMatch || chat?.isMatch || matches.some((match) => match._id === chatUserId);
  const isSelfChat = chat?.isSelfChat || chatUserId === authUser?._id;
  const isOnline = isSelfChat || (Array.isArray(onlineUsers) && (onlineUsers.includes(chat?.id) || onlineUsers.includes(chat?._id))) || chat?.isOnline;
  const isBlocked = isUserBlocked(chatUserId);
  const isSpammed = isUserSpammed(chatUserId);

  const avatarUrl = chat?.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(chat?.fullName || "U")}&background=random`;

  const handleStartCall = (isVideo) => {
    if (!chat || !authUser || isSelfChat) return;
    const receiverId = chat.id || chat._id;
    OpenCallWindow({ name: chat.fullName, avatar: avatarUrl, id: receiverId, video: isVideo ? "true" : "false", caller: "true" });
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleBlockUser = async () => {
    if (!chatUserId) return;
    if (isBlocked) {
      await unblockUser(chatUserId);
    } else {
      await blockUser(chatUserId);
    }
    setIsMenuOpen(false);
    getHomeStats(); // Refresh conversation list
  };

  const handleSpamUser = async () => {
    if (!chatUserId) return;
    if (isSpammed) {
      await unspamUser(chatUserId);
    } else {
      await spamUser(chatUserId);
    }
    setIsMenuOpen(false);
    getHomeStats(); // Refresh conversation list
  };

  const handleUnmatchUser = async () => {
    if (!chatUserId || !isDatingMatch) return;

    const shouldUnmatch = window.confirm(`Unmatch with ${chat.fullName}?`);
    if (!shouldUnmatch) return;

    await unmatchProfile(chatUserId);
    setIsMenuOpen(false);
    setSelectedUser(null);
    getHomeStats();
  };

  if (!chat) return null;

  return (
    <div className="flex items-center justify-between p-4 border-b bg-white sticky top-0 z-10">
      <div className="flex items-center gap-2">
        <button onClick={() => setSelectedUser(null)} className="md:hidden p-1 text-gray-500 hover:bg-gray-100 rounded-full">
          <ChevronLeft size={24} />
        </button>

        {isSelfChat ? (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center border shadow-sm flex-shrink-0">
            <Cloud size={20} className="text-white" />
          </div>
        ) : (
          <img src={avatarUrl} alt={chat.fullName} className="w-10 h-10 rounded-full border object-cover" />
        )}

        <div>
          <h3 className="font-bold text-sm text-gray-800">
            {isSelfChat ? "Cloud" : chat.fullName}
          </h3>
          {!isSelfChat && (
            <p className={`text-xs flex items-center gap-1 ${isOnline ? "text-green-500" : "text-gray-400"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-green-500" : "bg-gray-300"}`}></span>
              {isOnline ? "Online" : "Offline"}
            </p>)}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={onToggleSearch}
          className={`p-2 rounded-xl transition-colors ${isSearchOpen ? "bg-pink-50 text-pink-500" : "text-gray-400 hover:text-pink-500 hover:bg-pink-50"}`}
        >
          <Search size={20} />
        </button>


        <>
          {!isSelfChat && isDatingMatch && (
            <>
              <button onClick={() => handleStartCall(false)} className="p-2 text-gray-400 hover:text-pink-500 hover:bg-pink-50 rounded-xl" title="Voice Call">
                <Phone size={20} />
              </button>
              <button onClick={() => handleStartCall(true)} className="p-2 text-gray-400 hover:text-pink-500 hover:bg-pink-50 rounded-xl" title="Video Call">
                <Video size={20} />
              </button>
            </>
          )}

          {!isSelfChat && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-800 hover:bg-gray-100"
                title="More options"
              >
                <MoreVertical size={20} />
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <button
                    onClick={handleBlockUser}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 transition-colors"
                  >
                    <ShieldOff size={16} className={isBlocked ? "text-green-600" : "text-red-600"} />
                    <span className={isBlocked ? "text-green-700" : "text-red-700"}>
                      {isBlocked ? "Unblock User" : "Block User"}
                    </span>
                  </button>
                  <button
                    onClick={handleSpamUser}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 transition-colors"
                  >
                    <ShieldAlert size={16} className={isSpammed ? "text-green-600" : "text-orange-600"} />
                    <span className={isSpammed ? "text-green-700" : "text-orange-700"}>
                      {isSpammed ? "Unmark as Spam" : "Mark as Spam"}
                    </span>
                  </button>
                  {isDatingMatch && (
                    <button
                      onClick={handleUnmatchUser}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 flex items-center gap-2 transition-colors"
                    >
                      <UserX size={16} className="text-red-600" />
                      <span className="text-red-700">Unmatch</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="w-px h-6 bg-gray-200 mx-1"></div>
          <button
            onClick={onToggleInfoSidebar}
            className={`p-2 rounded-xl ${isInfoSidebarOpen ? "bg-pink-50 text-pink-500" : "text-gray-400 hover:text-gray-800 hover:bg-gray-100"}`}
          >
            <Sidebar size={20} />
          </button>
        </>

      </div>
    </div>
  );
}

import {
  ChevronLeft,
  Cloud,
  Flag,
  Loader2,
  MoreVertical,
  Phone,
  Search,
  ShieldAlert,
  ShieldOff,
  Sidebar,
  UserX,
  Video,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useBlock } from "../../../context/BlockContext";
import { useChat } from "../../../context/ChatContext";
import { useDating } from "../../../context/DatingContext";
import { reportReasons, useReport } from "../../../context/ReportContext";
import { useSocket } from "../../../context/SocketContext";
import { OpenCallWindow } from "../../../utils/window";

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
  const {
    isUserBlocked,
    isUserSpammed,
    blockUser,
    unblockUser,
    spamUser,
    unspamUser,
    fetchBlockedUsers,
  } = useBlock();
  const { reportUser, isReporting } = useReport();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportForm, setReportForm] = useState({
    reason: "harassment",
    details: "",
    blockUser: true,
  });
  const menuRef = useRef(null);

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
    getHomeStats();
  };

  const handleSpamUser = async () => {
    if (!chatUserId) return;
    if (isSpammed) {
      await unspamUser(chatUserId);
    } else {
      await spamUser(chatUserId);
    }
    setIsMenuOpen(false);
    getHomeStats();
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

  const openReportModal = () => {
    setIsMenuOpen(false);
    setIsReportOpen(true);
  };

  const closeReportModal = () => {
    if (isReporting) return;
    setIsReportOpen(false);
    setReportForm({ reason: "harassment", details: "", blockUser: true });
  };

  const handleSubmitReport = async (event) => {
    event.preventDefault();
    if (!chatUserId || isSelfChat) return;

    await reportUser(chatUserId, reportForm);
    if (reportForm.blockUser) {
      await fetchBlockedUsers();
      getHomeStats();
    }
    closeReportModal();
  };

  if (!chat) return null;

  return (
    <>
      <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setSelectedUser(null)} className="rounded-full p-1 text-gray-500 hover:bg-gray-100 md:hidden">
            <ChevronLeft size={24} />
          </button>

          {isSelfChat ? (
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border bg-gradient-to-br from-blue-400 to-cyan-400 shadow-sm">
              <Cloud size={20} className="text-white" />
            </div>
          ) : (
            <img src={avatarUrl} alt={chat.fullName} className="h-10 w-10 rounded-full border object-cover" draggable={false} />
          )}

          <div>
            <h3 className="text-sm font-bold text-gray-800">
              {isSelfChat ? "Cloud" : chat.fullName}
            </h3>
            {!isSelfChat && (
              <p className={`flex items-center gap-1 text-xs ${isOnline ? "text-green-500" : "text-gray-400"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? "bg-green-500" : "bg-gray-300"}`}></span>
                {isOnline ? "Online" : "Offline"}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onToggleSearch}
            className={`rounded-xl p-2 transition-colors ${isSearchOpen ? "bg-pink-50 text-pink-500" : "text-gray-400 hover:bg-pink-50 hover:text-pink-500"}`}
            title="Search messages"
          >
            <Search size={20} />
          </button>

          {!isSelfChat && isDatingMatch && (
            <>
              <button onClick={() => handleStartCall(false)} className="rounded-xl p-2 text-gray-400 hover:bg-pink-50 hover:text-pink-500" title="Voice Call">
                <Phone size={20} />
              </button>
              <button onClick={() => handleStartCall(true)} className="rounded-xl p-2 text-gray-400 hover:bg-pink-50 hover:text-pink-500" title="Video Call">
                <Video size={20} />
              </button>
            </>
          )}

          {!isSelfChat && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-800"
                title="More options"
              >
                <MoreVertical size={20} />
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 z-50 mt-2 w-52 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                  <button
                    onClick={openReportModal}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors hover:bg-red-50"
                  >
                    <Flag size={16} className="text-red-600" />
                    <span className="text-red-700">Report User</span>
                  </button>
                  <button
                    onClick={handleBlockUser}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors hover:bg-gray-100"
                  >
                    <ShieldOff size={16} className={isBlocked ? "text-green-600" : "text-red-600"} />
                    <span className={isBlocked ? "text-green-700" : "text-red-700"}>
                      {isBlocked ? "Unblock User" : "Block User"}
                    </span>
                  </button>
                  <button
                    onClick={handleSpamUser}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors hover:bg-gray-100"
                  >
                    <ShieldAlert size={16} className={isSpammed ? "text-green-600" : "text-orange-600"} />
                    <span className={isSpammed ? "text-green-700" : "text-orange-700"}>
                      {isSpammed ? "Unmark as Spam" : "Mark as Spam"}
                    </span>
                  </button>
                  {isDatingMatch && (
                    <button
                      onClick={handleUnmatchUser}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors hover:bg-red-50"
                    >
                      <UserX size={16} className="text-red-600" />
                      <span className="text-red-700">Unmatch</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="mx-1 h-6 w-px bg-gray-200"></div>
          <button
            onClick={onToggleInfoSidebar}
            className={`rounded-xl p-2 ${isInfoSidebarOpen ? "bg-pink-50 text-pink-500" : "text-gray-400 hover:bg-gray-100 hover:text-gray-800"}`}
            title="Chat details"
          >
            <Sidebar size={20} />
          </button>
        </div>
      </div>

      {isReportOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={handleSubmitReport} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Report {chat.fullName}</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Tell us what happened. Reports help keep MatchConnect safer.
                </p>
              </div>
              <button
                type="button"
                onClick={closeReportModal}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-800"
                disabled={isReporting}
              >
                <X size={18} />
              </button>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-gray-700">Reason</span>
              <select
                value={reportForm.reason}
                onChange={(event) => setReportForm((prev) => ({ ...prev, reason: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
              >
                {reportReasons.map((reason) => (
                  <option key={reason.value} value={reason.value}>
                    {reason.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-4 block">
              <span className="mb-1.5 block text-sm font-semibold text-gray-700">Details</span>
              <textarea
                value={reportForm.details}
                onChange={(event) => setReportForm((prev) => ({ ...prev, details: event.target.value }))}
                rows={4}
                maxLength={1000}
                className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                placeholder="Add context for this report"
              />
            </label>

            <label className="mt-4 flex items-start gap-3 rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={reportForm.blockUser}
                onChange={(event) => setReportForm((prev) => ({ ...prev, blockUser: event.target.checked }))}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-pink-500 focus:ring-pink-500"
              />
              <span>
                <span className="block font-semibold text-gray-900">Also block this user</span>
                They will be hidden from your chats and Discover list.
              </span>
            </label>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeReportModal}
                disabled={isReporting}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isReporting}
                className="inline-flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-60"
              >
                {isReporting && <Loader2 className="h-4 w-4 animate-spin" />}
                Submit report
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

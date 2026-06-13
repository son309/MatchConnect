import { useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { Search } from "lucide-react";
import { useFriend } from "../../../context/FriendContext";
import { useSocket } from "../../../context/SocketContext";
import FriendCard from "./FriendCard";

// Component shared for: All, Online, Incoming Requests
export default function FriendsList({ type }) {
  const { searchQuery = "", viewMode = "grid", onStartChat } = useOutletContext() || {};
  const { getFriendRequests, friendRequests, friends, getFriends } = useFriend();
  const { onlineUsers } = useSocket();

  useEffect(() => {
    getFriends();
    getFriendRequests();
  }, [getFriends, getFriendRequests]); // Xóa getAllContacts khỏi đây để hết lỗi "not defined"

  // Add online status to contacts based on onlineUsers array
  // Use Array.isArray to guard against API returning error objects
  const safeFriends = Array.isArray(friends) ? friends : [];
  const safeOnlineUsers = Array.isArray(onlineUsers) ? onlineUsers : [];
  const friendsWithStatus = safeFriends.map(friend => ({
    ...friend,
    status: (friend && safeOnlineUsers.includes(friend._id)) ? 'online' : 'offline'
  }));

  // Filter data based on 'type' prop
  const getData = () => {
    let rawData = [];
    switch (type) {
      case "requests":
        rawData = Array.isArray(friendRequests) ? friendRequests : [];
        break;
      case "online":
        rawData = friendsWithStatus.filter(c => c.status === 'online');
        break;
      case "all":
      default:
        rawData = friendsWithStatus; // lấy từ danh sách bạn bè với trạng thái
        break;
    }

    // Ensure rawData is an array before filtering
    if (!Array.isArray(rawData)) return [];

    // Filter by search query
    return rawData.filter(item => {
      const search = searchQuery.toLowerCase();
      const name = item?.fullName || item?.name || "";
      const email = (item?.email || "").toLowerCase()
      return name.includes(search) || email.includes(search);
    });
  };

  const data = getData();

  if (data.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full py-20 text-gray-400">
        <Search size={48} className="opacity-20 mb-4" />
        <p className="text-sm italic text-center px-4">
          {searchQuery 
            ? `No results found for "${searchQuery}"`
            : type === 'online'
              ? "No friends are online right now."
              : type === 'requests'
                ? "No pending friend requests."
                : "Your friends list is empty."}
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 px-1">
        <p className="text-gray-400 text-xs">
          {data.length} {data.length === 1 ? 'contact' : 'contacts'}
          {type === 'online' && ' online'}
        </p>
      </div>

      <div className={
        viewMode === 'grid'
          ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 pb-4 pr-2 overflow-y-auto custom-scrollbar"
          : "flex flex-col gap-2 pb-4 pr-2 overflow-y-auto custom-scrollbar"
      }>
        {data.map(user => (
          <FriendCard
            key={user?._id || user?.id || Math.random()}
            user={user}
            type={type}
            onStartChat={onStartChat}
            viewMode={viewMode}
          />
        ))}
      </div>
    </div>
  );
}
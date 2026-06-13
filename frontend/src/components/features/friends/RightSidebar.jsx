import { useChat } from "../../../context/ChatContext";
import { useFriend } from "../../../context/FriendContext"; //
import { useSocket } from "../../../context/SocketContext"; //
import { useEffect } from "react";
export default function RightSidebar({ onStartChat }) {
  const { friends, getFriends } = useFriend();
  const { friendRequests, acceptFriendRequest, rejectFriendRequest } = useFriend();
  const { onlineUsers } = useSocket();

  useEffect(() => {
    if (friends.length === 0) {
      getFriends();
    }
  }, [getFriends, friends.length]);

  const safeFriends = Array.isArray(friends) ? friends : [];
  const safeOnlineUsers = Array.isArray(onlineUsers) ? onlineUsers : [];

  //Lọc bạn bè đang online
  const onlineFriends = safeFriends.filter((friend) => 
  safeOnlineUsers.includes(String(friend._id))
  );

  

  const getAvatar = (user) =>
    user.profilePic ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      user.fullName || user.name || "U"
    )}&background=random`;

  const renderFriendItem = (user, showButtons = false) => (
    <div
      key={user._id}
      className={`flex items-center gap-3 p-2 rounded-xl transition-colors ${
        !showButtons ? "hover:bg-gray-50 cursor-pointer" : ""
      }`}
    >
      <div className="relative flex-shrink-0">
        <img
          src={getAvatar(user)}
          alt={user.fullName || user.name}
          className="w-10 h-10 rounded-full object-cover"
        />
        {!showButtons && (
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-gray-700 truncate">
          {user.fullName || user.name}
        </h4>
        {showButtons && (
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => acceptFriendRequest(user._id)}
              className="flex-1 text-xs bg-pink-500 hover:bg-pink-600 text-white py-1 rounded-lg transition"
            >
              Accept
            </button>
            <button
              onClick={() => rejectFriendRequest(user._id)}
              className="flex-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 py-1 rounded-lg transition"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-100 p-5 overflow-y-auto">
      {/* Requests Section*/}
      {Array.isArray(friendRequests) && friendRequests.length > 0 && (
        <div className="mb-5 pb-5 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700 uppercase">
              Requests
            </h3>
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {friendRequests.length}
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {friendRequests.map((req) => renderFriendItem(req, true))}
          </div>
        </div>
      )}

      {/* Online Section */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">
          Active Now
        </h3>
        <div className="flex flex-col gap-2">
          {onlineFriends.length > 0 ? (
            onlineFriends.map((user) => (
              <div key={user._id} onClick={() => onStartChat(user)}>
                {renderFriendItem(user)}
              </div>
            ))
          ) : (
            <p className="text-xs text-gray-400 italic">No friends online</p>
          )}
        </div>
      </div>
    </div>
  );
}

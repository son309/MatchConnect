import { Users } from "lucide-react";

export default function GroupItem({ group, isActive, onClick }) {
  const memberCount = group.members?.length || 0;

  // Format time
  const formatTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffDays === 1) {
      return "Hôm qua";
    } else if (diffDays < 7) {
      return date.toLocaleDateString("vi-VN", { weekday: "short" });
    } else {
      return date.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
      });
    }
  };

  return (
    <div
      onClick={onClick}
      className={`flex items-center p-3 cursor-pointer transition-all rounded-xl mx-2 mb-1 ${isActive
        ? "bg-purple-50 border border-purple-100"
        : "hover:bg-gray-50 border border-transparent"
        }`}
    >
      <div className="relative">
        {group.avatar ? (
          <img
            src={group.avatar}
            alt={group.name}
            className="w-12 h-12 rounded-full object-cover border border-gray-100"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center border border-purple-200">
            <Users size={20} className="text-white" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 ml-3">
        <div className="flex justify-between items-baseline">
          <p
            className={`font-semibold text-sm truncate ${isActive ? "text-purple-700" : "text-gray-800"
              }`}
          >
            {group.name}
          </p>
          <span className="text-[10px] text-gray-400">
            {formatTime(group.updatedAt)}
          </span>
        </div>
        <div className="flex justify-between items-center mt-0.5">
          <p
            className={`text-xs truncate max-w-[140px] ${isActive ? "text-purple-400 font-medium" : "text-gray-500"
              }`}
          >
            {memberCount} members
          </p>
          {group.unreadCount > 0 && (
            <span className="flex items-center justify-center text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 bg-purple-500">
              {group.unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

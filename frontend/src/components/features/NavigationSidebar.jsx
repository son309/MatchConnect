import { Compass, Heart, LogOut, MessageCircle, Settings, ShieldCheck, User } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";
import { useDating } from "../../context/DatingContext";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

const NavItem = ({ icon: Icon, to, onClick, defaultActive = false, badgeCount = 0 }) => {
  const location = useLocation();
  const [targetPath, targetQuery = ""] = to.split("?");
  const targetSearch = targetQuery ? `?${targetQuery}` : "";
  const isActive =
    location.pathname === targetPath &&
    (targetSearch
      ? location.search === targetSearch || (defaultActive && location.search === "")
      : true);

  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={`
        relative
        w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-300
        shadow-sm hover:shadow-md md:hover:-translate-y-1
        ${
          isActive
            ? "bg-pink-400 text-white shadow-pink-300/30 scale-110 md:scale-100"
            : "bg-white text-black hover:text-pink-400"
        }
      `}
    >
      <Icon size={22} strokeWidth={2} />
      {badgeCount > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold leading-none text-white shadow-sm ring-2 ring-white">
          {badgeCount > 99 ? "99+" : badgeCount}
        </span>
      )}
    </NavLink>
  );
};

export default function NavigationSidebar() {
  const { authUser, logout } = useAuth();
  const { homeStats } = useChat();
  const { likedYou } = useDating();
  const navigate = useNavigate();
  const isAdmin = authUser?.role === "admin";

  const likedYouCount = isAdmin ? 0 : likedYou.length;
  const unreadMatchesCount = isAdmin
    ? 0
    : (homeStats?.chats || []).reduce((total, chat) => {
        if (!chat.isDatingMatch && !chat.isMatch) return total;
        return total + (chat.unreadCount || 0);
      }, 0);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <nav
      className={`
        flex md:flex-col
        w-full md:w-16
        h-auto md:h-full
        px-4 py-3 md:px-0 md:py-4
        items-center
        justify-between md:justify-start
        gap-2 md:gap-4
        z-50

        bg-white/80 md:bg-transparent
        backdrop-blur-md md:backdrop-blur-0

        border-t border-gray-100 md:border-none
      `}
    >
      <div className="flex flex-row md:flex-col gap-2 md:gap-4 items-center">
        {isAdmin ? (
          <NavItem icon={ShieldCheck} to="/chat/admin" defaultActive />
        ) : (
          <>
            <NavItem icon={Compass} to="/chat/dating?tab=discover" defaultActive />
            <NavItem icon={Heart} to="/chat/dating?tab=liked-you" badgeCount={likedYouCount} />
            <NavItem icon={MessageCircle} to="/chat/matches" badgeCount={unreadMatchesCount} />
            <NavItem icon={User} to="/chat/profile" />
          </>
        )}
      </div>

      <div className="hidden md:flex flex-1"></div>

      <div className="flex flex-row md:flex-col gap-2 md:gap-4 mb-0 md:mb-4 items-center flex-shrink-0">
        <NavItem icon={Settings} to="/chat/settings/activity" />
        <button
          onClick={handleLogout}
          className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white text-black shadow-sm hover:text-pink-400 hover:shadow-md transition-all active:scale-95 shrink-0"
        >
          <LogOut size={22} />
        </button>
      </div>
    </nav>
  );
}
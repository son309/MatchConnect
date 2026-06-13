import { useEffect } from 'react';
import { Heart, Phone, MessageCircle, Users } from 'lucide-react';
import { useChat } from "../../../context/ChatContext";
import { useDating } from "../../../context/DatingContext";
import { useNavigate } from 'react-router-dom';

import SectionCard from './SectionCard';
import { CallItem, ChatItem, FriendItem } from './HomeItems';

export default function HomeDashboard() {
  const { homeStats, allContacts, getHomeStats, getAllContacts } = useChat();
  const { matches, getMatches } = useDating();
  const navigate = useNavigate();

  useEffect(() => {
    getHomeStats();
    getAllContacts();
    getMatches();
  }, [getHomeStats, getAllContacts, getMatches]);

  const handleNavigation = (path) => {
    navigate(`/chat/${path}`);
  };

  return (
    <div className="h-full w-full p-4 overflow-y-auto md:overfollow-hidden font-sans text-gray-800">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 h-full">
        {/* DATING */}
        <SectionCard
          title="Dating" subtitle="Discover matches" icon={Heart} image="/friends.jpg"
          items={matches}
          renderItem={(item) => <FriendItem key={item._id || item.id} friend={{ ...item, desc: "Match" }} />}
          onClick={() => handleNavigation('dating')}
          bgColor="bg-rose-100"
          borderColor="border-rose-100"
          iconColor="text-rose-600"
          iconBg="bg-rose-100/90"
        />

        {/* CALLS */}
        <SectionCard
          title="Calls" subtitle="Recent history" icon={Phone} image="/call.jpg"
          items={homeStats.calls}
          renderItem={(item) => <CallItem key={item._id || item.id} call={item} />}
          onClick={() => handleNavigation('calls')} 
        />

        {/* CHATS */}
        <SectionCard
          title="Chats" subtitle="New messages" icon={MessageCircle} image="/chat.jpg"
          items={homeStats.chats}
          renderItem={(item) => <ChatItem key={item._id || item.id} chat={item} />}
          onClick={() => handleNavigation('messages')}
        />

        {/* FRIENDS */}
        <SectionCard
          title="Friends" subtitle="Online status" icon={Users} image="/friends.jpg"
          items={allContacts}
          renderItem={(item) => <FriendItem key={item._id || item.id} friend={item} />}
          onClick={() => handleNavigation('friends')}
        />
      </div>
    </div>
  );
}

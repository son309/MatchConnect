import { ChevronDown, ChevronRight, Cloud, Image as ImageIcon, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useChat } from "../../../context/ChatContext";

const InfoItem = ({ icon: Icon, label }) => (
  <button className="flex items-center w-full p-3 hover:bg-gray-50 rounded-xl transition-colors text-gray-600 gap-3">
    <div className="p-2 bg-gray-100 rounded-lg">
      <Icon size={16} />
    </div>
    <span className="text-sm font-medium">{label}</span>
  </button>
);

export default function InfoSidebar({ chat, onClose }) {
  const [isMediaOpen, setIsMediaOpen] = useState(false);
  const [sharedMedia, setSharedMedia] = useState([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const { getSharedMedia } = useChat();
  const { authUser } = useAuth();

  const isSelfChat = chat.isSelfChat || chat._id === authUser?._id;

  useEffect(() => {
    const fetchMedia = async () => {
      if (!chat?._id) return;
      setIsLoadingMedia(true);
      const media = await getSharedMedia(chat._id);
      setSharedMedia(media || []);
      setIsLoadingMedia(false);
    };

    if (isMediaOpen) {
      fetchMedia();
    }
  }, [chat?._id, getSharedMedia, isMediaOpen]);

  const avatarUrl = chat?.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(chat?.fullName || 'User')}&background=random`;
  return (
    <div className="flex flex-col w-full h-full bg-white border-l border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="font-bold text-gray-800 text-sm">Chat Details</h3>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Avatar + Info */}
        <div className="flex flex-col items-center py-6 border-b border-gray-200">
          {isSelfChat ? (
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center border shadow-sm flex-shrink-0">
              <Cloud size={50} className="text-white" />
            </div>
          ) : (
            <img
              src={avatarUrl}
              alt={chat.fullName}
              className="w-24 h-24 rounded-full mb-3 border-4 border-gray-50"
            />)}
          <h2 className="text-xl font-bold text-gray-800">{isSelfChat ? "My Cloud" : chat.fullName}</h2>
          {!isSelfChat && <p className="text-sm text-gray-400">
            {chat.email || "No email provided"}
          </p>}
        </div>

        {/* Shared Media Section */}
        <div className="py-2">
          <button
            onClick={() => setIsMediaOpen(!isMediaOpen)}
            className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3 text-gray-700">
              <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
                <ImageIcon size={18} />
              </div>
              <span className="font-semibold text-sm">Shared Media</span>
            </div>
            {isMediaOpen ? <ChevronDown size={18} className="text-gray-400" /> : <ChevronRight size={18} className="text-gray-400" />}
          </button>

          {isMediaOpen && (
            <div className="p-3 animate-in fade-in slide-in-from-top-2 duration-200">
              {isLoadingMedia ? (
                <div className="text-center py-4 text-xs text-gray-400">Loading...</div>
              ) : sharedMedia.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-3 gap-2">
                  {sharedMedia.map((msg) => (
                    <div
                      key={msg._id || msg.messageId}
                      onClick={() => window.open(msg.image, '_blank')}
                      className="relative aspect-square group cursor-pointer overflow-hidden rounded-lg bg-gray-100"
                    >
                      <img
                        src={msg.image}
                        alt="Shared"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-400">No media shared yet</p>
                </div>
              )}
            </div>
          )}
        </div>


        {/* Delete Button
          <button className="w-full bg-pink-500 text-white px-3 py-2 rounded-lg hover:bg-pink-600 transition">
            Delete Conversation
          </button> */}
      </div>
    </div>
  );
}

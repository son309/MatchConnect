import {
  Bell,
  ChevronDown,
  ChevronRight,
  Cloud,
  FileText,
  Image as ImageIcon,
  Lock,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useChat } from "../../../context/ChatContext";

const QuickAction = ({ icon: Icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center text-gray-700 transition hover:text-pink-600"
  >
    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-900">
      <Icon size={22} />
    </span>
    <span className="max-w-[86px] text-xs font-medium leading-4">{label}</span>
  </button>
);

const SectionHeader = ({ title, open, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition ${
      open ? "bg-gray-100" : "hover:bg-gray-50"
    }`}
  >
    <span className="text-sm font-bold text-gray-900">{title}</span>
    {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
  </button>
);

const MenuRow = ({ icon: Icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-gray-800 transition hover:bg-gray-50"
  >
    <Icon size={22} className="text-gray-900" />
    <span className="text-sm font-semibold">{label}</span>
  </button>
);

export default function InfoSidebar({ chat, onClose }) {
  const [openSection, setOpenSection] = useState("media-files");
  const [activeMediaView, setActiveMediaView] = useState("menu");
  const [sharedMedia, setSharedMedia] = useState([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const { getSharedMedia, messages } = useChat();
  const { authUser } = useAuth();

  const isSelfChat = chat.isSelfChat || chat._id === authUser?._id;
  const avatarUrl =
    chat?.profilePic ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(chat?.fullName || "User")}&background=random`;

  const sharedFiles = useMemo(
    () =>
      messages
        .filter((message) => message.audio)
        .map((message) => ({
          _id: message._id,
          url: message.audio,
          name: message.text || "Audio message",
          createdAt: message.createdAt,
        })),
    [messages]
  );

  useEffect(() => {
    const fetchMedia = async () => {
      if (!chat?._id || activeMediaView !== "media") return;
      setIsLoadingMedia(true);
      const media = await getSharedMedia(chat._id);
      setSharedMedia(media || []);
      setIsLoadingMedia(false);
    };

    fetchMedia();
  }, [activeMediaView, chat?._id, getSharedMedia]);

  const toggleSection = (section) => {
    setOpenSection((prev) => (prev === section ? "" : section));
    if (section !== "media-files") setActiveMediaView("menu");
  };

  return (
    <div className="flex h-full w-full flex-col border-l border-gray-100 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 p-4">
        <h3 className="text-sm font-bold text-gray-900">Chat details</h3>
        <button
          onClick={onClose}
          className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100"
          title="Close details"
        >
          <X size={18} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="flex flex-col items-center py-5 text-center">
          {isSelfChat ? (
            <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 shadow-sm">
              <Cloud size={50} className="text-white" />
            </div>
          ) : (
            <img
              src={avatarUrl}
              alt={chat.fullName}
              className="mb-3 h-24 w-24 rounded-full border-4 border-gray-50 object-cover"
              draggable={false}
            />
          )}
          <h2 className="mt-3 text-xl font-bold text-gray-900">
            {isSelfChat ? "My Cloud" : chat.fullName}
          </h2>
          {!isSelfChat && (
            <p className="mt-1 text-sm text-gray-500">{chat.email || "No email provided"}</p>
          )}
          {!isSelfChat && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-xs font-bold text-gray-800">
              <Lock size={14} />
              <span>End-to-end encrypted</span>
            </div>
          )}
        </div>

        {!isSelfChat && (
          <div className="mb-5 flex items-start justify-center gap-5 border-b border-gray-100 pb-5">
            <QuickAction icon={UserRound} label="Profile" />
            <QuickAction icon={Bell} label="Mute" />
            <QuickAction icon={Search} label="Search" />
          </div>
        )}

        <div className="space-y-2">
          <SectionHeader
            title="Chat information"
            open={openSection === "chat-info"}
            onClick={() => toggleSection("chat-info")}
          />
          {openSection === "chat-info" && (
            <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-500">
              Messages and calls are only available after both users match.
            </div>
          )}

          <SectionHeader
            title="Chat customization"
            open={openSection === "customization"}
            onClick={() => toggleSection("customization")}
          />
          {openSection === "customization" && (
            <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-500">
              Theme and notification settings can be expanded later.
            </div>
          )}

          <SectionHeader
            title="Media and files"
            open={openSection === "media-files"}
            onClick={() => toggleSection("media-files")}
          />
          {openSection === "media-files" && (
            <div className="rounded-xl bg-white pb-2">
              {activeMediaView === "menu" && (
                <>
                  <MenuRow icon={ImageIcon} label="Media" onClick={() => setActiveMediaView("media")} />
                  <MenuRow icon={FileText} label="Files" onClick={() => setActiveMediaView("files")} />
                </>
              )}

              {activeMediaView === "media" && (
                <div className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => setActiveMediaView("menu")}
                    className="mb-3 text-xs font-semibold text-gray-500 hover:text-pink-600"
                  >
                    Back to media and files
                  </button>
                  {isLoadingMedia ? (
                    <div className="rounded-xl bg-gray-50 py-8 text-center text-xs text-gray-400">Loading...</div>
                  ) : sharedMedia.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {sharedMedia.map((msg) => (
                        <button
                          key={msg._id || msg.messageId || msg.image}
                          type="button"
                          onClick={() => window.open(msg.image, "_blank")}
                          className="group relative aspect-square overflow-hidden rounded-lg bg-gray-100"
                          title="Open media"
                        >
                          <img
                            src={msg.image}
                            alt="Shared media"
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                            loading="lazy"
                            draggable={false}
                          />
                          <span className="absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl bg-gray-50 py-8 text-center text-xs text-gray-400">
                      No media shared yet
                    </div>
                  )}
                </div>
              )}

              {activeMediaView === "files" && (
                <div className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => setActiveMediaView("menu")}
                    className="mb-3 text-xs font-semibold text-gray-500 hover:text-pink-600"
                  >
                    Back to media and files
                  </button>
                  {sharedFiles.length > 0 ? (
                    <div className="space-y-2">
                      {sharedFiles.map((file) => (
                        <button
                          key={file._id || file.url}
                          type="button"
                          onClick={() => window.open(file.url, "_blank")}
                          className="flex w-full items-center gap-3 rounded-xl border border-gray-100 p-3 text-left transition hover:bg-gray-50"
                        >
                          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
                            <FileText size={20} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-gray-800">{file.name}</span>
                            <span className="text-xs text-gray-400">
                              {file.createdAt ? new Date(file.createdAt).toLocaleDateString() : "Shared file"}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl bg-gray-50 py-8 text-center text-xs text-gray-400">
                      No files shared yet
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <SectionHeader
            title="Privacy and support"
            open={openSection === "privacy"}
            onClick={() => toggleSection("privacy")}
          />
          {openSection === "privacy" && (
            <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-500">
              Block, unmatch, and report actions are available from the chat menu.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useCallback, useRef } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useChat } from "../../../context/ChatContext";
import ConversationSidebar from "./ConversationSidebar";
import ChatArea from "./ChatArea";
import InfoSidebar from "./InfoSidebar";
import NewMatchesPanel from "./NewMatchesPanel";
import ProfileDetailModal from "../dating/ProfileDetailModal";

export default function ChatDashboard({ title = "Messages" }) {
  const { selectedUser, setSelectedUser } = useChat();
  const { authUser } = useAuth();
  const [isInfoSidebarOpen, setIsInfoSidebarOpen] = useState(false);
  const [activePanel, setActivePanel] = useState(null);
  const [newMatches, setNewMatches] = useState([]);
  const [detailProfile, setDetailProfile] = useState(null);
  const [pendingHighlightMessageId, setPendingHighlightMessageId] = useState(null);
  const chatAreaRef = useRef(null);

  const handleHighlightMessage = useCallback((messageId) => {
    setPendingHighlightMessageId(messageId);
  }, []);

  const handleHighlightProcessed = useCallback(() => {
    setPendingHighlightMessageId(null);
  }, []);

  const handleChatSelect = useCallback(
    (user) => {
      setActivePanel(null);
      setDetailProfile(null);
      setSelectedUser(user);
      setIsInfoSidebarOpen(false);
    },
    [setSelectedUser]
  );

  const handleNewMatchesSelect = useCallback(
    (matches) => {
      setNewMatches(matches);
      setSelectedUser(null);
      setActivePanel("newMatches");
      setIsInfoSidebarOpen(false);
    },
    [setSelectedUser]
  );

  const handleClosePanel = useCallback(() => {
    setActivePanel(null);
  }, []);

  const hasMainContent = selectedUser || activePanel;

  return (
    <div className="flex h-full w-full overflow-hidden rounded-3xl bg-white shadow-sm relative">
      <div
        className={`${hasMainContent ? "hidden" : "flex"
          } md:flex w-full md:w-80 h-full flex-shrink-0 border-r border-gray-50`}
      >
        <ConversationSidebar
          title={title}
          selectedChat={selectedUser}
          activePanel={activePanel}
          onChatSelect={handleChatSelect}
          onNewMatchesSelect={handleNewMatchesSelect}
          onHighlightMessage={handleHighlightMessage}
        />
      </div>

      <div
        className={`${hasMainContent ? "flex" : "hidden"
          } md:flex flex-1 h-full min-w-0`}
      >
        {activePanel === "newMatches" ? (
          <NewMatchesPanel
            matches={newMatches}
            onStartChat={handleChatSelect}
            onClose={handleClosePanel}
          />
        ) : (
          <ChatArea
            ref={chatAreaRef}
            chat={selectedUser}
            onToggleInfoSidebar={() => setIsInfoSidebarOpen(!isInfoSidebarOpen)}
            isInfoSidebarOpen={isInfoSidebarOpen}
            externalHighlightMessageId={pendingHighlightMessageId}
            onHighlightProcessed={handleHighlightProcessed}
            onProfileClick={setDetailProfile}
          />
        )}
      </div>

      {isInfoSidebarOpen && selectedUser && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40 xl:hidden"
            onClick={() => setIsInfoSidebarOpen(false)}
          />
          <div className="fixed right-0 top-0 bottom-0 w-[280px] z-50 xl:relative xl:w-80 h-full flex-shrink-0 border-l border-gray-50 bg-white shadow-xl xl:shadow-none">
            <InfoSidebar
              chat={selectedUser}
              onClose={() => setIsInfoSidebarOpen(false)}
            />
          </div>
        </>
      )}

      <ProfileDetailModal
        profile={detailProfile}
        currentUser={authUser}
        onClose={() => setDetailProfile(null)}
      />
    </div>
  );
}

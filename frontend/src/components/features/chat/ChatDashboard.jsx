import { useEffect, useState, useCallback, useRef } from "react";
import { useChat } from "../../../context/ChatContext";
import { useGroup } from "../../../context/GroupContext";
import ConversationSidebar from "./ConversationSidebar";
import ChatArea from "./ChatArea";
import InfoSidebar from "./InfoSidebar";
import GroupChatArea from "./GroupChatArea";
import GroupInfoSidebar from "./GroupInfoSidebar";

export default function ChatDashboard({ title = "Messages", allowGroups = true }) {
  const { selectedUser, setSelectedUser } = useChat();
  const { selectedGroup, selectGroup, clearSelectedGroup } = useGroup();
  const [isInfoSidebarOpen, setIsInfoSidebarOpen] = useState(false);
  const [pendingHighlightMessageId, setPendingHighlightMessageId] = useState(null);

  const chatAreaRef = useRef(null);

  useEffect(() => {
    if (!allowGroups && selectedGroup) {
      clearSelectedGroup();
    }
  }, [allowGroups, selectedGroup, clearSelectedGroup]);

  // Handle message highlight from sidebar search
  const handleHighlightMessage = useCallback((messageId) => {
    setPendingHighlightMessageId(messageId);
  }, []);

  // Clear pending highlight after ChatArea processes it
  const handleHighlightProcessed = useCallback(() => {
    setPendingHighlightMessageId(null);
  }, []);

  // Handle chat selection (clear group when selecting chat)
  const handleChatSelect = useCallback(
    (user) => {
      setSelectedUser(user);
      if (user) {
        clearSelectedGroup();
      }
    },
    [setSelectedUser, clearSelectedGroup]
  );

  // Handle group selection (clear chat when selecting group)
  const handleGroupSelect = useCallback(
    (group) => {
      if (group) {
        if (!allowGroups) return;
        setSelectedUser(null);
        selectGroup(group);
      } else {
        clearSelectedGroup();
      }
    },
    [allowGroups, setSelectedUser, selectGroup, clearSelectedGroup]
  );

  // Check if anything is selected
  const activeGroup = allowGroups ? selectedGroup : null;
  const hasSelection = selectedUser || activeGroup;

  return (
    <div className="flex h-full w-full overflow-hidden rounded-3xl bg-white shadow-sm relative">
      {/* Sidebar */}
      <div
        className={`${
          hasSelection ? "hidden" : "flex"
        } md:flex w-full md:w-80 h-full flex-shrink-0 border-r border-gray-50`}
      >
        <ConversationSidebar
          title={title}
          allowGroups={allowGroups}
          selectedChat={selectedUser}
          onChatSelect={handleChatSelect}
          onHighlightMessage={handleHighlightMessage}
          selectedGroup={activeGroup}
          onGroupSelect={handleGroupSelect}
        />
      </div>

      {/* Chat Area / Group Chat Area */}
      <div
        className={`${
          hasSelection ? "flex" : "hidden"
        } md:flex flex-1 h-full min-w-0`}
      >
        {activeGroup ? (
          <GroupChatArea
            onBack={() => {
              clearSelectedGroup();
              setIsInfoSidebarOpen(false);
            }}
            onToggleInfoSidebar={() => setIsInfoSidebarOpen(!isInfoSidebarOpen)}
            isInfoSidebarOpen={isInfoSidebarOpen}
          />
        ) : (
          <ChatArea
            ref={chatAreaRef}
            chat={selectedUser}
            onToggleInfoSidebar={() => setIsInfoSidebarOpen(!isInfoSidebarOpen)}
            isInfoSidebarOpen={isInfoSidebarOpen}
            externalHighlightMessageId={pendingHighlightMessageId}
            onHighlightProcessed={handleHighlightProcessed}
          />
        )}
      </div>

      {/* Info Sidebar (for direct chats) */}
      {isInfoSidebarOpen && selectedUser && !selectedGroup && (
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

      {/* Group Info Sidebar */}
      {isInfoSidebarOpen && activeGroup && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40 xl:hidden"
            onClick={() => setIsInfoSidebarOpen(false)}
          />
          <div className="fixed right-0 top-0 bottom-0 w-[280px] z-50 xl:relative xl:w-80 h-full flex-shrink-0 border-l border-gray-50 bg-white shadow-xl xl:shadow-none">
            <GroupInfoSidebar onClose={() => setIsInfoSidebarOpen(false)} />
          </div>
        </>
      )}
    </div>
  );
}

import { useState, useCallback, useEffect, useRef, forwardRef } from "react";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";
import MessageSearch from "./MessageSearch";
import { MessageCircleMore, ShieldAlert } from "lucide-react";
import { useBlock } from "../../../context/BlockContext";
import { useDating } from "../../../context/DatingContext";

const ChatArea = forwardRef(function ChatArea({
  chat,
  onToggleInfoSidebar,
  isInfoSidebarOpen,
  externalHighlightMessageId,
  onHighlightProcessed,
}, ref) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [highlightMessageId, setHighlightMessageId] = useState(null);
  const messageListRef = useRef(null);
  const { isUserBlocked, isUserSpammed } = useBlock();
  const { matches } = useDating();

  // Check friend status
  const chatUserId = chat?._id || chat?.id;
  const isDatingMatch = matches.some((match) => match._id === chatUserId);
  const isBlocked = isUserBlocked(chatUserId);
  const isSpammed = isUserSpammed(chatUserId);

  // Toggle search panel
  const handleToggleSearch = useCallback(() => {
    setIsSearchOpen((prev) => !prev);
    if (isSearchOpen) {
      setHighlightMessageId(null);
    }
  }, [isSearchOpen]);

  // Close search when chat changes
  useEffect(() => {
    setIsSearchOpen(false);
    setHighlightMessageId(null);
  }, [chat?._id, chat?.id]);

  // Handle external highlight (from sidebar search)
  useEffect(() => {
    if (externalHighlightMessageId) {
      setHighlightMessageId(externalHighlightMessageId);

      // Scroll to message with a delay to ensure messages are loaded
      setTimeout(() => {
        const messageElement = document.getElementById(`message-${externalHighlightMessageId}`);
        if (messageElement) {
          messageElement.scrollIntoView({ behavior: "smooth", block: "center" });
          messageElement.classList.add("highlight-message");
          setTimeout(() => {
            messageElement.classList.remove("highlight-message");
          }, 2000);
        }
      }, 500);

      // Notify parent that highlight was processed
      if (onHighlightProcessed) {
        onHighlightProcessed();
      }
    }
  }, [externalHighlightMessageId, onHighlightProcessed]);

  // Keyboard shortcut for search (Ctrl+F)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f" && chat) {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [chat]);

  // Navigate to a specific message (from ChatHeader search)
  const handleNavigateToMessage = useCallback((messageId) => {
    setHighlightMessageId(messageId);

    // Scroll to message with a slight delay to ensure render
    setTimeout(() => {
      const messageElement = document.getElementById(`message-${messageId}`);
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: "smooth", block: "center" });

        // Add highlight effect
        messageElement.classList.add("highlight-message");
        setTimeout(() => {
          messageElement.classList.remove("highlight-message");
        }, 2000);
      }
    }, 100);
  }, []);

  // Close search
  const handleCloseSearch = useCallback(() => {
    setIsSearchOpen(false);
    setHighlightMessageId(null);
  }, []);

  if (!chat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full bg-[#FAFAFA]">
        <div className="w-40 h-40 bg-gray-100 rounded-full mb-4 flex items-center justify-center">
          <MessageCircleMore size={64} className="text-gray-300" />
        </div>
        <p className="text-gray-400 font-medium text-sm">Select a conversation to start chatting</p>
      </div>
    );
  }

  return (
    <div ref={ref} className="flex-1 flex flex-col h-full bg-white relative">
      <ChatHeader
        chat={chat}
        onToggleInfoSidebar={onToggleInfoSidebar}
        isInfoSidebarOpen={isInfoSidebarOpen}
        onToggleSearch={handleToggleSearch}
        isSearchOpen={isSearchOpen}
      />

      {/* Search Panel */}
      {isSearchOpen && (
        <MessageSearch
          chat={chat}
          onClose={handleCloseSearch}
          onNavigateToMessage={handleNavigateToMessage}
        />
      )}

      {/* Blocked user warning */}
      {isBlocked && (
        <div className="px-4 py-2.5 bg-gradient-to-r from-red-50 to-rose-50 border-y border-red-200">
          <div className="flex items-center justify-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-600" />
            <p className="text-sm text-red-800">
              <span className="font-semibold">This user is blocked.</span> They cannot send you messages.
            </p>
          </div>
        </div>
      )}

      {/* Spammed user warning */}
      {!isBlocked && isSpammed && (
        <div className="px-4 py-2.5 bg-gradient-to-r from-orange-50 to-yellow-50 border-y border-orange-200">
          <div className="flex items-center justify-center gap-2">
            <ShieldAlert className="w-5 h-5 text-orange-600" />
            <p className="text-sm text-orange-800">
              <span className="font-semibold">This user is marked as spam.</span> Their messages appear in unread.
            </p>
          </div>
        </div>
      )}

      {/* Match gate notification banner */}
      {!chat?.isSelfChat && !isDatingMatch && !isBlocked && !isSpammed && (
        <div className="px-4 py-2.5 bg-gradient-to-r from-rose-50 to-pink-50 border-y border-rose-200">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <p className="text-sm text-rose-800">
              <span className="font-semibold">Match required.</span> You can message {chat.fullName} after both of you like each other.
            </p>
          </div>
        </div>
      )}

      <MessageList
        ref={messageListRef}
        chat={chat}
        highlightMessageId={highlightMessageId}
      />

      <ChatInput chat={chat} />

      {/* CSS for message highlighting */}
      <style jsx>{`
        :global(.highlight-message) {
          animation: highlightPulse 2s ease-out;
        }
        
        @keyframes highlightPulse {
          0%, 100% {
            background-color: transparent;
          }
          25%, 75% {
            background-color: rgba(251, 191, 36, 0.3);
          }
        }
      `}</style>
    </div>
  );
});

export default ChatArea;

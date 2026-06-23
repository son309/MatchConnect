import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { SocketProvider } from "../context/SocketContext";
import { FriendProvider } from "../context/FriendContext";
import { ChatProvider } from "../context/ChatContext";
import { CallProvider } from "../context/CallContext";
import { GroupProvider } from "../context/GroupContext";
import { BlockProvider } from "../context/BlockContext";
import { DatingProvider } from "../context/DatingContext";
import { ReportProvider } from "../context/ReportContext";
import { useNavigate, Outlet } from "react-router-dom";
import { LoaderIcon } from "lucide-react";
import NavigationSidebar from "../components/features/NavigationSidebar";
import IncomingCallModal from "../components/IncomingCallModal";

// Content component separated from Providers
const ChatPageContent = () => {
  return (
    // Responsive: flex-col trên mobile, flex-row trên desktop
    <div className="h-screen w-full bg-[#F2F0E9] flex flex-col md:flex-row p-0 md:p-2 gap-0 md:gap-1 overflow-hidden">
      {/* Vùng nội dung chính: Hiện lên trên cùng ở mobile (order-1) */}
      <div className="flex-1 h-full min-w-0 bg-white md:rounded-3xl shadow-xl overflow-hidden relative order-1 md:order-2">
        <Outlet />
      </div>

      {/* Navigation: Hiện ở dưới cùng trên mobile (order-2) */}
      <div className="order-2 md:order-1 w-full md:w-auto shrink-0">
        <NavigationSidebar />
      </div>

      {/* Incoming Call Modal - shown when receiving a call */}
      <IncomingCallModal />
    </div>
  );
};

export default function ChatPage() {
  const { authUser, isCheckingAuth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isCheckingAuth && !authUser) navigate("/login", { replace: true });
  }, [authUser, isCheckingAuth, navigate]);

  if (isCheckingAuth || !authUser) {
    return (
      <div className="h-screen flex justify-center items-center">
        <LoaderIcon className="animate-spin" />
      </div>
    );
  }

  // Wrap with all providers in proper order
  return (
    <SocketProvider>
      <FriendProvider>
        <BlockProvider>
          <ChatProvider>
            <GroupProvider>
              <DatingProvider>
                <ReportProvider>
                  <CallProvider>
                    <ChatPageContent />
                  </CallProvider>
                </ReportProvider>
              </DatingProvider>
            </GroupProvider>
          </ChatProvider>
        </BlockProvider>
      </FriendProvider>
    </SocketProvider>
  );
}



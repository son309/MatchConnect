import { AuthProvider, useAuth } from "../context/AuthContext";
import { SocketProvider } from "../context/SocketContext";
import { CallProvider } from "../context/CallContext";
import CallPage from "./CallPage";
import { LoaderIcon } from "lucide-react";

// Inner component that uses auth
function CallPageContent() {
  const { authUser, isCheckingAuth } = useAuth();

  // Show loading while checking auth
  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-gray-900">
        <LoaderIcon className="w-10 h-10 animate-spin text-pink-500" />
        <span className="ml-2 text-white">Connecting...</span>
      </div>
    );
  }

  // If not authenticated, show error
  if (!authUser) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-gray-900">
        <div className="text-center text-white">
          <p className="text-xl">Session expired</p>
          <p className="text-gray-400 mt-2">Please close this window and try again</p>
        </div>
      </div>
    );
  }

  return (
    <SocketProvider>
      <CallProvider>
        <CallPage />
      </CallProvider>
    </SocketProvider>
  );
}

// Wrapper component to provide necessary context for the standalone call window
// Must include AuthProvider so that SocketProvider can access authUser
export default function CallPageWrapper() {
  return (
    <AuthProvider>
      <CallPageContent />
    </AuthProvider>
  );
}

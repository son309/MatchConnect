import { Routes, Route, Navigate } from "react-router-dom";
import { LoaderIcon } from "lucide-react"; // Import icon loading
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import ChatPage from "./pages/ChatPage";
import CallPageWrapper from "./pages/CallPageWrapper";
import ForgotPasswordPage from "./pages/ForgetPasswordPage";
import HomeDashboard from "./components/features/home/HomeDashboard";
import CallsDashboard from "./components/features/calls/CallsDashboard";
import DatingDashboard from "./components/features/dating/DatingDashboard";
import FriendsDashboard from "./components/features/friends/FriendsDashboard";
import ChatDashboard from "./components/features/chat/ChatDashboard";
import SettingsDashboard from "./components/features/settings/SettingsDashboard";
import { useAuth } from "./context/AuthContext";
import AuthLayout from './layouts/AuthLayout';
import FriendsList from "./components/features/friends/FriendsList";
import SentRequests from "./components/features/friends/SentRequests";
import ProfileSettings from "./components/features/settings/ProfileSettings";
import ChangePassword from "./components/features/settings/ChangePassword";
import ActivitySettings from "./components/features/settings/ActivitySettings";
import AdminDashboard from "./components/features/admin/AdminDashboard";
function App() {
  const { authUser, isCheckingAuth } = useAuth();
  const isAdmin = authUser?.role === "admin";

  //Chặn render router khi đang kiểm tra đăng nhập
  if (isCheckingAuth && !authUser) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-[#F2F0E9]">
        <LoaderIcon className="w-10 h-10 animate-spin text-pink-500" />
      </div>
    );
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />

        <Route element={<AuthLayout />}>
          <Route path="/login" element={!authUser ? <LoginPage /> : <Navigate to={isAdmin ? "/chat/admin" : "/chat"} />} />
          <Route path="/signup" element={!authUser ? <SignUpPage /> : <Navigate to={isAdmin ? "/chat/admin" : "/chat"} />} />
          <Route path="/forgot-password" element={!authUser ? <ForgotPasswordPage /> : <Navigate to={isAdmin ? "/chat/admin" : "/chat"} />} />
        </Route>



        <Route
          path="/call-window"
          element={<CallPageWrapper />}
        />
        <Route path="/chat" element={authUser ? <ChatPage /> : <Navigate to="/login" />} >
          {/* Mặc định vào /chat sẽ chuyển hướng sang /chat/home */}
          <Route index element={<Navigate to={isAdmin ? "admin" : "dating?tab=discover"} replace />} />

          {/* Các Route con */}
          <Route path="home" element={!isAdmin ? <HomeDashboard /> : <Navigate to="/chat/admin" replace />} />
          <Route path="messages" element={!isAdmin ? <ChatDashboard title="Messages" /> : <Navigate to="/chat/admin" replace />} />
          <Route path="matches" element={!isAdmin ? <ChatDashboard title="Matches" allowGroups={false} /> : <Navigate to="/chat/admin" replace />} />
          <Route path="dating" element={!isAdmin ? <DatingDashboard /> : <Navigate to="/chat/admin" replace />} />
          <Route path="profile" element={!isAdmin ? <ProfileSettings /> : <Navigate to="/chat/admin" replace />} />
          <Route path="friends" element={!isAdmin ? <FriendsDashboard /> : <Navigate to="/chat/admin" replace />}>
            <Route index element={<Navigate to="all" replace />} />
            <Route path="all" element={<FriendsList type="all" />} />
            <Route path="online" element={<FriendsList type="online" />} />
            <Route path="requests" element={<FriendsList type="requests" />} />
            <Route path="sent" element={<SentRequests />} />
          </Route>
          <Route path="calls" element={!isAdmin ? <CallsDashboard /> : <Navigate to="/chat/admin" replace />} />
          {/* [MODIFIED] Cấu hình Nested Route cho Settings */}
          <Route path="admin" element={authUser?.role === "admin" ? <AdminDashboard /> : <Navigate to="/chat/dating?tab=discover" replace />} />
          <Route path="settings" element={<SettingsDashboard />}>
            {/* Mặc định vào settings sẽ chuyển ngay tới profile */}
            <Route index element={<Navigate to="activity" replace />} />
            <Route path="activity" element={<ActivitySettings />} />
            <Route path="profile" element={<Navigate to="/chat/profile" replace />} />
            <Route path="password" element={<ChangePassword />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}

export default App;

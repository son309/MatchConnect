import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  HeartIcon,
  MailIcon,
  LockIcon,
  LoaderIcon,
  ShieldCheckIcon,
  UserIcon,
} from "lucide-react";
import { Link, useNavigate } from "react-router";

function LoginPage() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loginMode, setLoginMode] = useState("user");
  const { login, isLoggingIn, authUser, isCheckingAuth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isCheckingAuth && authUser) {
      navigate(authUser.role === "admin" && loginMode === "admin" ? "/chat/admin" : "/chat", {
        replace: true,
      });
    }
  }, [authUser, isCheckingAuth, loginMode, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login({ ...formData, expectedRole: loginMode });
    } catch (error) {
      // Toast is handled in AuthContext.
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  if (isCheckingAuth) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <LoaderIcon className="h-8 w-8 animate-spin text-pink-400" />
      </div>
    );
  }

  const isAdminMode = loginMode === "admin";

  return (
    <div className="w-full flex flex-col md:flex-row bg-white rounded-xl shadow-lg overflow-hidden min-h-[600px]">
      <div className="w-full md:w-1/2 p-8 flex items-center justify-center border-r border-gray-200">
        <div className="w-full max-w-md">
          <div className="text-center mb-6 md:mb-8">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-50 text-pink-400">
              {isAdminMode ? <ShieldCheckIcon size={28} /> : <HeartIcon size={28} />}
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
              {isAdminMode ? "Admin Login" : "User Login"}
            </h2>
            <p className="text-gray-500">
              {isAdminMode
                ? "Sign in with an administrator account"
                : "Sign in to continue matching and chatting"}
            </p>
          </div>

          <div className="mb-5 grid grid-cols-2 rounded-2xl bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setLoginMode("user")}
              className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition ${
                !isAdminMode ? "bg-white text-pink-500 shadow-sm" : "text-gray-500 hover:text-gray-800"
              }`}
            >
              <UserIcon size={17} />
              User
            </button>
            <button
              type="button"
              onClick={() => setLoginMode("admin")}
              className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition ${
                isAdminMode ? "bg-white text-pink-500 shadow-sm" : "text-gray-500 hover:text-gray-800"
              }`}
            >
              <ShieldCheckIcon size={17} />
              Admin
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
            <div>
              <label className="block text-gray-700 font-medium mb-1">Email</label>
              <div className="relative">
                <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300"
                  placeholder={isAdminMode ? "admin@example.com" : "example@gmail.com"}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-1">Password</label>
              <div className="relative">
                <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300"
                  placeholder="Enter your password"
                  required
                />
              </div>
              <div className="text-right mt-1">
                <Link to="/forgot-password" className="text-sm text-purple-500 hover:underline">
                  Forgot password?
                </Link>
              </div>
            </div>

            {isAdminMode && (
              <div className="rounded-2xl bg-pink-50 px-4 py-3 text-sm font-medium text-pink-600">
                Admin login only works for accounts configured with admin access.
              </div>
            )}

            <button
              className="w-full text-white font-semibold py-2.5 rounded-lg transition-colors bg-pink-400 hover:bg-pink-500 disabled:opacity-70"
              type="submit"
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <LoaderIcon className="w-5 h-5 mx-auto animate-spin" />
              ) : isAdminMode ? (
                "Login as Admin"
              ) : (
                "Login as User"
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/signup" className="text-pink-400 hover:underline font-medium">
              Don't have an account? Sign Up
            </Link>
            <br />
            <Link to="/" className="text-[#847ef2] hover:underline font-medium">
              or Back to Home
            </Link>
          </div>
        </div>
      </div>

      <div
        className="md:block md:w-1/2 bg-cover bg-center hidden"
        style={{ backgroundImage: "url('/sample.png')" }}
      ></div>
    </div>
  );
}

export default LoginPage;
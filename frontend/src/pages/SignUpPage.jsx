import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  HeartIcon,
  UserIcon,
  MailIcon,
  LockIcon,
  LoaderIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { Link, useNavigate } from "react-router";

function SignUpPage() {
  const [formData, setFormData] = useState({ fullName: "", email: "", password: "" });
  const [signupMode, setSignupMode] = useState("user");
  const [errors, setErrors] = useState({});

  const { signup, isSigningUp, authUser, isCheckingAuth } = useAuth();
  const navigate = useNavigate();

  const isAdminMode = signupMode === "admin";
  const isPasswordValid = formData.password.length >= 6;
  const hasTypedPassword = formData.password.length > 0;
  const passwordColor = isPasswordValid ? "text-green-600" : hasTypedPassword ? "text-red-500" : "text-gray-400";
  const dotColor = isPasswordValid ? "bg-green-500" : hasTypedPassword ? "bg-red-500" : "bg-gray-300";

  useEffect(() => {
    if (!isCheckingAuth && authUser) {
      navigate(authUser.role === "admin" && isAdminMode ? "/chat/admin" : "/chat", { replace: true });
    }
  }, [authUser, isCheckingAuth, isAdminMode, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) setErrors({ ...errors, [name]: "" });
  };

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = "Full name is required";
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      await signup({ ...formData, requestedRole: signupMode });
    } catch (error) {
      // Toast is handled in AuthContext.
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center h-screen w-full">
        <LoaderIcon className="w-8 h-8 animate-spin text-pink-400" />
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col md:flex-row bg-white rounded-xl shadow-lg overflow-hidden min-h-[600px]">
      <div className="md:w-1/2 p-8 flex items-center justify-center border-r border-gray-200">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-50 text-pink-400">
              {isAdminMode ? <ShieldCheckIcon size={28} /> : <HeartIcon size={28} />}
            </div>
            <h2 className="text-3xl font-bold text-gray-800">
              {isAdminMode ? "Create Admin Account" : "Create Account"}
            </h2>
            <p className="text-gray-500">
              {isAdminMode ? "Register with an approved administrator email" : "Sign up for a new dating account"}
            </p>
          </div>

          <div className="mb-5 grid grid-cols-2 rounded-2xl bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setSignupMode("user")}
              className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition ${
                !isAdminMode ? "bg-white text-pink-500 shadow-sm" : "text-gray-500 hover:text-gray-800"
              }`}
            >
              <UserIcon size={17} />
              User
            </button>
            <button
              type="button"
              onClick={() => setSignupMode("admin")}
              className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition ${
                isAdminMode ? "bg-white text-pink-500 shadow-sm" : "text-gray-500 hover:text-gray-800"
              }`}
            >
              <ShieldCheckIcon size={17} />
              Admin
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-gray-700 font-medium mb-1 text-sm">Full Name</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  name="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    errors.fullName ? "border-red-500 focus:ring-red-100" : "border-gray-300 focus:ring-pink-300"
                  }`}
                  placeholder="Enter your full name"
                />
              </div>
              {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-1 text-sm">Email</label>
              <div className="relative">
                <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    errors.email ? "border-red-500 focus:ring-red-100" : "border-gray-300 focus:ring-pink-300"
                  }`}
                  placeholder={isAdminMode ? "admin@example.com" : "example@gmail.com"}
                />
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-1 text-sm">Password</label>
              <div className="relative">
                <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    errors.password ? "border-red-500 focus:ring-red-100" : "border-gray-300 focus:ring-pink-300"
                  }`}
                  placeholder="Enter your password"
                />
              </div>

              <div className="mt-2 ml-1">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${dotColor}`} />
                  <p className={`text-[11px] font-semibold transition-colors duration-300 ${passwordColor}`}>
                    {isPasswordValid ? "Password meets requirements" : "At least 6 characters required"}
                  </p>
                </div>
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
              </div>
            </div>

            {isAdminMode && (
              <div className="rounded-2xl bg-pink-50 px-4 py-3 text-sm font-medium text-pink-600">
                Admin registration requires this email to be listed in ADMIN_EMAILS.
              </div>
            )}

            <button
              className="w-full text-white font-semibold py-2.5 rounded-lg transition-all bg-pink-400 hover:bg-pink-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              type="submit"
              disabled={isSigningUp}
            >
              {isSigningUp ? (
                <div className="flex items-center justify-center gap-2">
                  <LoaderIcon className="w-5 h-5 animate-spin" />
                  <span>Creating Account...</span>
                </div>
              ) : isAdminMode ? (
                "Create Admin Account"
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <Link to="/login" className="text-pink-400 hover:underline font-medium">
              Already have an account? Login
            </Link>
            <br />
            <Link to="/" className="text-[#847ef2] hover:underline font-medium">
              or Back to Home
            </Link>
          </div>
        </div>
      </div>

      <div
        className="hidden md:block md:w-1/2 bg-cover bg-center"
        style={{ backgroundImage: "url('/sample.png')" }}
      />
    </div>
  );
}

export default SignUpPage;
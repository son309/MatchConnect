import { createContext, useContext, useState, useEffect } from "react";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [authUser, setAuthUser] = useState(null);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const [isSigningUp, setIsSigningUp] = useState(false);
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
    const [isSendingOTP, setIsSendingOTP] = useState(false);
    const [isResettingPassword, setIsResettingPassword] = useState(false);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        setIsCheckingAuth(true);
        try {
            const res = await axiosInstance.get("/auth/check");
            setAuthUser(res.data);
        } catch (error) {
            console.log("Error checking auth:", error);
            setAuthUser(null);
        } finally {
            setIsCheckingAuth(false);
        }
    };

    const signup = async (data) => {
        setIsSigningUp(true);
        try {
            const res = await axiosInstance.post("/auth/signup", data);
            console.log("Signup successful:", res.data);
            setAuthUser(res.data);
            toast.success("Account created successfully!");
        } catch (error) {
            toast.error(error.response?.data?.message || "Signup failed");
            throw error;
        } finally {
            setIsSigningUp(false);
        }
    };

    const login = async (data) => {
        setIsLoggingIn(true);
        try {
            const res = await axiosInstance.post("/auth/login", data);
            console.log("Login successful:", res.data);
            setAuthUser(res.data);
            toast.success("Logged in successfully!");
        } catch (error) {
            toast.error(error.response?.data?.message || "Login failed");
            throw error;
        } finally {
            setIsLoggingIn(false);
        }
    };

    const logout = async () => {
        try {
            await axiosInstance.post("/auth/logout");
            console.log("Logout successful");
            setAuthUser(null);
            toast.success("Logged out successfully");
        } catch (error) {
            toast.error(error.response?.data?.message || "Logout failed");
        }
    };

    const updateProfile = async (data) => {
        setIsUpdatingProfile(true);
        try {
            const res = await axiosInstance.put("/auth/update-profile", data);
            console.log("Profile update successful:", res.data);
            setAuthUser(res.data);
            toast.success("Profile updated successfully!");
        } catch (error) {
            toast.error(error.response?.data?.message || "Update failed");
            throw error;
        } finally {
            setIsUpdatingProfile(false);
        }
    };

    const forgotPassword = async (email) => {
        setIsSendingOTP(true);
        try {
            const res = await axiosInstance.post("/auth/forgot-password", { email });
            toast.success(res.data.message || "Mã OTP đã được gửi!");
            return true; // Trả về true để Frontend biết và chuyển bước (Step)
        } catch (error) {
            toast.error(error.response?.data?.message || "Gửi OTP thất bại");
            return false;
        } finally {
            setIsSendingOTP(false);
        }
    };

    const resetPassword = async (data) => {
        setIsResettingPassword(true);
        try {
            const res = await axiosInstance.post("/auth/reset-password", data);
            toast.success("Đặt lại mật khẩu thành công!");
            return true;
        } catch (error) {
            toast.error(error.response?.data?.message || "Đặt lại mật khẩu thất bại");
            return false;
        } finally {
            setIsResettingPassword(false);
        }
    };

        const value = {
        authUser,
        setAuthUser,
        isCheckingAuth,
        isSigningUp,
        isLoggingIn,
        isUpdatingProfile,
        signup,
        login,
        logout,
        checkAuth,
        updateProfile,
        isSendingOTP,
        isResettingPassword,
        forgotPassword,
        resetPassword,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within AuthProvider");
    }
    return context;
};

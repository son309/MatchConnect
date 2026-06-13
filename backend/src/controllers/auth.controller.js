import { sendWelcomeEmail,sendOTPEmail } from "../emails/emailHandlers.js";
import { generateToken } from "../lib/utils.js";
import { ENV } from "../lib/env.js";
import {
    signupService,
    loginService,
    updateProfileService,
    getUserByIdService,
    changePasswordService,
    forgotPasswordService, resetPasswordService
} from "../services/auth.service.js";

export const signup = async (req, res) => {
    const { fullName, email, password } = req.body;

    try {
        const user = await signupService(fullName, email, password);

        // Generate token after successful signup
        generateToken(user._id, res);

        res.status(201).json(user);

        // Send welcome email (non-blocking)
        try {
            await sendWelcomeEmail(user.email, user.fullName, ENV.CLIENT_URL);
        } catch (emailError) {
            console.error("Failed to send welcome email:", emailError);
        }
    } catch (error) {
        console.error("signup:", error);
        res.status(error.statusCode || 500).json({ message: error.message || "Server error" });
    }
};

export const login = async (req, res) => {
    const { email, password } = req.body;


    try {
        const user = await loginService(email, password);

        // Generate token after successful login
        generateToken(user._id, res);

        res.status(200).json(user);
    } catch (error) {
        console.error("login:", error);
        res.status(error.statusCode || 500).json({ message: error.message || "Server error" });
    }
};

export const logout = (_, res) => {
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Logged out successfully" });
};


export const updateProfile = async (req, res) => {
    try {
        const { profilePic, fullName } = req.body;
        const userId = req.user._id;

        const updatedUser = await updateProfileService(userId, { fullName, profilePic });
        res.status(200).json(updatedUser);
    } catch (error) {
        console.error("updateProfile:", error);
        res.status(error.statusCode || 500).json({ message: error.message || "Server error" });
    }
};

export const checkAuth = async (req, res) => {
    try {
        const user = await getUserByIdService(req.user._id);
        res.status(200).json(user);
    } catch (error) {
        console.error("checkAuth:", error);
        res.status(error.statusCode || 500).json({ message: error.message || "Server error" });
    }
};

export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user._id;

        const result = await changePasswordService(userId, currentPassword, newPassword);

        res.status(200).json(result);
    } catch (error) {
        console.error("changePassword:", error);
        res.status(error.statusCode || 500).json({ message: error.message || "Server error" });
    }
};


export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const result = await forgotPasswordService(email);
        
        //await để đợi quá trình gửi mail hoàn tất
        await sendOTPEmail(result.email, result.fullName, result.otp);
        
        res.status(200).json({ message: "Mã OTP sent your email" });
    } catch (error) {
        //bắt lỗi từ service và emailHandler
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};


export const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        const result = await resetPasswordService(email, otp, newPassword);
        res.status(200).json(result);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};
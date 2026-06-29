import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";
import User from "../models/User.js";
import Call from "../models/Call.js";
import DatingAction from "../models/DatingAction.js";
import DatingMatch from "../models/DatingMatch.js";
import Message from "../models/Message.js";
import Report from "../models/Report.js";
import { ENV } from "../lib/env.js";
import { AppError } from "./AppError.js";

// Email regex for validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ADMIN_EMAILS = new Set(
    String(ENV.ADMIN_EMAILS || "")
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean)
);

const isAdminEmail = (email) => ADMIN_EMAILS.has(String(email || "").toLowerCase());

const normalizePhone = (phone) => String(phone || "")
    .replace(/[^0-9+\-\s()]/g, "")
    .trim()
    .slice(0, 30);

const publicUser = (user) => ({
    _id: user._id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone || "",
    profilePic: user.profilePic,
    role: user.role,
    isSuspended: user.isSuspended,
    profileVerification: user.profileVerification,
    datingProfile: user.datingProfile,
});

/**
 * Create a new user account
 */
export const signupService = async (fullName, email, password, requestedRole = "user") => {
    // Validation
    if (!fullName || !email || !password) {
        throw new AppError("All fields are required", 400);
    }

    if (password.length < 6) {
        throw new AppError("Password must be at least 6 characters", 400);
    }

    if (!EMAIL_REGEX.test(email)) {
        throw new AppError("Invalid email format", 400);
    }

    if (requestedRole === "admin" && !isAdminEmail(email)) {
        throw new AppError("This email is not allowed to create an admin account", 403);
    }

    if (requestedRole === "user" && isAdminEmail(email)) {
        throw new AppError("This email is reserved for admin registration. Please choose Admin.", 403);
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        throw new AppError("Email already exists", 400);
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const newUser = new User({
        fullName,
        email,
        password: hashedPassword,
        role: requestedRole === "admin" ? "admin" : "user",
    });

    const savedUser = await newUser.save();

    return publicUser(savedUser);
};

/**
 * Authenticate a user
 */
export const loginService = async (email, password, expectedRole = "user") => {
    if (!email || !password) {
        throw new AppError("Email and password are required", 400);
    }

    const user = await User.findOne({ email });
    if (!user) {
        throw new AppError("Invalid credentials", 400);
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
        throw new AppError("Invalid credentials", 400);
    }

    if (isAdminEmail(user.email) && user.role !== "admin") {
        user.role = "admin";
        await user.save();
    }

    if (expectedRole === "admin" && user.role !== "admin") {
        throw new AppError("This account does not have admin access", 403);
    }

    if (expectedRole === "user" && user.role === "admin") {
        throw new AppError("This is an admin account. Please choose Admin login.", 403);
    }

    if (user.isSuspended && user.role !== "admin") {
        throw new AppError("Your account has been suspended", 403);
    }

    return publicUser(user);
};

/**
 * Update user profile picture
 */
export const updateProfileService = async (userId, { fullName, phone, profilePic }) => {
    const updateData = {};
    if (fullName) updateData.fullName = fullName;
    if (phone !== undefined) updateData.phone = normalizePhone(phone);

    if (profilePic) {
        try {
            // Upload Base64 to Cloudinary
            const uploadResponse = await cloudinary.uploader.upload(profilePic);
            updateData.profilePic = uploadResponse.secure_url;
        } catch (uploadError) {
            console.error("Cloudinary upload error:", uploadError);
            throw new AppError("Failed to upload profile picture. Please try again.", 500);
        }
    }

    const updatedUser = await User.findByIdAndUpdate(
        userId,
        updateData,
        { new: true }
    ).select("-password");

    return updatedUser;
};

/**
 * Get user by ID (for auth check)
 */
export const getUserByIdService = async (userId) => {
    const user = await User.findById(userId).select("-password");
    return user;
};


export const deleteAccountService = async (userId, currentPassword) => {
    if (!currentPassword) {
        throw new AppError("Current password is required", 400);
    }

    const user = await User.findById(userId).select("password role");
    if (!user) {
        throw new AppError("User not found", 404);
    }

    if (user.role === "admin") {
        throw new AppError("Admin accounts cannot be deleted from user settings", 403);
    }

    const isPasswordCorrect = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordCorrect) {
        throw new AppError("Current password is incorrect", 400);
    }

    await Promise.all([
        Message.deleteMany({ $or: [{ senderId: userId }, { receiverId: userId }] }),
        DatingAction.deleteMany({ $or: [{ from: userId }, { to: userId }] }),
        DatingMatch.deleteMany({ $or: [{ userA: userId }, { userB: userId }] }),
        Call.deleteMany({ $or: [{ caller: userId }, { receiver: userId }] }),
        Report.deleteMany({ $or: [{ reporter: userId }, { reportedUser: userId }] }),
        User.updateMany(
            {},
            {
                $pull: {
                    friends: userId,
                    friendRequests: userId,
                    sentFriendRequests: userId,
                    blockedUsers: userId,
                    spammedUsers: userId,
                },
            }
        ),
    ]);

    await User.findByIdAndDelete(userId);

    return { message: "Account deleted successfully" };
};

/**
 * Change user password
 */
export const changePasswordService = async (userId, currentPassword, newPassword) => {
    if (!currentPassword || !newPassword) {
        throw new AppError("Current password and new password are required", 400);
    }

    if (newPassword.length < 6) {
        throw new AppError("New password must be at least 6 characters", 400);
    }

    // Get user with password
    const user = await User.findById(userId);
    if (!user) {
        throw new AppError("User not found", 404);
    }

    // Verify current password
    const isPasswordCorrect = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordCorrect) {
        throw new AppError("Current password is incorrect", 400);
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    user.password = hashedPassword;
    await user.save();

    return { message: "Password changed successfully" };
};


// Forget password - Tạo OTP và lưu vào DB
export const forgotPasswordService = async (email) => {
    const user = await User.findOne({ email });
    if (!user) throw new AppError("Email no exist ", 404);

    // Tạo mã OTP 6 số dạng chuỗi
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp; 
    user.otpExpires = Date.now() + 10 * 60 * 1000; // Hết hạn sau 10 phút
    await user.save();

    return { email: user.email, fullName: user.fullName, otp };
};

// Xác thực và đổi mật khẩu mới
export const resetPasswordService = async (email, otp, newPassword) => {
    const user = await User.findOne({ 
        email: email, 
        otp: otp.toString(), // Ép kiểu string để khớp với DB
        otpExpires: { $gt: Date.now() } 
    });

    if (!user) throw new AppError("Mã OTP incorrected or expired", 400);

    // Hash mật khẩu mới
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    
    // Xóa mã sau khi dùng thành công
    user.otp = undefined; 
    user.otpExpires = undefined;
    await user.save();

    return { message: "Change password successfully" };
};
import Call from "../models/Call.js";
import DatingAction from "../models/DatingAction.js";
import DatingMatch from "../models/DatingMatch.js";
import Group from "../models/Group.js";
import Message from "../models/Message.js";
import Report from "../models/Report.js";
import User from "../models/User.js";

const sanitizeUser = (user) => ({
  _id: user._id,
  fullName: user.fullName,
  email: user.email,
  profilePic: user.profilePic,
  role: user.role,
  isSuspended: user.isSuspended,
  suspendedAt: user.suspendedAt,
  suspendedReason: user.suspendedReason,
  profileVerification: user.profileVerification,
  datingProfile: user.datingProfile,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export const getAdminOverview = async (_, res) => {
  try {
    const [totalUsers, suspendedUsers, pendingReports, resolvedReports, pendingVerifications] = await Promise.all([
      User.countDocuments({ role: { $ne: "admin" } }),
      User.countDocuments({ role: { $ne: "admin" }, isSuspended: true }),
      Report.countDocuments({ status: "pending" }),
      Report.countDocuments({ status: "resolved" }),
      User.countDocuments({ "profileVerification.status": "pending" }),
    ]);

    res.status(200).json({
      totalUsers,
      suspendedUsers,
      pendingReports,
      resolvedReports,
      pendingVerifications,
    });
  } catch (error) {
    console.error("getAdminOverview:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getAdminReports = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status && status !== "all" ? { status } : {};

    const reports = await Report.find(filter)
      .populate("reporter", "fullName email profilePic role isSuspended")
      .populate("reportedUser", "fullName email profilePic role isSuspended suspendedReason")
      .sort({ createdAt: -1 })
      .limit(200);

    res.status(200).json(reports);
  } catch (error) {
    console.error("getAdminReports:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateReportStatus = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status } = req.body;
    const allowedStatuses = new Set(["pending", "reviewed", "resolved", "dismissed"]);

    if (!allowedStatuses.has(status)) {
      return res.status(400).json({ message: "Invalid report status" });
    }

    const report = await Report.findByIdAndUpdate(
      reportId,
      { status },
      { new: true }
    )
      .populate("reporter", "fullName email profilePic role isSuspended")
      .populate("reportedUser", "fullName email profilePic role isSuspended suspendedReason");

    if (!report) return res.status(404).json({ message: "Report not found" });

    res.status(200).json(report);
  } catch (error) {
    console.error("updateReportStatus:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getAdminUsers = async (req, res) => {
  try {
    const { search = "" } = req.query;
    const normalizedSearch = String(search).trim();
    const filter = normalizedSearch
      ? {
          $or: [
            { fullName: { $regex: normalizedSearch, $options: "i" } },
            { email: { $regex: normalizedSearch, $options: "i" } },
          ],
        }
      : {};

    const users = await User.find(filter)
      .select("-password -otp -otpExpires")
      .sort({ createdAt: -1 })
      .limit(200);

    res.status(200).json(users.map(sanitizeUser));
  } catch (error) {
    console.error("getAdminUsers:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateUserModeration = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isSuspended, suspendedReason = "" } = req.body;

    if (req.user._id.toString() === userId) {
      return res.status(400).json({ message: "You cannot suspend your own admin account" });
    }

    const user = await User.findById(userId).select("-password -otp -otpExpires");
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role === "admin") {
      return res.status(400).json({ message: "Admin accounts cannot be suspended here" });
    }

    user.isSuspended = Boolean(isSuspended);
    user.suspendedAt = user.isSuspended ? new Date() : null;
    user.suspendedReason = user.isSuspended
      ? String(suspendedReason || "Policy violation").trim().slice(0, 300)
      : "";

    await user.save();

    res.status(200).json(sanitizeUser(user));
  } catch (error) {
    console.error("updateUserModeration:", error);
    res.status(500).json({ message: "Server error" });
  }
};
export const updateProfileVerification = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, note = "" } = req.body;
    const allowedStatuses = new Set(["pending", "verified", "rejected", "none"]);

    if (!allowedStatuses.has(status)) {
      return res.status(400).json({ message: "Invalid verification status" });
    }

    const user = await User.findById(userId).select("-password -otp -otpExpires");
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role === "admin") {
      return res.status(400).json({ message: "Admin profiles do not need dating verification" });
    }

    const reviewed = status === "verified" || status === "rejected";
    user.profileVerification = {
      status,
      requestedAt: user.profileVerification?.requestedAt || (status === "pending" ? new Date() : null),
      reviewedAt: reviewed ? new Date() : null,
      reviewedBy: reviewed ? req.user._id : null,
      note: String(note || "").trim().slice(0, 300),
    };

    await user.save();

    res.status(200).json(sanitizeUser(user));
  } catch (error) {
    console.error("updateProfileVerification:", error);
    res.status(500).json({ message: "Server error" });
  }
};
export const deleteUserPermanently = async (req, res) => {
  try {
    const { userId } = req.params;

    if (req.user._id.toString() === userId) {
      return res.status(400).json({ message: "You cannot delete your own admin account" });
    }

    const user = await User.findById(userId).select("role");
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role === "admin") {
      return res.status(400).json({ message: "Admin accounts cannot be deleted here" });
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
      Group.updateMany({}, { $pull: { members: userId, admins: userId } }),
    ]);

    await Group.deleteMany({ members: { $size: 0 } });
    await User.findByIdAndDelete(userId);

    res.status(200).json({ message: "User permanently deleted", userId });
  } catch (error) {
    console.error("deleteUserPermanently:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const removeUserDatingPhoto = async (req, res) => {
  try {
    const { userId, photoIndex } = req.params;
    const index = Number(photoIndex);

    if (!Number.isInteger(index) || index < 0) {
      return res.status(400).json({ message: "Invalid photo index" });
    }

    const user = await User.findById(userId).select("-password -otp -otpExpires");
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role === "admin") {
      return res.status(400).json({ message: "Admin profiles do not have moderated dating photos" });
    }

    const photos = Array.isArray(user.datingProfile?.photos) ? [...user.datingProfile.photos] : [];
    if (index >= photos.length) {
      return res.status(404).json({ message: "Photo not found" });
    }

    photos.splice(index, 1);
    user.datingProfile.photos = photos;
    user.profileVerification = {
      status: "rejected",
      requestedAt: user.profileVerification?.requestedAt || null,
      reviewedAt: new Date(),
      reviewedBy: req.user._id,
      note: "A dating photo was removed for violating community rules",
    };

    await user.save();

    res.status(200).json(sanitizeUser(user));
  } catch (error) {
    console.error("removeUserDatingPhoto:", error);
    res.status(500).json({ message: "Server error" });
  }
};
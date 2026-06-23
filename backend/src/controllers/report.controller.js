import Report from "../models/Report.js";
import User from "../models/User.js";

const allowedReasons = new Set([
  "fake-profile",
  "harassment",
  "spam",
  "inappropriate-content",
  "scam",
  "other",
]);

export const createReport = async (req, res) => {
  try {
    const reporterId = req.user._id;
    const { userId: reportedUserId } = req.params;
    const { reason, details = "", blockUser = false } = req.body;

    if (reporterId.toString() === reportedUserId) {
      return res.status(400).json({ message: "You cannot report yourself" });
    }

    if (!allowedReasons.has(reason)) {
      return res.status(400).json({ message: "Invalid report reason" });
    }

    const reportedUser = await User.findById(reportedUserId).select("_id fullName");
    if (!reportedUser) {
      return res.status(404).json({ message: "Reported user not found" });
    }

    const report = await Report.create({
      reporter: reporterId,
      reportedUser: reportedUserId,
      reason,
      details: String(details || "").trim().slice(0, 1000),
    });

    if (blockUser) {
      await User.findByIdAndUpdate(reporterId, {
        $addToSet: { blockedUsers: reportedUserId },
        $pull: { spammedUsers: reportedUserId },
      });
    }

    res.status(201).json({
      message: blockUser ? "Report submitted and user blocked" : "Report submitted",
      report,
    });
  } catch (error) {
    console.error("createReport:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Server error",
    });
  }
};

export const getMyReports = async (req, res) => {
  try {
    const reports = await Report.find({ reporter: req.user._id })
      .populate("reportedUser", "fullName email profilePic")
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json(reports);
  } catch (error) {
    console.error("getMyReports:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Server error",
    });
  }
};

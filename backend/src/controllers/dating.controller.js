import mongoose from "mongoose";
import DatingAction from "../models/DatingAction.js";
import DatingMatch from "../models/DatingMatch.js";
import User from "../models/User.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketIds, io } from "../lib/socket.js";

const userSelect =
    "fullName email profilePic datingProfile createdAt";

const MAX_DATING_PHOTOS = 6;

function emitToUser(userId, event, data) {
    const socketIds = getReceiverSocketIds(userId);
    socketIds.forEach((socketId) => {
        io.to(socketId).emit(event, data);
    });
}

function normalizeInterests(interests) {
    if (!Array.isArray(interests)) return [];

    return [...new Set(
        interests
            .map((interest) => String(interest || "").trim())
            .filter(Boolean)
            .slice(0, 8)
    )];
}

async function normalizePhotos(photos) {
    if (!Array.isArray(photos)) return [];

    const normalized = photos
        .map((photo) => String(photo || "").trim())
        .filter(Boolean)
        .slice(0, MAX_DATING_PHOTOS);

    const uploadedPhotos = await Promise.all(
        normalized.map(async (photo) => {
            if (!photo.startsWith("data:image/")) return photo;

            const uploadResponse = await cloudinary.uploader.upload(photo, {
                folder: "dating-photos",
            });
            return uploadResponse.secure_url;
        })
    );

    return uploadedPhotos.filter(Boolean);
}

function sanitizeDatingProfile(body) {
    const profile = {};

    if ("bio" in body) profile.bio = String(body.bio || "").trim().slice(0, 500);
    if ("age" in body) {
        const age = Number(body.age);
        profile.age = Number.isFinite(age) && age >= 18 && age <= 100 ? age : null;
    }
    if ("gender" in body) profile.gender = body.gender || "";
    if ("interestedIn" in body) profile.interestedIn = body.interestedIn || "everyone";
    if ("city" in body) profile.city = String(body.city || "").trim().slice(0, 80);
    if ("intentions" in body) profile.intentions = body.intentions || "";
    if ("interests" in body) profile.interests = normalizeInterests(body.interests);

    return profile;
}

function sortMatchUsers(userIdA, userIdB) {
    const first = userIdA.toString();
    const second = userIdB.toString();
    return first < second
        ? { userA: userIdA, userB: userIdB }
        : { userA: userIdB, userB: userIdA };
}

function getOtherUser(match, userId) {
    return match.userA._id.toString() === userId.toString()
        ? match.userB
        : match.userA;
}

function likesGender(preference, gender) {
    if (!preference || preference === "everyone" || !gender) return true;
    if (preference === "women") return gender === "woman";
    if (preference === "men") return gender === "man";
    return true;
}

function isMutualPreference(currentUser, candidate) {
    const currentProfile = currentUser.datingProfile || {};
    const candidateProfile = candidate.datingProfile || {};

    return (
        likesGender(currentProfile.interestedIn, candidateProfile.gender) &&
        likesGender(candidateProfile.interestedIn, currentProfile.gender)
    );
}

function buildDiscoverFilters(query) {
    const filters = {};
    const minAgeInput = String(query.minAge || "").trim();
    const maxAgeInput = String(query.maxAge || "").trim();
    const minAge = minAgeInput ? Number(minAgeInput) : null;
    const maxAge = maxAgeInput ? Number(maxAgeInput) : null;
    const city = String(query.city || "").trim();
    const intentions = String(query.intentions || "").trim();

    if (minAge !== null || maxAge !== null) {
        filters["datingProfile.age"] = {};
        if (Number.isFinite(minAge)) filters["datingProfile.age"].$gte = Math.max(18, minAge);
        if (Number.isFinite(maxAge)) filters["datingProfile.age"].$lte = Math.min(100, maxAge);
    }

    if (city) {
        filters["datingProfile.city"] = { $regex: city, $options: "i" };
    }

    if (intentions) {
        filters["datingProfile.intentions"] = intentions;
    }

    return filters;
}

export const getDatingProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select(userSelect);
        res.status(200).json(user);
    } catch (error) {
        console.error("getDatingProfile:", error);
        res.status(500).json({ message: "Failed to load dating profile" });
    }
};

export const updateDatingProfile = async (req, res) => {
    try {
        const profile = sanitizeDatingProfile(req.body);
        if ("photos" in req.body) {
            profile.photos = await normalizePhotos(req.body.photos);
        }
        const updateData = {};

        Object.entries(profile).forEach(([key, value]) => {
            updateData[`datingProfile.${key}`] = value;
        });

        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { $set: updateData },
            { new: true, runValidators: true }
        ).select(userSelect);

        res.status(200).json(updatedUser);
    } catch (error) {
        console.error("updateDatingProfile:", error);
        res.status(500).json({
            message: error.message || "Failed to update dating profile",
        });
    }
};

export const discoverProfiles = async (req, res) => {
    try {
        await DatingAction.deleteMany({ from: req.user._id, action: "pass" });

        const currentUser = await User.findById(req.user._id).select(
            "datingProfile blockedUsers spammedUsers"
        );
        const limit = Math.min(Number(req.query.limit) || 20, 50);
        const discoverFilters = buildDiscoverFilters(req.query);

        const [actions, incomingLikes, matches] = await Promise.all([
            DatingAction.find({ from: req.user._id, action: "like" }).select("to"),
            DatingAction.find({ to: req.user._id, action: "like" }).select("from"),
            DatingMatch.find({
                $or: [{ userA: req.user._id }, { userB: req.user._id }],
            }).select("userA userB"),
        ]);

        const excludedIds = new Set([
            req.user._id.toString(),
            ...(currentUser.blockedUsers || []).map((id) => id.toString()),
            ...(currentUser.spammedUsers || []).map((id) => id.toString()),
            ...actions.map((action) => action.to.toString()),
            ...incomingLikes.map((action) => action.from.toString()),
        ]);

        matches.forEach((match) => {
            excludedIds.add(
                match.userA.toString() === req.user._id.toString()
                    ? match.userB.toString()
                    : match.userA.toString()
            );
        });

        const candidates = await User.find({
            _id: {
                $nin: [...excludedIds].map((id) => new mongoose.Types.ObjectId(id)),
            },
            blockedUsers: { $ne: req.user._id },
            ...discoverFilters,
        })
            .select(userSelect)
            .sort({ updatedAt: -1 })
            .limit(limit * 3);

        const profiles = candidates
            .filter((candidate) => isMutualPreference(currentUser, candidate))
            .slice(0, limit);

        res.status(200).json(profiles);
    } catch (error) {
        console.error("discoverProfiles:", error);
        res.status(500).json({ message: "Failed to load discover profiles" });
    }
};

export const getLikedYou = async (req, res) => {
    try {
        const currentUser = await User.findById(req.user._id).select(
            "blockedUsers spammedUsers"
        );

        const [incomingLikes, myActions, matches] = await Promise.all([
            DatingAction.find({ to: req.user._id, action: "like" }).select("from createdAt"),
            DatingAction.find({ from: req.user._id }).select("to"),
            DatingMatch.find({
                $or: [{ userA: req.user._id }, { userB: req.user._id }],
            }).select("userA userB"),
        ]);

        const excludedIds = new Set([
            req.user._id.toString(),
            ...(currentUser.blockedUsers || []).map((id) => id.toString()),
            ...(currentUser.spammedUsers || []).map((id) => id.toString()),
            ...myActions.map((action) => action.to.toString()),
        ]);

        matches.forEach((match) => {
            excludedIds.add(
                match.userA.toString() === req.user._id.toString()
                    ? match.userB.toString()
                    : match.userA.toString()
            );
        });

        const likedByIds = incomingLikes
            .map((action) => action.from.toString())
            .filter((id) => !excludedIds.has(id));

        const users = await User.find({
            _id: {
                $in: likedByIds.map((id) => new mongoose.Types.ObjectId(id)),
            },
            blockedUsers: { $ne: req.user._id },
        }).select(userSelect);

        const likedAtByUserId = new Map(
            incomingLikes.map((action) => [
                action.from.toString(),
                action.createdAt,
            ])
        );

        const result = users
            .map((user) => ({
                ...user.toObject(),
                likedAt: likedAtByUserId.get(user._id.toString()),
            }))
            .sort((a, b) => new Date(b.likedAt) - new Date(a.likedAt));

        res.status(200).json(result);
    } catch (error) {
        console.error("getLikedYou:", error);
        res.status(500).json({ message: "Failed to load likes" });
    }
};

export const likeProfile = async (req, res) => {
    try {
        const targetId = req.params.userId;

        if (req.user._id.toString() === targetId) {
            return res.status(400).json({ message: "You cannot like yourself" });
        }

        const targetUser = await User.findById(targetId).select(userSelect);
        if (!targetUser) {
            return res.status(404).json({ message: "User not found" });
        }

        await DatingAction.findOneAndUpdate(
            { from: req.user._id, to: targetId },
            { action: "like" },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        const reciprocalLike = await DatingAction.findOne({
            from: targetId,
            to: req.user._id,
            action: "like",
        });

        if (!reciprocalLike) {
            const currentUser = await User.findById(req.user._id).select(userSelect);
            emitToUser(targetId, "dating:liked-you", {
                ...currentUser.toObject(),
                likedAt: new Date(),
            });

            return res.status(200).json({
                matched: false,
                user: targetUser,
            });
        }

        const { userA, userB } = sortMatchUsers(req.user._id, targetId);
        const match = await DatingMatch.findOneAndUpdate(
            { userA, userB },
            { userA, userB },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        const currentUser = await User.findById(req.user._id).select(userSelect);
        const targetPayload = {
            ...currentUser.toObject(),
            isDatingMatch: true,
            matchId: match._id,
            matchedAt: match.createdAt,
        };
        const currentPayload = {
            ...targetUser.toObject(),
            isDatingMatch: true,
            matchId: match._id,
            matchedAt: match.createdAt,
        };

        emitToUser(targetId, "dating:match", targetPayload);

        res.status(200).json({
            matched: true,
            matchId: match._id,
            user: currentPayload,
        });
    } catch (error) {
        console.error("likeProfile:", error);
        res.status(500).json({ message: "Failed to like profile" });
    }
};

export const passProfile = async (req, res) => {
    try {
        const targetId = req.params.userId;

        if (req.user._id.toString() === targetId) {
            return res.status(400).json({ message: "You cannot pass yourself" });
        }

        const targetUser = await User.findById(targetId);
        if (!targetUser) {
            return res.status(404).json({ message: "User not found" });
        }

        await DatingAction.deleteMany({
            $or: [
                { from: req.user._id, to: targetId, action: "pass" },
                { from: targetId, to: req.user._id, action: "like" },
            ],
        });

        res.status(200).json({ message: "Profile passed" });
    } catch (error) {
        console.error("passProfile:", error);
        res.status(500).json({ message: "Failed to pass profile" });
    }
};

export const getMatches = async (req, res) => {
    try {
        const matches = await DatingMatch.find({
            $or: [{ userA: req.user._id }, { userB: req.user._id }],
        })
            .populate("userA", userSelect)
            .populate("userB", userSelect)
            .sort({ createdAt: -1 });

        const result = matches.map((match) => {
            const otherUser = getOtherUser(match, req.user._id);
            return {
                ...otherUser.toObject(),
                isDatingMatch: true,
                matchId: match._id,
                matchedAt: match.createdAt,
            };
        });

        res.status(200).json(result);
    } catch (error) {
        console.error("getMatches:", error);
        res.status(500).json({ message: "Failed to load matches" });
    }
};

export const unmatchProfile = async (req, res) => {
    try {
        const targetId = req.params.userId;
        const { userA, userB } = sortMatchUsers(req.user._id, targetId);
        const [currentUser, targetUser] = await Promise.all([
            User.findById(req.user._id).select(userSelect),
            User.findById(targetId).select(userSelect),
        ]);

        if (!targetUser) {
            return res.status(404).json({ message: "User not found" });
        }

        await DatingMatch.deleteOne({ userA, userB });
        await DatingAction.deleteMany({
            $or: [
                { from: req.user._id, to: targetId },
                { from: targetId, to: req.user._id },
            ],
        });

        emitToUser(targetId, "dating:unmatch", {
            userId: req.user._id,
            profile: currentUser,
        });
        emitToUser(req.user._id, "dating:unmatch", {
            userId: targetId,
            profile: targetUser,
        });

        res.status(200).json({ message: "Unmatched", profile: targetUser });
    } catch (error) {
        console.error("unmatchProfile:", error);
        res.status(500).json({ message: "Failed to unmatch profile" });
    }
};

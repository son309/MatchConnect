import mongoose from "mongoose";
import Call from "../models/Call.js";
import DatingAction from "../models/DatingAction.js";
import DatingMatch from "../models/DatingMatch.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketIds, io } from "../lib/socket.js";

const userSelect =
    "fullName email profilePic role datingProfile datingPreferences createdAt";

const MAX_DATING_PHOTOS = 6;

function emitToUser(userId, event, data) {
    const socketIds = getReceiverSocketIds(userId);
    socketIds.forEach((socketId) => {
        io.to(socketId).emit(event, data);
    });
}

function clampAge(value, fallback) {
    const age = Number(value);
    if (!Number.isFinite(age)) return fallback;
    return Math.min(100, Math.max(18, Math.round(age)));
}

function normalizeInterests(interests) {
    if (!Array.isArray(interests)) return [];

    return [...new Set(
        interests
            .map((interest) => String(interest || "").trim())
            .filter(Boolean)
            .slice(0, 5)
    )];
}

function getDatingPreferences(userOrProfile = {}) {
    const profile = userOrProfile.datingProfile || userOrProfile;
    const preferences = userOrProfile.datingPreferences || {};

    return {
        interestedIn: preferences.interestedIn || profile.interestedIn || "everyone",
        preferredMinAge: preferences.preferredMinAge ?? profile.preferredMinAge,
        preferredMaxAge: preferences.preferredMaxAge ?? profile.preferredMaxAge,
        preferredIntentions: preferences.preferredIntentions ?? profile.preferredIntentions ?? "",
        preferredEducationLevel: preferences.preferredEducationLevel || "any",
        preferredChildrenStatus: preferences.preferredChildrenStatus || "any",
        preferredSmoking: preferences.preferredSmoking || "any",
        preferredDrinking: preferences.preferredDrinking || "any",
    };
}

function getIncompleteDatingProfileFields(profile = {}, preferences = {}) {
    const missingFields = [];
    const currentPreferences = {
        ...getDatingPreferences(profile),
        ...preferences,
    };

    if (!String(profile.bio || "").trim()) missingFields.push("bio");
    if (!Number.isFinite(Number(profile.age)) || Number(profile.age) < 18 || Number(profile.age) > 100) {
        missingFields.push("age");
    }
    if (!String(profile.gender || "").trim()) missingFields.push("gender");
    if (!String(profile.city || "").trim()) missingFields.push("city");
    if (!String(profile.intentions || "").trim()) missingFields.push("intentions");
    if (!Array.isArray(profile.interests) || profile.interests.filter(Boolean).length === 0) {
        missingFields.push("interests");
    }
    if (!Array.isArray(profile.photos) || profile.photos.filter(Boolean).length === 0) {
        missingFields.push("photos");
    }
    if (!String(currentPreferences.interestedIn || "").trim()) missingFields.push("interestedIn");
    if (!Number.isFinite(Number(currentPreferences.preferredMinAge))) missingFields.push("preferredMinAge");
    if (!Number.isFinite(Number(currentPreferences.preferredMaxAge))) missingFields.push("preferredMaxAge");

    return missingFields;
}

function isDatingProfileComplete(userOrProfile = {}) {
    const profile = userOrProfile.datingProfile || userOrProfile;
    const preferences = getDatingPreferences(userOrProfile);
    return getIncompleteDatingProfileFields(profile, preferences).length === 0;
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
    if ("height" in body) {
        const height = Number(body.height);
        profile.height = Number.isFinite(height) && height >= 90 && height <= 250 ? height : null;
    }
    if ("gender" in body) profile.gender = body.gender || "";
    if ("city" in body) profile.city = String(body.city || "").trim().slice(0, 80);
    if ("intentions" in body) profile.intentions = body.intentions || "";
    if ("interests" in body) profile.interests = normalizeInterests(body.interests);
    if ("jobTitle" in body) profile.jobTitle = String(body.jobTitle || "").trim().slice(0, 80);
    if ("company" in body) profile.company = String(body.company || "").trim().slice(0, 80);
    if ("highSchool" in body) profile.highSchool = String(body.highSchool || "").trim().slice(0, 100);
    if ("university" in body) profile.university = String(body.university || "").trim().slice(0, 100);
    if ("graduateSchool" in body) profile.graduateSchool = String(body.graduateSchool || "").trim().slice(0, 100);
    if ("educationLevel" in body) profile.educationLevel = body.educationLevel || "";
    if ("childrenStatus" in body) profile.childrenStatus = body.childrenStatus || "";
    if ("smoking" in body) profile.smoking = body.smoking || "";
    if ("drinking" in body) profile.drinking = body.drinking || "";

    return profile;
}

function sanitizeDatingPreferences(body) {
    const preferences = {};

    if ("interestedIn" in body) preferences.interestedIn = body.interestedIn || "everyone";
    if ("preferredMinAge" in body) preferences.preferredMinAge = clampAge(body.preferredMinAge, 18);
    if ("preferredMaxAge" in body) preferences.preferredMaxAge = clampAge(body.preferredMaxAge, 60);
    if ("preferredMinAge" in body && "preferredMaxAge" in body && preferences.preferredMinAge > preferences.preferredMaxAge) {
        const minAge = preferences.preferredMinAge;
        preferences.preferredMinAge = preferences.preferredMaxAge;
        preferences.preferredMaxAge = minAge;
    }
    if ("preferredIntentions" in body) preferences.preferredIntentions = body.preferredIntentions || "";
    if ("preferredEducationLevel" in body) preferences.preferredEducationLevel = body.preferredEducationLevel || "any";
    if ("preferredChildrenStatus" in body) preferences.preferredChildrenStatus = body.preferredChildrenStatus || "any";
    if ("preferredSmoking" in body) preferences.preferredSmoking = body.preferredSmoking || "any";
    if ("preferredDrinking" in body) preferences.preferredDrinking = body.preferredDrinking || "any";

    return preferences;
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
    const currentPreferences = getDatingPreferences(currentUser);
    const candidatePreferences = getDatingPreferences(candidate);

    return (
        likesGender(currentPreferences.interestedIn, candidateProfile.gender) &&
        likesGender(candidatePreferences.interestedIn, currentProfile.gender)
    );
}

function buildDiscoverFilters(query, currentPreferences = {}) {
    const filters = {};
    const minAgeInput = String(query.minAge || currentPreferences.preferredMinAge || "").trim();
    const maxAgeInput = String(query.maxAge || currentPreferences.preferredMaxAge || "").trim();
    const minAge = minAgeInput ? Number(minAgeInput) : null;
    const maxAge = maxAgeInput ? Number(maxAgeInput) : null;
    const city = String(query.city || "").trim();
    const intentions = String(query.intentions || currentPreferences.preferredIntentions || "").trim();
    const educationLevel = String(query.educationLevel || currentPreferences.preferredEducationLevel || "").trim();
    const childrenStatus = String(query.childrenStatus || currentPreferences.preferredChildrenStatus || "").trim();
    const smoking = String(query.smoking || currentPreferences.preferredSmoking || "").trim();
    const drinking = String(query.drinking || currentPreferences.preferredDrinking || "").trim();

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

    if (educationLevel && educationLevel !== "any") {
        filters["datingProfile.educationLevel"] = educationLevel;
    }

    if (childrenStatus && childrenStatus !== "any") {
        filters["datingProfile.childrenStatus"] = childrenStatus;
    }

    if (smoking && smoking !== "any") {
        filters["datingProfile.smoking"] = smoking;
    }

    if (drinking && drinking !== "any") {
        filters["datingProfile.drinking"] = drinking;
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
        const preferences = sanitizeDatingPreferences(req.body);
        if ("photos" in req.body) {
            profile.photos = await normalizePhotos(req.body.photos);
        }
        const updateData = {};

        Object.entries(profile).forEach(([key, value]) => {
            updateData[`datingProfile.${key}`] = value;
        });
        Object.entries(preferences).forEach(([key, value]) => {
            updateData[`datingPreferences.${key}`] = value;
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
            "datingProfile datingPreferences blockedUsers spammedUsers"
        );
        const missingFields = getIncompleteDatingProfileFields(
            currentUser?.datingProfile || {},
            getDatingPreferences(currentUser || {})
        );
        if (missingFields.length > 0) {
            return res.status(400).json({
                code: "DATING_PROFILE_INCOMPLETE",
                message: "Please complete and save your dating profile before using Discover",
                missingFields,
            });
        }

        const limit = Math.min(Number(req.query.limit) || 20, 50);
        const discoverFilters = buildDiscoverFilters(req.query, getDatingPreferences(currentUser));

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
            role: { $ne: "admin" },
            blockedUsers: { $ne: req.user._id },
            "datingProfile.bio": { $nin: ["", null] },
            "datingProfile.age": { $gte: 18, $lte: 100 },
            "datingProfile.gender": { $nin: ["", null] },
            $or: [
                { "datingPreferences.interestedIn": { $nin: ["", null] } },
                { "datingProfile.interestedIn": { $nin: ["", null] } },
            ],
            "datingProfile.city": { $nin: ["", null] },
            "datingProfile.intentions": { $nin: ["", null] },
            "datingProfile.interests.0": { $exists: true },
            "datingProfile.photos.0": { $exists: true },
            ...discoverFilters,
        })
            .select(userSelect)
            .sort({ updatedAt: -1 })
            .limit(limit * 3);

        const profiles = candidates
            .filter((candidate) => isDatingProfileComplete(candidate))
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
            role: { $ne: "admin" },
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
        if (!targetUser || targetUser.role === "admin") {
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

        const result = matches
            .map((match) => {
                const otherUser = getOtherUser(match, req.user._id);
                if (!otherUser || otherUser.role === "admin") return null;
                return {
                    ...otherUser.toObject(),
                    isDatingMatch: true,
                    matchId: match._id,
                    matchedAt: match.createdAt,
                };
            })
            .filter(Boolean);

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

        await Promise.all([
            DatingMatch.deleteOne({ userA, userB }),
            DatingAction.deleteMany({
                $or: [
                    { from: req.user._id, to: targetId },
                    { from: targetId, to: req.user._id },
                ],
            }),
            Message.deleteMany({
                $or: [
                    { senderId: req.user._id, receiverId: targetId },
                    { senderId: targetId, receiverId: req.user._id },
                ],
            }),
            Call.deleteMany({
                $or: [
                    { caller: req.user._id, receiver: targetId },
                    { caller: targetId, receiver: req.user._id },
                ],
            }),
        ]);

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

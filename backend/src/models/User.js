import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
    },
    fullName: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
    },
    profilePic: {
        type: String,
        default: "",
    },
    phone: {
        type: String,
        default: "",
        trim: true,
        maxlength: 30,
    },
    otp: {
        type: String,
        default: null,
    },
    otpExpires: {
        type: Date,
        default: null,
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    role: {
        type: String,
        enum: ["user", "admin"],
        default: "user",
    },
    isSuspended: {
        type: Boolean,
        default: false,
    },
    suspendedAt: {
        type: Date,
        default: null,
    },
    suspendedReason: {
        type: String,
        default: "",
        maxlength: 300,
    },
    profileVerification: {
        status: {
            type: String,
            enum: ["none", "pending", "verified", "rejected"],
            default: "none",
        },
        requestedAt: {
            type: Date,
            default: null,
        },
        reviewedAt: {
            type: Date,
            default: null,
        },
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        note: {
            type: String,
            default: "",
            maxlength: 300,
        },
    },
    friends: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: [],
    }],
    friendRequests: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: [],
    }],
    sentFriendRequests: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: [],
    }],
    blockedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: [],
    }],
    spammedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: [],
    }],
    datingProfile: {
        bio: {
            type: String,
            default: "",
            maxlength: 500,
        },
        age: {
            type: Number,
            min: 18,
            max: 100,
            default: null,
        },
        height: {
            type: Number,
            min: 90,
            max: 250,
            default: null,
        },
        gender: {
            type: String,
            enum: ["woman", "man", "nonbinary", "other", ""],
            default: "",
        },
        interestedIn: {
            type: String,
            enum: ["women", "men", "everyone", ""],
            default: "everyone",
        },
        city: {
            type: String,
            default: "",
            maxlength: 80,
        },
        intentions: {
            type: String,
            enum: ["relationship", "casual", "friends", "not-sure", ""],
            default: "",
        },
        preferredMinAge: {
            type: Number,
            min: 18,
            max: 100,
            default: 18,
        },
        preferredMaxAge: {
            type: Number,
            min: 18,
            max: 100,
            default: 60,
        },
        preferredIntentions: {
            type: String,
            enum: ["relationship", "casual", "friends", "not-sure", ""],
            default: "",
        },
        interests: [{
            type: String,
            trim: true,
            maxlength: 32,
        }],
        jobTitle: {
            type: String,
            default: "",
            maxlength: 80,
            trim: true,
        },
        company: {
            type: String,
            default: "",
            maxlength: 80,
            trim: true,
        },
        highSchool: {
            type: String,
            default: "",
            maxlength: 100,
            trim: true,
        },
        university: {
            type: String,
            default: "",
            maxlength: 100,
            trim: true,
        },
        graduateSchool: {
            type: String,
            default: "",
            maxlength: 100,
            trim: true,
        },
        educationLevel: {
            type: String,
            enum: ["high-school", "college", "bachelor", "master", "phd", "other", ""],
            default: "",
        },
        childrenStatus: {
            type: String,
            enum: ["have-children", "dont-have-children", "want-children", "dont-want-children", "open-to-children", "prefer-not-say", ""],
            default: "",
        },
        smoking: {
            type: String,
            enum: ["never", "socially", "occasionally", "regularly", "prefer-not-say", ""],
            default: "",
        },
        drinking: {
            type: String,
            enum: ["never", "socially", "occasionally", "regularly", "prefer-not-say", ""],
            default: "",
        },
        photos: [{
            type: String,
        }],
    },
    datingPreferences: {
        interestedIn: {
            type: String,
            enum: ["women", "men", "everyone", ""],
            default: "everyone",
        },
        preferredMinAge: {
            type: Number,
            min: 18,
            max: 100,
            default: 18,
        },
        preferredMaxAge: {
            type: Number,
            min: 18,
            max: 100,
            default: 60,
        },
        preferredIntentions: {
            type: String,
            enum: ["relationship", "casual", "friends", "not-sure", ""],
            default: "",
        },
        preferredEducationLevel: {
            type: String,
            enum: ["any", "high-school", "college", "bachelor", "master", "phd", "other"],
            default: "any",
        },
        preferredChildrenStatus: {
            type: String,
            enum: ["any", "have-children", "dont-have-children", "want-children", "dont-want-children", "open-to-children", "prefer-not-say"],
            default: "any",
        },
        preferredSmoking: {
            type: String,
            enum: ["any", "never", "socially", "occasionally", "regularly", "prefer-not-say"],
            default: "any",
        },
        preferredDrinking: {
            type: String,
            enum: ["any", "never", "socially", "occasionally", "regularly", "prefer-not-say"],
            default: "any",
        },
    },
},
    { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;

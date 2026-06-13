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
        interests: [{
            type: String,
            trim: true,
            maxlength: 32,
        }],
        photos: [{
            type: String,
        }],
    },
},
    { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;

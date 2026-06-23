import express from "express";
import {
    discoverProfiles,
    getDatingProfile,
    getLikedYou,
    getMatches,
    likeProfile,
    passProfile,
    unmatchProfile,
    updateDatingProfile,
} from "../controllers/dating.controller.js";
import { arcjetProtection } from "../middleware/arcjet.middleware.js";
import { protectRoute, requireMember } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(arcjetProtection, protectRoute, requireMember);

router.get("/profile", getDatingProfile);
router.put("/profile", updateDatingProfile);
router.get("/discover", discoverProfiles);
router.get("/liked-you", getLikedYou);
router.get("/matches", getMatches);
router.post("/like/:userId", likeProfile);
router.post("/pass/:userId", passProfile);
router.delete("/matches/:userId", unmatchProfile);

export default router;

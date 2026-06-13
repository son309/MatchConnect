import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { arcjetProtection } from "../middleware/arcjet.middleware.js";
import {
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    cancelFriendRequest,
    removeFriend,
    getFriendRequests,
    getSentRequests,
    getFriends,
    searchFriends,
    searchUsers,
} from "../controllers/friend.controller.js";

const router = express.Router();

router.use(arcjetProtection, protectRoute);

router.post("/request/:userId", sendFriendRequest);
router.post("/accept/:userId", acceptFriendRequest);
router.post("/reject/:userId", rejectFriendRequest);
router.post("/cancel/:userId", cancelFriendRequest);
router.delete("/remove/:userId", removeFriend);

router.get("/requests", getFriendRequests);
router.get("/requests/sent", getSentRequests);
router.get("/list", getFriends);
router.get("/search", searchUsers);
router.get("/search-friends", searchFriends);

export default router;




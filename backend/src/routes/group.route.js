import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  createGroup,
  getMyGroups,
  getGroupById,
  leaveGroup,
  addMembers,
  removeMember,
  addAdmin,
  removeAdmin,
  updateGroup,
} from "../controllers/group.controller.js";

const router = express.Router();

// All routes require authentication
router.use(protectRoute);

// Create a new group
router.post("/", createGroup);

// Get all groups for the authenticated user
router.get("/", getMyGroups);

// Get a specific group by ID
router.get("/:groupId", getGroupById);

// Update group information (admins only)
router.put("/:groupId", updateGroup);

// Leave a group
router.post("/:groupId/leave", leaveGroup);

// Add members to a group (admins only)
router.post("/:groupId/members", addMembers);

// Remove a member from a group (admins only)
router.delete("/:groupId/members/:userId", removeMember);

// Add admin rights to a member (admins only)
router.post("/:groupId/admins/:userId", addAdmin);

// Remove admin rights from a member (admins only)
router.delete("/:groupId/admins/:userId", removeAdmin);

export default router;

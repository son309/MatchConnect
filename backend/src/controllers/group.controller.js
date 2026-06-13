import {
  createGroupService,
  getGroupsByUserIdService,
  getGroupByIdService,
  leaveGroupService,
  addMembersToGroupService,
  removeMemberFromGroupService,
  addAdminToGroupService,
  removeAdminFromGroupService,
  updateGroupService,
} from "../services/group.service.js";
import { getReceiverSocketIds, io } from "../lib/socket.js";

// Helper to emit to all sockets of a user
function emitToUser(userId, event, data) {
  const socketIds = getReceiverSocketIds(userId);
  socketIds.forEach((socketId) => {
    io.to(socketId).emit(event, data);
  });
}

/**
 * Create a new group
 * POST /api/groups
 */
export const createGroup = async (req, res) => {
  try {
    const userId = req.user._id;
    const { name, description, memberIds, avatar } = req.body;

    const group = await createGroupService(userId, {
      name,
      description,
      memberIds,
      avatar,
    });

    // Notify all members (except creator) about the new group
    group.members.forEach((member) => {
      if (member._id.toString() !== userId.toString()) {
        emitToUser(member._id, "group:created", { group });
      }
    });

    res.status(201).json({
      success: true,
      message: "Group created successfully",
      data: group,
    });
  } catch (error) {
    console.error("Error in createGroup controller:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

/**
 * Get all groups for the authenticated user
 * GET /api/groups
 */
export const getMyGroups = async (req, res) => {
  try {
    const userId = req.user._id;
    const groups = await getGroupsByUserIdService(userId);

    res.status(200).json({
      success: true,
      data: groups,
    });
  } catch (error) {
    console.error("Error in getMyGroups controller:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

/**
 * Get a specific group by ID
 * GET /api/groups/:groupId
 */
export const getGroupById = async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId } = req.params;

    const group = await getGroupByIdService(groupId, userId);

    res.status(200).json({
      success: true,
      data: group,
    });
  } catch (error) {
    console.error("Error in getGroupById controller:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

/**
 * Leave a group
 * POST /api/groups/:groupId/leave
 */
export const leaveGroup = async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId } = req.params;

    const result = await leaveGroupService(groupId, userId);

    // Notify remaining members about the user leaving
    if (!result.deleted && result.group) {
      result.group.members.forEach((memberId) => {
        emitToUser(memberId, "group:memberLeft", {
          groupId,
          userId,
        });
      });
    }

    res.status(200).json({
      success: true,
      message: result.deleted
        ? "Group deleted (you were the last member)"
        : "Left the group successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error in leaveGroup controller:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

/**
 * Add members to a group
 * POST /api/groups/:groupId/members
 */
export const addMembers = async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId } = req.params;
    const { memberIds } = req.body;

    const result = await addMembersToGroupService(groupId, userId, memberIds);

    // Notify new members about being added to the group
    result.addedMembers.forEach((memberId) => {
      emitToUser(memberId, "group:added", {
        group: result.group,
      });
    });

    // Notify existing members about new members
    result.group.members.forEach((member) => {
      if (
        !result.addedMembers.includes(member._id.toString()) &&
        member._id.toString() !== userId.toString()
      ) {
        emitToUser(member._id, "group:membersAdded", {
          groupId,
          addedMembers: result.addedMembers,
        });
      }
    });

    res.status(200).json({
      success: true,
      message: "Members added successfully",
      data: result.group,
    });
  } catch (error) {
    console.error("Error in addMembers controller:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

/**
 * Remove a member from a group
 * DELETE /api/groups/:groupId/members/:userId
 */
export const removeMember = async (req, res) => {
  try {
    const adminUserId = req.user._id;
    const { groupId, userId } = req.params;

    const result = await removeMemberFromGroupService(groupId, adminUserId, userId);

    // Notify removed member
    emitToUser(userId, "group:removed", {
      groupId,
      removedBy: adminUserId,
    });

    // Notify remaining members
    result.group.members.forEach((member) => {
      if (member._id.toString() !== adminUserId.toString()) {
        emitToUser(member._id, "group:memberRemoved", {
          groupId,
          removedMemberId: userId,
        });
      }
    });

    res.status(200).json({
      success: true,
      message: "Member removed successfully",
      data: result.group,
    });
  } catch (error) {
    console.error("Error in removeMember controller:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

/**
 * Add admin rights to a member
 * POST /api/groups/:groupId/admins/:userId
 */
export const addAdmin = async (req, res) => {
  try {
    const adminUserId = req.user._id;
    const { groupId, userId } = req.params;

    const result = await addAdminToGroupService(groupId, adminUserId, userId);

    // Notify the promoted member
    emitToUser(userId, "group:promotedToAdmin", {
      groupId,
      promotedBy: adminUserId,
    });

    // Notify all other members
    result.group.members.forEach((member) => {
      if (
        member._id.toString() !== userId &&
        member._id.toString() !== adminUserId.toString()
      ) {
        emitToUser(member._id, "group:adminAdded", {
          groupId,
          newAdminId: userId,
        });
      }
    });

    res.status(200).json({
      success: true,
      message: "Admin rights granted successfully",
      data: result.group,
    });
  } catch (error) {
    console.error("Error in addAdmin controller:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

/**
 * Remove admin rights from a member
 * DELETE /api/groups/:groupId/admins/:userId
 */
export const removeAdmin = async (req, res) => {
  try {
    const adminUserId = req.user._id;
    const { groupId, userId } = req.params;

    const result = await removeAdminFromGroupService(groupId, adminUserId, userId);

    // Notify the demoted member
    emitToUser(userId, "group:demotedFromAdmin", {
      groupId,
      demotedBy: adminUserId,
    });

    // Notify all other members
    result.group.members.forEach((member) => {
      if (
        member._id.toString() !== userId &&
        member._id.toString() !== adminUserId.toString()
      ) {
        emitToUser(member._id, "group:adminRemoved", {
          groupId,
          demotedAdminId: userId,
        });
      }
    });

    res.status(200).json({
      success: true,
      message: "Admin rights removed successfully",
      data: result.group,
    });
  } catch (error) {
    console.error("Error in removeAdmin controller:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

/**
 * Update group information
 * PUT /api/groups/:groupId
 */
export const updateGroup = async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId } = req.params;
    const { name, description, avatar } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (avatar !== undefined) updateData.avatar = avatar;

    const group = await updateGroupService(groupId, userId, updateData);

    // Notify all members about the update
    group.members.forEach((member) => {
      if (member._id.toString() !== userId.toString()) {
        emitToUser(member._id, "group:updated", {
          groupId,
          updatedBy: userId,
          group,
        });
      }
    });

    res.status(200).json({
      success: true,
      message: "Group updated successfully",
      data: group,
    });
  } catch (error) {
    console.error("Error in updateGroup controller:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

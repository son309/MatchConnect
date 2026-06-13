import { useState } from "react";
import {
  X,
  Users,
  Crown,
  LogOut,
  Calendar,
  FileText,
  UserPlus,
  Settings,
  Shield,
  ShieldOff,
  UserMinus,
  MoreVertical,
} from "lucide-react";
import { useGroup } from "../../../context/GroupContext";
import { useAuth } from "../../../context/AuthContext";
import { useSocket } from "../../../context/SocketContext";
import AddMemberModal from "./AddMemberModal";
import EditGroupModal from "./EditGroupModal";
import toast from "react-hot-toast";

export default function GroupInfoSidebar({ onClose }) {
  const { authUser } = useAuth();
  const { onlineUsers } = useSocket();
  const { selectedGroup, leaveGroup, clearSelectedGroup, removeMember, addAdmin, removeAdmin } = useGroup();
  const [isLeaving, setIsLeaving] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [openMemberMenu, setOpenMemberMenu] = useState(null);
  const [loadingAction, setLoadingAction] = useState(null);

  if (!selectedGroup) return null;

  const isAdmin = selectedGroup.admins?.some(
    (admin) => admin._id === authUser._id || admin === authUser._id
  );

  const isCreator =
    selectedGroup.createdBy?._id === authUser._id ||
    selectedGroup.createdBy === authUser._id;

  const handleLeaveGroup = async () => {
    if (!confirm("Are you sure you want to leave this group?")) return;

    setIsLeaving(true);
    try {
      await leaveGroup(selectedGroup._id);
      toast.success("Left group");
      clearSelectedGroup();
      onClose?.();
    } catch (error) {
      toast.error("Error leaving group");
    } finally {
      setIsLeaving(false);
    }
  };

  const handleRemoveMember = async (memberId, memberName) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from the group?`)) return;

    setLoadingAction(memberId);
    try {
      await removeMember(selectedGroup._id, memberId);
      toast.success(`Removed ${memberName} from group`);
      setOpenMemberMenu(null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Error removing member");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleAddAdmin = async (memberId, memberName) => {
    setLoadingAction(memberId);
    try {
      await addAdmin(selectedGroup._id, memberId);
      toast.success(`Assigned ${memberName} as admin`);
      setOpenMemberMenu(null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Error assigning admin");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRemoveAdmin = async (memberId, memberName) => {
    if (!confirm(`Are you sure you want to remove admin rights from ${memberName}?`)) return;

    setLoadingAction(memberId);
    try {
      await removeAdmin(selectedGroup._id, memberId);
      toast.success(`Removed admin rights from ${memberName}`);
      setOpenMemberMenu(null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Error removing admin rights");
    } finally {
      setLoadingAction(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <>
      <div className="flex flex-col h-full bg-white">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold text-gray-800">Group Info</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Group Avatar & Name */}
          <div className="flex flex-col items-center py-6 px-4 border-b">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center mb-3">
              {selectedGroup.avatar ? (
                <img
                  src={selectedGroup.avatar}
                  alt={selectedGroup.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <Users size={32} className="text-white" />
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-800 text-center">
              {selectedGroup.name}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {selectedGroup.members?.length || 0} members
            </p>
          </div>

          {/* Description */}
          {selectedGroup.description && (
            <div className="px-4 py-3 border-b">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <FileText size={16} />
                <span className="text-sm font-medium">Description</span>
              </div>
              <p className="text-sm text-gray-700">{selectedGroup.description}</p>
            </div>
          )}

          {/* Admin Actions */}
          {isAdmin && (
            <div className="px-4 py-3 border-b space-y-2">
              <button
                onClick={() => setShowEditGroupModal(true)}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                <Settings size={18} className="text-purple-500" />
                <span className="text-sm font-medium text-gray-700">Edit Group</span>
              </button>
              <button
                onClick={() => setShowAddMemberModal(true)}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                <UserPlus size={18} className="text-green-500" />
                <span className="text-sm font-medium text-gray-700">Add Member</span>
              </button>
            </div>
          )}

          {/* Created Date */}
          <div className="px-4 py-3 border-b">
            <div className="flex items-center gap-2 text-gray-500">
              <Calendar size={16} />
              <span className="text-sm">
                Created: {formatDate(selectedGroup.createdAt)}
              </span>
            </div>
          </div>

          {/* Members List */}
          <div className="px-4 py-3">
            <div className="flex items-center gap-2 text-gray-500 mb-3">
              <Users size={16} />
              <span className="text-sm font-medium">
                Members ({selectedGroup.members?.length || 0})
              </span>
            </div>

            <div className="space-y-2">
              {selectedGroup.members?.map((member) => {
                const memberId = member._id || member;
                const memberName = member.fullName || "Unknown";
                const memberEmail = member.email || "";
                const memberAvatar =
                  member.profilePic ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    memberName
                  )}&background=random`;

                const isMemberAdmin = selectedGroup.admins?.some(
                  (admin) => admin._id === memberId || admin === memberId
                );
                const isMemberCreator =
                  selectedGroup.createdBy?._id === memberId ||
                  selectedGroup.createdBy === memberId;
                const isOnline = onlineUsers?.includes(memberId);
                const isCurrentUser = memberId === authUser._id;

                return (
                  <div
                    key={memberId}
                    className={`flex items-center gap-3 p-2 rounded-lg ${isCurrentUser ? "bg-purple-50" : "hover:bg-gray-50"
                      } relative`}
                  >
                    <div className="relative">
                      <img
                        src={memberAvatar}
                        alt={memberName}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      {isOnline && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-800 truncate">
                          {memberName}
                          {isCurrentUser && " (You)"}
                        </span>
                        {isMemberCreator && (
                          <Crown size={14} className="text-yellow-500" />
                        )}
                        {isMemberAdmin && !isMemberCreator && (
                          <span className="text-[10px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded">
                            Admin
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 truncate block">
                        {memberEmail}
                      </span>
                    </div>

                    {isOnline && (
                      <span className="text-xs text-green-500">Online</span>
                    )}

                    {/* Admin actions menu */}
                    {isAdmin && !isCurrentUser && !isMemberCreator && (
                      <div className="relative">
                        <button
                          onClick={() => setOpenMemberMenu(openMemberMenu === memberId ? null : memberId)}
                          className="p-1 hover:bg-gray-200 rounded-full"
                        >
                          <MoreVertical size={16} className="text-gray-500" />
                        </button>

                        {openMemberMenu === memberId && (
                          <div className="absolute right-0 top-8 bg-white border rounded-lg shadow-lg py-1 z-10 min-w-[160px]">
                            {isMemberAdmin ? (
                              <button
                                onClick={() => handleRemoveAdmin(memberId, memberName)}
                                disabled={loadingAction === memberId}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-orange-600 hover:bg-orange-50 disabled:opacity-50"
                              >
                                <ShieldOff size={14} />
                                Remove Admin
                              </button>
                            ) : (
                              <button
                                onClick={() => handleAddAdmin(memberId, memberName)}
                                disabled={loadingAction === memberId}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-purple-600 hover:bg-purple-50 disabled:opacity-50"
                              >
                                <Shield size={14} />
                                Assign Admin
                              </button>
                            )}
                            <button
                              onClick={() => handleRemoveMember(memberId, memberName)}
                              disabled={loadingAction === memberId}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                            >
                              <UserMinus size={14} />
                              Remove from Group
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t">
          <button
            onClick={handleLeaveGroup}
            disabled={isLeaving}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium disabled:opacity-50"
          >
            <LogOut size={18} />
            {isLeaving ? "Leaving..." : "Leave Group"}
          </button>
        </div>
      </div>

      {/* Modals */}
      <AddMemberModal
        isOpen={showAddMemberModal}
        onClose={() => setShowAddMemberModal(false)}
        group={selectedGroup}
      />
      <EditGroupModal
        isOpen={showEditGroupModal}
        onClose={() => setShowEditGroupModal(false)}
        group={selectedGroup}
      />
    </>
  );
}

import { useState } from "react";
import { X, Users, Search, Check } from "lucide-react";
import { useGroup } from "../../../context/GroupContext";
import { useFriend } from "../../../context/FriendContext";
import toast from "react-hot-toast";

export default function CreateGroupModal({ isOpen, onClose }) {
  const { createGroup } = useGroup();
  const { friends } = useFriend();

  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const filteredFriends = friends.filter((friend) =>
    friend.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleMember = (friendId) => {
    setSelectedMembers((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!groupName.trim()) {
      toast.error("Please enter group name");
      return;
    }

    if (selectedMembers.length === 0) {
      toast.error("Please select at least 1 member");
      return;
    }

    setIsLoading(true);
    try {
      await createGroup({
        name: groupName.trim(),
        description: description.trim(),
        memberIds: selectedMembers,
      });
      toast.success("Group created successfully!");
      handleClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "Error creating group");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setGroupName("");
    setDescription("");
    setSelectedMembers([]);
    setSearchQuery("");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-pink-500" />
            <h2 className="text-lg font-semibold">Create New Group</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Group Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Group Name *
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Group description (optional)..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none resize-none"
              rows={2}
              maxLength={500}
            />
          </div>

          {/* Member Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Add Members ({selectedMembers.length} selected)
            </label>

            {/* Search */}
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search friends..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none text-sm"
              />
            </div>

            {/* Friends List */}
            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
              {filteredFriends.length === 0 ? (
                <p className="text-center text-gray-500 py-4 text-sm">
                  No friends found
                </p>
              ) : (
                filteredFriends.map((friend) => (
                  <div
                    key={friend._id}
                    onClick={() => toggleMember(friend._id)}
                    className={`flex items-center gap-3 p-2 cursor-pointer hover:bg-gray-50 transition-colors ${selectedMembers.includes(friend._id) ? "bg-pink-50" : ""
                      }`}
                  >
                    <img
                      src={
                        friend.profilePic ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          friend.fullName
                        )}&background=random`
                      }
                      alt={friend.fullName}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <span className="flex-1 text-sm">{friend.fullName}</span>
                    {selectedMembers.includes(friend._id) && (
                      <Check className="w-4 h-4 text-pink-500" />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={
              isLoading || !groupName.trim() || selectedMembers.length === 0
            }
            className="w-full py-2 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Creating..." : "Create Group"}
          </button>
        </form>
      </div>
    </div>
  );
}

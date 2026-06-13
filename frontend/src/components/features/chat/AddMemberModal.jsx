import { useState } from "react";
import { X, Search, Check, UserPlus } from "lucide-react";
import { useGroup } from "../../../context/GroupContext";
import { useFriend } from "../../../context/FriendContext";
import toast from "react-hot-toast";

export default function AddMemberModal({ isOpen, onClose, group }) {
  const { addMembers } = useGroup();
  const { friends } = useFriend();

  const [selectedMembers, setSelectedMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen || !group) return null;

  // Filter friends who are not already in the group
  const existingMemberIds = group.members?.map((m) => m._id || m) || [];
  const availableFriends = friends.filter(
    (friend) => !existingMemberIds.includes(friend._id)
  );

  const filteredFriends = availableFriends.filter((friend) =>
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

    if (selectedMembers.length === 0) {
      toast.error("Please select at least 1 member");
      return;
    }

    setIsLoading(true);
    try {
      await addMembers(group._id, selectedMembers);
      toast.success("Members added successfully!");
      handleClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "Error adding members");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
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
            <UserPlus className="w-5 h-5 text-purple-500" />
            <h2 className="text-lg font-semibold">Add Members</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search friends..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
            />
          </div>

          {/* Friends List */}
          <div className="max-h-64 overflow-y-auto space-y-2">
            {filteredFriends.length === 0 ? (
              <p className="text-center text-gray-500 py-4">
                {availableFriends.length === 0
                  ? "All friends are already in the group"
                  : "No friends found"}
              </p>
            ) : (
              filteredFriends.map((friend) => (
                <div
                  key={friend._id}
                  onClick={() => toggleMember(friend._id)}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${selectedMembers.includes(friend._id)
                      ? "bg-purple-50 border border-purple-200"
                      : "hover:bg-gray-50 border border-transparent"
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
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">
                      {friend.fullName}
                    </p>
                    <p className="text-sm text-gray-500">{friend.email}</p>
                  </div>
                  {selectedMembers.includes(friend._id) && (
                    <Check className="w-5 h-5 text-purple-500" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Selected count */}
          {selectedMembers.length > 0 && (
            <p className="text-sm text-purple-600">
              Selected {selectedMembers.length} people
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || selectedMembers.length === 0}
              className="flex-1 py-2.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Adding..." : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

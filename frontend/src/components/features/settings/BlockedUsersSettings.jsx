import { Ban, Loader2, Unlock, UserRound } from "lucide-react";
import { useEffect } from "react";
import { useBlock } from "../../../context/BlockContext";

function avatarFor(user) {
  if (user?.profilePic) return user.profilePic;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullName || "User")}&background=random`;
}

export default function BlockedUsersSettings() {
  const { blockedUsers, fetchBlockedUsers, unblockUser, isLoading } = useBlock();

  useEffect(() => {
    fetchBlockedUsers();
  }, [fetchBlockedUsers]);

  const handleUnblock = async (userId) => {
    await unblockUser(userId);
  };

  return (
    <div className="flex h-full flex-col bg-white md:bg-transparent">
      <div className="sticky top-0 z-10 border-b border-gray-100 bg-white px-4 py-4 sm:px-8 sm:py-6">
        <h3 className="text-lg font-bold text-gray-900 sm:text-xl">Blocked Users</h3>
        <p className="mt-0.5 text-xs text-gray-500 sm:text-sm">
          Manage people you have blocked
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="max-w-3xl rounded-xl border border-gray-100 bg-white shadow-sm">
          {blockedUsers.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {blockedUsers.map((user) => (
                <div
                  key={user._id}
                  className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <img
                      src={avatarFor(user)}
                      alt={user.fullName}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                    <div className="min-w-0">
                      <h4 className="truncate font-bold text-gray-900">
                        {user.fullName || "Unknown user"}
                      </h4>
                      <p className="truncate text-sm text-gray-500">
                        {user.email || "No email"}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleUnblock(user._id)}
                    disabled={isLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-pink-200 hover:bg-pink-50 hover:text-pink-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Unlock className="h-4 w-4" />
                    )}
                    Unblock
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-50 text-pink-500">
                <Ban className="h-7 w-7" />
              </div>
              <h4 className="text-base font-bold text-gray-900">No blocked users</h4>
              <p className="mt-2 max-w-sm text-sm leading-6 text-gray-500">
                People you block from profiles, reports, or chat will appear here.
              </p>
              <UserRound className="mt-5 h-9 w-9 text-gray-200" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

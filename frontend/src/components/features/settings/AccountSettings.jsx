import { useState } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../../context/AuthContext";

export default function AccountSettings() {
  const { deleteAccount, isDeletingAccount, authUser } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");

  const canDelete = currentPassword.trim() && confirmText === "DELETE" && authUser?.role !== "admin";

  const handleDelete = async (e) => {
    e.preventDefault();

    if (authUser?.role === "admin") {
      toast.error("Admin accounts cannot be deleted from user settings");
      return;
    }

    if (!currentPassword.trim()) {
      toast.error("Please enter your current password");
      return;
    }

    if (confirmText !== "DELETE") {
      toast.error("Type DELETE to confirm account deletion");
      return;
    }

    await deleteAccount(currentPassword);
    navigate("/signup", { replace: true });
  };

  return (
    <div className="flex h-full flex-col bg-white md:bg-transparent">
      <div className="sticky top-0 z-10 border-b border-gray-100 bg-white px-4 py-4 sm:px-8 sm:py-6">
        <h3 className="text-lg font-bold text-gray-900 sm:text-xl">Account</h3>
        <p className="mt-0.5 text-xs text-gray-500 sm:text-sm">
          Manage sensitive account actions
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        <form onSubmit={handleDelete} className="max-w-2xl space-y-5 rounded-xl border border-red-100 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900">Delete account permanently</h4>
              <p className="mt-1 text-sm leading-6 text-gray-500">
                This removes your profile, messages, matches, reports, calls, and friend links. This action cannot be undone.
              </p>
            </div>
          </div>

          {authUser?.role === "admin" ? (
            <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm font-medium text-gray-500">
              Admin accounts are protected and cannot be deleted from this page.
            </div>
          ) : (
            <>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">Current Password</span>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-400/20 sm:text-base"
                  placeholder="Enter current password"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">Type DELETE to confirm</span>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-400/20 sm:text-base"
                  placeholder="DELETE"
                />
              </label>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!canDelete || isDeletingAccount}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500 px-6 py-3 font-medium text-white shadow-sm transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60 md:ml-auto md:w-auto"
                >
                  {isDeletingAccount ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      <span>Delete Account</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

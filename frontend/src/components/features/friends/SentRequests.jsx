import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { UserMinus, Search, Loader } from "lucide-react";
import { useFriend } from "../../../context/FriendContext";

export default function SentRequests() {
    // Get searchQuery, viewMode from Dashboard via Outlet Context
    const { searchQuery, viewMode } = useOutletContext();
    const { sentRequests, getSentRequests, cancelFriendRequest } = useFriend();
    const [cancelingId, setCancelingId] = useState(null);

    useEffect(() => {
        getSentRequests();
    }, [getSentRequests]);

    const handleCancel = async (userId) => {
        setCancelingId(userId);
        try {
            await cancelFriendRequest(userId);
        } catch (error) {
            // Error already handled in context
        } finally {
            setCancelingId(null);
        }
    };

    // Use Array.isArray to guard against API returning error objects
    const safeSentRequests = Array.isArray(sentRequests) ? sentRequests : [];
    const filteredList = safeSentRequests.filter(req =>
        req.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (filteredList.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center h-full py-20 text-gray-400">
                <Search size={48} className="opacity-20 mb-4" />
                <p className="text-sm italic text-center px-4">
                    {searchQuery 
                        ? `No requests found for "${searchQuery}"` 
                        : "No pending requests sent."}
                </p>
            </div>
        );
    }

    return (
        <div className={
            viewMode === 'grid'
                ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-4 pr-2 overflow-y-auto custom-scrollbar"
                : "flex flex-col gap-3 pb-4 pr-2 overflow-y-auto custom-scrollbar"
        }>
            {filteredList.map((req) => (
                <div
                    key={req._id}
                    className={`bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 group hover:shadow-md hover:border-pink-200 transition-all ${viewMode === 'grid' ? 'p-4 flex-col text-center sm:flex-row sm:text-left' : 'p-3 px-5'
                        }`}
                >
                    <img
                        src={req.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(req.fullName || 'U')}&background=random`}
                        alt={req.fullName}
                        className={`${viewMode === 'grid' ? 'w-16 h-16' : 'w-10 h-10'} rounded-full object-cover border border-gray-100`}
                    />

                    <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-800 text-sm truncate">{req.fullName || "Unknown"}</h4>
                        <p className="text-xs text-gray-400 truncate">{req.email}</p>
                    </div>

                    <span className="hidden sm:inline-block px-2 py-1 bg-yellow-50 text-yellow-600 text-[10px] font-bold rounded-full">
                        Pending
                    </span>

                    <button
                        onClick={() => handleCancel(req._id)}
                        disabled={cancelingId === req._id}
                        className="p-2 bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors shrink-0 disabled:opacity-50"
                        title="Cancel Request"
                    >
                        {cancelingId === req._id ? (
                            <Loader size={18} className="animate-spin" />
                        ) : (
                            <UserMinus size={18} />
                        )}
                    </button>
                </div>
            ))}
        </div>
    );
}
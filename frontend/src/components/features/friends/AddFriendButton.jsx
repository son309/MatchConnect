import { useState } from "react";
import { Mail, Send, CheckCircle, Plus, X, Loader , UserPlus} from "lucide-react";
import toast from "react-hot-toast";
import { useFriend } from "../../../context/FriendContext";

export default function AddFriendButton() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [email, setEmail] = useState("");
    const [isSent, setIsSent] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { searchUsers, sendFriendRequest } = useFriend();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email.trim() || isLoading) return;

        setIsLoading(true);
        try {
            // Search for user by email
            const users = await searchUsers(email.trim());
            if (!users || users.length === 0) {
                toast.error("User not found with that email");
                return;
            }

            // Find exact email match
            const targetUser = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
            if (!targetUser) {
                toast.error("No user found with that exact email");
                return;
            }

            // Send friend request
            await sendFriendRequest(targetUser._id);
            setIsSent(true);

            setTimeout(() => {
                setIsSent(false);
                setEmail("");
                setIsModalOpen(false);
            }, 1000);
        } catch (error) {
            // Error already handled by sendFriendRequest in context
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* Floating Action Button */}
            <button
                onClick={() => setIsModalOpen(true)}
                className="absolute bottom-8 right-8 bg-pink-500 hover:bg-pink-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all z-20 group"
                title="Add New Friend"
            >
                <Plus size={28} className="group-hover:rotate-90 transition-transform duration-300" />
            </button>

            {/* MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                        onClick={() => setIsModalOpen(false)}
                    ></div>

                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 relative z-10 animate-in fade-in zoom-in duration-200">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                        >
                            <X size={20} />
                        </button>

                        <div className="text-center mb-6">
                            <div className="bg-pink-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-pink-500">
                                <UserPlus size={32} />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800">Add Friend</h2>
                            <p className="text-sm text-gray-500 mt-1">Enter email to send request</p>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="relative flex items-center group mb-6">
                                <Mail className="absolute left-4 text-gray-400 group-focus-within:text-pink-500 transition-colors" size={20} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@example.com"
                                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-pink-300 focus:ring-4 focus:ring-pink-50 transition-all text-sm"
                                    required
                                    autoFocus
                                    disabled={isLoading}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={!email.trim() || isSent || isLoading}
                                className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 ${isSent
                                    ? "bg-green-500 text-white"
                                    : "bg-pink-500 hover:bg-pink-600 text-white disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed disabled:shadow-none"
                                    }`}
                            >
                                {isLoading ? (
                                    <> <Loader size={20} className="animate-spin" /> Sending... </>
                                ) : isSent ? (
                                    <> <CheckCircle size={20} /> Sent Successfully </>
                                ) : (
                                    <> <Send size={20} /> Send Request </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}


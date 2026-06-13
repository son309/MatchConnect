import { useEffect, useRef } from "react";
import { Phone, PhoneOff, Video, X } from "lucide-react";
import { useCall } from "../context/CallContext";
import { OpenCallWindow } from "../utils/window";

export default function IncomingCallModal() {
  const { incomingCall, rejectCall, setIncomingCall } = useCall();
  const ringtoneRef = useRef(null);

  // Play ringtone when incoming call
  useEffect(() => {
    if (incomingCall) {
      // Try to play ringtone, but gracefully handle if file doesn't exist
      try {
        ringtoneRef.current = new Audio("/amthanhcuocgoiden.mp3");
        ringtoneRef.current.loop = true;
        ringtoneRef.current.volume = 0.5;
        ringtoneRef.current.play().catch((err) => {
          // Autoplay might be blocked or file doesn't exist
          console.log("Ringtone could not play:", err.message);
        });
      } catch (err) {
        console.log("Ringtone audio creation failed:", err.message);
      }
    }

    return () => {
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current = null;
      }
    };
  }, [incomingCall]);

  if (!incomingCall) return null;

  const { callId, callerId, callerInfo, isVideo } = incomingCall;

  const handleAccept = () => {
    if (ringtoneRef.current) ringtoneRef.current.pause();
    setIncomingCall(null);

    const params = {
      name: callerInfo.name,
      avatar: callerInfo.avatar || "",
      id: callerId,
      video: isVideo ? "true" : "false",
      receiver: "true",
      callId: callId,
    };

    OpenCallWindow(params);
  };

  const handleReject = () => {
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
    }
    rejectCall(callId, callerId);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100]">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 animate-bounce-slow">
        {/* Caller Avatar */}
        <div className="flex flex-col items-center">
          <div className="relative">
            {callerInfo.avatar ? (
              <img
                src={callerInfo.avatar}
                alt={callerInfo.name}
                className="w-24 h-24 rounded-full object-cover border-4 border-pink-200 shadow-lg"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center border-4 border-pink-200 shadow-lg">
                <span className="text-3xl text-white font-bold">
                  {callerInfo.name?.charAt(0)?.toUpperCase() || "?"}
                </span>
              </div>
            )}
            {/* Pulse animation */}
            <div className="absolute inset-0 rounded-full border-4 border-pink-400 animate-ping opacity-75"></div>
          </div>

          {/* Caller Name */}
          <h2 className="mt-4 text-xl font-bold text-gray-800">
            {callerInfo.name}
          </h2>

          {/* Call Type */}
          <p className="mt-1 text-gray-500 flex items-center gap-2">
            {isVideo ? (
              <>
                <Video size={18} className="text-pink-500" />
                Incoming Video Call
              </>
            ) : (
              <>
                <Phone size={18} className="text-pink-500" />
                Incoming Voice Call
              </>
            )}
          </p>

          {/* Animated dots */}
          <div className="mt-2 flex gap-1">
            <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
            <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
            <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-center gap-6">
          {/* Reject Button */}
          <button
            onClick={handleReject}
            className="group flex flex-col items-center"
          >
            <div className="p-4 bg-red-100 hover:bg-red-500 rounded-full transition-all group-hover:scale-110 shadow-lg">
              <PhoneOff
                size={28}
                className="text-red-500 group-hover:text-white transition-colors"
              />
            </div>
            <span className="mt-2 text-sm text-gray-600">Decline</span>
          </button>

          {/* Accept Button */}
          <button
            onClick={handleAccept}
            className="group flex flex-col items-center"
          >
            <div className="p-4 bg-green-100 hover:bg-green-500 rounded-full transition-all group-hover:scale-110 shadow-lg animate-pulse">
              {isVideo ? (
                <Video
                  size={28}
                  className="text-green-500 group-hover:text-white transition-colors"
                />
              ) : (
                <Phone
                  size={28}
                  className="text-green-500 group-hover:text-white transition-colors"
                />
              )}
            </div>
            <span className="mt-2 text-sm text-gray-600">Accept</span>
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

import { Activity, Eye, EyeOff } from "lucide-react";
import { useSocket } from "../../../context/SocketContext";

export default function ActivitySettings() {
  const { isActivityVisible, setActivityVisible, isConnected } = useSocket();

  return (
    <div className="flex h-full flex-col bg-white md:bg-transparent">
      <div className="sticky top-0 z-10 border-b border-gray-100 bg-white px-4 py-4 sm:px-8 sm:py-6">
        <h3 className="text-lg font-bold text-gray-900 sm:text-xl">Activity Status</h3>
        <p className="mt-0.5 text-xs text-gray-500 sm:text-sm">
          Control whether others can see when you are online
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="max-w-2xl rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-pink-50 text-pink-500">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900">Show activity status</h4>
                <p className="mt-1 text-sm leading-6 text-gray-500">
                  When this is off, your profile appears offline to other users.
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs font-medium text-gray-400">
                  {isActivityVisible ? (
                    <>
                      <Eye className="h-4 w-4 text-green-500" />
                      <span>Visible</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-4 w-4 text-gray-400" />
                      <span>Hidden</span>
                    </>
                  )}
                  {!isConnected && <span>Socket reconnecting...</span>}
                </div>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={isActivityVisible}
              onClick={() => setActivityVisible(!isActivityVisible)}
              className={`relative flex h-8 w-14 flex-shrink-0 items-center rounded-full p-1 transition-colors ${
                isActivityVisible ? "bg-pink-500" : "bg-gray-300"
              }`}
            >
              <span
                className={`h-6 w-6 rounded-full bg-white shadow transition-transform ${
                  isActivityVisible ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

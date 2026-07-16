import { useState } from "react";
import { ChevronLeft, HeartHandshake, Loader2, MapPin, Send } from "lucide-react";
import { useChat } from "../../../context/ChatContext";

function getAvatarUrl(match) {
  return (
    match.profilePic ||
    match.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(match.fullName || match.name || "U")}&background=random`
  );
}

function getProfileMeta(match) {
  const dating = match?.datingProfile || {};
  const meta = [];

  if (dating.age) meta.push(dating.age);
  if (dating.city) meta.push(dating.city);

  return meta.join(", ");
}

export default function NewMatchesPanel({ matches = [], onStartChat, onClose }) {
  const { sendMessage } = useChat();
  const [wavingId, setWavingId] = useState(null);

  const sendWave = async (event, match) => {
    event.stopPropagation();
    if (wavingId) return;

    const formData = new FormData();
    formData.append("text", "👋");
    setWavingId(match._id);
    await sendMessage(match._id, formData);
    setWavingId(null);
    onStartChat(match);
  };

  return (
    <div className="flex h-full flex-1 flex-col bg-white">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-gray-100 bg-white p-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1 text-gray-500 hover:bg-gray-100 md:hidden"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-rose-400 text-white shadow-sm">
          <HeartHandshake size={23} />
        </div>
        <div>
          <h2 className="text-base font-bold text-gray-900">New Matches</h2>
          <p className="text-xs text-gray-500">
            {matches.length} people waiting for a first message
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-[#FAFAFA] p-4 custom-scrollbar">
        {matches.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-pink-50 text-pink-400">
              <HeartHandshake size={42} />
            </div>
            <p className="text-sm font-semibold text-gray-700">No new matches</p>
            <p className="mt-1 max-w-xs text-xs leading-5 text-gray-400">
              Matches without messages will appear here.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {matches.map((match) => {
              const dating = match?.datingProfile || {};
              const meta = getProfileMeta(match);

              return (
                <article
                  key={match._id}
                  onClick={() => onStartChat(match)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onStartChat(match);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className="group overflow-hidden rounded-xl border border-gray-100 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-pink-100 hover:shadow-md"
                >
                  <div className="relative aspect-[4/3] w-full bg-gray-100 text-left">
                    <img
                      src={getAvatarUrl(match)}
                      alt={match.fullName || match.name || "New match"}
                      className="h-full w-full object-cover"
                      draggable={false}
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-white">
                      <p className="truncate text-sm font-bold">
                        {match.fullName || match.name || "New match"}
                      </p>
                      {meta && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-white/90">
                          <MapPin size={13} />
                          <span className="truncate">{meta}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="p-3">
                    {dating.bio && (
                      <p className="line-clamp-2 min-h-[40px] text-xs leading-5 text-gray-500">
                        {dating.bio}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={(event) => sendWave(event, match)}
                      disabled={wavingId === match._id}
                      className="mt-3 inline-flex items-center gap-2 rounded-lg bg-pink-50 px-3 py-2 text-xs font-semibold text-pink-600 transition hover:bg-pink-100 disabled:opacity-60"
                    >
                      {wavingId === match._id ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                      Send wave
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

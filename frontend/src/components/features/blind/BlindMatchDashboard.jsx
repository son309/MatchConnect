import { useEffect, useRef, useState } from "react";
import { Loader2, MessageCircle, Search, Send, ShieldQuestion, Sparkles, UserRound, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { useSocket } from "../../../context/SocketContext";

function formatTime(ms) {
  const safeMs = Math.max(0, ms);
  const totalSeconds = Math.ceil(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function BlindMatchDashboard() {
  const { authUser } = useAuth();
  const { socket, isConnected } = useSocket();
  const [status, setStatus] = useState("idle");
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [partnerLiked, setPartnerLiked] = useState(false);
  const [myDecision, setMyDecision] = useState("");
  const [officialMatch, setOfficialMatch] = useState(null);
  const [now, setNow] = useState(Date.now());
  const messagesEndRef = useRef(null);
  const sessionRef = useRef(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  useEffect(() => {
    if (!socket) return;

    const handleSearching = () => {
      setStatus("searching");
      setError("");
      setOfficialMatch(null);
    };

    const handleIdle = () => {
      setStatus("idle");
      setSession(null);
      setMessages([]);
      setPartnerLiked(false);
      setMyDecision("");
    };

    const handleMatchedSession = (payload) => {
      setSession(payload);
      setMessages([]);
      setPartnerLiked(false);
      setMyDecision("");
      setOfficialMatch(null);
      setStatus("chatting");
      setError("");
    };

    const handleMessage = (message) => {
      setMessages((prev) => [...prev, message]);
    };

    const handlePartnerDecision = () => {
      setPartnerLiked(true);
    };

    const handleOfficialMatch = ({ partner }) => {
      setOfficialMatch(partner);
      setStatus("matched");
      setSession(null);
      setPartnerLiked(false);
      setMyDecision("");
    };

    const handleEnded = ({ reason }) => {
      setStatus("ended");
      setSession(null);
      setPartnerLiked(false);
      setMyDecision("");
      setError(
        reason === "expired"
          ? "Blind match expired."
          : reason === "passed"
          ? "One side skipped this blind match."
          : reason === "disconnected"
          ? "The other person disconnected."
          : "Blind match ended."
      );
    };

    const handleError = ({ message }) => {
      setError(message || "Something went wrong");
    };

    socket.on("blind:searching", handleSearching);
    socket.on("blind:idle", handleIdle);
    socket.on("blind:matched-session", handleMatchedSession);
    socket.on("blind:message", handleMessage);
    socket.on("blind:partner-decision", handlePartnerDecision);
    socket.on("blind:matched", handleOfficialMatch);
    socket.on("blind:ended", handleEnded);
    socket.on("blind:error", handleError);

    return () => {
      socket.off("blind:searching", handleSearching);
      socket.off("blind:idle", handleIdle);
      socket.off("blind:matched-session", handleMatchedSession);
      socket.off("blind:message", handleMessage);
      socket.off("blind:partner-decision", handlePartnerDecision);
      socket.off("blind:matched", handleOfficialMatch);
      socket.off("blind:ended", handleEnded);
      socket.off("blind:error", handleError);
    };
  }, [socket]);

  useEffect(() => {
    return () => {
      if (!socket) return;
      const activeSession = sessionRef.current;
      if (activeSession?.sessionId) {
        socket.emit("blind:leave", { sessionId: activeSession.sessionId });
      } else {
        socket.emit("blind:cancel-search");
      }
    };
  }, [socket]);

  const startSearch = () => {
    if (!socket) return;
    setError("");
    setOfficialMatch(null);
    socket.emit("blind:find");
  };

  const cancelSearch = () => {
    if (!socket) return;
    socket.emit("blind:cancel-search");
    setStatus("idle");
  };

  const sendMessage = (event) => {
    event.preventDefault();
    const cleanText = text.trim();
    if (!socket || !session?.sessionId || !cleanText) return;
    socket.emit("blind:message", { sessionId: session.sessionId, text: cleanText });
    setText("");
  };

  const decide = (decision) => {
    if (!socket || !session?.sessionId || myDecision) return;
    setMyDecision(decision);
    socket.emit("blind:decision", { sessionId: session.sessionId, decision });
  };

  const remainingMs = session?.expiresAt ? session.expiresAt - now : 0;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#FAFAFA]">
      <div className="flex items-center justify-between border-b border-gray-100 bg-white px-5 py-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Blind Match</h1>
          <p className="mt-1 text-sm text-gray-500">Anonymous real-time chat before revealing profiles.</p>
        </div>
        <div className="hidden items-center gap-2 rounded-full bg-pink-50 px-3 py-1.5 text-xs font-semibold text-pink-600 sm:flex">
          <ShieldQuestion size={15} />
          Anonymous
        </div>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center p-4 md:p-6">
        <div className="flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          {status === "chatting" && session ? (
            <>
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-full bg-gray-100 text-gray-500">
                    <UserRound size={22} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-gray-900">Anonymous Stranger</h2>
                    <p className="text-xs text-gray-500">Name and avatar are hidden until both agree.</p>
                  </div>
                </div>
                <div className="rounded-lg bg-gray-900 px-3 py-1.5 font-mono text-sm font-bold text-white">
                  {formatTime(remainingMs)}
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto bg-[#FAFAFA] p-5 custom-scrollbar">
                {messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center text-gray-400">
                    <MessageCircle size={42} className="mb-3" />
                    <p className="text-sm font-medium">Say hi. You have 10 minutes.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((message) => {
                      const isMine = message.sender === authUser?._id;
                      return (
                        <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm leading-6 shadow-sm ${
                            isMine
                              ? "rounded-br-md bg-pink-500 text-white"
                              : "rounded-bl-md bg-white text-gray-800"
                          }`}>
                            {message.text}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 bg-white p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-gray-500">
                    {partnerLiked
                      ? "The other person already agreed. Your choice?"
                      : myDecision === "like"
                      ? "Waiting for the other person to agree..."
                      : "Agree to reveal profiles and create a real match."}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => decide("like")}
                      disabled={Boolean(myDecision)}
                      className="inline-flex items-center gap-2 rounded-lg bg-pink-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-pink-600 disabled:opacity-60"
                    >
                      <Sparkles size={16} />
                      Agree
                    </button>
                    <button
                      type="button"
                      onClick={() => decide("pass")}
                      disabled={Boolean(myDecision)}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-60"
                    >
                      <X size={16} />
                      Skip
                    </button>
                  </div>
                </div>

                <form onSubmit={sendMessage} className="flex gap-2">
                  <input
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    maxLength={1000}
                    className="min-w-0 flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-pink-400 focus:ring-2 focus:ring-pink-400/20"
                    placeholder="Type anonymously..."
                  />
                  <button
                    type="submit"
                    className="grid h-12 w-12 place-items-center rounded-xl bg-pink-500 text-white transition hover:bg-pink-600"
                    title="Send"
                  >
                    <Send size={18} />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <div className="mb-5 grid h-24 w-24 place-items-center rounded-full bg-pink-50 text-pink-500">
                {status === "searching" ? <Loader2 size={42} className="animate-spin" /> : <Search size={42} />}
              </div>

              <h2 className="text-xl font-bold text-gray-900">
                {status === "searching"
                  ? "Finding someone online..."
                  : status === "matched"
                  ? "You matched!"
                  : "Find a quick blind match"}
              </h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">
                {status === "matched"
                  ? `You and ${officialMatch?.fullName || "your blind match"} both agreed. The profile is now visible in Matches.`
                  : "You will be paired anonymously with another online user. After chatting, both sides can agree to create an official match."}
              </p>

              {error && (
                <div className="mt-4 rounded-lg bg-rose-50 px-4 py-2 text-sm font-medium text-rose-600">
                  {error}
                </div>
              )}

              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {status === "searching" ? (
                  <button
                    type="button"
                    onClick={cancelSearch}
                    className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
                  >
                    Cancel Search
                  </button>
                ) : status === "matched" ? (
                  <>
                    <Link
                      to="/chat/matches"
                      className="rounded-lg bg-pink-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-pink-600"
                    >
                      Go to Matches
                    </Link>
                    <button
                      type="button"
                      onClick={startSearch}
                      className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
                    >
                      Find Again
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={startSearch}
                    disabled={!isConnected}
                    className="inline-flex items-center gap-2 rounded-lg bg-pink-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-pink-600 disabled:opacity-60"
                  >
                    <Search size={17} />
                    Find Quick Match
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

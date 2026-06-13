import EmojiPicker from "emoji-picker-react";
import { Image, Loader2, Mic, Send, Smile, Trash, X, ShieldOff } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useChat } from "../../../context/ChatContext";
import { useAuth } from "../../../context/AuthContext";
import { useSocket } from "../../../context/SocketContext";
import { useBlock } from "../../../context/BlockContext";
import { useDating } from "../../../context/DatingContext";
import "../../../styles/emoji-picker.css";

const MAX_IMAGE_SIZE_MB = 20;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

export default function ChatInput({ chat }) {
  const [text, setText] = useState("");
  const [previewImage, setPreviewImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const { sendMessage, getHomeStats } = useChat();
  const { authUser } = useAuth();
  const { emitTyping, stopTyping } = useSocket();
  const { isUserBlocked, unblockUser, checkIfBlockedBy } = useBlock();
  const { matches } = useDating();
  const [isEmojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const fileInputRef = useRef(null);
  const [blockedByThem, setBlockedByThem] = useState(false);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  const receiverId = chat?._id || chat?.id;
  const isBlocked = isUserBlocked(receiverId);
  const isSelfChat = chat?.isSelfChat || receiverId === authUser?._id;
  const isDatingMatch = matches.some((match) => match._id === receiverId);
  const canMessage = Boolean(chat && receiverId && (isSelfChat || isDatingMatch));

  // Check if you're blocked by them
  useEffect(() => {
    const checkBlocked = async () => {
      if (receiverId) {
        const blocked = await checkIfBlockedBy(receiverId);
        setBlockedByThem(blocked);
      }
    };
    checkBlocked();
  }, [receiverId, checkIfBlockedBy]);

  const handleUnblock = async () => {
    try {
      await unblockUser(receiverId);
      getHomeStats(); // Refresh conversation list
    } catch (error) {
      // Error already handled in context
    }
  };

  const handleTextChange = (e) => {
    if (!canMessage) return;
    setText(e.target.value);
    if (receiverId && e.target.value && !chat?.isSelfChat) {
      emitTyping(receiverId);
    }
  };

  const startRecording = async () => {
    if (!canMessage) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        handleSendAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop()); // Stop mic
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);

      // Start Timer
      setRecordingDuration(0);
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      toast.error("Could not access microphone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      // Just stop without sending
      mediaRecorderRef.current.onstop = null; // Remove handler to prevent send
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      clearInterval(timerRef.current);
      setRecordingDuration(0);
    }
  };

  const handleSendAudio = async (audioBlob) => {
    if (!canMessage) return;
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "voice-message.webm"); // Filename is important for some backends

      await sendMessage(receiverId, formData);
    } catch (err) {
      toast.error(err.message || "Failed to send voice message");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };


  const handleSend = async (e) => {
    e.preventDefault();
    if ((!text.trim() && !imageFile) || !canMessage) return;
    setLoading(true);

    if (receiverId && !chat?.isSelfChat) {
      stopTyping(receiverId);
    }

    try {
      const formData = new FormData();
      formData.append('text', text.trim());
      if (imageFile) {
        formData.append("image", imageFile);
      }
      await sendMessage(receiverId, formData);
      setText("");
      setPreviewImage(null);
      setImageFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      toast.error(err.message || "Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      toast.error(`Image size must be less than ${MAX_IMAGE_SIZE_MB}MB`);
      return;
    }
    setImageFile(file);
    const fileReader = new FileReader();
    fileReader.onloadend = () => {
      setPreviewImage(fileReader.result);
    };
    fileReader.readAsDataURL(file);
  };

  const removeImage = () => {
    setPreviewImage(null);
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="relative">
      {/* If you blocked them, show Unblock button */}
      {isBlocked ? (
        <div className="p-4 bg-white border-t border-gray-100">
          <div className="flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-red-50 to-rose-50 rounded-xl border border-red-200">
            <ShieldOff className="w-5 h-5 text-red-600" />
            <p className="text-sm text-red-800 font-medium">
              You blocked this user
            </p>
            <button
              onClick={handleUnblock}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Unblock
            </button>
          </div>
        </div>
      ) : blockedByThem ? (
        /* If they blocked you, show locked message */
        <div className="p-4 bg-white border-t border-gray-100">
          <div className="flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-300">
            <ShieldOff className="w-5 h-5 text-gray-600" />
            <p className="text-sm text-gray-800 font-medium">
              {chat?.fullName} has blocked you. You cannot send messages.
            </p>
          </div>
        </div>
      ) : !canMessage ? (
        <div className="p-4 bg-white border-t border-gray-100">
          <div className="flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl border border-rose-200">
            <ShieldOff className="w-5 h-5 text-rose-600" />
            <p className="text-sm text-rose-800 font-medium">
              You can only message after matching.
            </p>
          </div>
        </div>
      ) : (
        <>
          {isEmojiPickerOpen && (
            <div className="absolute bottom-full right-20 mb-2 z-10">
              <EmojiPicker
                open={isEmojiPickerOpen}
                onEmojiClick={(emoji) => {
                  setText(prev => prev + emoji.emoji);
                  setEmojiPickerOpen(false);
                }}
                className="custom-emoji-picker"
                previewConfig={{ showPreview: false }}
              />
            </div>
          )}
          <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-100">
            {previewImage && (
              <div className="relative inline-block ml-3">
                <img
                  src={previewImage}
                  alt="preview"
                  className="w-20 h-20 object-cover rounded-lg border border-pink-500"
                />
                <button
                  onClick={removeImage}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300 flex items-center justify-center"
                  type="button"
                >
                  <X className="size-3" />
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 p-2 rounded-[24px] focus-within:bg-white focus-within:ring-2 focus-within:ring-pink-100 focus-within:border-pink-300 transition-all shadow-sm">

              {/* Default Input View (when NOT recording) */}
              {!isRecording && (
                <>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                  />
                  <button
                    type="button"
                    className={`p-2 text-gray-400 hover:text-pink-500 transition-colors ${previewImage ? 'text-pink-500' : 'text-gray-400'}`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Image size={20} />
                  </button>

                  <input
                    type="text"
                    value={text}
                    onChange={handleTextChange}
                    placeholder="Type a message..."
                    className="flex-1 bg-transparent px-2 py-2 text-sm focus:outline-none text-gray-700 placeholder:text-gray-400"
                  />

                  <button
                    type="button"
                    onClick={() => setEmojiPickerOpen(!isEmojiPickerOpen)}
                    className="p-2 text-gray-400 hover:text-yellow-500 transition-colors"
                  >
                    <Smile size={20} />
                  </button>
                </>
              )}

              {/* Recording View (Overlay) */}
              {isRecording && (
                <div className="flex-1 flex items-center justify-between px-2 animate-in fade-in zoom-in duration-200">
                  <div className="flex items-center gap-2 text-rose-500">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                    <span className="font-mono font-medium">{formatTime(recordingDuration)}</span>
                  </div>
                  <div className="text-gray-400 text-xs tracking-wider uppercase animate-pulse">Recording Audio...</div>
                </div>
              )}

              {/* Action Button (Mic or Send or Stop) */}
              {isRecording ? (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={cancelRecording}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    title="Cancel"
                  >
                    <Trash size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="p-3 bg-rose-500 hover:bg-rose-600 text-white rounded-full shadow-md shadow-rose-200 transition-colors"
                    title="Send Voice Message"
                  >
                    <Send size={18} className="ml-0.5" />
                  </button>
                </div>
              ) : (
                <>
                  {/* Only show Mic if no text/image is present */}
                  {!text.trim() && !imageFile ? (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="p-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full transition-colors"
                      title="Record Voice"
                    >
                      <Mic size={20} />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={loading}
                      className={`p-3 rounded-full transition-all shadow-sm flex items-center justify-center 
                 bg-pink-500 text-white hover:bg-pink-600 shadow-pink-200`}
                    >
                      {loading ? (
                        <Loader2 className="animate-spin" size={18} />
                      ) : (
                        <Send size={18} className="ml-0.5" />
                      )}
                    </button>
                  )}
                </>
              )}

            </div>
          </form>
        </>
      )}
    </div>
  );
}

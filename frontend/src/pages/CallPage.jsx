import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Video, VideoOff, Mic, MicOff, PhoneOff, ArrowLeftRight, User } from "lucide-react";
import { useCall } from "../context/CallContext";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";

export default function CallPage() {
  const [searchParams] = useSearchParams();
  const name = searchParams.get("name") || "Remote";
  const avatar = searchParams.get("avatar");
  const recipientId = searchParams.get("id");
  const isVideoCall = searchParams.get("video") === "true";
  const isReceiver = searchParams.get("receiver") === "true";
  const isCaller = searchParams.get("caller") === "true";
  const callIdParam = searchParams.get("callId");

  const [isNoAnswer, setIsNoAnswer] = useState(false);

  const { authUser } = useAuth();
  const { isConnected } = useSocket();
  const {
    callState,
    localStream,
    remoteStream,
    initiateCall,
    acceptCall,
    endCall,
    hasVideo,
    selectedVideoDeviceId,
    selectedAudioDeviceId,
    switchCamera,
    switchMicrophone,
  } = useCall();

  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(isVideoCall);
  const [isSwapped, setIsSwapped] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [videoDevices, setVideoDevices] = useState([]);
  const [audioDevices, setAudioDevices] = useState([]);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const durationIntervalRef = useRef(null);
  const initializedRef = useRef(false);
  const noAnswerTimeoutRef = useRef(null);
  const localVideoTrack = localStream?.getVideoTracks()[0];
  const remoteHasVideo = Boolean(remoteStream?.getVideoTracks().length);
  const callHasVideo = isVideoCall || hasVideo || Boolean(localVideoTrack) || remoteHasVideo || callState.callType === "video";

  // Âm thanh cuộc gọi
  const outgoingSoundRef = useRef(new Audio("/amthanhcuocgoiden.mp3"));
  const busySoundRef = useRef(new Audio("/amthanhcuocgoinho.mp3"));


  useEffect(() => {
    const ringback = outgoingSoundRef.current;
    ringback.loop = true;
    if (callState.callStatus === "ringing" && isCaller) {
      ringback.play().catch(e => console.warn("Audio blocked", e));
    } else {
      ringback.pause();
      ringback.currentTime = 0;
    }
    return () => { ringback.pause(); ringback.currentTime = 0; };
  }, [callState.callStatus, isCaller]);

  useEffect(() => {
    if (isNoAnswer || callState.callStatus === "busy" || callState.callStatus === "rejected") {
      const busySound = busySoundRef.current;
      busySound.play().catch(e => console.warn("Busy audio blocked", e));
    }
    return () => {
      busySoundRef.current.pause();
      busySoundRef.current.currentTime = 0;
    };
  }, [isNoAnswer, callState.callStatus]);

  //Khởi tạo cuộc gọi
  useEffect(() => {
    if (initializedRef.current || !isConnected || !authUser) return;
    initializedRef.current = true;

    const start = async () => {
      if (isReceiver && callIdParam) {
        await acceptCall(callIdParam, recipientId, { id: recipientId, name, avatar }, isVideoCall);
      } else if (isCaller) {
        await initiateCall(recipientId, { id: recipientId, name, avatar }, isVideoCall);

        // Set timeout for no answer - using ref to avoid stale closure
        noAnswerTimeoutRef.current = setTimeout(() => {
          setIsNoAnswer(true);
          setTimeout(() => handleEndCall(), 5000);
        }, 30000);
      }
    };
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, authUser]);

  useEffect(() => {
    if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (!navigator.mediaDevices?.enumerateDevices) return;

    const loadMediaDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setVideoDevices(devices.filter((device) => device.kind === "videoinput"));
        setAudioDevices(devices.filter((device) => device.kind === "audioinput"));
      } catch (error) {
        console.warn("Unable to enumerate media devices:", error);
      }
    };

    loadMediaDevices();
    navigator.mediaDevices.addEventListener?.("devicechange", loadMediaDevices);
    return () => {
      navigator.mediaDevices.removeEventListener?.("devicechange", loadMediaDevices);
    };
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  useEffect(() => {
    // Clear timeout when call connects
    if (callState.callStatus === "connected" && noAnswerTimeoutRef.current) {
      clearTimeout(noAnswerTimeoutRef.current);
      noAnswerTimeoutRef.current = null;
    }

    // Clear any existing interval first to prevent memory leak
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    // Start duration counter when connected
    if (callState.callStatus === "connected") {
      durationIntervalRef.current = setInterval(() => setCallDuration(p => p + 1), 1000);
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    };
  }, [callState.callStatus]);

  useEffect(() => {
    if (["idle", "rejected", "busy"].includes(callState.callStatus) && initializedRef.current && !isNoAnswer) {
      setTimeout(() => window.close(), 2000);
    }
  }, [callState.callStatus, isNoAnswer]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      // End call and cleanup when window/component unmounts
      if (callState.isInCall || callState.callId) {
        endCall(recipientId || callState.remoteUser?.id, callState.callId || callIdParam);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEndCall = () => {
    // Clear any pending timeouts
    if (noAnswerTimeoutRef.current) {
      clearTimeout(noAnswerTimeoutRef.current);
      noAnswerTimeoutRef.current = null;
    }
    endCall(recipientId || callState.remoteUser?.id, callState.callId || callIdParam);
    window.close();
  };

  // Toggle microphone on/off
  const toggleMic = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    }
  };

  // Toggle camera on/off
  const toggleCamera = async () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCamOn(videoTrack.enabled);
        return;
      }
    }

    const nextDeviceId = selectedVideoDeviceId || videoDevices[0]?.deviceId;
    if (!nextDeviceId) {
      alert("No camera found on this device.");
      return;
    }
    const switched = await switchCamera(
      nextDeviceId,
      recipientId || callState.remoteUser?.id,
      callState.callId || callIdParam
    );
    if (switched) setIsCamOn(true);
  };

  const handleCameraChange = async (event) => {
    const nextDeviceId = event.target.value;
    if (!nextDeviceId || nextDeviceId === selectedVideoDeviceId) return;
    const switched = await switchCamera(
      nextDeviceId,
      recipientId || callState.remoteUser?.id,
      callState.callId || callIdParam
    );
    if (switched) setIsCamOn(true);
  };

  const handleMicrophoneChange = async (event) => {
    const nextDeviceId = event.target.value;
    if (!nextDeviceId || nextDeviceId === selectedAudioDeviceId) return;
    const switched = await switchMicrophone(nextDeviceId);
    if (switched) {
      const audioTrack = localStream?.getAudioTracks()[0];
      setIsMicOn(audioTrack ? audioTrack.enabled : true);
    }
  };

  const formatDuration = (s) => {
    const m = Math.floor(s / 60);
    const rs = s % 60;
    return `${m.toString().padStart(2, "0")}:${rs.toString().padStart(2, "0")}`;
  };

  if (!isConnected) {
    return (
      <div className="h-screen w-screen bg-gray-900 flex flex-col items-center justify-center text-white">
        <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-gray-900 flex items-center justify-center text-white relative overflow-hidden">

      {/* --- Remote Video (Người bên kia) --- */}
      <div className={isSwapped ? "absolute top-4 right-4 w-48 h-36 z-20 border rounded-xl overflow-hidden shadow-2xl" : "absolute inset-0 w-full h-full z-0"} onClick={() => isSwapped && setIsSwapped(false)}>
        <video ref={remoteVideoRef} autoPlay playsInline className={`w-full h-full object-cover ${!remoteHasVideo ? "hidden" : ""}`} />
        {!remoteHasVideo && (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-800">
            {avatar ? (
              <img src={avatar} alt={name} className="w-24 h-24 rounded-full object-cover border-4 border-gray-700" />
            ) : (
              <User size={64} className="text-gray-500" />
            )}
            <p className="mt-4 text-yellow-400 font-medium">
              {callState.callStatus === "ringing"
                ? "Ringing..."
                : callState.callStatus === "connected"
                ? callHasVideo
                  ? "Camera off"
                  : "Voice call"
                : "Connecting..."}
            </p>
          </div>
        )}
      </div>

      {/*Local Video*/}
      <div className={!isSwapped ? "absolute top-4 right-4 w-48 h-36 z-20 border rounded-xl overflow-hidden shadow-2xl" : "absolute inset-0 w-full h-full z-0"} onClick={() => !isSwapped && setIsSwapped(true)}>
        <video ref={localVideoRef} autoPlay muted playsInline className={`w-full h-full object-cover scale-x-[-1] ${(!localStream || !isCamOn) ? "hidden" : ""}`} />
        {(!localStream || !isCamOn) && (
          <div className="w-full h-full flex items-center justify-center bg-gray-700">
            {authUser?.profilePic ? (
              <img src={authUser.profilePic} alt="You" className="w-16 h-16 rounded-full object-cover border-2 border-gray-600" />
            ) : (
              <User size={32} className="text-gray-400" />
            )}
          </div>
        )}
      </div>

      {/* Overlay Thông báo */}
      {(callState.callStatus === "rejected" || callState.callStatus === "busy" || isNoAnswer) && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="text-center p-8 bg-gray-800 rounded-2xl border border-red-500/50 shadow-2xl">
            <PhoneOff size={48} className="mx-auto text-red-500 mb-4" />
            <p className="text-xl font-bold">
              {isNoAnswer ? "No Answer" : callState.callStatus === "busy" ? "Busy" : "The call was rejected"}
            </p>
            <p className="text-gray-400 mt-2 text-sm">Cửa sổ sẽ tự đóng...</p>
          </div>
        </div>
      )}

      {/* Control Bar */}
      <div className="absolute bottom-8 flex gap-4 bg-gray-900/80 p-4 rounded-full border border-gray-700 z-40 backdrop-blur-md">
        <button onClick={toggleMic} className={`p-4 rounded-full transition-all ${isMicOn ? "bg-gray-700 hover:bg-gray-600" : "bg-red-500 hover:bg-red-600"}`}>
          {isMicOn ? <Mic size={24} /> : <MicOff size={24} />}
        </button>
        <button onClick={toggleCamera} className={`p-4 rounded-full transition-all ${isCamOn ? "bg-gray-700 hover:bg-gray-600" : "bg-red-500 hover:bg-red-600"}`}>
          {isCamOn ? <Video size={24} /> : <VideoOff size={24} />}
        </button>
        <button onClick={handleEndCall} className="p-4 bg-red-600 rounded-full hover:bg-red-700 transition-all shadow-lg">
          <PhoneOff size={24} />
        </button>
        {callHasVideo && (
          <button onClick={() => setIsSwapped(!isSwapped)} className="p-4 bg-gray-700 rounded-full hover:bg-gray-600 transition-all">
            <ArrowLeftRight size={24} />
          </button>
        )}
      </div>

      {(videoDevices.length > 1 || audioDevices.length > 1) && (
        <div className="absolute left-6 top-6 z-40 space-y-3 rounded-2xl border border-white/10 bg-gray-900/80 p-3 backdrop-blur-md">
          {audioDevices.length > 1 && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-300">
                Microphone
              </label>
              <select
                value={selectedAudioDeviceId || localStream?.getAudioTracks()[0]?.getSettings?.().deviceId || ""}
                onChange={handleMicrophoneChange}
                className="mt-2 max-w-[280px] rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/30"
              >
                {audioDevices.map((device, index) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Microphone ${index + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {videoDevices.length > 1 && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-300">
                Camera
              </label>
              <select
                value={selectedVideoDeviceId || localStream?.getVideoTracks()[0]?.getSettings?.().deviceId || ""}
                onChange={handleCameraChange}
                className="mt-2 max-w-[280px] rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/30"
              >
                {videoDevices.map((device, index) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${index + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {callState.callStatus === "connected" && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-black/50 px-6 py-2 rounded-full font-mono text-xl z-30 border border-white/10">
          {formatDuration(callDuration)}
        </div>
      )}
    </div>
  );
}

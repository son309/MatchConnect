import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
} from "react";
import { useSocket } from "./SocketContext";
import { useAuth } from "./AuthContext";

const CallContext = createContext();

function getApiBaseUrl() {
  const defaultUrl =
    import.meta.env.MODE === "development"
      ? "http://localhost:3000/api"
      : `${window.location.origin}/api`;

  return (import.meta.env.VITE_API_URL || defaultUrl).replace(/\/$/, "");
}

// Function to fetch ICE servers configuration from backend
// This keeps credentials secure on the server side
const fetchICEServers = async () => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/calls/turn-config`, {
      credentials: "include",
    });
    const data = await response.json();

    if (data.success) {
      const provider = data.provider === "cloudflare" ? "Cloudflare" : "Free";
      console.log(`[TURN] ${provider} TURN servers loaded`);
      return {
        iceServers: data.iceServers,
        iceCandidatePoolSize: data.iceCandidatePoolSize,
      };
    } else {
      throw new Error("Failed to fetch TURN config");
    }
  } catch (error) {
    console.error("[TURN] Error fetching TURN config, using fallback:", error);
    // Fallback configuration
    return {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        {
          urls: "turn:openrelay.metered.ca:80",
          username: "openrelayproject",
          credential: "openrelayproject",
        },
      ],
      iceCandidatePoolSize: 10,
    };
  }
};

function buildVideoConstraints(deviceId) {
  if (deviceId) {
    return {
      deviceId: { exact: deviceId },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    };
  }

  return {
    facingMode: "user",
    width: { ideal: 1280 },
    height: { ideal: 720 },
  };
}

function buildAudioConstraints(deviceId) {
  const audioConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  };

  if (!deviceId) return audioConstraints;

  return {
    ...audioConstraints,
    deviceId: { exact: deviceId },
  };
}

function addMissingLocalTracks(peerConnection, stream) {
  if (!peerConnection || !stream) return;

  stream.getTracks().forEach((track) => {
    const hasSenderForKind = peerConnection
      .getSenders()
      .some((sender) => sender.track?.kind === track.kind);

    if (!hasSenderForKind) {
      peerConnection.addTrack(track, stream);
    }
  });
}

export const CallProvider = ({ children }) => {
  const { socket } = useSocket();
  const { authUser } = useAuth();

  // Call state
  const [callState, setCallState] = useState({
    isInCall: false,
    isRinging: false,
    isReceivingCall: false,
    callId: null,
    callType: null, // 'video' or 'audio'
    remoteUser: null,
    callStatus: "idle", // idle, ringing, connecting, connected, ended, rejected, busy
  });

  // Streams
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState(
    () => localStorage.getItem("selectedVideoDeviceId") || ""
  );
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState(
    () => localStorage.getItem("selectedAudioDeviceId") || ""
  );

  // ICE servers config
  const [iceServers, setIceServers] = useState(null);

  // Refs
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const socketRef = useRef(null);
  const selectedVideoDeviceIdRef = useRef(selectedVideoDeviceId);
  const selectedAudioDeviceIdRef = useRef(selectedAudioDeviceId);

  useEffect(() => {
    selectedVideoDeviceIdRef.current = selectedVideoDeviceId;
  }, [selectedVideoDeviceId]);

  useEffect(() => {
    selectedAudioDeviceIdRef.current = selectedAudioDeviceId;
  }, [selectedAudioDeviceId]);

  // Keep socket ref updated
  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  // Fetch ICE servers configuration on mount
  useEffect(() => {
    fetchICEServers().then(setIceServers);
  }, []);

  // Incoming call info
  const [incomingCall, setIncomingCall] = useState(null);
  const [hasVideo, setHasVideo] = useState(false);

  // Stop all tracks in a stream
  const stopStream = useCallback((stream) => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
  }, []);

  // Get user media logic
  const getUserMedia = useCallback(async (isVideo = true, options = {}) => {
    if (localStreamRef.current && !options.forceNew) return localStreamRef.current;

    if (options.forceNew) {
      stopStream(localStreamRef.current);
      localStreamRef.current = null;
      setLocalStream(null);
    }

    try {
      const requestedVideoDeviceId = options.videoDeviceId ?? selectedVideoDeviceIdRef.current;
      const requestedAudioDeviceId = options.audioDeviceId ?? selectedAudioDeviceIdRef.current;
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideo ? buildVideoConstraints(requestedVideoDeviceId) : false,
        audio: buildAudioConstraints(requestedAudioDeviceId),
      });
      setLocalStream(stream);
      setHasVideo(isVideo);
      localStreamRef.current = stream;
      const videoDeviceId = stream.getVideoTracks()[0]?.getSettings?.().deviceId;
      if (videoDeviceId) {
        setSelectedVideoDeviceId(videoDeviceId);
        localStorage.setItem("selectedVideoDeviceId", videoDeviceId);
      }
      const audioDeviceId = stream.getAudioTracks()[0]?.getSettings?.().deviceId;
      if (audioDeviceId) {
        setSelectedAudioDeviceId(audioDeviceId);
        localStorage.setItem("selectedAudioDeviceId", audioDeviceId);
      }
      return stream;
    } catch (error) {
      console.error("Error getting media:", error);
      const requestedVideoDeviceId = options.videoDeviceId ?? selectedVideoDeviceIdRef.current;
      const requestedAudioDeviceId = options.audioDeviceId ?? selectedAudioDeviceIdRef.current;

      if ((isVideo && requestedVideoDeviceId) || requestedAudioDeviceId) {
        try {
          if (requestedVideoDeviceId) {
            localStorage.removeItem("selectedVideoDeviceId");
            setSelectedVideoDeviceId("");
            selectedVideoDeviceIdRef.current = "";
          }
          if (requestedAudioDeviceId) {
            localStorage.removeItem("selectedAudioDeviceId");
            setSelectedAudioDeviceId("");
            selectedAudioDeviceIdRef.current = "";
          }
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            video: isVideo ? buildVideoConstraints("") : false,
            audio: buildAudioConstraints(""),
          });
          setLocalStream(fallbackStream);
          setHasVideo(isVideo);
          localStreamRef.current = fallbackStream;
          const videoDeviceId = fallbackStream.getVideoTracks()[0]?.getSettings?.().deviceId;
          if (videoDeviceId) {
            setSelectedVideoDeviceId(videoDeviceId);
            localStorage.setItem("selectedVideoDeviceId", videoDeviceId);
          }
          const audioDeviceId = fallbackStream.getAudioTracks()[0]?.getSettings?.().deviceId;
          if (audioDeviceId) {
            setSelectedAudioDeviceId(audioDeviceId);
            localStorage.setItem("selectedAudioDeviceId", audioDeviceId);
          }
          return fallbackStream;
        } catch (fallbackError) {
          console.error("Default camera fallback failed:", fallbackError);
        }
      }

      // Handle different error types with user-friendly messages
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        alert('Camera/Microphone permission denied. Please enable permissions in your browser settings and try again.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        alert('No camera or microphone found on this device. Please connect a camera/microphone and try again.');
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        alert('Camera or microphone is already in use by another application. Please close other apps using your camera/mic.');
      } else if (error.name === 'OverconstrainedError') {
        alert('Camera does not support the requested video quality. Trying with lower quality...');
        // Fallback: try again with lower constraints
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            video: isVideo ? { facingMode: "user" } : false,
            audio: buildAudioConstraints(""),
          });
          setLocalStream(fallbackStream);
          setHasVideo(isVideo);
          localStreamRef.current = fallbackStream;
          const videoDeviceId = fallbackStream.getVideoTracks()[0]?.getSettings?.().deviceId;
          if (videoDeviceId) {
            setSelectedVideoDeviceId(videoDeviceId);
            localStorage.setItem("selectedVideoDeviceId", videoDeviceId);
          }
          const audioDeviceId = fallbackStream.getAudioTracks()[0]?.getSettings?.().deviceId;
          if (audioDeviceId) {
            setSelectedAudioDeviceId(audioDeviceId);
            localStorage.setItem("selectedAudioDeviceId", audioDeviceId);
          }
          return fallbackStream;
        } catch (fallbackError) {
          console.error("Fallback getUserMedia failed:", fallbackError);
          alert('Unable to access camera/microphone. Please check your device settings.');
        }
      } else {
        alert(`Unable to access camera/microphone: ${error.message}`);
      }

      return null;
    }
  }, [stopStream]);

  const renegotiateConnection = useCallback(async (recipientId, callId) => {
    if (!peerConnectionRef.current || !socketRef.current || !recipientId || !callId) return;

    const offer = await peerConnectionRef.current.createOffer();
    await peerConnectionRef.current.setLocalDescription(offer);
    socketRef.current.emit("webrtc:offer", { recipientId, offer, callId });
  }, []);

  const switchCamera = useCallback(async (videoDeviceId, recipientId, callId) => {
    if (!videoDeviceId) return false;

    try {
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: buildVideoConstraints(videoDeviceId),
        audio: false,
      });
      const nextVideoTrack = cameraStream.getVideoTracks()[0];
      if (!nextVideoTrack) return false;

      const currentStream = localStreamRef.current || new MediaStream();
      const previousVideoTracks = currentStream.getVideoTracks();
      previousVideoTracks.forEach((track) => {
        currentStream.removeTrack(track);
        track.stop();
      });
      currentStream.addTrack(nextVideoTrack);

      const videoSender = peerConnectionRef.current
        ?.getSenders()
        .find((sender) => sender.track?.kind === "video");
      if (videoSender) {
        await videoSender.replaceTrack(nextVideoTrack);
      } else if (peerConnectionRef.current) {
        peerConnectionRef.current.addTrack(nextVideoTrack, currentStream);
        await renegotiateConnection(recipientId, callId);
      }

      localStreamRef.current = currentStream;
      setLocalStream(new MediaStream(currentStream.getTracks()));
      setHasVideo(true);
      setCallState((prev) => ({ ...prev, callType: "video" }));
      setSelectedVideoDeviceId(videoDeviceId);
      localStorage.setItem("selectedVideoDeviceId", videoDeviceId);
      return true;
    } catch (error) {
      console.error("Error switching camera:", error);
      alert("Unable to switch camera. Please check whether the selected camera is available.");
      return false;
    }
  }, [renegotiateConnection]);

  const switchMicrophone = useCallback(async (audioDeviceId) => {
    if (!audioDeviceId) return false;

    try {
      const micStream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: buildAudioConstraints(audioDeviceId),
      });
      const nextAudioTrack = micStream.getAudioTracks()[0];
      if (!nextAudioTrack) return false;

      const currentStream = localStreamRef.current || new MediaStream();
      const previousAudioTrack = currentStream.getAudioTracks()[0];
      const wasEnabled = previousAudioTrack ? previousAudioTrack.enabled : true;
      nextAudioTrack.enabled = wasEnabled;

      currentStream.getAudioTracks().forEach((track) => {
        currentStream.removeTrack(track);
        track.stop();
      });
      currentStream.addTrack(nextAudioTrack);

      const audioSender = peerConnectionRef.current
        ?.getSenders()
        .find((sender) => sender.track?.kind === "audio");
      if (audioSender) {
        await audioSender.replaceTrack(nextAudioTrack);
      } else if (peerConnectionRef.current) {
        peerConnectionRef.current.addTrack(nextAudioTrack, currentStream);
      }

      localStreamRef.current = currentStream;
      setLocalStream(new MediaStream(currentStream.getTracks()));
      setSelectedAudioDeviceId(audioDeviceId);
      localStorage.setItem("selectedAudioDeviceId", audioDeviceId);
      return true;
    } catch (error) {
      console.error("Error switching microphone:", error);
      alert("Unable to switch microphone. Please check whether the selected microphone is available.");
      return false;
    }
  }, []);

  // Create peer connection
  const createPeerConnection = useCallback(
    (recipientId, callId) => {
      if (peerConnectionRef.current) return peerConnectionRef.current;

      // Wait for ICE servers to be loaded
      if (!iceServers) {
        console.warn("ICE servers not loaded yet");
        return null;
      }

      const pc = new RTCPeerConnection(iceServers);

      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          console.log("[WebRTC] ICE Candidate:", {
            type: event.candidate.type,
            protocol: event.candidate.protocol,
            address: event.candidate.address,
            port: event.candidate.port,
            candidateType: event.candidate.candidate.includes("relay") ? "TURN (relay)" :
              event.candidate.candidate.includes("srflx") ? "STUN (srflx)" :
                "Direct (host)"
          });
          socketRef.current.emit("webrtc:ice-candidate", {
            recipientId,
            candidate: event.candidate,
            callId,
          });
        } else if (!event.candidate) {
          console.log("[WebRTC] All ICE candidates gathered");
        }
      };

      pc.ontrack = (event) => {
        if (event.streams[0]) setRemoteStream(event.streams[0]);
      };

      pc.onconnectionstatechange = () => {
        console.log("[WebRTC] Connection State:", pc.connectionState);
        console.log("[WebRTC] ICE Connection State:", pc.iceConnectionState);
        console.log("[WebRTC] ICE Gathering State:", pc.iceGatheringState);

        if (pc.connectionState === "connected") {
          console.log("[WebRTC] Call connected successfully");
          setCallState((prev) => ({ ...prev, callStatus: "connected" }));
        } else if (
          ["disconnected", "failed", "closed"].includes(pc.connectionState)
        ) {
          console.log("[WebRTC] Call ended or failed:", pc.connectionState);
          endCall(recipientId, callId);
        }
      };

      peerConnectionRef.current = pc;
      return pc;
    },
    [iceServers]
  );

  // Initiate a call
  const initiateCall = useCallback(
    async (receiverId, receiverInfo, isVideo = true) => {
      const stream = await getUserMedia(isVideo);
      if (!stream || !socketRef.current) return false;

      setCallState({
        isInCall: true,
        isRinging: true,
        isReceivingCall: false,
        callId: null,
        callType: isVideo ? "video" : "audio",
        remoteUser: receiverInfo,
        callStatus: "ringing",
      });

      socketRef.current.emit("call:initiate", {
        receiverId,
        callerInfo: {
          id: authUser._id,
          name: authUser.fullName,
          avatar: authUser.profilePic,
        },
        isVideo,
      });
      return true;
    },
    [authUser, getUserMedia]
  );

  // Accept incoming call
  const acceptCall = useCallback(
    async (callId, callerId, callerInfo, isVideo) => {
      await getUserMedia(isVideo);
      setCallState({
        isInCall: true,
        isRinging: false,
        isReceivingCall: false,
        callId,
        callType: isVideo ? "video" : "audio",
        remoteUser: callerInfo,
        callStatus: "connecting",
      });
      setIncomingCall(null);
      socketRef.current.emit("call:accept", {
        callId,
        callerId,
        receiverInfo: {
          id: authUser._id,
          name: authUser.fullName,
          avatar: authUser.profilePic,
        },
      });
    },
    [authUser, getUserMedia]
  );

  const endCall = useCallback(
    (recipientId, callId) => {
      if (socketRef.current && recipientId && callId) {
        socketRef.current.emit("call:end", { callId, recipientId });
      }
      if (peerConnectionRef.current) peerConnectionRef.current.close();
      peerConnectionRef.current = null;
      stopStream(localStreamRef.current);
      localStreamRef.current = null;
      setLocalStream(null);
      setRemoteStream(null);
      setIncomingCall(null); // Clear incoming call modal
      setCallState({
        isInCall: false,
        isRinging: false,
        isReceivingCall: false,
        callId: null,
        callType: null,
        remoteUser: null,
        callStatus: "idle",
      });
    },
    [stopStream]
  );

  // Reject an incoming call
  const rejectCall = useCallback((callId, callerId) => {
    if (socketRef.current && callId && callerId) {
      socketRef.current.emit("call:reject", {
        callId,
        callerId,
        reason: "Call declined",
      });
    }
    setIncomingCall(null);
    setCallState({
      isInCall: false,
      isRinging: false,
      isReceivingCall: false,
      callId: null,
      callType: null,
      remoteUser: null,
      callStatus: "idle",
    });
  }, []);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleWebRTCOffer = async ({ callId, senderId, offer }) => {
      const pc = createPeerConnection(senderId, callId);
      addMissingLocalTracks(pc, localStreamRef.current);
      if (offer?.sdp?.includes("m=video")) {
        setCallState((prev) => ({ ...prev, callType: "video" }));
      }
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("webrtc:answer", { recipientId: senderId, answer, callId });
    };

    const handleWebRTCAnswer = async ({ answer }) => {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(answer)
        );
      }
    };

    const handleCallAccepted = async ({ callId, receiverId }) => {
      const pc = createPeerConnection(receiverId, callId);
      addMissingLocalTracks(pc, localStreamRef.current);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("webrtc:offer", { recipientId: receiverId, offer, callId });
    };

    socket.on("call:incoming", (data) => {
      if (callState.isInCall)
        return socket.emit("call:busy", {
          callId: data.callId,
          callerId: data.callerId,
        });
      setIncomingCall(data);
      setCallState((p) => ({ ...p, isReceivingCall: true }));
    });

    socket.on("call:accepted", handleCallAccepted);
    socket.on("webrtc:offer", handleWebRTCOffer);
    socket.on("webrtc:answer", handleWebRTCAnswer);
    socket.on("webrtc:ice-candidate", ({ candidate }) => {
      peerConnectionRef.current?.addIceCandidate(
        new RTCIceCandidate(candidate)
      );
    });
    socket.on("call:rejected", () => {
      setCallState((p) => ({ ...p, callStatus: "rejected" }));
      setIncomingCall(null); // Clear incoming call modal
    });
    socket.on("call:busy", () => {
      setCallState((p) => ({ ...p, callStatus: "busy" }));
      setIncomingCall(null); // Clear incoming call modal
    });
    socket.on("call:ended", () => {
      endCall();
      setIncomingCall(null); // Clear incoming call modal when caller cancels
    });

    return () => {
      socket.off("call:incoming");
      socket.off("call:accepted");
      socket.off("webrtc:offer");
      socket.off("webrtc:answer");
      socket.off("webrtc:ice-candidate");
      socket.off("call:rejected");
      socket.off("call:busy");
      socket.off("call:ended");
    };
  }, [socket, callState.isInCall, createPeerConnection, endCall]);

  return (
    <CallContext.Provider
      value={{
        callState,
        localStream,
        remoteStream,
        incomingCall,
        setIncomingCall,
        hasVideo,
        selectedVideoDeviceId,
        selectedAudioDeviceId,
        initiateCall,
        acceptCall,
        rejectCall,
        endCall,
        getUserMedia,
        switchCamera,
        switchMicrophone,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => useContext(CallContext);

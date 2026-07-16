import { Server } from "socket.io";
import http from "http";
import express from "express";
import { ENV } from "./env.js";
import { socketAuthMiddleware } from "../middleware/socket.auth.middleware.js";
import Call from "../models/Call.js";
import DatingMatch from "../models/DatingMatch.js";
import Message from "../models/Message.js";
import User from "../models/User.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [ENV.CLIENT_URL],
    credentials: true,
  },
});

io.use(socketAuthMiddleware);

const userSocketsMap = {};
const hiddenPresenceUsers = new Set();
const BLIND_MATCH_DURATION_MS = 10 * 60 * 1000;
const blindQueue = [];
const blindSessions = {};
const blindSessionByUser = {};

export function getReceiverSocketIds(userId) {
  return userSocketsMap[userId] ? Array.from(userSocketsMap[userId]) : [];
}

function emitToUser(userId, event, data) {
  const socketIds = getReceiverSocketIds(userId);
  socketIds.forEach(socketId => {
    io.to(socketId).emit(event, data);
  });
}

function emitToOneSocket(userId, event, data) {
  const socketIds = getReceiverSocketIds(userId);
  if (socketIds.length > 0) {
    const targetSocketId = socketIds[socketIds.length - 1];
    io.to(targetSocketId).emit(event, data);
    console.log(`Emitted ${event} to single socket ${targetSocketId} for user ${userId}`);
  }
}

export function isUserOnline(userId) {
  return userSocketsMap[userId] && userSocketsMap[userId].size > 0;
}

function getOnlineUserIds() {
  return Object.keys(userSocketsMap).filter(
    userId => userSocketsMap[userId].size > 0 && !hiddenPresenceUsers.has(userId)
  );
}

async function hasDatingMatch(userIdA, userIdB) {
  const first = userIdA.toString();
  const second = userIdB.toString();
  const userA = first < second ? userIdA : userIdB;
  const userB = first < second ? userIdB : userIdA;

  return Boolean(await DatingMatch.exists({ userA, userB }));
}

const activeCalls = {};

function getCallMessageText(callType, status, duration) {
  const label = callType === "video" ? "Video call" : "Voice call";

  if (status === "answered") {
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    const durationText = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
    return `${label} ended (${durationText})`;
  }

  const statusLabels = {
    missed: "missed",
    rejected: "declined",
    busy: "busy",
    unavailable: "unavailable",
  };

  return `${label} ${statusLabels[status] || status}`;
}

function sortDatingMatchUsers(userIdA, userIdB) {
  const first = userIdA.toString();
  const second = userIdB.toString();
  return first < second
    ? { userA: userIdA, userB: userIdB }
    : { userA: userIdB, userB: userIdA };
}

function removeFromBlindQueue(userId) {
  const index = blindQueue.findIndex((entry) => entry.userId === userId);
  if (index >= 0) blindQueue.splice(index, 1);
}

function getBlindPartner(session, userId) {
  return session.participants.find((participantId) => participantId !== userId);
}

function emitBlindSession(session, event, data) {
  session.participants.forEach((participantId) => {
    emitToOneSocket(participantId, event, data);
  });
}

async function createBlindDatingMatch(session) {
  const [firstUserId, secondUserId] = session.participants;
  const { userA, userB } = sortDatingMatchUsers(firstUserId, secondUserId);
  const match = await DatingMatch.findOneAndUpdate(
    { userA, userB },
    { userA, userB },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const users = await User.find({ _id: { $in: [firstUserId, secondUserId] } }).select(
    "fullName email profilePic role datingProfile datingPreferences createdAt"
  );
  const usersById = new Map(users.map((user) => [user._id.toString(), user]));

  session.participants.forEach((participantId) => {
    const partnerId = getBlindPartner(session, participantId);
    const partner = usersById.get(partnerId);
    if (!partner) return;

    const payload = {
      ...partner.toObject(),
      isDatingMatch: true,
      matchId: match._id,
      matchedAt: match.createdAt,
    };

    emitToUser(participantId, "dating:match", payload);
    emitToUser(participantId, "blind:matched", {
      sessionId: session.id,
      matchId: match._id,
      partner: payload,
    });
  });
}

function cleanupBlindSession(sessionId, reason = "ended") {
  const session = blindSessions[sessionId];
  if (!session) return;

  clearTimeout(session.timeout);
  session.participants.forEach((participantId) => {
    delete blindSessionByUser[participantId];
  });
  delete blindSessions[sessionId];

  if (reason) {
    emitBlindSession(session, "blind:ended", { sessionId, reason });
  }
}

function createBlindSession(first, second) {
  const sessionId = `blind-${Date.now()}-${first.userId}-${second.userId}`;
  const expiresAt = Date.now() + BLIND_MATCH_DURATION_MS;
  const session = {
    id: sessionId,
    participants: [first.userId, second.userId],
    decisions: {},
    expiresAt,
    timeout: null,
  };

  session.timeout = setTimeout(() => {
    cleanupBlindSession(sessionId, "expired");
  }, BLIND_MATCH_DURATION_MS);

  blindSessions[sessionId] = session;
  session.participants.forEach((participantId) => {
    blindSessionByUser[participantId] = sessionId;
  });

  session.participants.forEach((participantId) => {
    const partnerId = getBlindPartner(session, participantId);
    emitToOneSocket(participantId, "blind:matched-session", {
      sessionId,
      partnerAnonId: partnerId === first.userId ? "A" : "B",
      expiresAt,
    });
  });
}

async function saveCallRecord(callId, status) {
  const call = activeCalls[callId];
  if (!call) {
    console.log("No active call found for callId:", callId);
    return;
  }

  try {
    const endTime = Date.now();
    const duration = call.answeredAt
      ? Math.round((endTime - call.answeredAt) / 1000)
      : 0;
    const callType = call.isVideo ? "video" : "audio";

    const callRecord = new Call({
      callId,
      caller: call.callerId,
      receiver: call.receiverId,
      callType,
      status,
      duration,
      startedAt: call.answeredAt ? new Date(call.answeredAt) : null,
      endedAt: status === "answered" ? new Date(endTime) : null,
    });

    await callRecord.save();
    const existingCallMessage = await Message.exists({
      messageType: "call",
      "call.callId": callId,
    });

    if (!existingCallMessage) {
      const callMessage = await Message.create({
        senderId: call.callerId,
        receiverId: call.receiverId,
        text: getCallMessageText(callType, status, duration),
        messageType: "call",
        call: {
          callId,
          callType,
          status,
          duration,
        },
      });

      emitToUser(call.callerId, "newMessage", callMessage);
      emitToUser(call.receiverId, "newMessage", callMessage);
    }

    console.log("Call record saved:", callId, "status:", status, "duration:", duration);
  } catch (error) {
    console.error("Error saving call record:", error);
  }
}

io.on("connection", (socket) => {
  console.log("A user connected", socket.user.fullName);

  const userId = socket.userId;

  if (!userSocketsMap[userId]) {
    userSocketsMap[userId] = new Set();
  }
  userSocketsMap[userId].add(socket.id);

  console.log(`User ${socket.user.fullName} now has ${userSocketsMap[userId].size} socket(s)`);

  io.emit("getOnlineUsers", getOnlineUserIds());

  // Handle call initiation
  socket.on("call:initiate", async ({ receiverId, callerInfo, isVideo }) => {
    console.log("=== CALL INITIATE ===");
    console.log("From:", userId, "To:", receiverId);
    console.log("CallerInfo:", callerInfo);
    console.log("Online users:", getOnlineUserIds());

    if (userId === receiverId || !(await hasDatingMatch(userId, receiverId))) {
      socket.emit("call:unavailable", {
        receiverId,
        reason: "You can only call users after matching"
      });
      return;
    }

    const callId = `${userId}-${receiverId}-${Date.now()}`;

    const isReceiverOnline = isUserOnline(receiverId);
    console.log("Receiver online:", isReceiverOnline);

    activeCalls[callId] = {
      callerId: userId,
      receiverId,
      status: "ringing",
      isVideo,
      startTime: Date.now()
    };

    if (isReceiverOnline) {
      console.log("Emitting call:incoming to receiver (all sockets)");
      emitToUser(receiverId, "call:incoming", {
        callId,
        callerId: userId,
        callerInfo,
        isVideo
      });
      emitToUser(userId, "call:ringing", { callId, receiverId });
      console.log("call:ringing emitted to caller");
    } else {
      console.log("Receiver is offline");
      saveCallRecord(callId, "unavailable");
      socket.emit("call:unavailable", {
        receiverId,
        reason: "User is offline"
      });
      delete activeCalls[callId];
    }
  });

  socket.on("call:accept", ({ callId, callerId, receiverInfo }) => {
    console.log("=== CALL ACCEPT ===");
    console.log("CallId:", callId);
    console.log("CallerId:", callerId);
    console.log("ReceiverInfo:", receiverInfo);
    console.log("From user:", userId);

    if (activeCalls[callId]) {
      activeCalls[callId].status = "connected";
      activeCalls[callId].answeredAt = Date.now();
    }

    emitToOneSocket(callerId, "call:accepted", {
      callId,
      receiverId: userId,
      receiverInfo
    });
  });

  socket.on("call:reject", async ({ callId, callerId, reason }) => {
    await saveCallRecord(callId, "rejected");

    if (activeCalls[callId]) {
      delete activeCalls[callId];
    }

    emitToUser(callerId, "call:rejected", {
      callId,
      receiverId: userId,
      reason: reason || "Call declined"
    });
  });

  socket.on("call:end", async ({ callId, recipientId }) => {
    const call = activeCalls[callId];
    if (call) {
      const status = call.answeredAt ? "answered" : "missed";
      await saveCallRecord(callId, status);
      delete activeCalls[callId];
    }

    emitToUser(recipientId, "call:ended", {
      callId,
      endedBy: userId
    });
  });

  socket.on("webrtc:offer", ({ recipientId, offer, callId }) => {
    console.log("WebRTC offer from", userId, "to", recipientId);
    emitToOneSocket(recipientId, "webrtc:offer", {
      callId,
      senderId: userId,
      offer
    });
  });

  socket.on("webrtc:answer", ({ recipientId, answer, callId }) => {
    console.log("WebRTC answer from", userId, "to", recipientId);
    emitToOneSocket(recipientId, "webrtc:answer", {
      callId,
      senderId: userId,
      answer
    });
  });

  socket.on("webrtc:ice-candidate", ({ recipientId, candidate, callId }) => {
    emitToOneSocket(recipientId, "webrtc:ice-candidate", {
      callId,
      senderId: userId,
      candidate
    });
  });

  socket.on("call:busy", async ({ callId, callerId }) => {
    await saveCallRecord(callId, "busy");

    if (activeCalls[callId]) {
      delete activeCalls[callId];
    }

    emitToUser(callerId, "call:busy", {
      callId,
      receiverId: userId
    });
  });

  // Typing indicator events
  socket.on("presence:set-visibility", ({ isVisible }) => {
    if (isVisible === false) {
      hiddenPresenceUsers.add(userId);
    } else {
      hiddenPresenceUsers.delete(userId);
    }

    io.emit("getOnlineUsers", getOnlineUserIds());
  });

  socket.on("user:typing", ({ receiverId }) => {
    emitToUser(receiverId, "user:typing", { senderId: userId });
  });

  socket.on("user:stop-typing", ({ receiverId }) => {
    emitToUser(receiverId, "user:stop-typing", { senderId: userId });
  });

  socket.on("blind:find", () => {
    if (blindSessionByUser[userId]) {
      socket.emit("blind:error", { message: "You are already in a blind match" });
      return;
    }

    removeFromBlindQueue(userId);

    const partnerIndex = blindQueue.findIndex((entry) => entry.userId !== userId && isUserOnline(entry.userId));
    if (partnerIndex >= 0) {
      const partner = blindQueue.splice(partnerIndex, 1)[0];
      createBlindSession({ userId, socketId: socket.id }, partner);
      return;
    }

    blindQueue.push({ userId, socketId: socket.id, joinedAt: Date.now() });
    socket.emit("blind:searching");
  });

  socket.on("blind:cancel-search", () => {
    removeFromBlindQueue(userId);
    socket.emit("blind:idle");
  });

  socket.on("blind:message", ({ sessionId, text }) => {
    const session = blindSessions[sessionId];
    if (!session || !session.participants.includes(userId)) return;

    const cleanText = String(text || "").trim().slice(0, 1000);
    if (!cleanText) return;

    const message = {
      id: `${sessionId}-${Date.now()}-${userId}`,
      sessionId,
      sender: userId,
      text: cleanText,
      createdAt: new Date().toISOString(),
    };

    emitBlindSession(session, "blind:message", message);
  });

  socket.on("blind:decision", async ({ sessionId, decision }) => {
    const session = blindSessions[sessionId];
    if (!session || !session.participants.includes(userId)) return;

    const normalizedDecision = decision === "like" ? "like" : "pass";
    session.decisions[userId] = normalizedDecision;

    if (normalizedDecision === "pass") {
      cleanupBlindSession(sessionId, "passed");
      return;
    }

    emitToOneSocket(getBlindPartner(session, userId), "blind:partner-decision", {
      sessionId,
      decision: "like",
    });

    const [firstUserId, secondUserId] = session.participants;
    if (session.decisions[firstUserId] === "like" && session.decisions[secondUserId] === "like") {
      try {
        await createBlindDatingMatch(session);
        cleanupBlindSession(sessionId, null);
      } catch (error) {
        console.error("blind:decision create match error:", error);
        emitBlindSession(session, "blind:error", { message: "Failed to create match" });
      }
    }
  });

  socket.on("blind:leave", ({ sessionId }) => {
    const session = blindSessions[sessionId || blindSessionByUser[userId]];
    if (!session || !session.participants.includes(userId)) return;
    cleanupBlindSession(session.id, "left");
  });


  socket.on("disconnect", async () => {
    console.log("A user disconnected", socket.user.fullName);

    removeFromBlindQueue(userId);
    const blindSessionId = blindSessionByUser[userId];
    if (blindSessionId) {
      cleanupBlindSession(blindSessionId, "disconnected");
    }

    if (userSocketsMap[userId]) {
      userSocketsMap[userId].delete(socket.id);
      console.log(`User ${socket.user.fullName} now has ${userSocketsMap[userId].size} socket(s)`);

      if (userSocketsMap[userId].size === 0) {
        for (const callId of Object.keys(activeCalls)) {
          const call = activeCalls[callId];
          if (call.callerId === userId || call.receiverId === userId) {
            const otherUserId = call.callerId === userId ? call.receiverId : call.callerId;

            const status = call.answeredAt ? "answered" : "missed";
            await saveCallRecord(callId, status);

            emitToUser(otherUserId, "call:ended", {
              callId,
              endedBy: userId,
              reason: "User disconnected"
            });
            delete activeCalls[callId];
          }
        }

        delete userSocketsMap[userId];
        hiddenPresenceUsers.delete(userId);
      }
    }

    io.emit("getOnlineUsers", getOnlineUserIds());
  });
});

export { io, app, server };

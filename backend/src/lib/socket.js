import { Server } from "socket.io";
import http from "http";
import express from "express";
import { ENV } from "./env.js";
import { socketAuthMiddleware } from "../middleware/socket.auth.middleware.js";
import Call from "../models/Call.js";
import DatingMatch from "../models/DatingMatch.js";

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

    const callRecord = new Call({
      callId,
      caller: call.callerId,
      receiver: call.receiverId,
      callType: call.isVideo ? "video" : "audio",
      status,
      duration,
      startedAt: call.answeredAt ? new Date(call.answeredAt) : null,
      endedAt: status === "answered" ? new Date(endTime) : null,
    });

    await callRecord.save();
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

  // ==================== GROUP EVENTS ====================

  // Join group room (for real-time updates)
  socket.on("group:join", ({ groupId }) => {
    socket.join(`group:${groupId}`);
    console.log(`User ${socket.user.fullName} joined group room: ${groupId}`);
  });

  // Leave group room
  socket.on("group:leave", ({ groupId }) => {
    socket.leave(`group:${groupId}`);
    console.log(`User ${socket.user.fullName} left group room: ${groupId}`);
  });

  // Group typing indicator
  socket.on("group:typing", ({ groupId }) => {
    socket.to(`group:${groupId}`).emit("group:typing", {
      groupId,
      senderId: userId,
      senderName: socket.user.fullName,
    });
  });

  socket.on("group:stop-typing", ({ groupId }) => {
    socket.to(`group:${groupId}`).emit("group:stop-typing", {
      groupId,
      senderId: userId,
    });
  });

  // Group message reaction
  socket.on("group:messageReaction", ({ groupId, message }) => {
    socket.to(`group:${groupId}`).emit("group:messageReaction", {
      groupId,
      message,
    });
  });

  socket.on("disconnect", async () => {
    console.log("A user disconnected", socket.user.fullName);

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

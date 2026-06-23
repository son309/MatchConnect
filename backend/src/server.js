import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import cors from "cors";

import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import friendRoutes from "./routes/friend.route.js";
import callRoutes from "./routes/call.route.js";
import groupRoutes from "./routes/group.route.js";
import blockRoutes from "./routes/block.route.js";
import datingRoutes from "./routes/dating.route.js";
import reportRoutes from "./routes/report.route.js";
import adminRoutes from "./routes/admin.route.js";
import { connectDB } from "./lib/db.js";
import { ENV } from "./lib/env.js";
import { app, server } from "./lib/socket.js";

const __dirname = path.resolve();

const PORT = ENV.PORT || 3000;

app.use(express.json({ limit: "25mb" })); // req.body
app.use(cors({ origin: ENV.CLIENT_URL, credentials: true }));
app.use(cookieParser());
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.get("/api/health", (_, res) => {
  res.status(200).json({
    status: "ok",
    service: "MatchConnect API",
    environment: ENV.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

app.get("/", (_, res) => {
  res.status(200).send(`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>MatchConnect API</title>
        <style>
          body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: Arial, sans-serif; background: #fafafa; color: #111827; }
          main { max-width: 560px; padding: 32px; text-align: center; border: 1px solid #f3f4f6; border-radius: 24px; background: #fff; box-shadow: 0 16px 40px rgba(17, 24, 39, 0.08); }
          .badge { display: inline-block; padding: 8px 12px; border-radius: 999px; background: #fce7f3; color: #db2777; font-weight: 700; font-size: 14px; }
          h1 { margin: 18px 0 8px; font-size: 32px; }
          p { margin: 8px 0; color: #6b7280; line-height: 1.6; }
          code { display: inline-block; margin-top: 14px; padding: 10px 12px; border-radius: 12px; background: #f9fafb; color: #374151; }
        </style>
      </head>
      <body>
        <main>
          <span class="badge">API Online</span>
          <h1>MatchConnect API is running</h1>
          <p>The backend service is active. Use the frontend app URL to access the user interface.</p>
          <code>GET /api/health</code>
        </main>
      </body>
    </html>
  `);
});

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/calls", callRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/block", blockRoutes);
app.use("/api/dating", datingRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/admin", adminRoutes);

// make ready for deployment
if (ENV.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("*", (_, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

server.listen(PORT, () => {
  console.log("Server running on port: " + PORT);
  connectDB();
});


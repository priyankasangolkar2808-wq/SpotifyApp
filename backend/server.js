

import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";

import connectDB from "./config/db.js";
import tracksRouter from "./routes/tracks.js";
import roomsRouter from "./routes/rooms.js";
import recommendationsRouter from "./routes/recommendations.js";
import registerDjSocket from "./socket/djSocket.js";

const app = express();
const httpServer = http.createServer(app);

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
];

if (process.env.CLIENT_URL) {
  allowedOrigins.push(process.env.CLIENT_URL);
}

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  })
);

app.use(express.json({ limit: "100kb" }));

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
  },
});

app.get("/", (req, res) => {
  res.json({ message: "Spotify AI DJ Studio backend is running." });
});

app.get("/api/health", (req, res) => {
  res.json({ message: "Backend is running", success: true });
});

app.use("/api/tracks", tracksRouter);
app.use("/api/rooms", roomsRouter);
app.use("/api/recommendations", recommendationsRouter);

registerDjSocket(io);

const PORT = Number(process.env.PORT) || 5000;

async function startServer() {
  try {
    await connectDB();

    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`API: http://localhost:${PORT}/api`);
      console.log(`Socket.IO is ready`);
    });
  } catch (error) {
    console.error("Failed to start backend:", error.message);
    process.exit(1);
  }
}

startServer();

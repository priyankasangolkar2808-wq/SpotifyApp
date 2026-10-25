
import express from "express";
import Room from "../models/Room.js";

const router = express.Router();

// Return the list of available rooms.
router.get("/", async (req, res) => {
  try {
    const rooms = await Room.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .select("roomName code hostName members queue createdAt")
      .lean();

    res.json(
      rooms.map((room) => ({
        ...room,
        memberCount: room.members.length
      }))
    );
  } catch (error) {
    console.error("List rooms error:", error.message);
    res.status(500).json({ message: "Unable to retrieve rooms" });
  }
});

// Create a room through HTTP.
// Socket.IO will connect the creator to it.
router.post("/", async (req, res) => {
  try {
    const roomName =
      typeof req.body.roomName === "string"
        ? req.body.roomName.trim()
        : "";

    const hostName =
      typeof req.body.hostName === "string"
        ? req.body.hostName.trim()
        : "";

    if (!roomName || !hostName) {
      return res.status(400).json({
        message: "Room name and display name are required"
      });
    }

    if (roomName.length > 60 || hostName.length > 30) {
      return res.status(400).json({
        message: "Room name must be under 60 characters and display name under 30"
      });
    }

    let room;
    let attempts = 0;

    // Retry if a generated code already exists.
    while (!room && attempts < 5) {
      attempts += 1;

      const code = Math.random()
        .toString(36)
        .slice(2, 8)
        .toUpperCase()
        .padEnd(6, "0");

      try {
        room = await Room.create({
          roomName,
          hostName,
          code
        });
      } catch (error) {
        if (error.code !== 11000) {
          throw error;
        }
      }
    }

    if (!room) {
      return res.status(500).json({
        message: "Could not generate a unique room code. Try again."
      });
    }

    res.status(201).json({
      message: "Room created successfully",
      room: {
        _id: room._id,
        roomName: room.roomName,
        code: room.code,
        hostName: room.hostName,
        members: room.members,
        queue: room.queue,
        chat: room.chat
      }
    });
  } catch (error) {
    console.error("Create room error:", error.message);
    res.status(500).json({ message: "Unable to create room" });
  }
});

export default router;

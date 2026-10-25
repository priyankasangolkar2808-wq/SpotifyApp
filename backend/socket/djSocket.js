
import mongoose from "mongoose";
import Room from "../models/Room.js";
import Track from "../models/Track.js";

const MAX_MEMBERS = 30;
const MAX_QUEUE_ITEMS = 100;
const MAX_CHAT_MESSAGES = 100;

function cleanName(value) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, 30);
}

function publicRoom(room) {
  return {
    id: room._id.toString(),
    roomName: room.roomName,
    code: room.code,
    hostName: room.hostName,
    members: room.members.map((member) => ({
      userName: member.userName
    })),
    queue: room.queue.map((item) => ({
      id: item._id.toString(),
      trackId: item.trackId.toString(),
      title: item.title,
      artist: item.artist,
      durationSeconds: item.durationSeconds,
      addedBy: item.addedBy,
      votes: item.votes,
      voteCount: item.votes.length
    })),
    chat: room.chat.map((item) => ({
      id: item._id.toString(),
      userName: item.userName,
      message: item.message,
      createdAt: item.createdAt
    }))
  };
}

function sendError(socket, message) {
  socket.emit("dj:error", { message });
}

async function findRoomByCode(code) {
  if (typeof code !== "string") return null;

  return Room.findOne({
    code: code.trim().toUpperCase()
  });
}

export default function registerDjSocket(io) {
  // Store the current room code for each connected socket.
  const socketRooms = new Map();

  io.on("connection", (socket) => {
    console.log("DJ client connected:", socket.id);

    socket.on("dj:room-list", async () => {
      try {
        const rooms = await Room.find()
          .sort({ createdAt: -1 })
          .limit(50)
          .select("roomName code hostName members queue")
          .lean();

        socket.emit(
          "dj:room-list",
          rooms.map((room) => ({
            id: room._id.toString(),
            roomName: room.roomName,
            code: room.code,
            hostName: room.hostName,
            memberCount: room.members.length,
            queueCount: room.queue.length
          }))
        );
      } catch (error) {
        console.error("Room list socket error:", error.message);
        sendError(socket, "Unable to load the room list.");
      }
    });

    socket.on("dj:join", async (payload = {}) => {
      try {
        const code =
          typeof payload.code === "string"
            ? payload.code.trim().toUpperCase()
            : "";

        const userName = cleanName(payload.userName);

        if (!code || !userName) {
          return sendError(socket, "Enter a room code and display name.");
        }

        if (socketRooms.has(socket.id)) {
          return sendError(socket, "Leave your current room before joining another.");
        }

        const room = await findRoomByCode(code);

        if (!room) {
          return sendError(socket, "Room not found. Check the room code.");
        }

        const existingMember = room.members.find(
          (member) => member.socketId === socket.id
        );

        if (!existingMember && room.members.length >= MAX_MEMBERS) {
          return sendError(socket, "This room has reached its member limit.");
        }

        // Display names must be unique within a room.
        const duplicateName = room.members.some(
          (member) =>
            member.userName.toLowerCase() === userName.toLowerCase()
        );

        if (duplicateName) {
          return sendError(
            socket,
            "That display name is already in use in this room."
          );
        }

        room.members.push({ socketId: socket.id, userName });
        await room.save();

        await socket.join(room.code);
        socketRooms.set(socket.id, room.code);

        socket.emit("dj:joined", {
          room: publicRoom(room),
          userName
        });

        io.to(room.code).emit("dj:room-update", publicRoom(room));
      } catch (error) {
        console.error("Join room error:", error.message);
        sendError(socket, "Unable to join this room.");
      }
    });

    socket.on("dj:leave", async () => {
      await leaveRoom(socket, io, socketRooms);
    });

    socket.on("dj:queue-add", async (payload = {}) => {
      try {
        const code = socketRooms.get(socket.id);
        if (!code) return sendError(socket, "Join a room first.");

        const trackId = payload.trackId;
        if (!mongoose.isValidObjectId(trackId)) {
          return sendError(socket, "Choose a valid track.");
        }

        const room = await Room.findOne({ code });
        if (!room) return sendError(socket, "Room no longer exists.");

        const member = room.members.find(
          (item) => item.socketId === socket.id
        );
        if (!member) return sendError(socket, "Join the room first.");

        if (room.queue.length >= MAX_QUEUE_ITEMS) {
          return sendError(socket, "The queue is full.");
        }

        const track = await Track.findById(trackId).lean();
        if (!track) return sendError(socket, "Track not found.");

        room.queue.push({
          trackId: track._id,
          title: track.title,
          artist: track.artist,
          durationSeconds: track.durationSeconds,
          addedBy: member.userName,
          votes: []
        });

        await room.save();
        io.to(code).emit("dj:room-update", publicRoom(room));
      } catch (error) {
        console.error("Add queue item error:", error.message);
        sendError(socket, "Unable to add the track to the queue.");
      }
    });

    socket.on("dj:vote", async (payload = {}) => {
      try {
        const code = socketRooms.get(socket.id);
        if (!code) return sendError(socket, "Join a room first.");

        const queueItemId = payload.queueItemId;

        if (!mongoose.isValidObjectId(queueItemId)) {
          return sendError(socket, "Choose a valid queue item.");
        }

        const room = await Room.findOne({ code });
        if (!room) return sendError(socket, "Room no longer exists.");

        const member = room.members.find(
          (item) => item.socketId === socket.id
        );
        if (!member) return sendError(socket, "Join the room first.");

        const item = room.queue.id(queueItemId);
        if (!item) return sendError(socket, "Queue item not found.");

        const alreadyVoted = item.votes.includes(member.userName);

        if (alreadyVoted) {
          item.votes = item.votes.filter(
            (name) => name !== member.userName
          );
        } else {
          item.votes.push(member.userName);
        }

        await room.save();
        io.to(code).emit("dj:room-update", publicRoom(room));
      } catch (error) {
        console.error("Vote error:", error.message);
        sendError(socket, "Unable to register your vote.");
      }
    });

    socket.on("dj:chat-send", async (payload = {}) => {
      try {
        const code = socketRooms.get(socket.id);
        if (!code) return sendError(socket, "Join a room first.");

        const message =
          typeof payload.message === "string"
            ? payload.message.trim()
            : "";

        if (!message) return;
        if (message.length > 500) {
          return sendError(socket, "Messages must be 500 characters or fewer.");
        }

        const room = await Room.findOne({ code });
        if (!room) return sendError(socket, "Room no longer exists.");

        const member = room.members.find(
          (item) => item.socketId === socket.id
        );
        if (!member) return sendError(socket, "Join the room first.");

        room.chat.push({
          userName: member.userName,
          message
        });

        // Keep only the latest 100 messages.
        if (room.chat.length > MAX_CHAT_MESSAGES) {
          room.chat = room.chat.slice(-MAX_CHAT_MESSAGES);
        }

        await room.save();

        io.to(code).emit("dj:room-update", publicRoom(room));
      } catch (error) {
        console.error("Chat error:", error.message);
        sendError(socket, "Unable to send your message.");
      }
    });

    socket.on("dj:queue-next", async () => {
      try {
        const code = socketRooms.get(socket.id);
        if (!code) return sendError(socket, "Join a room first.");

        const room = await Room.findOne({ code });
        if (!room) return sendError(socket, "Room no longer exists.");

        const member = room.members.find(
          (item) => item.socketId === socket.id
        );

        if (!member) return sendError(socket, "Join the room first.");

        // Only the room creator can advance the queue.
        if (member.userName !== room.hostName) {
          return sendError(socket, "Only the room host can skip to the next track.");
        }

        if (room.queue.length > 0) {
          room.queue.shift();
          await room.save();
        }

        io.to(code).emit("dj:room-update", publicRoom(room));
      } catch (error) {
        console.error("Next track error:", error.message);
        sendError(socket, "Unable to advance the queue.");
      }
    });

    socket.on("disconnect", async () => {
      await leaveRoom(socket, io, socketRooms);
      console.log("DJ client disconnected:", socket.id);
    });
  });
}

async function leaveRoom(socket, io, socketRooms) {
  const code = socketRooms.get(socket.id);
  if (!code) return;

  try {
    const room = await Room.findOne({ code });

    if (room) {
      room.members = room.members.filter(
        (member) => member.socketId !== socket.id
      );

      await room.save();

      await socket.leave(code);
      socketRooms.delete(socket.id);

      io.to(code).emit("dj:room-update", publicRoom(room));
    } else {
      socketRooms.delete(socket.id);
      await socket.leave(code);
    }
  } catch (error) {
    console.error("Leave room error:", error.message);
    socketRooms.delete(socket.id);
  }
}

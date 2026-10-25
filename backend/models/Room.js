
import mongoose from "mongoose";

const queueItemSchema = new mongoose.Schema(
  {
    trackId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Track",
      required: true
    },
    title: {
      type: String,
      required: true
    },
    artist: {
      type: String,
      required: true
    },
    durationSeconds: {
      type: Number,
      default: 0
    },
    addedBy: {
      type: String,
      required: true
    },
    votes: {
      type: [String],
      default: []
    }
  },
  { _id: true }
);

const memberSchema = new mongoose.Schema(
  {
    socketId: {
      type: String,
      required: true
    },
    userName: {
      type: String,
      required: true
    }
  },
  { _id: false }
);

const chatMessageSchema = new mongoose.Schema(
  {
    userName: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true,
      maxlength: 500
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const roomSchema = new mongoose.Schema(
  {
    roomName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true
    },
    hostName: {
      type: String,
      required: true
    },
    members: {
      type: [memberSchema],
      default: []
    },
    queue: {
      type: [queueItemSchema],
      default: []
    },
    chat: {
      type: [chatMessageSchema],
      default: []
    }
  },
  { timestamps: true }
);

const Room = mongoose.model("Room", roomSchema);

export default Room;

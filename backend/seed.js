
import dotenv from "dotenv";
import mongoose from "mongoose";

import connectDB from "./config/db.js";
import Track from "./models/Track.js";

dotenv.config();

const sampleTracks = [
  {
    title: "Night Drive",
    artist: "Nova Circuit",
    durationSeconds: 210,
    genre: "Electronic",
    acoustic: {
      bpm: 124,
      camelotKey: "8A",
      energy: 0.78,
      valence: 0.65
    },
    timeline: [
      {
        ts: 12,
        type: "trivia",
        text: "An energetic electronic track for a night drive."
      }
    ]
  },
  {
    title: "Midnight Pulse",
    artist: "Echo Motion",
    durationSeconds: 195,
    genre: "House",
    acoustic: {
      bpm: 126,
      camelotKey: "9A",
      energy: 0.85,
      valence: 0.75
    },
    timeline: [
      {
        ts: 20,
        type: "trivia",
        text: "A house track designed for a steady dance rhythm."
      }
    ]
  },
  {
    title: "Golden Horizon",
    artist: "Solar Avenue",
    durationSeconds: 225,
    genre: "Electronic",
    acoustic: {
      bpm: 122,
      camelotKey: "8B",
      energy: 0.65,
      valence: 0.88
    },
    timeline: [
      {
        ts: 15,
        type: "trivia",
        text: "A melodic electronic track with a positive mood."
      }
    ]
  }
];

const seedDatabase = async () => {
  try {
    await connectDB();

    await Track.deleteMany({});
    await Track.insertMany(sampleTracks);

    console.log("Sample tracks inserted successfully");
  } catch (error) {
    console.error("Seeding failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seedDatabase();

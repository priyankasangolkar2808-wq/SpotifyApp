

import express from "express";
import mongoose from "mongoose";
import Track from "../models/Track.js";

const router = express.Router();

// Escape special characters before using a search term in a regex.
const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// GET /api/tracks
// Examples:
// /api/tracks?q=night
// /api/tracks?genre=Electronic
// /api/tracks?sort=title
// /api/tracks?q=nova&genre=Electronic&sort=artist
router.get("/", async (req, res) => {
  try {
    const { q = "", genre = "", sort = "newest" } = req.query;

    const filter = {};

    // Search title, artist, or genre.
    if (q.trim()) {
      const searchPattern = new RegExp(escapeRegex(q.trim()), "i");

      filter.$or = [
        { title: searchPattern },
        { artist: searchPattern },
        { genre: searchPattern }
      ];
    }

    // Filter by exact genre.
    if (genre.trim() && genre !== "All") {
      filter.genre = genre.trim();
    }

    // Choose the sort order.
    const sortOptions = {
      newest: { createdAt: -1 },
      title: { title: 1 },
      artist: { artist: 1 },
      duration: { durationSeconds: 1 }
    };

    const sortBy = sortOptions[sort] || sortOptions.newest;

    const tracks = await Track.find(filter).sort(sortBy).lean();

    res.status(200).json(tracks);
  } catch (error) {
    console.error("Get tracks error:", error.message);

    res.status(500).json({
      message: "Unable to retrieve tracks"
    });
  }
});

// GET /api/tracks/genres
// Return all genres stored in the database.
router.get("/genres", async (req, res) => {
  try {
    const genres = await Track.distinct("genre");

    res.status(200).json(
      genres.filter(Boolean).sort((a, b) => a.localeCompare(b))
    );
  } catch (error) {
    console.error("Get genres error:", error.message);

    res.status(500).json({
      message: "Unable to retrieve genres"
    });
  }
});

// GET /api/tracks/:id
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid track ID"
      });
    }

    const track = await Track.findById(req.params.id).lean();

    if (!track) {
      return res.status(404).json({
        message: "Track not found"
      });
    }

    res.status(200).json(track);
  } catch (error) {
    console.error("Get track error:", error.message);

    res.status(500).json({
      message: "Unable to retrieve track"
    });
  }
});

// POST /api/tracks
// Create a track in MongoDB.
router.post("/", async (req, res) => {
  try {
    const {
      title,
      artist,
      durationSeconds,
      audioAssetUrl,
      genre,
      acoustic
    } = req.body;

    if (
      !title?.trim() ||
      !artist?.trim() ||
      !genre?.trim()
    ) {
      return res.status(400).json({
        message: "Title, artist, and genre are required"
      });
    }

    const duration = Number(durationSeconds);

    if (
      !Number.isFinite(duration) ||
      duration < 1 ||
      !Number.isInteger(duration)
    ) {
      return res.status(400).json({
        message: "Duration must be a positive number of seconds"
      });
    }

    const newTrack = await Track.create({
      title: title.trim(),
      artist: artist.trim(),
      durationSeconds: duration,
      audioAssetUrl: audioAssetUrl?.trim() || "",
      genre: genre.trim(),
      acoustic: acoustic || {}
    });

    res.status(201).json({
      message: "Track added successfully",
      track: newTrack
    });
  } catch (error) {
    console.error("Create track error:", error.message);

    res.status(400).json({
      message: "Unable to add track. Check the track details.",
      error: error.message
    });
  }
});

export default router;

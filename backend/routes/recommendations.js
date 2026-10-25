
import express from "express";
import mongoose from "mongoose";
import Track from "../models/Track.js";
import { rankRecommendations } from "../services/recommendationEngine.js";

const router = express.Router();

// GET /api/recommendations?trackId=TRACK_ID&limit=10
router.get("/", async (req, res) => {
  try {
    const { trackId } = req.query;

    const requestedLimit = Number.parseInt(req.query.limit, 10);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 50)
      : 10;

    if (!trackId) {
      return res.status(400).json({
        message: "Please provide a trackId.",
      });
    }

    if (!mongoose.isValidObjectId(trackId)) {
      return res.status(400).json({
        message: "The provided trackId is invalid.",
      });
    }

    const sourceTrack = await Track.findById(trackId).lean();

    if (!sourceTrack) {
      return res.status(404).json({
        message: "The selected track was not found.",
      });
    }

    const allTracks = await Track.find({
      _id: { $ne: sourceTrack._id },
    }).lean();

    // Convert plain MongoDB objects into objects that the engine can rank.
    const sourceForEngine = {
      ...sourceTrack,
      toObject() {
        return { ...sourceTrack };
      },
    };

    const candidatesForEngine = allTracks.map((track) => ({
      ...track,
      toObject() {
        return { ...track };
      },
    }));

    const recommendations = rankRecommendations(
      sourceForEngine,
      candidatesForEngine,
      limit
    );

    return res.status(200).json({
      sourceTrack,
      count: recommendations.length,
      recommendations,
    });
  } catch (error) {
    console.error("Recommendation error:", error);

    return res.status(500).json({
      message: "Unable to generate recommendations.",
    });
  }
});

export default router;

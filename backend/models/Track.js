

import mongoose from "mongoose";

const timelineSchema = new mongoose.Schema(
  {
    ts: {
      type: Number,
      default: 0
    },
    type: {
      type: String,
      default: "trivia"
    },
    text: {
      type: String,
      default: ""
    }
  },
  { _id: false }
);

const trackSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    artist: {
      type: String,
      required: true,
      trim: true
    },
    durationSeconds: {
      type: Number,
      required: true,
      min: 1
    },
    audioAssetUrl: {
      type: String,
      default: ""
    },
    genre: {
      type: String,
      required: true,
      trim: true
    },
    acoustic: {
      bpm: {
        type: Number,
        min: 1,
        default: null
      },
      camelotKey: {
        type: String,
        default: "",
        validate: {
          validator: (value) =>
            !value || /^(?:[1-9]|1[0-2])[AB]$/.test(value),
          message: "Camelot key must be like 8A or 11B"
        }
      },
      energy: {
        type: Number,
        min: 0,
        max: 1,
        default: null
      },
      valence: {
        type: Number,
        min: 0,
        max: 1,
        default: null
      }
    },
    timeline: {
      type: [timelineSchema],
      default: []
    }
  },
  { timestamps: true }
);

const Track = mongoose.model("Track", trackSchema);

export default Track;

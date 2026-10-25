
import { useEffect, useState } from "react";
import {
  getTracks,
  getRecommendations,
} from "../services/api";

function formatDuration(seconds) {
  const value = Number(seconds);

  if (!Number.isFinite(value) || value < 0) return "--:--";

  const minutes = Math.floor(value / 60);
  const remainingSeconds = Math.floor(value % 60);

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function getScoreLabel(score) {
  if (score >= 85) return "Excellent match";
  if (score >= 70) return "Good match";
  if (score >= 50) return "Possible match";
  return "Low compatibility";
}

export default function AIRecommendations() {
  const [tracks, setTracks] = useState([]);
  const [selectedTrackId, setSelectedTrackId] = useState("");
  const [recommendations, setRecommendations] = useState([]);
  const [sourceTrack, setSourceTrack] = useState(null);

  const [loadingTracks, setLoadingTracks] = useState(true);
  const [loadingRecommendations, setLoadingRecommendations] =
    useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadTracks() {
      try {
        setLoadingTracks(true);
        setError("");

        const data = await getTracks();

        // Support either an array or an API response with a tracks array.
        const trackList = Array.isArray(data)
          ? data
          : Array.isArray(data?.tracks)
            ? data.tracks
            : [];

        if (!cancelled) {
          setTracks(trackList);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              "Unable to load tracks. Check your backend and database."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingTracks(false);
        }
      }
    }

    loadTracks();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleGenerateRecommendations() {
    if (!selectedTrackId) {
      setError("Please select a track first.");
      return;
    }

    try {
      setLoadingRecommendations(true);
      setError("");
      setRecommendations([]);
      setSourceTrack(null);

      const data = await getRecommendations(selectedTrackId, 10);

      setSourceTrack(data.sourceTrack || null);
      setRecommendations(
        Array.isArray(data.recommendations) ? data.recommendations : []
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to generate recommendations. Please check the backend."
      );
    } finally {
      setLoadingRecommendations(false);
    }
  }

  return (
    <section className="recommendations-page">
      <div className="recommendations-heading">
        <div>
          <p className="recommendations-eyebrow">SMART DJ MIXING</p>
          <h1>AI Recommendations</h1>
          <p className="recommendations-description">
            Discover tracks that match your tempo, musical key, energy, and mood.
          </p>
        </div>
      </div>

      <div className="recommendation-control">
        <label htmlFor="source-track">Choose your starting track</label>

        <select
          id="source-track"
          value={selectedTrackId}
          onChange={(event) => {
            setSelectedTrackId(event.target.value);
            setRecommendations([]);
            setSourceTrack(null);
            setError("");
          }}
          disabled={loadingTracks || tracks.length === 0}
        >
          <option value="">
            {loadingTracks ? "Loading tracks..." : "Select a track"}
          </option>

          {tracks.map((track) => (
            <option key={track._id} value={track._id}>
              {track.title} — {track.artist}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="recommendation-button"
          onClick={handleGenerateRecommendations}
          disabled={
            loadingTracks ||
            loadingRecommendations ||
            !selectedTrackId
          }
        >
          {loadingRecommendations
            ? "Analyzing tracks..."
            : "Find Recommendations"}
        </button>

        {!loadingTracks && tracks.length === 0 && !error && (
          <p className="recommendation-empty">
            No tracks found. Add tracks to your MongoDB database first.
          </p>
        )}
      </div>

      {error && (
        <div className="recommendation-error" role="alert">
          {error}
        </div>
      )}

      {sourceTrack && (
        <div className="selected-track-card">
          <div>
            <p className="recommendations-eyebrow">YOUR SELECTED TRACK</p>
            <h2>{sourceTrack.title}</h2>
            <p>{sourceTrack.artist}</p>
          </div>

          <div className="selected-track-metrics">
            <span>{sourceTrack.acoustic?.bpm ?? "—"} BPM</span>
            <span>{sourceTrack.acoustic?.camelotKey ?? "—"}</span>
            <span>
              Energy: {sourceTrack.acoustic?.energy ?? "—"}
            </span>
            <span>
              Valence: {sourceTrack.acoustic?.valence ?? "—"}
            </span>
          </div>
        </div>
      )}

      {recommendations.length > 0 && (
        <>
          <div className="recommendation-results-heading">
            <div>
              <h2>Recommended for your mix</h2>
              <p>
                Ranked by compatibility with your selected track.
              </p>
            </div>
            <span>{recommendations.length} tracks</span>
          </div>

          <div className="recommendation-list">
            {recommendations.map((track) => (
              <article
                className="recommendation-card"
                key={track._id}
              >
                <div className="recommendation-track-info">
                  <div className="recommendation-track-icon">♫</div>

                  <div>
                    <h3>{track.title}</h3>
                    <p>{track.artist}</p>
                    <span className="recommendation-duration">
                      {formatDuration(track.durationSeconds)}
                    </span>
                  </div>
                </div>

                <div className="recommendation-metrics">
                  <span>{track.acoustic?.bpm ?? "—"} BPM</span>
                  <span>{track.acoustic?.camelotKey ?? "—"}</span>
                  <span>Energy {track.acoustic?.energy ?? "—"}</span>
                  <span>Valence {track.acoustic?.valence ?? "—"}</span>
                </div>

                <div className="recommendation-score">
                  <strong>{track.recommendationScore}%</strong>
                  <span>
                    {getScoreLabel(track.recommendationScore)}
                  </span>
                </div>

                <div className="recommendation-reasons">
                  {(track.recommendationReasons || []).map(
                    (reason, index) => (
                      <span key={`${track._id}-${index}`}>
                        {reason}
                      </span>
                    )
                  )}
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {!loadingRecommendations &&
        sourceTrack &&
        recommendations.length === 0 &&
        !error && (
          <div className="recommendation-empty">
            No compatible tracks were found. Add more tracks with valid
            BPM, Camelot key, energy, or valence values.
          </div>
        )}

      {!sourceTrack && !loadingTracks && tracks.length > 0 && !error && (
        <div className="recommendation-empty">
          Select a starting track to discover compatible music.
        </div>
      )}
    </section>
  );
}

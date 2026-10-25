
import AIRecommendations from "./components/AIRecommendations";

import { useEffect, useMemo, useState } from "react";
import DjLounge from "./components/DjLounge";
import { getTracks } from "./services/api";
import "./App.css";

function formatDuration(seconds) {
  const value = Number(seconds) || 0;
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}

function App() {
  const [page, setPage] = useState("Dashboard");
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState("All Genres");

  useEffect(() => {
    async function loadTracks() {
      try {
        setLoading(true);
        setError("");

        const data = await getTracks();
        setTracks(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load tracks:", err);
        setError("Unable to load music. Please check your backend.");
      } finally {
        setLoading(false);
      }
    }

    loadTracks();
  }, []);

  const genres = useMemo(() => {
    return [
      "All Genres",
      ...new Set(
        tracks
          .map((track) => track.genre)
          .filter(Boolean)
      )
    ];
  }, [tracks]);

  const filteredTracks = useMemo(() => {
    const query = search.trim().toLowerCase();

    return tracks.filter((track) => {
      const matchesSearch =
        !query ||
        track.title?.toLowerCase().includes(query) ||
        track.artist?.toLowerCase().includes(query) ||
        track.genre?.toLowerCase().includes(query);

      const matchesGenre =
        genre === "All Genres" || track.genre === genre;

      return matchesSearch && matchesGenre;
    });
  }, [tracks, search, genre]);

  const totalDuration = tracks.reduce(
    (total, track) => total + (Number(track.durationSeconds) || 0),
    0
  );

  const navigation = [
    { name: "Dashboard", icon: "⌂" },
    { name: "Music Library", icon: "♫" },
    { name: "DJ Lounge", icon: "◉" },
    { name: "AI Recommendations", icon: "✧" },
    { name: "Soundclash", icon: "⚡" },
    { name: "Analytics", icon: "▥" }
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">♫</div>
          <div>
            <h1>SONIQ</h1>
            <span>AI DJ STUDIO</span>
          </div>
        </div>

        <p className="nav-label">WORKSPACE</p>

        <nav className="sidebar-nav">
          {navigation.map((item) => (
            <button
              key={item.name}
              className={`nav-item ${
                page === item.name ? "active" : ""
              }`}
              onClick={() => setPage(item.name)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.name}</span>

              {item.name === "DJ Lounge" && (
                <span className="nav-live-dot" />
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="profile-avatar">P</div>
          <div>
            <strong>DJ Listener</strong>
            <span>Studio member</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="topbar-label">YOUR MUSIC WORKSPACE</p>
            <h2>{page}</h2>
          </div>

          <div className="topbar-status">
            <span className="status-dot" />
            Music Studio
          </div>
        </header>

        {page === "Dashboard" && (
          <section className="dashboard-page">
            <div className="hero-banner">
              <div className="hero-content">
                <p className="eyebrow">YOUR SOUND. YOUR SPACE.</p>
                <h2>
                  Feel the music.
                  <br />
                  <span>Shape the vibe.</span>
                </h2>
                <p>
                  Explore your music library and create a listening
                  experience with your friends.
                </p>

                <button
                  className="primary-button"
                  onClick={() => setPage("DJ Lounge")}
                >
                  Enter DJ Lounge →
                </button>
              </div>

              <div className="hero-art" aria-hidden="true">
                <div className="hero-disc">
                  <div className="disc-center">♫</div>
                </div>
                <div className="sound-wave">
                  {Array.from({ length: 19 }, (_, index) => (
                    <span
                      key={index}
                      style={{
                        height: `${18 + ((index * 17) % 54)}px`
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="stats-grid">
              <article className="stat-card">
                <span className="stat-icon">♫</span>
                <p>Total Tracks</p>
                <strong>{tracks.length}</strong>
                <span className="stat-caption">In your library</span>
              </article>

              <article className="stat-card">
                <span className="stat-icon">◷</span>
                <p>Total Listening Time</p>
                <strong>
                  {Math.floor(totalDuration / 3600)}h{" "}
                  {Math.floor((totalDuration % 3600) / 60)}m
                </strong>
                <span className="stat-caption">Based on track durations</span>
              </article>

              <article className="stat-card">
                <span className="stat-icon">▤</span>
                <p>Genres</p>
                <strong>{genres.length - 1}</strong>
                <span className="stat-caption">Music categories</span>
              </article>
            </div>

            <section className="content-section">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">RECENTLY ADDED</p>
                  <h3>Your Music Library</h3>
                </div>

                <button
                  className="secondary-button"
                  onClick={() => setPage("Music Library")}
                >
                  View all →
                </button>
              </div>

              {loading ? (
                <p className="empty-state">Loading tracks...</p>
              ) : error ? (
                <p className="error-message">{error}</p>
              ) : tracks.length === 0 ? (
                <p className="empty-state">
                  No tracks found. Add tracks to your database first.
                </p>
              ) : (
                <div className="track-grid">
                  {tracks.slice(0, 4).map((track) => (
                    <TrackCard
                      key={track._id}
                      track={track}
                    />
                  ))}
                </div>
              )}
            </section>
          </section>
        )}

        {page === "Music Library" && (
          <section className="music-library-page">
            <div className="library-heading">
              <div>
                <p className="eyebrow">EXPLORE YOUR COLLECTION</p>
                <h3>Music Library</h3>
                <p className="muted-text">
                  Search songs, artists, and genres.
                </p>
              </div>

              <span className="library-count">
                {filteredTracks.length} tracks
              </span>
            </div>

            <div className="library-filters">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search title, artist, or genre..."
                aria-label="Search music library"
              />

              <select
                value={genre}
                onChange={(event) => setGenre(event.target.value)}
                aria-label="Filter by genre"
              >
                {genres.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            {loading ? (
              <p className="empty-state">Loading tracks...</p>
            ) : error ? (
              <p className="error-message">{error}</p>
            ) : filteredTracks.length === 0 ? (
              <p className="empty-state">
                No matching tracks found. Try a different search or genre.
              </p>
            ) : (
              <div className="track-grid">
                {filteredTracks.map((track) => (
                  <TrackCard key={track._id} track={track} />
                ))}
              </div>
            )}
          </section>
        )}

        {page === "DJ Lounge" && <DjLounge />}

        {page !== "Dashboard" &&
          page !== "Music Library" &&
          page !== "DJ Lounge" && (
            <section className="coming-soon">
              <div className="coming-soon-icon">✧</div>
              <p className="eyebrow">COMING NEXT</p>
              <h3>{page}</h3>
              <p>
                This feature is planned for the next stage of Spotify
                AI DJ Studio development.
              </p>

              <button
                className="primary-button"
                onClick={() => setPage("DJ Lounge")}
              >
                Explore DJ Lounge →
              </button>
            </section>
          )}

        <footer className="app-footer">
          <span>SONIQ · AI DJ STUDIO</span>
          <span>Made for music lovers ♫</span>
        </footer>
      </main>
    </div>
  );
}

function TrackCard({ track }) {
  const acoustic = track.acoustic || {};

  return (
    <article className="track-card">
      <div className="track-artwork">
        <span>♫</span>
      </div>

      <div className="track-card-info">
        <h4>{track.title}</h4>
        <p>{track.artist}</p>
        <div className="track-meta">
          <span>{track.genre || "Unknown genre"}</span>
          <span>{formatDuration(track.durationSeconds)}</span>
        </div>
      </div>

      <div className="track-acoustic">
        {acoustic.bpm != null && <span>{acoustic.bpm} BPM</span>}
        {acoustic.camelotKey && <span>{acoustic.camelotKey}</span>}
      </div>
    </article>
  );
}

export default App;

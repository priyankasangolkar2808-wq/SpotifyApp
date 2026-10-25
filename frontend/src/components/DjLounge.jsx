
import { useCallback, useEffect, useState } from "react";
import { getTracks } from "../services/api";
import { socket } from "../services/socket";

function formatDuration(seconds) {
  const value = Number(seconds) || 0;
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}

export default function DjLounge() {
  const [displayName, setDisplayName] = useState("");
  const [roomName, setRoomName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [room, setRoom] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [selectedTrackId, setSelectedTrackId] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [sendingChat, setSendingChat] = useState(false);

  const refreshRooms = useCallback(() => {
    socket.emit("dj:room-list");
  }, []);

  useEffect(() => {
    async function loadTracks() {
      try {
        const result = await getTracks({ sort: "title" });
        setTracks(result);

        if (result.length) {
          setSelectedTrackId(result[0]._id);
        }
      } catch (err) {
        console.error("Loading tracks failed:", err.message);
        setError("Unable to load tracks. Check your backend connection.");
      }
    }

    loadTracks();
  }, []);

  useEffect(() => {
    function handleRoomList(items) {
      setRooms(items);
    }

    function handleJoined(data) {
      setRoom(data.room);
      setDisplayName(data.userName);
      setRoomCode(data.room.code);
      setConnecting(false);
      setCreating(false);
      setError("");
      setNotice(`You joined ${data.room.roomName}.`);
    }

    function handleRoomUpdate(updatedRoom) {
      setRoom((current) => {
        if (!current || current.code === updatedRoom.code) {
          return updatedRoom;
        }
        return current;
      });
    }

    function handleError(data) {
      setError(data?.message || "Something went wrong.");
      setConnecting(false);
      setCreating(false);
      setSendingChat(false);
    }

    function handleConnectError() {
      setError("Cannot connect to Socket.IO. Check that the backend is running.");
      setConnecting(false);
      setCreating(false);
    }

    function handleDisconnect() {
      setRoom(null);
      setConnecting(false);
      setNotice("Connection closed. Reconnect to continue.");
    }

    socket.on("dj:room-list", handleRoomList);
    socket.on("dj:joined", handleJoined);
    socket.on("dj:room-update", handleRoomUpdate);
    socket.on("dj:error", handleError);
    socket.on("connect_error", handleConnectError);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect", refreshRooms);

    if (!socket.connected) {
      socket.connect();
    } else {
      refreshRooms();
    }

    return () => {
      socket.off("dj:room-list", handleRoomList);
      socket.off("dj:joined", handleJoined);
      socket.off("dj:room-update", handleRoomUpdate);
      socket.off("dj:error", handleError);
      socket.off("connect_error", handleConnectError);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect", refreshRooms);
    };
  }, [refreshRooms]);

  async function createRoom(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    const name = displayName.trim();
    const title = roomName.trim();

    if (!name || !title) {
      setError("Enter your display name and a room name.");
      return;
    }

    if (name.length > 30 || title.length > 60) {
      setError("Display name must be under 30 characters and room name under 60.");
      return;
    }

    setCreating(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/rooms`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomName: title,
            hostName: name
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not create room.");
      }

      setRoomCode(data.room.code);
      setDisplayName(name);

      socket.emit("dj:join", {
        code: data.room.code,
        userName: name
      });
    } catch (err) {
      setError(err.message || "Could not create room.");
      setCreating(false);
    }
  }

  function joinRoom(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!displayName.trim() || !roomCode.trim()) {
      setError("Enter your display name and room code.");
      return;
    }

    if (displayName.trim().length > 30) {
      setError("Display name must be under 30 characters.");
      return;
    }

    setConnecting(true);

    socket.emit("dj:join", {
      code: roomCode.trim().toUpperCase(),
      userName: displayName.trim()
    });
  }

  function leaveRoom() {
    socket.emit("dj:leave");
    setRoom(null);
    setError("");
    setNotice("You left the room.");
  }

  function addSong() {
    if (!selectedTrackId) {
      setError("Select a track first.");
      return;
    }

    setError("");
    socket.emit("dj:queue-add", { trackId: selectedTrackId });
    setNotice("Track request sent to the room.");
  }

  function voteForSong(queueItemId) {
    setError("");
    socket.emit("dj:vote", { queueItemId });
  }

  function skipSong() {
    setError("");
    socket.emit("dj:queue-next");
  }

  function sendChat(event) {
    event.preventDefault();

    const message = chatMessage.trim();
    if (!message || sendingChat) return;

    setSendingChat(true);
    setError("");
    socket.emit("dj:chat-send", { message });
    setChatMessage("");

    // Stop the form from getting stuck if a response is delayed.
    window.setTimeout(() => setSendingChat(false), 500);
  }

  const isHost = room && room.hostName === displayName;

  return (
    <section className="dj-lounge">
      <div className="dj-page-heading">
        <div>
          <p className="eyebrow">LISTEN TOGETHER</p>
          <h2>DJ Lounge</h2>
          <p className="dj-muted">
            Create a room, build a shared queue, vote, and chat live.
          </p>
        </div>

        <span className={`dj-connection ${socket.connected ? "online" : ""}`}>
          <span />
          {socket.connected ? "Connected" : "Connecting"}
        </span>
      </div>

      {error && <div className="alert error-alert">{error}</div>}
      {notice && <div className="alert success-alert">{notice}</div>}

      {!room ? (
        <>
          <div className="dj-entry-grid">
            <form className="dj-panel dj-form" onSubmit={createRoom}>
              <span className="dj-panel-icon">＋</span>
              <h3>Create a room</h3>
              <p className="dj-muted">
                Start a new listening session and invite your friends.
              </p>

              <label>
                Your display name
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  maxLength={30}
                  placeholder="e.g. Priyanka"
                  required
                />
              </label>

              <label>
                Room name
                <input
                  value={roomName}
                  onChange={(event) => setRoomName(event.target.value)}
                  maxLength={60}
                  placeholder="Friday Night Mix"
                  required
                />
              </label>

              <button
                className="primary-button"
                disabled={creating || !socket.connected}
                type="submit"
              >
                {creating ? "Creating room..." : "Create DJ room →"}
              </button>
            </form>

            <form className="dj-panel dj-form" onSubmit={joinRoom}>
              <span className="dj-panel-icon">◉</span>
              <h3>Join a room</h3>
              <p className="dj-muted">
                Enter the room code shared by the host.
              </p>

              <label>
                Your display name
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  maxLength={30}
                  placeholder="Enter your name"
                  required
                />
              </label>

              <label>
                Room code
                <input
                  value={roomCode}
                  onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
                  maxLength={6}
                  placeholder="ABC123"
                  required
                />
              </label>

              <button
                className="primary-button"
                disabled={connecting || !socket.connected}
                type="submit"
              >
                {connecting ? "Joining..." : "Join DJ room →"}
              </button>
            </form>
          </div>

          <div className="dj-room-list-section">
            <div className="dj-section-heading">
              <div>
                <p className="eyebrow">COMMUNITY</p>
                <h3>Available rooms</h3>
              </div>
              <button className="secondary-button" onClick={refreshRooms}>
                Refresh
              </button>
            </div>

            {rooms.length ? (
              <div className="dj-available-list">
                {rooms.map((item) => (
                  <article className="dj-available-room" key={item.id}>
                    <div className="dj-room-avatar">♫</div>
                    <div className="dj-room-info">
                      <strong>{item.roomName}</strong>
                      <span>Host: {item.hostName}</span>
                      <span>
                        {item.memberCount} members · {item.queueCount} queued
                      </span>
                    </div>
                    <button
                      className="secondary-button"
                      onClick={() => setRoomCode(item.code)}
                    >
                      Use code
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="dj-empty">
                No rooms listed yet. Create the first room!
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="dj-live-layout">
          <div className="dj-live-main">
            <section className="dj-panel dj-room-banner">
              <div>
                <span className="pill">● LIVE ROOM</span>
                <h3>{room.roomName}</h3>
                <p className="dj-muted">
                  Host: {room.hostName} · {room.members.length} connected
                </p>
              </div>

              <div className="dj-room-code">
                <span>ROOM CODE</span>
                <strong>{room.code}</strong>
                <button
                  className="text-button"
                  onClick={() => {
                    navigator.clipboard?.writeText(room.code);
                    setNotice("Room code copied if clipboard access is available.");
                  }}
                >
                  Copy code
                </button>
              </div>
            </section>

            <section className="dj-panel">
              <div className="dj-section-heading">
                <div>
                  <p className="eyebrow">UP NEXT</p>
                  <h3>Shared queue ({room.queue.length})</h3>
                </div>
              </div>

              <div className="dj-add-song">
                <select
                  value={selectedTrackId}
                  onChange={(event) => setSelectedTrackId(event.target.value)}
                  aria-label="Choose a track"
                >
                  {tracks.length === 0 && <option value="">No tracks available</option>}
                  {tracks.map((track) => (
                    <option key={track._id} value={track._id}>
                      {track.title} — {track.artist}
                    </option>
                  ))}
                </select>

                <button
                  className="primary-button"
                  onClick={addSong}
                  disabled={!tracks.length}
                >
                  + Add to queue
                </button>
              </div>

              {room.queue.length ? (
                <div className="dj-queue-list">
                  {room.queue.map((item, index) => {
                    const myVote = item.votes.includes(displayName);

                    return (
                      <article className="dj-queue-item" key={item.id}>
                        <span className="dj-queue-number">
                          {String(index + 1).padStart(2, "0")}
                        </span>

                        <div className="dj-queue-details">
                          <strong>{item.title}</strong>
                          <span>
                            {item.artist} · {formatDuration(item.durationSeconds)}
                          </span>
                          <small>Added by {item.addedBy}</small>
                        </div>

                        <button
                          className={`dj-vote-button ${myVote ? "voted" : ""}`}
                          onClick={() => voteForSong(item.id)}
                          aria-label={`Vote for ${item.title}`}
                        >
                          ▲ {item.voteCount}
                        </button>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="dj-empty">
                  Your queue is empty. Add a track to get started.
                </div>
              )}

              {isHost && room.queue.length > 0 && (
                <button className="secondary-button dj-next-button" onClick={skipSong}>
                  Remove first song / Next track →
                </button>
              )}
            </section>

            <section className="dj-panel">
              <div className="dj-section-heading">
                <div>
                  <p className="eyebrow">ROOM MEMBERS</p>
                  <h3>Listening together</h3>
                </div>
                <span className="dj-member-count">
                  {room.members.length} online
                </span>
              </div>

              <div className="dj-member-list">
                {room.members.map((member, index) => (
                  <div className="dj-member" key={`${member.userName}-${index}`}>
                    <span className="dj-member-avatar">
                      {member.userName.charAt(0).toUpperCase()}
                    </span>
                    <span>{member.userName}</span>
                    {member.userName === room.hostName && (
                      <small>HOST</small>
                    )}
                    {member.userName === displayName && (
                      <small>YOU</small>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="dj-panel dj-chat-panel">
            <div className="dj-chat-heading">
              <div>
                <p className="eyebrow">REAL-TIME CHAT</p>
                <h3>Room chat</h3>
              </div>
              <span>●</span>
            </div>

            <div className="dj-chat-messages" aria-live="polite">
              {room.chat.length ? (
                room.chat.map((item) => (
                  <article className="dj-chat-message" key={item.id}>
                    <strong>{item.userName}</strong>
                    <p>{item.message}</p>
                    <time>
                      {new Date(item.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </time>
                  </article>
                ))
              ) : (
                <div className="dj-empty">
                  No messages yet. Say hello!
                </div>
              )}
            </div>

            <form className="dj-chat-form" onSubmit={sendChat}>
              <input
                value={chatMessage}
                onChange={(event) => setChatMessage(event.target.value)}
                maxLength={500}
                placeholder="Write a message..."
                aria-label="Chat message"
              />
              <button
                type="submit"
                className="primary-button"
                disabled={!chatMessage.trim() || sendingChat}
              >
                Send
              </button>
            </form>

            <button
              className="dj-leave-button"
              onClick={leaveRoom}
            >
              ← Leave room
            </button>
          </aside>
        </div>
      )}
    </section>
  );
}

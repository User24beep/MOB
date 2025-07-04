import React, { useState, useEffect, useRef } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import { Card, Container, Alert, OverlayTrigger, Tooltip } from "react-bootstrap";
import RoomMembers from "./RoomMembers";
import Timer from "./Timer";

function StudentPanel({ room, user }) {
  const [members, setMembers] = useState([]);
  const [socketStatus, setSocketStatus] = useState("Disconnected");
  const token = localStorage.getItem("accessToken");
  const [timerString, setTimerString] = useState("");

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  const [showSocketAlert, setShowSocketAlert] = useState(false);

  const RoundStatus = {
    PAUSED: "paused",
    STARTED: "started",
    GUESS_PHASE: "guess_phase",
    RESULT: "result",
  };
  const [roundStatus, setRoundStatus] = useState(RoundStatus.PAUSED);

  const [hasTurn, setHasTurn] = useState(false);

  const [guessResult, setGuessResult] = useState("");

  const [guessHistory, setGuessHistory] = useState([]);

  const ws = useRef(null);

  useEffect(() => {
    // WebSocket-URL je nach Gast oder Token
    const studentId = localStorage.getItem("studentId");
    let wsUrl;
    if (studentId) {
      wsUrl = `ws://localhost:8000/ws/rooms/${room.id}/?student_id=${studentId}`;
    } else {
      wsUrl = `ws://localhost:8000/ws/rooms/${room.id}/?token=${token}`;
    }
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      setSocketStatus("Connected");
      setShowSocketAlert(false);
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log(data);
      if (data.type === "member_list") {
        setMembers(data.members);
      }
      if (data.type === "timer") {
        setTimerString(data.seconds);
        setRoundStatus(RoundStatus.STARTED);
      }
      if (data.type === "private_message") {
        setMessages((prevMessages) => [
          ...prevMessages,
          { username: "?", message: data.message },
        ]);
        setHasTurn(true);
      }
      if (data.type === "round_started") {
        room.current_round = data.current_round;
        setMessages([]);
        setNewMessage("");
        setRoundStatus(RoundStatus.STARTED);
      }
      if (data.type === "guess_phase") {
        setGuessResult("");
        setRoundStatus(RoundStatus.GUESS_PHASE);
      }
      if (data.type === "make_guess") {
        setGuessResult(
          data.is_correct
            ? "Du hast richtig geraten."
            : "Du hast falsch geraten."
        );
        setRoundStatus(RoundStatus.RESULT);
        // Guess zur History hinzufügen
        setGuessHistory((prev) => [
          {
            id: Date.now(),
            round: room.current_round,
            guessed_ai: ws.current._lastGuess,
            is_correct: data.is_correct,
            created_at: new Date().toISOString(),
          },
          ...prev.slice(0, 19),
        ]);
      }
      if (data.type === "conversation_start") {
        setHasTurn(data.starter);
      }
    };

    ws.current.onclose = () => {
      setSocketStatus("Disconnected");
      setShowSocketAlert(true);
      ws.current = null;
    };

    ws.current.onerror = (error) => {
      console.error("WebSocket Fehler:", error);
      setShowSocketAlert(true);
    };

    return () => {
      if (ws.current) {
        ws.current.close();
      }
      setGuessHistory([]); // Clear Guess-Historie beim Raum verlassen
    };
  }, [room]);

  const handleSend = () => {
    if (
      ws.current &&
      ws.current.readyState === WebSocket.OPEN &&
      newMessage.trim() !== ""
    ) {
      const payload = {
        command: "send_private_message",
        user: user,
        room_id: room.id,
        room_round: room.current_round,
        message: newMessage,
        past_messages: messages.map((msg) =>
          msg.username === "Du"
            ? { role: "user", content: msg.message }
            : { role: "assistant", content: msg.message }
        ),
      };
      ws.current.send(JSON.stringify(payload));

      // Füge die eigene Nachricht sofort lokal zum Chatverlauf hinzu
      setMessages((prevMessages) => [
        ...prevMessages,
        { username: "Du", message: newMessage },
      ]);
      setNewMessage("");
      setHasTurn(false);
    }
  };

  const handleGuess = (gueessedAI) => {
    console.log("Guess senden:", gueessedAI ? "AI" : "Human");
    console.log("Round:", room.current_round);
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      const payload = {
        command: "make_guess",
        guessed_ai: gueessedAI,
        room_round: room.current_round,
      };
      ws.current.send(JSON.stringify(payload));
      // speichere den letzten Guess im State für make_guess
      ws.current._lastGuess = gueessedAI;
    }
    setRoundStatus(RoundStatus.PAUSED);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  // Wenn user ein Gast ist, hole den Namen aus localStorage
  const displayName = localStorage.getItem("studentName") || user;

  return (
    <Container className="mt-5 d-flex flex-column align-items-center">
      <Card
        className="shadow-lg p-4"
        style={{
          maxWidth: 800,
          width: "100%",
          borderRadius: 20,
          background: "linear-gradient(135deg, #f8fafc 60%, #e0e7ff 100%)",
        }}
      >
        <Card.Header
          className="text-center bg-primary text-white"
          style={{
            borderRadius: 15,
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: 1,
          }}
        >
          <span role="img" aria-label="student">
            🎓
          </span>{" "}
          {room.name}
        </Card.Header>
        <Card.Body style={{ position: "relative" }}>
          <div className="mb-4 d-flex justify-content-center align-items-center gap-4">
            <div className="d-flex align-items-center">
              <strong className="me-2" style={{ fontSize: 22 }}>
                Raumcode:
              </strong>
              <span
                className="badge bg-secondary"
                style={{
                  fontSize: 22,
                  letterSpacing: 1,
                  padding: "10px 18px",
                }}
              >
                {room.code}
              </span>
            </div>
            <div className="d-flex align-items-center">
              <strong className="me-2" style={{ fontSize: 22 }}>
                Runde:
              </strong>
              <span className="badge bg-secondary" style={{ fontSize: 22 }}>
                {room.current_round}
              </span>
            </div>
          </div>
          <div className="mb-3 text-center">
            <div
              style={{
                fontSize: 48,
                fontWeight: 700,
                marginBottom: 8,
              }}
            >
              <Timer timerString={timerString} />
            </div>
          </div>
          <OverlayTrigger
            placement="bottom"
            overlay={
              <Tooltip id="websocket-status-tooltip">
                WebSocket-Verbindung:{" "}
                {socketStatus === "Connected" ? "Verbunden" : "Nicht verbunden"}
              </Tooltip>
            }
          >
            <span
              style={{
                position: "absolute",
                top: 20,
                right: 30,
                cursor: "pointer",
              }}
            >
              <i
                className={`bi ${
                  socketStatus === "Connected" ? "bi-wifi" : "bi-wifi-off"
                }`}
                style={{
                  color: socketStatus === "Connected" ? "#198754" : "#dc3545",
                  fontSize: 22,
                }}
              ></i>
            </span>
          </OverlayTrigger>

          {roundStatus === RoundStatus.STARTED && (
            <div className="shadow p-4 mt-4" style={{ borderRadius: 20 }}>
              <div
                className="text-center bg-info text-white"
                style={{
                  borderRadius: 15,
                  fontSize: 22,
                  fontWeight: 500,
                  marginBottom: 16,
                  padding: 8,
                }}
              >
                Chat
              </div>
              <div className="private-chat">
                <h5
                  style={{
                    fontWeight: 500,
                    marginBottom: 16,
                  }}
                >
                  {hasTurn
                    ? "Du schreibst die nächste Nachricht"
                    : "Dein Gegenüber schreibt die nächste Nachricht"}
                </h5>
                <div
                  className="chat-window"
                  style={{
                    border: "1px solid #ccc",
                    height: "300px",
                    overflowY: "auto",
                    padding: "10px",
                    backgroundColor: "#f9f9f9",
                    borderRadius: 10,
                    marginBottom: 12,
                  }}
                >
                  {messages.map((msg, index) => (
                    <div key={index} style={{ marginBottom: "8px" }}>
                      <strong>{msg.username}: </strong>
                      <span>{msg.message}</span>
                    </div>
                  ))}
                </div>
                <div className="chat-input mt-2" style={{ display: "flex" }}>
                  {hasTurn ? (
                    <>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Nachricht eingeben..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyPress}
                        style={{ borderRadius: 8, fontSize: 18 }}
                      />
                      <button
                        className="btn btn-primary ml-2"
                        onClick={handleSend}
                        style={{
                          marginLeft: "10px",
                          fontWeight: 500,
                          fontSize: 18,
                          borderRadius: 8,
                        }}
                      >
                        Senden
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          {/* Guess-Historie anzeigen */}
          {guessHistory.length > 0 && (
            <div className="shadow p-3 mt-4" style={{ borderRadius: 20 }}>
              <div
                className="bg-secondary text-white text-center"
                style={{
                  borderRadius: 15,
                  fontSize: 20,
                  fontWeight: 500,
                  marginBottom: 12,
                  padding: 8,
                }}
              >
                Deine letzten Runden
              </div>
              <div>
                <table className="table table-bordered mb-0">
                  <thead>
                    <tr>
                      <th>Runde</th>
                      <th>Dein Tipp</th>
                      <th>Ergebnis</th>
                      <th>Zeitpunkt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guessHistory.map((g) => (
                      <tr key={g.id}>
                        <td>{g.round}</td>
                        <td>{g.guessed_ai ? "KI" : "Mensch"}</td>
                        <td
                          style={{
                            color: g.is_correct ? "#198754" : "#dc3545",
                            fontWeight: 600,
                          }}
                        >
                          {g.is_correct ? "Richtig" : "Falsch"}
                        </td>
                        <td>
                          {g.created_at
                            ? new Date(g.created_at).toLocaleString()
                            : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {roundStatus === RoundStatus.GUESS_PHASE && (
            <div className="shadow p-4 mt-4" style={{ borderRadius: 20 }}>
              <div
                className="text-center bg-warning text-dark"
                style={{
                  borderRadius: 15,
                  fontSize: 22,
                  fontWeight: 500,
                  marginBottom: 16,
                  padding: 8,
                }}
              >
                Mit was hast du gesprochen?
              </div>
              <div className="d-flex flex-column align-items-center">
                <button
                  onClick={() => handleGuess(false)}
                  className="btn btn-outline-primary mb-2"
                  style={{
                    fontWeight: 500,
                    fontSize: 18,
                    width: 200,
                    borderRadius: 8,
                  }}
                >
                  Das war ein Mensch.
                </button>
                <button
                  onClick={() => handleGuess(true)}
                  className="btn btn-outline-success"
                  style={{
                    fontWeight: 500,
                    fontSize: 18,
                    width: 200,
                    borderRadius: 8,
                  }}
                >
                  Das war eine KI.
                </button>
              </div>
            </div>
          )}

          {roundStatus === RoundStatus.RESULT && (
            <div className="shadow p-4 mt-4" style={{ borderRadius: 20 }}>
              <div
                className={
                  "text-center text-white" +
                  (guessResult.includes("falsch") ? " bg-danger" : " bg-success")
                }
                style={{
                  borderRadius: 15,
                  fontSize: 22,
                  fontWeight: 500,
                  marginBottom: 16,
                  padding: 8,
                }}
              >
                Ergebnis
              </div>
              <div className="d-flex flex-column align-items-center">
                <p style={{ fontSize: 24, fontWeight: 600 }}>{guessResult}</p>
              </div>
            </div>
          )}

          {showSocketAlert && (
            <Alert
              variant="danger"
              className="mt-3 shadow"
              dismissible
              onClose={() => setShowSocketAlert(false)}
              style={{ maxWidth: 500 }}
            >
              <Alert.Heading>Verbindungsfehler</Alert.Heading>
              <p>
                Die Verbindung zum Server ist fehlgeschlagen. Bitte erstelle einen
                neuen Raum.
              </p>
              <button
                className="btn btn-outline-danger"
                onClick={() => (window.location.href = "/")}
              >
                Raum verlassen
              </button>
            </Alert>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
}

export default StudentPanel;

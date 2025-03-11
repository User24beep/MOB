import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import StudentPanel from "./StudentPanel";
import TeacherPanel from "./TeacherPanel";
import API from "./api";
import { useParams } from "react-router-dom";
import axios from "axios";

function Room() {
  const [isStudent, setIsStudent] = useState(null);
  const [user, setUser] = useState("");
  const { roomId } = useParams();
  const [room, setRoom] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const response = await axios.get(
          `http://localhost:8000/api/rooms/${roomId}/`
        );
        setRoom(response.data);
      } catch (err) {
        setError("Raum nicht gefunden.");
      }
    };

    if (roomId) {
      fetchRoom();
    }
  }, [roomId]);

  useEffect(() => {
    API.get("/accounts/me/")
      .then((response) => {
        if (response.data.role === "student") {
          setIsStudent(true);
        } else if (response.data.role === "teacher") {
          setIsStudent(false);
        } else {
          setIsStudent(null);
        }
        setUser(response.data.id);
      })
      .catch((error) => {
        setError(error);
        setIsStudent(null);
      });
  }, []);

  if (error) {
    return <p>{error}</p>;
  }

  return (
    <div>
      {room && isStudent === true && <StudentPanel room={room} user={user} />}
      {room && isStudent === false && <TeacherPanel room={room} user={user}/>}
      {isStudent === null && <p>Loading...</p>}
    </div>
  );
}

export default Room;

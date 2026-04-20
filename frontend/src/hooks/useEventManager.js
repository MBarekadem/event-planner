
import { useState } from "react";
import axios from "axios";

export const useEventManager = () => {
  const [userEvents, setUserEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchUserEvents = async (userId, token) => {
    setLoading(true);
    try {
      const response = await axios.get(
        `http://localhost:5000/api/event/user_event/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUserEvents(response.data);
      return response.data;
    } catch (err) {
      console.error("Erreur chargement événements:", err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  return { userEvents, loading, fetchUserEvents, setUserEvents };
};
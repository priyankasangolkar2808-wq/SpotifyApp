

import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export async function getTracks() {
  const response = await api.get("/tracks");
  return response.data;
}

export async function getRecommendations(trackId, limit = 10) {
  const response = await api.get("/recommendations", {
    params: {
      trackId,
      limit,
    },
  });

  return response.data;
}

export default api;

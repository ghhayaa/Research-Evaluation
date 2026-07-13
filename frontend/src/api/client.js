import axios from "axios";

// Detect production vs local development safely
const isProd = typeof window !== "undefined" &&
  !window.location.hostname.includes("localhost") &&
  !window.location.hostname.includes("127.0.0.1");

const client = axios.create({
  baseURL: isProd ? "https://researchevalplatform.onrender.com/api" : "/api"
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("pe_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default client;

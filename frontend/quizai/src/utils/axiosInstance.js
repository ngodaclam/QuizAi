import axios from "axios";
import { BASE_URL } from "./apiPaths";

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 90000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Request interceptor to add auth token
axiosInstance.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem("token") || localStorage.getItem("authToken");
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor to handle responses globally
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      // You can handle specific status codes here
      if (error.response.status === 500) {
        // Token expired, handle accordingly
        console.error("Server error occurred. Please try again later.");
      } else if (error.code === "ECONNABORTED") {
        // Unauthorized, possibly redirect to login
        console.error("Request timed out. Please try again.");
      }
    }
    return Promise.reject(error);
  },
);

export default axiosInstance;

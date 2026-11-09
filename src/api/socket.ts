import { io, Socket } from "socket.io-client";
import { APP_CONFIG } from "../config/appConfig";

export const SOCKET_URL = APP_CONFIG.SOCKET_URL;

export const mobileSocket: Socket = io(SOCKET_URL, {
  autoConnect: true,
  transports: ["websocket", "polling"],
});

mobileSocket.on("connect", () => {
  console.log("⚡ Mobile App Connected to Socket.io:", mobileSocket.id);
});

mobileSocket.on("disconnect", () => {
  console.log("⚠️ Mobile App Disconnected from Socket.io");
});

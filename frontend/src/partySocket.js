/**
 * partySocket.js — Aether Party Mode Socket.IO client singleton
 */
import { io } from 'socket.io-client';

const PARTY_SERVER_URL =
  import.meta.env.VITE_PARTY_SERVER_URL?.trim() ||
  'http://localhost:4444';

let _socket = null;
let _currentUrl = null;

export function getSocket(targetUrl = 'http://localhost:4444') {
  if (_socket && _currentUrl !== targetUrl) {
    _socket.disconnect();
    _socket = null;
  }
  
  if (!_socket) {
    _socket = io(targetUrl, {
      autoConnect: false,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      transports: ['websocket'],
      extraHeaders: {
        "Bypass-Tunnel-Reminder": "true"
      }
    });
    _currentUrl = targetUrl;
  }
  return _socket;
}

export function connectSocket(targetUrl) {
  const s = getSocket(targetUrl);
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  if (_socket?.connected) _socket.disconnect();
}

export { PARTY_SERVER_URL };

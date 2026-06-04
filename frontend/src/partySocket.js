/**
 * partySocket.js — Aether Party Mode Socket.IO client singleton
 */
import { io } from 'socket.io-client';

const PARTY_SERVER_URL =
  import.meta.env.VITE_PARTY_SERVER_URL?.trim() ||
  'http://localhost:4444';

let _socket = null;
let _currentUrl = null;

export function getSocket(targetUrl = PARTY_SERVER_URL) {
  if (_socket && _currentUrl !== targetUrl) {
    _socket.disconnect();
    _socket = null;
  }
  
  if (!_socket) {
    const attachListeners = (s) => {
      s.on('connect', () => console.log('[PartySocket] Connected successfully to', targetUrl));
      s.on('connect_error', (err) => {
        console.error('[PartySocket] Connection error:', err && err.message ? err.message : err);
        console.error('[PartySocket] Full error:', err);
      });
      s.on('disconnect', (reason) => console.log('[PartySocket] Disconnected:', reason));
    };

    _socket = io(targetUrl, {
      autoConnect: false,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      transports: ['polling', 'websocket'],
      upgrade: true,
    });
    attachListeners(_socket);
    
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
  if (_socket) _socket.disconnect();
}

export { PARTY_SERVER_URL };

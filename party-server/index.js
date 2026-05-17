/**
 * Aether Party Server — Real-time collaborative listening relay
 * Deploy to Render (free tier) or run locally with: node index.js
 * All clients (host + members) connect here via Socket.IO
 */

'use strict';

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 30000,
  pingInterval: 10000,
});

// ─── Constants ─────────────────────────────────────────────────────────────
const MAX_PARTY_SIZE = 10;
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;  // 30 min
const IDLE_WARN_MS   = 25 * 60 * 1000;   // 25 min (warn at 5 min left)
const KEY_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// ─── In-memory room store ───────────────────────────────────────────────────
/** @type {Map<string, Room>} */
const rooms = new Map();

// ─── Helpers ────────────────────────────────────────────────────────────────
function generateKey(len = 6) {
  return Array.from({ length: len }, () => KEY_CHARS[Math.floor(Math.random() * KEY_CHARS.length)]).join('');
}

function sysMsg(text) {
  return { id: uuidv4(), type: 'system', message: text, ts: Date.now() };
}

function publicMembers(room) {
  return room.members.map(m => ({
    id: m.id,
    displayName: m.displayName,
    avatar: m.avatar || null,
    isHost: m.id === room.hostId,
  }));
}

function publicState(room) {
  return {
    partyId:       room.id,
    hostId:        room.hostId,
    isPrivate:     room.isPrivate,
    memberCount:   room.members.length,
    members:       publicMembers(room),
    currentTrack:  room.currentTrack,
    positionMs:    room.positionMs,
    isPlaying:     room.isPlaying,
    syncTimestamp: room.syncTimestamp,
    chat:          room.chat.slice(-80),
    requests:      room.requests,
  };
}

function touchActivity(room) {
  room.lastActivity = Date.now();
}

function scheduleIdleCheck(room) {
  clearTimeout(room._warnTimer);
  clearTimeout(room._idleTimer);

  room._warnTimer = setTimeout(() => {
    const r = rooms.get(room.id);
    if (!r) return;
    const idle = Date.now() - r.lastActivity;
    if (idle >= IDLE_WARN_MS && !r.isPlaying) {
      io.to(r.id).emit('party:idle-warning', { minutesLeft: 5 });
    }
  }, IDLE_WARN_MS);

  room._idleTimer = setTimeout(() => {
    const r = rooms.get(room.id);
    if (!r) return;
    const idle = Date.now() - r.lastActivity;
    if (idle >= IDLE_TIMEOUT_MS && !r.isPlaying) {
      io.to(r.id).emit('party:closed', { reason: 'idle' });
      closeRoom(r.id);
    }
  }, IDLE_TIMEOUT_MS);
}

function closeRoom(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  clearTimeout(room._warnTimer);
  clearTimeout(room._idleTimer);
  rooms.delete(roomId);
  console.log(`[Party] Room closed: ${roomId}`);
}

function findSocket(userId, partyId) {
  for (const s of io.sockets.sockets.values()) {
    if (s.data.userId === userId && s.data.partyId === partyId) return s;
  }
  return null;
}

// ─── Socket Logic ────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[Party] + Connected: ${socket.id}`);

  // ── Create Party ──────────────────────────────────────────────────────────
  socket.on('party:create', ({ userId, displayName, isPrivate, avatar } = {}) => {
    if (!userId || !displayName) return socket.emit('party:error', { code: 'BAD_REQUEST', message: 'Missing userId or displayName.' });

    const partyId = uuidv4().replace(/-/g, '').slice(0, 8).toUpperCase();
    const key = isPrivate ? generateKey() : null;

    const room = {
      id: partyId,
      hostId: userId,
      isPrivate: !!isPrivate,
      key,
      members: [{ id: userId, socketId: socket.id, displayName, avatar: avatar || null }],
      currentTrack: null,
      positionMs: 0,
      isPlaying: false,
      syncTimestamp: Date.now(),
      chat: [sysMsg(`${displayName} created the party 🎉`)],
      requests: [],
      lastActivity: Date.now(),
      _warnTimer: null,
      _idleTimer: null,
    };

    rooms.set(partyId, room);
    socket.join(partyId);
    socket.data = { partyId, userId, displayName };
    scheduleIdleCheck(room);

    socket.emit('party:created', { partyId, key, state: publicState(room) });
    console.log(`[Party] Room created: ${partyId} host=${displayName} private=${!!isPrivate}`);
  });

  // ── Join Party ────────────────────────────────────────────────────────────
  socket.on('party:join', ({ partyId, userId, displayName, key, avatar } = {}) => {
    const room = rooms.get(partyId);
    if (!room) return socket.emit('party:error', { code: 'NOT_FOUND', message: 'Party not found.' });
    if (room.members.length >= MAX_PARTY_SIZE) return socket.emit('party:error', { code: 'FULL', message: `Party is full (max ${MAX_PARTY_SIZE}).` });
    if (room.isPrivate && room.key !== String(key || '').toUpperCase()) return socket.emit('party:error', { code: 'WRONG_KEY', message: 'Incorrect party key.' });
    if (room.members.find(m => m.id === userId)) {
      // Reconnect: update socket id
      const member = room.members.find(m => m.id === userId);
      member.socketId = socket.id;
      socket.join(partyId);
      socket.data = { partyId, userId, displayName };
      return socket.emit('party:joined', { state: publicState(room) });
    }

    room.members.push({ id: userId, socketId: socket.id, displayName, avatar: avatar || null });
    touchActivity(room);
    socket.join(partyId);
    socket.data = { partyId, userId, displayName };

    const msg = sysMsg(`${displayName} joined the party 👋`);
    room.chat.push(msg);

    socket.emit('party:joined', { state: publicState(room) });
    io.to(partyId).emit('party:member-update', { members: publicMembers(room) });
    io.to(partyId).emit('party:message', msg);
    console.log(`[Party] ${displayName} joined room: ${partyId} (${room.members.length}/${MAX_PARTY_SIZE})`);
  });

  // ── Host pushes playback sync ─────────────────────────────────────────────
  socket.on('party:control', ({ partyId, userId, action, track, positionMs, isPlaying } = {}) => {
    const room = rooms.get(partyId);
    if (!room || room.hostId !== userId) return;

    if (track !== undefined) room.currentTrack = track;
    if (typeof positionMs === 'number') room.positionMs = positionMs;
    if (typeof isPlaying === 'boolean') {
      room.isPlaying = isPlaying;
      if (isPlaying) touchActivity(room);
    }
    room.syncTimestamp = Date.now();
    if (room.isPlaying) touchActivity(room);

    io.to(partyId).emit('party:sync', {
      action,
      track:     room.currentTrack,
      positionMs: room.positionMs,
      isPlaying: room.isPlaying,
      timestamp: room.syncTimestamp,
    });
  });

  // ── Chat message ──────────────────────────────────────────────────────────
  socket.on('party:chat', ({ partyId, userId, displayName, message } = {}) => {
    const room = rooms.get(partyId);
    if (!room) return;
    const text = String(message || '').trim().slice(0, 500);
    if (!text) return;

    touchActivity(room);
    const msg = { id: uuidv4(), type: 'chat', userId, displayName, message: text, ts: Date.now() };
    room.chat.push(msg);
    if (room.chat.length > 300) room.chat.splice(0, room.chat.length - 300);
    io.to(partyId).emit('party:message', msg);
  });

  // ── Member sends request ──────────────────────────────────────────────────
  socket.on('party:request', ({ partyId, userId, displayName, type, value } = {}) => {
    const room = rooms.get(partyId);
    if (!room || room.hostId === userId) return; // host doesn't request own controls
    if (!['skip', 'seek', 'song'].includes(type)) return;

    const req = { id: uuidv4(), userId, displayName, type, value: value || null, ts: Date.now() };
    room.requests.push(req);
    if (room.requests.length > 50) room.requests.splice(0, room.requests.length - 50);

    // Notify host
    const hostSock = findSocket(room.hostId, partyId);
    if (hostSock) hostSock.emit('party:request-notify', req);

    const labels = { skip: 'skip the track ⏭', seek: 'seek ⏩', song: `play "${value?.title || 'a song'}" 🎵` };
    const msg = sysMsg(`${displayName} requested to ${labels[type] || type}`);
    room.chat.push(msg);
    io.to(partyId).emit('party:message', msg);
    touchActivity(room);
  });

  // ── Host responds to request ──────────────────────────────────────────────
  socket.on('party:request-respond', ({ partyId, userId, requestId, approved } = {}) => {
    const room = rooms.get(partyId);
    if (!room || room.hostId !== userId) return;

    const req = room.requests.find(r => r.id === requestId);
    if (!req) return;
    room.requests = room.requests.filter(r => r.id !== requestId);

    io.to(partyId).emit('party:request-result', {
      requestId,
      approved,
      type:   req.type,
      value:  req.value,
      userId: req.userId,
    });

    const msg = sysMsg(`Host ${approved ? 'approved ✅' : 'denied ❌'} ${req.displayName}'s ${req.type} request`);
    room.chat.push(msg);
    io.to(partyId).emit('party:message', msg);
    touchActivity(room);
  });

  // ── Host transfers control ────────────────────────────────────────────────
  socket.on('party:transfer-host', ({ partyId, userId, newHostId } = {}) => {
    const room = rooms.get(partyId);
    if (!room || room.hostId !== userId) return;

    const newHost = room.members.find(m => m.id === newHostId);
    if (!newHost) return;

    room.hostId = newHostId;
    const msg = sysMsg(`${newHost.displayName} is now the host 👑`);
    room.chat.push(msg);
    io.to(partyId).emit('party:host-changed', { newHostId, members: publicMembers(room) });
    io.to(partyId).emit('party:message', msg);
    touchActivity(room);
  });

  // ── Leave party ───────────────────────────────────────────────────────────
  socket.on('party:leave', ({ partyId, userId } = {}) => {
    handleLeave(socket, partyId || socket.data?.partyId, userId || socket.data?.userId);
  });

  // ── Disconnect ────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const { partyId, userId } = socket.data || {};
    if (partyId && userId) handleLeave(socket, partyId, userId);
    console.log(`[Party] - Disconnected: ${socket.id}`);
  });

  // ── Internal leave handler ────────────────────────────────────────────────
  function handleLeave(sock, partyId, userId) {
    const room = rooms.get(partyId);
    if (!room) return;

    const member = room.members.find(m => m.id === userId);
    if (!member) return;

    const wasHost = room.hostId === userId;
    room.members = room.members.filter(m => m.id !== userId);
    sock.leave(partyId);

    if (room.members.length === 0) {
      closeRoom(partyId);
      return;
    }

    if (wasHost) {
      // Tell everyone host is leaving; they can vote for new host
      io.to(partyId).emit('party:host-leaving', {
        leftDisplayName: member.displayName,
        members: publicMembers(room),
      });
    } else {
      const msg = sysMsg(`${member.displayName} left the party`);
      room.chat.push(msg);
      io.to(partyId).emit('party:member-update', { members: publicMembers(room) });
      io.to(partyId).emit('party:message', msg);
    }
    touchActivity(room);
  }
});

// ─── HTTP routes ─────────────────────────────────────────────────────────────
app.get('/', (_req, res) => res.json({ service: 'Aether Party', status: 'ok', rooms: rooms.size }));
app.get('/health', (_req, res) => res.json({ ok: true }));

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4444;
httpServer.listen(PORT, () => console.log(`[Aether Party Server] Listening on :${PORT}`));

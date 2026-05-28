const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

// Spin up Express app
const app = express();
app.use(cors());
app.use(express.json());

// Grab an HTTP server instance so Socket.io can hook into it
const server = http.createServer(app);

// Fire up socket connection with CORS open for localhost client
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Dev client port 
    methods: ["GET", "POST"] 
  }
});

// Quick ping endpoint to see if backend is alive
app.get('/api/status', (req, res) => {
  res.json({ status: 'Virtual Lab Backend is running seamlessly!' });
});

// Wire up routing endpoints
const roomRoutes = require('./routes/rooms');
const authRoutes = require('./routes/auth');
app.use('/api/rooms', roomRoutes);
app.use('/api/auth', authRoutes);

// Manage real-time multiplayer socket events
io.on('connection', (socket) => {
  console.log(`New user connected: ${socket.id}`);

  // ── Peer joins a room ──
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    socket.roomId = roomId; // Cache it on the socket for cleanup on disconnect
    
    const clients = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
    const count = clients.length;
    socket.emit('room-user-count', { roomId, userCount: count });
    console.log(`User ${socket.id} joined room ${roomId} (${count} users)`);

    // Tell the rest of the room a new peer arrived
    socket.to(roomId).emit('user-joined', {
      userId: socket.id,
      userCount: count,
    });

    // If someone is already in the room, request their current canvas state to copy it over
    const otherClients = clients.filter(id => id !== socket.id);
    if (otherClients.length > 0) {
      io.to(otherClients[0]).emit('request-sync', { targetSocketId: socket.id });
    }
  });

  // ── Peer-to-peer state sharing ──
  socket.on('sync-state', (data) => {
    // payload: { targetSocketId, bodies: [...], constraints: [...] }
    io.to(data.targetSocketId).emit('sync-state', data);
  });

  // ── Forward position/angle/velocity updates to room peers ──
  socket.on('physics-update', (data) => {
    // payload: { roomId, bodies: [...serialized Matter.js bodies] }
    socket.to(data.roomId).emit('physics-update', data);
  });

  // ── Spawn a shape in everyone else's browser ──
  socket.on('add-body', (data) => {
    // payload: { roomId, body: { type, x, y, options... } }
    socket.to(data.roomId).emit('add-body', data);
  });

  socket.on('update-body-properties', (data) => {
    socket.to(data.roomId).emit('update-body-properties', data);
  });

  // ── Attach a constraint link in everyone else's browser ──
  socket.on('add-constraint', (data) => {
    // payload: { roomId, constraint: { type, bodyAId, bodyBId... } }
    socket.to(data.roomId).emit('add-constraint', data);
  });

  socket.on('update-constraint', (data) => {
    socket.to(data.roomId).emit('update-constraint', data);
  });

  // ── Delete shape event ──
  socket.on('remove-body', (data) => {
    // payload: { roomId, bodyId }
    socket.to(data.roomId).emit('remove-body', data);
  });

  socket.on('remove-constraint', (data) => {
    socket.to(data.roomId).emit('remove-constraint', data);
  });

  // ── Empty canvas event ──
  socket.on('clear-canvas', (data) => {
    // payload: { roomId }
    socket.to(data.roomId).emit('clear-canvas', data);
  });

  // ── Client closed window or connection dropped ──
  socket.on('disconnect', () => {
    if (socket.roomId) {
      const count = io.sockets.adapter.rooms.get(socket.roomId)?.size || 0;
      console.log(`User ${socket.id} left room ${socket.roomId} (${count} remaining)`);
      socket.to(socket.roomId).emit('user-left', {
        userId: socket.id,
        userCount: count,
      });
    } else {
      console.log(`User disconnected: ${socket.id}`);
    }
  });
});

// ── Server boot sequence ──
const startServer = async () => {
  try {
    // 1. Hook up MongoDB first
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB Atlas successfully!');

    // 2. Only listen on PORT if db connection succeeded
    const PORT = process.env.PORT || 5001;
    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });

  } catch (err) {
    // 3. Fail fast if database connection is broken
    console.error('CRITICAL: MongoDB connection failed!');
    console.error(err.message);
    process.exit(1); 
  }
};

// Run boot sequence
startServer();

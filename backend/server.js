const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

// Initialize Express
const app = express();
app.use(cors());
app.use(express.json());

// Create HTTP server (required for Socket.io)
const server = http.createServer(app);

// Initialize Socket.io with CORS allowing your frontend to connect
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Default Vite frontend port
    methods: ["GET", "POST"]
  }
});

// Basic Health Check Route (Phase 1 Requirement)
app.get('/api/status', (req, res) => {
  res.json({ status: 'Virtual Lab Backend is running seamlessly!' });
});

// Connect the Room API routes
// (Ensure you have a 'routes' folder with a 'rooms.js' file)
const roomRoutes = require('./routes/rooms');
app.use('/api/rooms', roomRoutes);

// Handle Real-Time Connections for the Physics Canvas
io.on('connection', (socket) => {
  console.log(`🟢 New user connected: ${socket.id}`);

  // ── Join a room ──
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    socket.roomId = roomId; // Store for later use
    const count = io.sockets.adapter.rooms.get(roomId)?.size || 0;
    socket.emit('room-user-count', { roomId, userCount: count });
    console.log(`🚪 ${socket.id} joined room ${roomId} (${count} users)`);

    // Notify others in the room that someone joined
    socket.to(roomId).emit('user-joined', {
      userId: socket.id,
      userCount: count,
    });
  });

  // ── Receive a physics update from one user, broadcast to the rest of the room ──
  socket.on('physics-update', (data) => {
    // data = { roomId, bodies: [...serialized Matter.js bodies] }
    socket.to(data.roomId).emit('physics-update', data);
  });

  // ── A user adds a new body to the canvas ──
  socket.on('add-body', (data) => {
    // data = { roomId, body: { type, x, y, options... } }
    socket.to(data.roomId).emit('add-body', data);
  });

  socket.on('update-body-properties', (data) => {
    socket.to(data.roomId).emit('update-body-properties', data);
  });

  // ── A user adds a constraint (pivot, spring) ──
  socket.on('add-constraint', (data) => {
    // data = { roomId, constraint: { type, bodyAId, bodyBId... } }
    socket.to(data.roomId).emit('add-constraint', data);
  });

  socket.on('update-constraint', (data) => {
    socket.to(data.roomId).emit('update-constraint', data);
  });

  // ── A user removes a body from the canvas ──
  socket.on('remove-body', (data) => {
    // data = { roomId, bodyId }
    socket.to(data.roomId).emit('remove-body', data);
  });

  socket.on('remove-constraint', (data) => {
    socket.to(data.roomId).emit('remove-constraint', data);
  });

  // ── A user clears the canvas ──
  socket.on('clear-canvas', (data) => {
    // data = { roomId }
    socket.to(data.roomId).emit('clear-canvas', data);
  });

  // ── Disconnect ──
  socket.on('disconnect', () => {
    if (socket.roomId) {
      const count = io.sockets.adapter.rooms.get(socket.roomId)?.size || 0;
      console.log(`🔴 ${socket.id} left room ${socket.roomId} (${count} remaining)`);
      socket.to(socket.roomId).emit('user-left', {
        userId: socket.id,
        userCount: count,
      });
    } else {
      console.log(`🔴 User disconnected: ${socket.id}`);
    }
  });
});

// ── DATABASE CONNECTION AND SERVER STARTUP ──
const startServer = async () => {
  try {
    // 1. Force the app to wait for MongoDB to connect first
    await mongoose.connect(process.env.MONGO_URI);
    console.log('📦 Connected to MongoDB Atlas successfully!');

    // 2. ONLY start the server if the database connection was successful
    const PORT = process.env.PORT || 5001;
    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });

  } catch (err) {
    // 3. Catch errors immediately and kill the server so it doesn't hang
    console.error('❌ CRITICAL: MongoDB connection failed!');
    console.error(err.message);
    process.exit(1); 
  }
};

// Execute the startup function
startServer();

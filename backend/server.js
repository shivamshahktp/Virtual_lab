const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
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
    origin: "http://localhost:5173", // Default Vite port
    methods: ["GET", "POST"]
  }
});

// Basic Health Check Route (Phase 1 Requirement)
app.get('/api/status', (req, res) => {
  res.json({ status: 'Virtual Lab Backend is running seamlessly!' });
});

// Handle Real-Time Connections (Phase 3 Foundation)
io.on('connection', (socket) => {
  console.log(`🟢 New user connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`🔴 User disconnected: ${socket.id}`);
  });
});

// Start the Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
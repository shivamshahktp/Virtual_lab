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

// Connect to MongoDB Atlas
// Ensure MONGO_URI is set in your .env file
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('📦 Connected to MongoDB successfully!'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// Basic Health Check Route (Phase 1 Requirement)
app.get('/api/status', (req, res) => {
  res.json({ status: 'Virtual Lab Backend is running seamlessly!' });
});

// Handle Real-Time Connections for the Physics Canvas
io.on('connection', (socket) => {
  console.log(`🟢 New user connected: ${socket.id}`);

  // We will add room joining and physics synchronization events here in Phase 3

  socket.on('disconnect', () => {
    console.log(`🔴 User disconnected: ${socket.id}`);
  });
});

// Start the Server (Defaulting to 5001 to avoid Mac AirPlay conflicts)
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
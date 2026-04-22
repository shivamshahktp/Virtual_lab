const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
  },
  bodies: {
    type: Array,
    default: [], // Stores the Matter.js body shapes, positions, masses, etc.
  },
  constraints: {
    type: Array,
    default: [], // Stores the ropes, springs, and pivots connecting the bodies
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('Room', roomSchema);
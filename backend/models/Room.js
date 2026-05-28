const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Keep it optional so older rooms don't break
  },
  bodies: {
    type: Array,
    default: [], // Dump of all Matter.js shapes (positions, masses, velocities, etc.)
  },
  constraints: {
    type: Array,
    default: [], // Connective tissues like ropes, springs, rods, and pivots
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('Room', roomSchema);